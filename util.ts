
export type Pattern = {
  type: "wildcard"
  value: string,
} | {
  type: "constructor",
  class: string,
  args: Pattern[],
}

export type GuardPattern = Pattern & {
  guard: string
}

export type MatchCase = {
  name: string,
  guard?: string,
  args: string[],
  expr: string | Match
}

export type Match = {
  match: string,
  cases: MatchCase[]
}

let idCount: number = 0

export const keywords: string[] = [
  "def", "class",
  "end", "match",
  "case", "do",
  "yield", "@",
  ":", "<|"
]

export const luaKeywords: string[] = [
  "and", "or", "repeat"
]

export const opLookup: Record<string, string> = {
  "+": "_PLUS_",
  "-": "_MINUS_",
  "*": "_TIMES_",
  "/": "_SLASH_",
  "!": "_BANG_",
  "@": "_AT_",
  "#": "_HASH_",
  "$": "_DOL_",
  "%": "_PER_",
  "^": "_CARET_",
  "&": "_AMP_",
  ":": "_COLON_",
  "?": "_QM_",
  "=": "_EQ_",
  "~": "_TILDE_",
  "|": "_PIPE_",
  "<": "_LT_",
  ">": "_GT_",
}

export function format(code: string) {
  let indentation = 0
  let newCode: string[] = []

  for (let line of code.split("\n")) {
    line = line.trim()
    if (line.includes("end")) indentation--
    if (line.includes("}")) indentation--
    if (/local [A-Z][a-zA-Z0-9]*/.test(line)) {
      newCode = [line, ...newCode]
      continue
    }
    indentation = indentation < 0
      ? 0 : indentation
    newCode.push("  ".repeat(indentation) + line)
    if (line.includes("{")) indentation++
    if (line.includes("function")) indentation++
    if (line.includes("then")) indentation++
  }

  return newCode.join("\n")
}

export function matchCaseAux(
  pattern: Pattern | GuardPattern,
  expr: string | Match
) {
  if (pattern.type === "wildcard") {
    return {
      ...pattern,
      name: pattern.value,
      args: [],
      expr,
    }
  }

  let result: Match | string = expr
  let args: string[] = []

  for (const arg of pattern.args) {
    if (arg.type === "constructor") {
      let matchVar = `_MATCH_${idCount++}`
      let got = matchCaseAux(arg, result)
      result = {
        match: matchVar,
        cases: [got],
      }
      args.push(matchVar)
    } else {
      args.push(arg.value)
    }
  }

  let guard: any = undefined

  if ("guard" in pattern) {
    guard = pattern.guard
  }

  let caseResult = {
    name: pattern.class,
    guard,
    args,
    expr: result,
  }

  return caseResult
}

export function fullMatchAux(
  matchObj: Match
) {
  let scrutinee = `_SCRUTINEE_${idCount++}`
  let casesVar = `_CASES_${idCount++}`
  let code =
    `(function(${scrutinee})\n`
  + `local ${casesVar} = {}\n`
  for (let c of matchObj.cases) {
    let expr = c.expr
    if (typeof expr === "object") {
      expr = fullMatchAux(expr)
    }
    let guard = c.guard
      ? c.guard
      : "True"
    if (c.args) {
      code +=
        `if __DEEP_EQ(__EAGER(`
      + `getmetatable(__EAGER`
      + `${scrutinee})).__type), ${c.name}`
      + `) then\ntable.insert(${casesVar}, (function(`
      + `${c.args.join(", ")})\nif __DEEP_EQ(${guard}`
      + `, True) then\nreturn {1, ${expr}}\n`
      + `else\nreturn {0}\nend\nend)(`
      + `table.unpack(getmetatable(__EAGER(${scrutinee}))`
      + `.__args)))\nend\n`
    } else {
      code +=
        `table.insert(${casesVar}, (function(`
      + `${c.name})\nif __DEEP_EQ(${guard}`
      + `, True) then\nreturn {1, ${expr}}\n`
      + `else\nreturn {0}\nend\nend)(`
      + `${scrutinee})\n)`
    }
  }

  code +=
    `for _, case in pairs(${casesVar}) do\n`
  + `if case[1] == 1 then\nreturn case[2]\nend\nend\n`

  code +=
    `error("Non-exhaustive pattern match against '" `
  + `.. tostring(${scrutinee}) .. "'.")\nend)(${matchObj.match})`

  return code
}