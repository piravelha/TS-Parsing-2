function __LAZY(f)
  if type(f) == "table"
  and f["~lazy"] then
    return f
  end

  return setmetatable({
    ["~"] = f,
    ["~lazy"] = true,
  }, {
    __tostring = function()
      local addr = tostring(f)
      return "lazy: (" .. addr .. ")"
    end,
  })
end

function __EAGER(l)
  if type(l) ~= "table"
  or not l["~lazy"] then
    return l
  end

  return __EAGER(l["~"]())
end

function __DEEP_EQ(
  tbl1, tbl2, depth
)
  depth = depth or 0
  if depth >= 10 then
    return true
  end

  tbl1 = __EAGER(tbl1)
  tbl2 = __EAGER(tbl2)

  if type(tbl1) == "function"
  or type(tbl2) == "function" then
    return type(tbl1) == type(tbl2)
  end

  if type(tbl1) ~= "table"
  or type(tbl2) ~= "table" then
    return tbl1 == tbl2
  end

  if tbl1["~"]
  or tbl2["~"] then
    return tbl1["~"] == tbl2["~"]
  end

  for k, v1 in pairs(tbl1) do
    local v2 = tbl2[k]
    if not __DEEP_EQ(
      v1, v2, depth + 1
    ) then
      return false
    end
  end

  if getmetatable(tbl1)
  and getmetatable(tbl2) then
    return __DEEP_EQ(
      getmetatable(tbl1),
      getmetatable(tbl2),
      depth + 1
    )
  end

  return true
end

local True
local False

True = __LAZY(function()
  return setmetatable({
    _PIPE__PIPE_ = function(b)
      return True
    end,
    _AMP__AMP_ = function(b)
      return b
    end,
    _not = __LAZY(function()
      return False
    end),
    ["~"] = true,
  }, {
    __tostring = function()
      return "True"
    end,
    __type = __LAZY(function()
      return True
    end),
    __args = {},
  })
end)

False = __LAZY(function()
  return setmetatable({
    _PIPE__PIPE_ = function(b)
      return b
    end,
    _AMP__AMP_ = function(b)
      return False
    end,
    _not = __LAZY(function()
      return True
    end),
    ["~"] = false,
  }, {
    __tostring = function()
      return "False"
    end,
    __type = __LAZY(function()
      return False
    end),
    __args = {},
  })
end)

function __INT(n)
  function _PLUS_(m)
    return __INT(n + __EAGER(m)["~"])
  end

  return setmetatable({
    ["~"] = n,
    _PLUS_ = _PLUS_,
    _MINUS_ = function(m)
      return __INT(n - __EAGER(m)["~"])
    end,
    _TIMES_ = function(m)
      return __INT(n * __EAGER(m)["~"])
    end,
    _SLASH_ = function(m)
      return __INT(n // __EAGER(m)["~"])
    end,
    _PER_ = function(m)
      return __INT(n % __EAGER(m)["~"])
    end,
    _LT_ = function(m)
      if n < __EAGER(m)["~"] then
        return True
      else
        return False
      end
    end,
    _GT_ = function(m)
      if n > __EAGER(m)["~"] then
        return True
      else
        return False
      end
    end,
    _LT__EQ_ = function(m)
      if n <= __EAGER(m)["~"] then
        return True
      else
        return False
      end
    end,
    _GT__EQ_ = function(m)
      if n >= __EAGER(m)["~"] then
        return True
      else
        return False
      end
    end,
    _EQ__EQ_ = function(m)
      if n == __EAGER(m)["~"] then
        return True
      else
        return False
      end
    end,
    _BANG__EQ_ = function(m)
      if n ~= __EAGER(m)["~"] then
        return True
      else
        return False
      end
    end,
  }, {
    __tostring = function()
      return tostring(n)
    end,
    __type = __LAZY(function()
      return __INT(n)
    end),
    __args = {},
  })
end

function __FLOAT(f)
  return setmetatable({
    ["~"] = f,
    _PLUS_ = function(g)
      return __FLOAT(f + __EAGER(g)["~"])
    end,
    _MINUS_ = function(g)
      return __FLOAT(f - __EAGER(g)["~"])
    end,
    _TIMES_ = function(g)
      return __FLOAT(f * __EAGER(g)["~"])
    end,
    _SLASH_ = function(g)
      return __FLOAT(f / __EAGER(g)["~"])
    end,
    _PER_ = function(g)
      return __FLOAT(f % __EAGER(g)["~"])
    end,
    _LT_ = function(g)
      if f < __EAGER(g)["~"] then
        return True
      else
        return False
      end
    end,
    _GT_ = function(g)
      if f > __EAGER(g)["~"] then
        return True
      else
        return False
      end
    end,
    _LT__EQ_ = function(g)
      if f <= __EAGER(g)["~"] then
        return True
      else
        return False
      end
    end,
    _GT__EQ_ = function(g)
      if f >= __EAGER(g)["~"] then
        return True
      else
        return False
      end
    end,
    _EQ__EQ_ = function(g)
      if f == __EAGER(g)["~"] then
        return True
      else
        return False
      end
    end,
    _BANG__EQ_ = function(g)
      if f ~= __EAGER(g)["~"] then
        return True
      else
        return False
      end
    end,
  }, {
    __tostring = function()
      return tostring(f)
    end,
    __type = __LAZY(function()
      return __FLOAT(f)
    end),
    __args = {},
  })
end

function __STRING(s)
  return setmetatable({
    ["~"] = s,
    _PLUS_ = function(t)
      return __STRING(s .. __EAGER(t)["~"])
    end,
    _repeat = function(n)
      return __STRING(s:rep(__EAGER(n)["~"]))
    end
  }, {
    __tostring = function()
      return s
    end,
    __type = __LAZY(function()
      return __STRING(s)
    end),
    __args = {},
  })
end

local Nil

function Cons(head)
  return function(tail)
    return setmetatable({
      _PLUS__PLUS_ = function(arr)
        return Cons(head, __EAGER(tail)._PLUS__PLUS_(arr))
      end,
      _LT__DOL__GT_ = function(f)
        return Cons(__EAGER(f)(head), __EAGER(tail)._LT__DOL__GT_(f))
      end,
      map = function(f)
        return Cons(__EAGER(f)(head), __EAGER(tail)._LT__DOL__GT_(f))
      end,
      filter = function(p)
        if __DEEP_EQ(__EAGER(p)(head), True) then
          return Cons(head, tail.filter(p))
        end
        return tail.filter(p)
      end,
      ["~h"] = head,
      ["~t"] = tail,
    }, {
      __tostring = function()
        local str = tostring(__EAGER(tail))
        if str == "[]" then
          return "[" .. tostring(__EAGER(head)) .. "]"
        end
        return "[" .. tostring(__EAGER(head)) .. ", " .. str:sub(2)
      end,
      __type = Cons,
      __args = {head, tail},
    })
  end
end

Nil = __LAZY(function()
  return setmetatable({
    _PLUS__PLUS = function(arr)
      return arr
    end,
    _LT__DOL__GT_ = function(f)
      return Nil
    end,
    map = function(f)
      return Nil
    end,
    filter = function(p)
      return Nil
    end,
  }, {
    __tostring = function()
      return "[]"
    end,
    __type = __LAZY(function()
      return Nil
    end),
    __args = {},
  })
end)

local List
List = {
  range = function(min)
    return function(max)
      return function(step)
        local arr = Nil
        for i = max["~"], min["~"], -step["~"] do
          arr = Cons(__INT(i))(arr)
        end
        return arr
      end
    end
  end
}

function __EVAL(io)
  return io["~"]()
end

function IO(io)
  return setmetatable({
    _GT__GT_ = function(x)
      return IO(function()
        io()
        return __EAGER(x)["~"]()
      end)
    end,
    _GT__GT__EQ_ = function(x)
      return IO(function()
        local result = __EAGER(x)(io())
        return __EAGER(result)["~"]()
      end)
    end,
    ["~"] = io,
  }, {
    __tostring = function()
      local addr = tostring(io)
      return "io: (" .. addr .. ")"
    end,
    __type = IO,
    __args = {io}
  })
end

function println(...)
  local args = {...}
  return IO(function()
    print(table.unpack(args))
  end)
end

function show(obj)
  return __STRING(tostring(obj))
end

local Random = {
  random = function(min)
    return function(max)
      return IO(function()
        math.randomseed(os.time())
        return __INT(math.random(min["~"], max["~"]))
      end)
    end
  end
}
local length
length = function(list)
  return (function(_SCRUTINEE_0)
  local _CASES_1 = {}
    if (_CASES_1[1] and _CASES_1[1][1] ~= 1) or #_CASES_1 == 0 and __DEEP_EQ(__EAGER(getmetatable(__EAGER(_SCRUTINEE_0)).__type), Nil) then
      table.insert(_CASES_1, (function()
        if __DEEP_EQ(True, True) then
        return {1, __INT(0)}
          else
        return {0}
        end
      end)(table.unpack(getmetatable(__EAGER(_SCRUTINEE_0)).__args)))
    end
    if (_CASES_1[1] and _CASES_1[1][1] ~= 1) or #_CASES_1 == 0 and __DEEP_EQ(__EAGER(getmetatable(__EAGER(_SCRUTINEE_0)).__type), Cons) then
      table.insert(_CASES_1, (function(x, xs)
        if __DEEP_EQ(True, True) then
        return {1, __EAGER(__EAGER(__INT(1))["_PLUS_"])(__EAGER(length)(__EAGER(xs)))}
          else
        return {0}
        end
      end)(table.unpack(getmetatable(__EAGER(_SCRUTINEE_0)).__args)))
    end
    for _, case in pairs(_CASES_1) do
    if case[1] == 1 then
      return case[2]
    end
  end
  error("Non-exhaustive pattern match against '" .. tostring(_SCRUTINEE_0) .. "'.")
end)(list)
end
__EVAL(__EAGER(__EAGER(println)(__EAGER(__EAGER(length)(__EAGER(__EAGER(__EAGER(List)["range"])(__EAGER(__INT(0)))(__EAGER(__INT(99)))(__EAGER(__INT(1)))))))))