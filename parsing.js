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
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazy = exports.regex = exports.string = exports.seq = exports.alt = exports.Parser = void 0;
var Parser = /** @class */ (function () {
    function Parser(parse) {
        this.raw_parse = parse;
        this.parse = function (input) {
            var result = parse(input, [1, 0]);
            if (!result.success)
                return result;
            if (!result.rest.trim())
                return result;
            return {
                success: false,
                error: {
                    type: "End Of Parse Error",
                    rest: result.rest.trim()
                }
            };
        };
        this.shouldSkip = false;
    }
    Parser.prototype.skip = function () {
        var _this = this;
        var p = new Parser(function (input, pos) {
            return _this.raw_parse(input, pos);
        });
        p.shouldSkip = true;
        return p;
    };
    Parser.prototype.map = function (f) {
        var _this = this;
        return new Parser(function (input, pos) {
            var result = _this.raw_parse(input, pos);
            if (!result.success)
                return result;
            var value = result.value, rest = result.rest;
            return {
                success: true,
                value: f(value),
                rest: rest,
            };
        });
    };
    Parser.prototype.filter = function (p) {
        var _this = this;
        return new Parser(function (input, pos) {
            var result = _this.raw_parse(input, pos);
            if (!result.success)
                return result;
            var value = result.value, rest = result.rest;
            if (p(value))
                return result;
            return {
                success: false,
                error: {
                    type: "Filter Error",
                }
            };
        });
    };
    Parser.prototype.some = function (configs) {
        var _this = this;
        if (configs === void 0) { configs = { skipSpaces: true }; }
        return new Parser(function (input, pos) {
            var result = _this.raw_parse(input, pos);
            if (!result.success)
                return result;
            var value = result.value, rest = result.rest;
            if (configs.skipSpaces) {
                rest = rest.trimStart();
            }
            var difference = input.slice(0, input.length - result.rest.length);
            for (var _i = 0, _a = difference.split(""); _i < _a.length; _i++) {
                var char = _a[_i];
                if (char === "\n") {
                    pos[0]++;
                    pos[1] = 0;
                    continue;
                }
                pos[1]++;
            }
            var results = _this.some(configs).raw_parse(rest, pos);
            if (!results.success)
                return __assign(__assign({}, result), { value: [value] });
            return __assign(__assign({}, results), { value: [value].concat(results.value) });
        });
    };
    Parser.prototype.many = function (configs) {
        var _this = this;
        if (configs === void 0) { configs = { skipSpaces: true }; }
        return new Parser(function (input, pos) {
            var result = _this.some(configs).raw_parse(input, pos);
            if (!result.success)
                return {
                    success: true,
                    value: [],
                    rest: input,
                };
            return result;
        });
    };
    Parser.prototype.trim = function () {
        var _this = this;
        return new Parser(function (input, pos) {
            return _this.raw_parse(input.trim(), pos);
        });
    };
    Parser.prototype.opt = function (fallback) {
        var _this = this;
        return new Parser(function (input, pos) {
            var result = _this.raw_parse(input, pos);
            if (!result.success)
                return {
                    success: true,
                    value: fallback,
                    rest: input
                };
            return result;
        });
    };
    return Parser;
}());
exports.Parser = Parser;
function alt() {
    var ps = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        ps[_i] = arguments[_i];
    }
    return new Parser(function (input, pos) {
        var combinedError = {
            type: "Syntax Error",
            line: pos[0],
            column: pos[0],
            expected: [],
            found: ""
        };
        for (var _i = 0, ps_1 = ps; _i < ps_1.length; _i++) {
            var p = ps_1[_i];
            var result = p.raw_parse(input, pos);
            if (result.success) {
                return result;
            }
            var error = result.error;
            if (error.type === "Syntax Error") {
                combinedError = error;
            }
        }
        return {
            "success": false,
            "error": combinedError,
        };
    });
}
exports.alt = alt;
function seq() {
    var ps = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        ps[_i] = arguments[_i];
    }
    var configs = {
        skipSpaces: true
    };
    var last = ps.slice(-1)[0];
    if (last.constructor === Object) {
        ps.pop();
        configs = last;
    }
    return new Parser(function (input, pos) {
        var untrimmed = input;
        var results = {
            success: true,
            value: [],
            rest: input
        };
        var line = pos[0];
        var column = pos[1];
        for (var _i = 0, ps_2 = ps; _i < ps_2.length; _i++) {
            var p = ps_2[_i];
            var result = p.raw_parse(input, [line, column]);
            if (!result.success) {
                return result;
            }
            if (!p.shouldSkip)
                results.value.push(result.value);
            var difference = input.slice(0, untrimmed.length - result.rest.length);
            for (var _a = 0, _b = difference.split(""); _a < _b.length; _a++) {
                var char = _b[_a];
                if (char === "\n") {
                    line++;
                    column = 0;
                    continue;
                }
                column++;
            }
            pos = [line, column];
            results.rest = result.rest;
            if (configs.skipSpaces) {
                input = result.rest.trimStart();
            }
            else
                input = result.rest;
            untrimmed = result.rest;
        }
        return results;
    });
}
exports.seq = seq;
function string(s) {
    return new Parser(function (input, pos) {
        if (input.startsWith(s)) {
            return {
                success: true,
                value: s,
                rest: input.slice(s.length),
            };
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
        };
    });
}
exports.string = string;
function regex(re) {
    return new Parser(function (input, pos) {
        var source = re.source;
        if (!source.startsWith("^")) {
            source = "^(?:".concat(source, ")");
        }
        var newRe = RegExp(source);
        var result = newRe.exec(input);
        if (!result)
            return {
                success: false,
                error: {
                    type: "Syntax Error",
                    line: pos[0],
                    column: pos[1],
                    expected: [re],
                    found: input.charAt(0),
                }
            };
        return {
            success: true,
            value: result[0],
            rest: input.slice(result[0].length),
        };
    });
}
exports.regex = regex;
function lazy(p) {
    return new Parser(function (input, pos) {
        return p().raw_parse(input, pos);
    });
}
exports.lazy = lazy;
