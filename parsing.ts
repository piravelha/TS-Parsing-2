
type ParseError =
  | {
    type: "Syntax Error",
    line: number,
    column: number,
    expected: (string | RegExp)[],
    found: string,
  }
  | {
    type: "End Of Parse Error",
    rest: string,
  }
  | {
    type: "Filter Error"
  }

export type ParseResult<A> = {
  success: true,
  value: A,
  rest: string,
} | {
  success: false,
  error: ParseError
}

type ParserFunction<A> =
  (input: string, pos: [number, number]) =>
    ParseResult<A>

export class Parser<A> {
  raw_parse: ParserFunction<A>
  parse: (input: string) => ParseResult<A>
  constructor(parse: ParserFunction<A>) {
    this.raw_parse = parse
    this.parse = input => {
      const result = parse(input, [1, 0])
      if (!result.success) return result
      if (!result.rest.trim()) return result
      return {
        success: false,
        error: {
          type: "End Of Parse Error",
          rest: result.rest.trim()
        }
      }
    }
    this.shouldSkip = false
  }
  shouldSkip: boolean
  skip(): Parser<A> & { shouldSkip: true } {
    const p = new Parser((input, pos) =>
      this.raw_parse(input, pos)  
    )
    p.shouldSkip = true
    return p as any
  }
  map<B>(f: (a: A) => B): Parser<B> {
    return new Parser((input, pos) => {
      const result = this.raw_parse(input, pos)
      if (!result.success) return result
      const { value, rest } = result
      return {
        success: true,
        value: f(value),
        rest,
      }
    })
  }
  filter(p: (a: A) => boolean): Parser<A> {
    return new Parser((input, pos) => {
      const result = this.raw_parse(input, pos)
      if (!result.success) return result
      const { value, rest } = result
      if (p(value)) return result
      return {
        success: false,
        error: {
          type: "Filter Error",
        }
      }
    })
  }
  some(): Parser<A[]> {
    return new Parser((input, pos) => {
      const result = this.raw_parse(input, pos)
      if (!result.success) return result
      const { value, rest } = result
      let difference = input.slice(
        0,
        input.length - result.rest.length
      )
      for (const char of difference.split("")) {
        if (char === "\n") {
          pos[0]++
          pos[1] = 0
          continue
        }
        pos[1]++
      }
      const results = this.some().raw_parse(rest, pos)
      if (!results.success) return {
        ...result,
        value: [value],
      }
      return {
        ...results,
        value: [value].concat(results.value)
      }
    })
  }
  many(): Parser<A[]> {
    return new Parser((input, pos) => {
      const result = this.some().raw_parse(input, pos)
      if (!result.success) return {
        success: true,
        value: [],
        rest: input,
      }
      return result
    })
  }
  trim(): Parser<A> {
    return new Parser((input, pos) =>
      this.raw_parse(input.trim(), pos)
    )
  }
  opt(fallback: A): Parser<A> {
    return new Parser((input, pos) => {
      const result = this.raw_parse(input, pos)
      if (!result.success) return {
        success: true,
        value: fallback,
        rest: input
      }
      return result
   })
  }
}

type UnwrapParsers<Ps extends any[], Acc extends any[] = []> =
  Ps extends [infer Head, ...infer Tail]
  ? Head extends Parser<infer X>
    ? UnwrapParsers<Tail, [...Acc, X]>
    : never
  : Acc

type TupleToUnion<T extends any[], Acc = never> =
  T extends [infer Head, ...infer Tail]
  ? Head extends Acc
    ? TupleToUnion<Tail, Acc>
    : TupleToUnion<Tail, Acc | Head>
  : Acc

export function alt<Ps extends Parser<any>[]>(
  ...ps: Ps
): Parser<TupleToUnion<UnwrapParsers<Ps>>> {
  return new Parser((input, pos) => {
    let combinedError = {
      type: "Syntax Error" as const,
      line: pos[0],
      column: pos[0],
      expected: [] as any[],
      found: ""
    }
    for (const p of ps) {
      const result = p.raw_parse(input, pos)
      if (result.success) {
        return result
      }
      const { error } = result
      if (error.type === "Syntax Error") {
        combinedError = error
      }
    }

    return {
      "success": false,
      "error": combinedError,
    }
  }) as any
}

type Seq<Ps extends any[], Acc extends any[] = []> =
  Ps extends [infer Head, ...infer Tail]
  ? Head extends Parser<infer X>
    ? Head["shouldSkip"] extends true
      ? Seq<Tail, Acc>
      : Seq<Tail, [...Acc, X]>
    : never
  : Parser<Acc>

export function seq<Ps extends Parser<any>[]>(
  ...ps: Ps
): Seq<Ps> {
  return new Parser((input, pos) => {
    let untrimmed = input

    let results = {
      success: true as const,
      value: [] as any[],
      rest: input
    }

    let line = pos[0]
    let column = pos[1]

    for (const p of ps) {
      const result = p.raw_parse(input, [line, column])
      if (!result.success) {
        return result
      }
      if (!p.shouldSkip) results.value.push(result.value)
      let difference = input.slice(
        0,
        untrimmed.length - result.rest.length
      )
      for (const char of difference.split("")) {
        if (char === "\n") {
          line++
          column = 0
          continue
        }
        column++
      }
      pos = [line, column]
      results.rest = result.rest
      input = result.rest.trimStart()
      untrimmed = result.rest
    }

    return results
  }) as any
}

export function string(s: string): Parser<string> {
  return new Parser((input, pos) => {
    if (input.startsWith(s)) {
      return {
        success: true,
        value: s,
        rest: input.slice(s.length) as any,
      }
    }
    return {
      success: false,
      error: {
        type: "Syntax Error",
        line: pos[0],
        column: pos[1],
        expected: [s],
        found: input.charAt(0),
      }
    }
  })
}

export function regex(re: RegExp): Parser<string> {
  return new Parser((input, pos) => {
    let source = re.source
    if (!source.startsWith("^")) {
      source = `^(?:${source})`
    }
    const newRe = RegExp(source)
    const result = newRe.exec(input)
    if (!result) return {
      success: false,
      error: {
        type: "Syntax Error",
         line: pos[0],
        column: pos[1],
        expected: [re],
        found: input.charAt(0),
      }
    }
    return {
      success: true,
      value: result[0],
      rest: input.slice(result[0].length),
    }
  })
}

export function lazy<A>(p: () => Parser<A>): Parser<A> {
  return new Parser((input, pos) =>
    p().raw_parse(input, pos)
  )
}