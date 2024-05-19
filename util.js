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
exports.fullMatchAux = exports.matchCaseAux = exports.format = exports.opLookup = exports.luaKeywords = exports.keywords = void 0;
var idCount = 0;
exports.keywords = [
    "def", "class",
    "end", "match",
    "case", "do",
    "yield", "@",
    ":", "<|", "module",
];
exports.luaKeywords = [
    "and", "or", "repeat"
];
exports.opLookup = {
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
};
function format(code) {
    var indentation = 0;
    var newCode = [];
    for (var _i = 0, _a = code.split("\n"); _i < _a.length; _i++) {
        var line = _a[_i];
        var untrimmed = line;
        line = line.trim();
        if (line.includes("end"))
            indentation--;
        if (line.includes("}"))
            indentation--;
        if (/^local [A-Z][a-zA-Z0-9]*/.test(untrimmed) && indentation == 0) {
            newCode = __spreadArray([line], newCode, true);
            continue;
        }
        indentation = indentation < 0
            ? 0 : indentation;
        newCode.push("  ".repeat(indentation) + line);
        if (line.includes("{"))
            indentation++;
        if (line.includes("function"))
            indentation++;
        if (line.includes("then"))
            indentation++;
    }
    return newCode.join("\n");
}
exports.format = format;
function matchCaseAux(pattern, expr) {
    if (pattern.type === "wildcard") {
        return __assign(__assign({}, pattern), { name: pattern.value, expr: expr });
    }
    var result = expr;
    var args = [];
    for (var _i = 0, _a = pattern.args; _i < _a.length; _i++) {
        var arg = _a[_i];
        if (arg.type === "constructor") {
            var matchVar = "_MATCH_".concat(idCount++);
            var got = matchCaseAux(arg, result);
            result = {
                match: matchVar,
                cases: [got],
            };
            args.push(matchVar);
        }
        else {
            args.push(arg.value);
        }
    }
    var guard = undefined;
    if ("guard" in pattern) {
        guard = pattern.guard;
    }
    var caseResult = {
        name: pattern.class,
        guard: guard,
        args: args,
        expr: result,
    };
    return caseResult;
}
exports.matchCaseAux = matchCaseAux;
function fullMatchAux(matchObj) {
    var scrutinee = "_SCRUTINEE_".concat(idCount++);
    var casesVar = "_CASES_".concat(idCount++);
    var code = "(function(".concat(scrutinee, ")\n")
        + "local ".concat(casesVar, " = {}\n");
    for (var _i = 0, _a = matchObj.cases; _i < _a.length; _i++) {
        var c = _a[_i];
        var expr = c.expr;
        if (typeof expr === "object") {
            expr = fullMatchAux(expr);
        }
        var guard = c.guard
            ? c.guard
            : "True";
        if ("args" in c) {
            code +=
                "if (".concat(casesVar, "[1] and ").concat(casesVar, "[1][1] ~= 1) or #").concat(casesVar, " == 0 and __DEEP_EQ(__EAGER(")
                    + "getmetatable(__EAGER("
                    + "".concat(scrutinee, ")).__type), ").concat(c.name)
                    + ") then\ntable.insert(".concat(casesVar, ", (function(")
                    + "".concat(c.args.join(", "), ")\nif __DEEP_EQ(").concat(guard)
                    + ", True) then\nreturn {1, ".concat(expr, "}\n")
                    + "else\nreturn {0}\nend\nend)("
                    + "table.unpack(getmetatable(__EAGER(".concat(scrutinee, "))")
                    + ".__args)))\nend\n";
        }
        else {
            code +=
                "if (".concat(casesVar, "[1] and ").concat(casesVar, "[1][1] ~= 1) or not ").concat(casesVar, "[1] then\n")
                    + "table.insert(".concat(casesVar, ", (function(")
                    + "".concat(c.name, ")\nif __DEEP_EQ(").concat(guard)
                    + ", True) then\nreturn {1, ".concat(expr, "}\n")
                    + "else\nreturn {0}\nend\nend)("
                    + "".concat(scrutinee, ")\n)\nend\n");
        }
    }
    code +=
        "for _, case in pairs(".concat(casesVar, ") do\n")
            + "if case[1] == 1 then\nreturn case[2]\nend\nend\n";
    code +=
        "error(\"Non-exhaustive pattern match against '\" "
            + ".. tostring(".concat(scrutinee, ") .. \"'.\")\nend)(").concat(matchObj.match, ")");
    return code;
}
exports.fullMatchAux = fullMatchAux;
