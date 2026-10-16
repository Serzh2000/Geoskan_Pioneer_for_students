-- функция с параметрами и одним результатом
local function average(a, b)
  return (a + b) / 2
end
print(average(1, 2))  -- 1.5
print(average(1, 3))  -- 2.0

-- функция может вернуть несколько значений сразу
local function describe(x)
  local color = (x > 0) and "green" or "red"
  local word = (x == 0) and "zero" or "nonzero"
  return color, word
end
print(describe(0))    -- red  zero
