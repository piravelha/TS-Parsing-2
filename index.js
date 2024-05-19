"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var parsing_1 = require("./parsing");
var util_1 = require("./util");
var fs_1 = require("fs");
var parseStart = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)(parseStatement.many(), (0, parsing_1.seq)((0, parsing_1.string)("<|").skip(), parseExpression).map(function (_a) {
    var e = _a[0];
    return "__EVAL(__EAGER(".concat(e, "))");
}).opt("")).map(function (_a) {
    var ss = _a[0], expr = _a[1];
    var defs = [];
    var code = (0, util_1.format)(__spreadArray(__spreadArray([], ss, true), [
        expr
    ], false).join("\n"));
    for (var _i = 0, _b = code.split("\n"); _i < _b.length; _i++) {
        var line = _b[_i];
        if (/^local \w+/.test(line)) {
            defs.push(line.split("local ")[1]);
        }
    }
    defs = defs.map(function (d) { return "".concat(d, " = ").concat(d, ",\n"); });
    return code + "return {\n".concat(defs.join(""), "}");
}); });
var parseStatement = (0, parsing_1.lazy)(function () { return (0, parsing_1.alt)(parseModuleDeclaration, parseClassDeclaration, parseVariableDeclaration, parseMethodDeclaration); });
var parseExpression = (0, parsing_1.lazy)(function () { return (0, parsing_1.alt)(parseDoNotation, parseMatchExpression, parseLambdaExpression, parsePrefixOp, parseOperatorCall, parseBlockCall, parseBlock, parseMethodCall, parsePropertyAccess, parseInterpolatedString, parseArray, parseString, parseIdentifier, parseFloat, parseInt, parseConstructor, (0, parsing_1.seq)((0, parsing_1.string)("(").skip(), parseExpression, (0, parsing_1.string)(")").skip()).map(function (_a) {
    var e = _a[0];
    return e;
})); });
var parseDoNotation = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("do").skip(), (0, parsing_1.alt)((0, parsing_1.seq)((0, parsing_1.string)("<|").skip(), parseExpression).map(function (_a) {
    var i = _a[0];
    return ["_", i];
}), (0, parsing_1.seq)((0, parsing_1.string)("yield").skip(), parseIdentifier, (0, parsing_1.string)("=").skip(), parseExpression).map(function (_a) {
    var n = _a[0], e = _a[1];
    return [n, e];
})).some(), (0, parsing_1.string)("end").skip()).map(function (_a) {
    var actions = _a[0];
    var code = "";
    for (var _i = 0, _b = actions.reverse(); _i < _b.length; _i++) {
        var _c = _b[_i], name_1 = _c[0], expr = _c[1];
        if (code === "") {
            code = expr;
            continue;
        }
        code =
            "__EAGER(__EAGER(".concat(expr, ")[\"")
                + "_GT__GT__EQ_\"])"
                + "(function(".concat(name_1, ")\nreturn ").concat(code, "\nend)");
    }
    return code;
}); });
var parseLambdaExpression = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.alt)(parseParameterList, parseIdentifier.map(function (i) { return [i]; })), (0, parsing_1.string)("=>").skip(), parseExpression).map(function (_a) {
    var params = _a[0], body = _a[1];
    var code = "";
    for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
        var p = params_1[_i];
        code += "function(".concat(p, ")\nreturn ");
    }
    code += body;
    code += "\nend".repeat(params.length);
    return code;
}); });
var parseBlockCall = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.alt)(parsePropertyAccess, parseIdentifier), (0, parsing_1.string)(":").skip(), parseStatement.many(), (0, parsing_1.seq)((0, parsing_1.string)("<|").skip(), parseExpression).map(function (_a) {
    var e = _a[0];
    return e;
}), (0, parsing_1.string)("end").skip()).map(function (_a) {
    var func = _a[0], ss = _a[1], expr = _a[2];
    return "".concat(func, "((function()\n")
        + "".concat(ss.map(function (s) { return "".concat(s, "\n"); }).join(""))
        + "return ".concat(expr, "\n")
        + "end)())";
}); });
var parseBlock = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("block").skip(), parseStatement.many(), (0, parsing_1.seq)((0, parsing_1.string)("<|").skip(), parseExpression).map(function (_a) {
    var e = _a[0];
    return e;
}), (0, parsing_1.string)("end").skip()).map(function (_a) {
    var ss = _a[0], expr = _a[1];
    return "(function()\n"
        + "".concat(ss.map(function (s) { return "".concat(s, "\n"); }).join(""))
        + "return ".concat(expr, "\n")
        + "end)()";
}); });
var parseMatchExpression = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("match").skip(), parseExpression, parseMatchCase.some(), (0, parsing_1.string)("end").skip()).map(function (_a) {
    var match = _a[0], cases = _a[1];
    return (0, util_1.fullMatchAux)({
        match: match,
        cases: cases
    });
}); });
var parseMatchCase = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("case").skip(), parseGuardPattern, (0, parsing_1.string)("=>").skip(), parseExpression).map(function (_a) {
    var pat = _a[0], expr = _a[1];
    return (0, util_1.matchCaseAux)(pat, expr);
}); });
var parseGuardPattern = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)(parsePattern, (0, parsing_1.seq)((0, parsing_1.string)("if").skip(), parseExpression).map(function (_a) {
    var e = _a[0];
    return e;
}).opt("True")).map(function (_a) {
    var pat = _a[0], guard = _a[1];
    return (__assign(__assign({}, pat), { guard: guard }));
}); });
var parsePattern = (0, parsing_1.lazy)(function () { return (0, parsing_1.alt)((0, parsing_1.alt)((0, parsing_1.alt)((0, parsing_1.string)("_"), parseIdentifier).map(function (i) { return ({
    type: "wildcard",
    value: i
}); }), parseInt.map(function (n) { return ({
    type: "constructor",
    class: n,
    args: [],
}); })), (0, parsing_1.seq)(parseConstructor, (0, parsing_1.seq)((0, parsing_1.string)("(").skip(), parsePattern, (0, parsing_1.seq)((0, parsing_1.string)(",").skip(), parsePattern).map(function (_a) {
    var p = _a[0];
    return p;
}).many(), (0, parsing_1.string)(")").skip()).map(function (_a) {
    var head = _a[0], tail = _a[1];
    return __spreadArray([head], tail, true);
}).opt([])).map(function (_a) {
    var con = _a[0], args = _a[1];
    return ({
        type: "constructor",
        class: con,
        args: args,
    });
})); });
var parseModuleDeclaration = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("module").skip(), parseConstructor, (0, parsing_1.alt)(parseMethodDeclaration, parseVariableDeclaration, parseClassDeclaration).many(), (0, parsing_1.string)("end").skip()).map(function (_a) {
    var name = _a[0], methods = _a[1];
    var methodNames = [];
    for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
        var m = methods_1[_i];
        m = m.split("local ")[1];
        m = m.split("\n")[0].trim();
        methodNames.push("".concat(m, " = ").concat(m, ",\n"));
    }
    var code = "local ".concat(name, "\n").concat(name, " = __LAZY(function()\n")
        + "".concat(methods.join("\n"), "\nreturn {\n").concat(methodNames.join(""), "}\nend)");
    return code;
}); });
var parseClassDeclaration = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("class").skip(), parseConstructor, parseParameterList.opt([]), (0, parsing_1.alt)(parseMethodDeclaration, parseVariableDeclaration).many(), (0, parsing_1.string)("end").skip()).map(function (_a) {
    var name = _a[0], params = _a[1], methods = _a[2];
    var methodNames = [];
    for (var _i = 0, methods_2 = methods; _i < methods_2.length; _i++) {
        var m = methods_2[_i];
        m = m.split("local ")[1];
        m = m.split("\n")[0].trim();
        methodNames.push("".concat(m, " = ").concat(m, ",\n"));
    }
    var tostring = "";
    if (name === "Cons") {
        tostring = "local str = tostring(tail)\nif str == \"[]\" then\nreturn \"[\" .. tostring(head) .. \"]\"\nend\nreturn \"[\" .. tostring(head) .. \", \" .. str:sub(2)";
    }
    else if (name === "Nil") {
        tostring = "return \"[]\"";
    }
    else {
        tostring += "\"".concat(name, "(\"");
        for (var _b = 0, params_2 = params; _b < params_2.length; _b++) {
            var p = params_2[_b];
            tostring += " .. tostring(".concat(p, ") .. \", \"");
        }
        if (params.length > 0) {
            tostring = tostring.slice(0, -8) + " .. \")\"";
        }
        else {
            tostring = "\"".concat(name, "\"");
        }
        tostring = "return " + tostring;
    }
    var code = "local ".concat(name, "\n").concat(name, " = __LAZY(function()\nreturn ");
    for (var _c = 0, params_3 = params; _c < params_3.length; _c++) {
        var p = params_3[_c];
        code += "function(".concat(p, ")\nreturn ");
    }
    code +=
        "(function()\n".concat(methods.map(function (m) { return "".concat(m, "\n"); }).join(""))
            + "return setmetatable({\n"
            + "".concat(methodNames.join("\n"), "}, {\n")
            + "__tostring = function()\n".concat(tostring, "\nend,\n")
            + "__type = __LAZY(function()\nreturn ".concat(name, "\nend),\n")
            + "__args = { ".concat(params.join(", "), " },\n")
            + "})\nend)()";
    code += "\nend".repeat(params.length) + "\nend)";
    return code;
}); });
var parseInterpolatedString = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)('`').skip(), (0, parsing_1.alt)((0, parsing_1.regex)(/[^`$]+/), (0, parsing_1.alt)((0, parsing_1.seq)((0, parsing_1.string)('$').skip(), parseIdentifier.map(function (id) { return "tostring(__EAGER(".concat(id, "))"); }), { skipSpaces: false }).map(function (_a) {
    var i = _a[0];
    return i;
}), (0, parsing_1.seq)((0, parsing_1.string)("${").skip(), parseExpression.map(function (expr) { return "tostring(__EAGER(".concat(expr, "))"); }), (0, parsing_1.string)("}").skip(), { skipSpaces: false }).map(function (_a) {
    var i = _a[0];
    return i;
}))).many({ skipSpaces: false }), (0, parsing_1.string)('`').skip()).map(function (_a) {
    var parts = _a[0];
    var luaString = parts.map(function (part) {
        if (part.startsWith('tostring')) {
            return "%s";
        }
        else {
            return part;
        }
    }).join('');
    var luaVariables = parts.filter(function (part) { return part.startsWith('tostring'); }).join(', ');
    return "__STRING((\"".concat(luaString, "\"):format(").concat(luaVariables, "))");
}); });
var parsePropertyAccess = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)(parsePrimitiveExpression, (0, parsing_1.seq)((0, parsing_1.string)(".").skip(), (0, parsing_1.alt)(parseIdentifier, parseConstructor)).map(function (_a) {
    var e = _a[0];
    return e;
}).many()).map(function (_a) {
    var name = _a[0], props = _a[1];
    var code = name;
    for (var _i = 0, props_1 = props; _i < props_1.length; _i++) {
        var p = props_1[_i];
        code = "__EAGER(".concat(code, ")[\"").concat(p, "\"]");
    }
    return code;
}); });
var parseOperatorCall = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.alt)(parseMethodCall, parsePrimitiveExpression), (0, parsing_1.seq)(parseIdentifier, (0, parsing_1.alt)(parseMethodCall, parsePrimitiveExpression)).some()).map(function (_a) {
    var name = _a[0], args = _a[1];
    var code = "__EAGER(".concat(name, ")");
    for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
        var _b = args_1[_i], op = _b[0], arg = _b[1];
        code += "[\"".concat(op, "\"]");
        code = "__EAGER(".concat(code, ")");
        code += "(".concat(arg, ")");
    }
    return code;
}); });
var parsePrimitiveExpression = (0, parsing_1.lazy)(function () { return (0, parsing_1.alt)(parseLambdaExpression, parseIdentifier, parseConstructor, parseInterpolatedString, parseFloat, parseInt, parseString, (0, parsing_1.seq)((0, parsing_1.string)("(").skip(), parseExpression, (0, parsing_1.string)(")").skip()).map(function (_a) {
    var e = _a[0];
    return e;
})); });
var parsePrefixOp = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.regex)(/@[a-z][a-zA-Z0-9]*/), (0, parsing_1.alt)(parseMethodCall, parsePrimitiveExpression)).map(function (_a) {
    var op = _a[0], expr = _a[1];
    return "__EAGER(".concat(expr, ")[\"").concat(op.slice(1), "\"]");
}); });
var parseMethodCall = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.alt)(parsePropertyAccess, parseIdentifier, parseConstructor), parseArgumentList).map(function (_a) {
    var name = _a[0], args = _a[1];
    return "__EAGER(".concat(name, ")(").concat(args.map(function (a) { return "__EAGER(".concat(a, ")"); }).join(")("), ")");
}); });
var parseArgumentList = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("(").skip(), parseExpression, (0, parsing_1.seq)((0, parsing_1.string)(",").skip(), parseExpression).map(function (_a) {
    var p = _a[0];
    return p;
}).many(), (0, parsing_1.string)(")").skip()).map(function (_a) {
    var head = _a[0], tail = _a[1];
    return __spreadArray([head], tail, true);
}); });
var parseMethodDeclaration = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("def").skip(), parseIdentifier, parseParameterList, (0, parsing_1.string)("=").skip(), parseExpression).map(function (_a) {
    var name = _a[0], args = _a[1], body = _a[2];
    var code = "local ".concat(name, "\n").concat(name, " = ");
    for (var _i = 0, args_2 = args; _i < args_2.length; _i++) {
        var a = args_2[_i];
        code += "function(".concat(a, ")\nreturn ");
    }
    code += body;
    return code + "\nend".repeat(args.length);
}); });
var parseParameterList = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("(").skip(), parseIdentifier, (0, parsing_1.seq)((0, parsing_1.string)(",").skip(), parseIdentifier).map(function (_a) {
    var p = _a[0];
    return p;
}).many(), (0, parsing_1.string)(")").skip()).map(function (_a) {
    var head = _a[0], tail = _a[1];
    return __spreadArray([head], tail, true);
}); });
var parseVariableDeclaration = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("def").skip(), parseIdentifier, (0, parsing_1.string)("=").skip(), parseExpression).map(function (_a) {
    var name = _a[0], value = _a[1];
    return "local ".concat(name, "\n")
        + "".concat(name, " = __LAZY(function()\n")
        + "return ".concat(value, "\n")
        + "end)";
}); });
var parseArray = (0, parsing_1.lazy)(function () { return (0, parsing_1.seq)((0, parsing_1.string)("[").skip(), parseExpression, (0, parsing_1.seq)((0, parsing_1.string)(",").skip(), parseExpression).map(function (_a) {
    var e = _a[0];
    return e;
}).many(), (0, parsing_1.string)("]").skip()).map(function (_a) {
    var head = _a[0], tail = _a[1];
    var elems = __spreadArray([head], tail, true);
    var arr = "Nil";
    for (var _i = 0, _b = elems.reverse(); _i < _b.length; _i++) {
        var e = _b[_i];
        arr = "__EAGER(Cons)(".concat(e, ")(").concat(arr, ")");
    }
    return arr;
}); });
var parseConstructor = (0, parsing_1.regex)(/[A-Z][a-zA-Z0-9]*/);
var parseIdentifier = (0, parsing_1.lazy)(function () { return (0, parsing_1.alt)(parseOperator, parseName); });
var parseOperator = (0, parsing_1.regex)(/[+\-*/!@#$%^&:?~|<>=]+/)
    .filter(function (op) { return !util_1.keywords.includes(op); })
    .map(function (op) { return op.split("")
    .map(function (char) { return util_1.opLookup[char]; })
    .join(""); });
var parseName = (0, parsing_1.regex)(/[a-z][a-zA-Z0-9]*/)
    .filter(function (name) { return !util_1.keywords.includes(name); })
    .map(function (name) { return util_1.luaKeywords.includes(name)
    ? "_".concat(name)
    : name; });
var parseInt = (0, parsing_1.regex)(/\d+/).map(function (n) { return "__INT(".concat(n, ")"); });
var parseFloat = (0, parsing_1.regex)(/\d+\.\d+/).map(function (f) { return "__FLOAT(".concat(f, ")"); });
var parseString = (0, parsing_1.regex)(/"[^"]*"/).map(function (s) { return "__STRING(".concat(s, ")"); });
var parse = function (input) {
    input = input.replace(/#.+/, "");
    var result = parseStart.trim().parse(input);
    if (result.success) {
    }
    else {
        console.log(result.error);
        throw new Error("Parsing Error");
    }
    var lib = (0, fs_1.readFileSync)("lib.lua", "utf-8");
    var haskLib = (0, fs_1.readFileSync)("HaskLib.hsk", "utf-8");
    var strHaskLib = parseStart.trim().parse(haskLib);
    strHaskLib = strHaskLib.value.toString();
    var newHaskLib = strHaskLib.substring(0, strHaskLib.lastIndexOf("return {"));
    (0, fs_1.writeFileSync)(filename.split(".hsk")[0] + ".lua", lib + newHaskLib + result.value.toString());
};
var filename = process.argv[2];
var text = (0, fs_1.readFileSync)(filename, "utf-8");
parse(text);
