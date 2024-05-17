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
      return "lazy: " .. addr:split(": ")[2]
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
    return true
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
True = __LAZY(function()
  return setmetatable({
    _PIPE__PIPE_ = function(b)
      return True
    end,
    _AMP__AMP_ = function(b)
      return b
    end,
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

local False
False = __LAZY(function()
  return setmetatable({
    _PIPE__PIPE_ = function(b)
      return b
    end,
    _AMP__AMP_ = function(b)
      return False
    end,
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

function __EVAL(io)
  return io["~"]()
end

function IO(io)
  return setmetatable({
    _GT__GT_ = function(x)
      return IO(function()
        io()
        return x["~"]()
      end)
    end,
    _GT__GT__EQ_ = function(x)
      return IO(function()
        local result = x(io())
        return result["~"]()
      end)
    end,
    ["~"] = io,
  }, {
    __tostring = function()
      local addr = tostring(io)
      return "io: " .. addr:split(":")[2]
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
