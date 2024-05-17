if exists("b:current_syntax")
  finish
endif

syntax clear

syntax keyword haskKeyword def class match case end do if then else block module

syntax match haskInfix "\([!%&*+<=>?@^|~\-/:$]\)\@<!\s\+\zs\<[a-z][a-zA-Z0-9]*\>\ze\s\+"

syntax match haskYieldArg "yield\s\+\<[a-z][a-zA-Z0-9]*\>" contains=haskYield,haskIdentifier

syntax keyword haskYield yield contained

syntax match haskIdentifier "\<[a-z][a-zA-Z0-9]*\>" contained

syntax keyword haskBoolean True False
syntax match haskSpecialOperator "<|"
syntax match haskOpBang "[!%&*+<=>?@^|~\-/:$]\([a-z]\)\@!"

syntax region haskInterpolated start=+`+ end=+`+ contains=haskInterpolatedVariable,haskBraceInterpolation

syntax region haskBraceInterpolation start=+${+ end=+}+

syntax match haskInterpolatedVariable "\$\<[a-z][a-zA-Z0-9]*\>" contained contains=haskDollar,haskInterpolatedIdentifier

syntax match haskDollar "\$" contained

syntax match haskInterpolatedIdentifier "\<[a-z][a-zA-Z0-9]*\>" contained

syntax match haskComment "#.*$"

syntax region haskString start=+"+ end=+"+

syntax match haskNumber "\<\d\+\>"

syntax match haskPrefixOp "@\<[a-z][a-zA-Z0-9]*\>\s\+"

syntax match haskClass "\<[A-Z][a-zA-Z0-9]*\>"

syntax match haskFunction "\(@\)\@<!\<[a-z][a-zA-Z0-9]*\>\ze("

syntax match haskMethod "\(def\s\+\)\@<=\<[a-z][a-zA-Z0-9]*\>\s*(\<[a-z][a-zA-Z0-9]*\>\(\s*,\s*\<[a-z][a-zA-Z0-9]*\>\)*)" contains=haskParameterList,haskMethodName

syntax match haskVariable "\(def\s\+\)\@<=\<[a-z][a-zA-Z0-9]*\>\((\)\@!"

syntax match haskParameterList "(\s*\<[a-z][a-zA-Z0-9]*\>\(\s*,\s*\<[a-z][a-zA-Z0-9]*\>\)*)" contained contains=haskParameter

syntax match haskParameter "\<[a-z][a-zA-Z0-9]*\>" contained

syntax match haskMethodName "\(def\s\+\)\@<=\<[a-z][a-zA-Z0-9]*\>" contained

syntax match haskProperty "\(\.\)\@<=\<[a-zA-Z][a-zA-Z0-9]*"

syntax match haskBlockCall "\<[a-zA-Z][a-zA-Z0-9]*\>:"

highlight link haskClass Type
highlight link haskDef Keyword
highlight link haskMethod Function
highlight link haskMethodIdentifier Function
highlight link haskYield Keyword
highlight link haskYieldArg Keyword
highlight link haskIdentifier Type
highlight link haskFunction Function
highlight link haskKeyword Keyword
highlight link haskBoolean Boolean
highlight link haskOpBang Define
highlight link haskSpecialOperator Define
highlight link haskComment Comment
highlight link haskString String
highlight link haskInterpolated String
highlight link haskNumber Number
highlight link haskPrefixOp Special
highlight link haskInfix Define
highlight link haskBlockCall Keyword
highlight link haskProperty Type
highlight link haskMethodName Function
highlight link haskVariable Function
highlight link haskParameter Type
highlight link haskDollar Special
let b:current_syntax = "hask"
