import { Parser, alt, lazy, regex, seq, string } from "./parsing"
import { Pattern, GuardPattern, matchCaseAux, fullMatchAux, format, opLookup, keywords, luaKeywords } from "./util"
import { readFileSync, writeFileSync } from "fs"

const parseStart = lazy(() => seq(
  parseStatement.many(),
  seq(
    string("<|").skip(),
    parseExpression,
  ).map(([e]) => `__EVAL(__EAGER(${e}))`),
).map(([ss, expr]) => {
  const lib = readFileSync("lib.lua", "utf-8")
  return lib + format([
    ...ss, expr
  ].join("\n"))
}))

const parseStatement = lazy(() => alt(
  parseVariableDeclaration,
  parseMethodDeclaration,
))

const parseExpression: Parser<string> = lazy(() => alt(
  parseDoNotation,
  parseMatchExpression,
  parsePrefixOp,
  parseOperatorCall,
  parseBlockCall,
  parseMethodCall,
  parsePropertyAccess,
  parseString,
  parseIdentifier,
  parseFloat,
  parseInt,
  parseConstructor,
  seq(
    string("(").skip(),
    parseExpression,
    string(")").skip(),
  ).map(([e]) => e)
))

const parseDoNotation = lazy(() => seq(
  string("do").skip(),
  seq(
    string("<|").skip(),
    parseExpression,
  ).map(([i]) => ["_", i]).some(),
  string("end").skip(),
).map(([actions]) => {
  let code = ""
  for (let [name, expr] of actions.reverse()) {
    if (code === "") {
      code = expr
      continue
    }
    code =
      `__EAGER(__EAGER(${expr})["`
    + `_GT__GT__EQ_"])`
    + `(function(${name})\nreturn ${code}\nend)`
  }
    
  return code
}))

const parseBlockCall = lazy(() => seq(
  alt(
    parsePropertyAccess,
    parseIdentifier,
  ),
  string(":").skip(),
  parseStatement.many(),
  seq(
    string("<|").skip(),
    parseExpression,
  ).map(([e]) => e),
  string("end").skip(),
).map(([func, ss, expr]) =>
  `${func}((function()\n`
+ `${ss.map(s => `${s}\n`).join("")}`
+ `return ${expr}\n`
+ `end)())`
))

const parseMatchExpression = lazy(() => seq(
  string("match").skip(),
  parseExpression,
  parseMatchCase.some(),
  string("end").skip(),
).map(([match, cases]) => fullMatchAux({
  match,
  cases
})))

const parseMatchCase = lazy(() => seq(
  string("case").skip(),
  parseGuardPattern,
  string("=>").skip(),
  parseExpression,
).map(([pat, expr]) => matchCaseAux(pat, expr)))

const parseGuardPattern: Parser<GuardPattern> = lazy(() => seq(
  parsePattern,
  seq(
    string("if").skip(),
    parseExpression,
  ).map(([e]) => e).opt("True"),
).map(([pat, guard]) => ({
  ...pat,
  guard: guard,
})))

const parsePattern: Parser<Pattern> = lazy(() => alt(
  alt(
    alt(
      string("_"),
      parseIdentifier
    ).map(i => ({
      type: "wildcard",
      value: i
    } as const)),
    parseInt.map(n => ({
      type: "constructor",
      class: n,
      args: [] as any[],
    } as const)),
  ),
  seq(
    parseConstructor,
    seq(
      string("(").skip(),
      parsePattern,
      seq(
        string(",").skip(),
        parsePattern,
      ).map(([p]) => p).many(),
      string(")").skip(),
    ).map(([head, tail]) => [head, ...tail]).opt([]),
  ).map(([con, args]) => ({
    type: "constructor",
    class: con,
    args,
  } as const))
))

const parseClassDeclaration = lazy(() => seq(
  string("class").skip(),
  parseConstructor,
  parseParameterList.opt([]),
  parseMethodDeclaration.many(),
  string("end").skip(),
).map(([name, params, methods]) => {
  let methodNames: string[] = []
  for (let m of methods) {
    m = m.split("local ")[1]
    m = m.split("\n")[0].trim()
    methodNames.push(`${m} = ${m},\n`)
  }
  let tostring = `"${name}("`
  for (let p of params) {
    tostring += ` .. tostring(${p})`
  }
  if (/\(" \.\. "\)"/.test(tostring)) {
    tostring = `"${name}"`
  }
  let code =
    `local ${name}\n${name} = __LAZY(`
  + `function(${params.join(", ")})\n`
  + `${methods.map(m => `${m}\n`).join("")}`
  + `return setmetatable({\n`
  + `${methodNames.join("\n")}}, {\n`
  + `__tostring = function()\nreturn ${tostring}\nend,`
  + `__type = __LAZY(function()\nreturn ${name}\nend)`
  + `__args = { ${params.join(", ")} },\n`
  + `})\nend)`

  return code
}))

const parsePropertyAccess = lazy(() => seq(
  parsePrimitiveExpression,
  seq(
    string(".").skip(),
    parseIdentifier,
  ).map(([e]) => e).many()
).map(([name, props]) => {
  let code = name
  for (const p of props) {
    code = `__EAGER(${code})["${p}"]`
  }
  return code
}))

const parseOperatorCall = lazy(() => seq(
  parsePrimitiveExpression,
  parseIdentifier,
  parsePrimitiveExpression,
).map(([name, op, arg]) => 
  `__EAGER(`
+ `__EAGER(${name})`
+ `["${op}"])`
+ `(${arg})`
))

const parsePrimitiveExpression: Parser<string> = lazy(() => alt(
  parseIdentifier,
  parseFloat,
  parseInt,
  parseString,
  seq(
    string("(").skip(),
    parseExpression,
    string(")").skip(),
  ).map(([e]) => e)
))

const parsePrefixOp = lazy(() => seq(
  regex(/@[a-z][a-zA-Z0-9]*/),
  parsePrimitiveExpression,
).map(([op, expr]) => `__EAGER(${expr})["${op.slice(1)}"]`))

const parseMethodCall = lazy(() => seq(
  alt(
    parseIdentifier
  ),
  parseArgumentList,
).map(([name, args]) => {
  return `__EAGER(${name})(${
    args.map(a => `__EAGER(${a})`).join(")(")
  })`
}))

const parseArgumentList = lazy(() => seq(
  string("(").skip(),
  parseExpression,
  seq(
    string(",").skip(),
    parseExpression,
  ).map(([p]) => p).many(),
  string(")").skip(),
).map(([head, tail]) => [head, ...tail]))

const parseMethodDeclaration = lazy(() => seq(
  string("def").skip(),
  parseIdentifier,
  parseParameterList,
  string("=").skip(),
  parseExpression,
).map(([name,args,body]) => {
  let code = `local ${name}\n${name} = `
  for (const a of args) {
    code += `function(${a})\nreturn `
  }
  code += body
  return code + `\nend`.repeat(args.length)
}))

const parseParameterList = lazy(() => seq(
  string("(").skip(),
  parseIdentifier,
  seq(
    string(",").skip(),
    parseIdentifier,
  ).map(([p]) => p).many(),
  string(")").skip(),
).map(([head, tail]) => [head, ...tail]))

const parseVariableDeclaration = lazy(() => seq(
  string("def").skip(),
  parseIdentifier,
  string("=").skip(),
  parseExpression,
).map(([name,value]) =>
  `local ${name}\n`
+ `${name} = __LAZY(function()\n`
+ `return ${value}\n`
+ `end)`))

const parseConstructor = regex(/[A-Z][a-zA-Z0-9]*/)

const parseIdentifier = lazy(() => alt(
  parseOperator,
  parseName,
))

const parseOperator = regex(/[+\-*/!@#$%^&:?~|<>=]+/)
  .filter(op => !keywords.includes(op))
  .map(op => op.split("")
    .map(char => opLookup[char])
    .join("")
  )

const parseName = regex(/[a-z][a-zA-Z0-9]*/)
  .filter(name => !keywords.includes(name))
  .map(name => luaKeywords.includes(name)
    ? `_${name}`
    : name
  )

const parseInt = regex(/\d+/).map(n => `__INT(${n})`)

const parseFloat = regex(/\d+\.\d+/).map(f => `__FLOAT(${f})`)

const parseString = regex(/"[^"]*"/).map(s => `__STRING(${s})`)

const filename = process.argv[2]
const text = readFileSync(filename, "utf-8")
const result = parseStart.trim().parse(text)

if (result.success) {
  writeFileSync(filename.split(".hsk")[0] + ".lua", result.value.toString())
} else {
  console.log(result.error)
  throw new Error(`Parsing Error`)
}