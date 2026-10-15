-- ipairs: обход массива по порядку, умножаем элементы на 2
local a = {10, 20, 30}
for i, v in ipairs(a) do
  a[i] = v * 2
end
print(a[1], a[2], a[3])  -- 20  40  60

-- pairs: обход словаря, увеличиваем значения на 1
local t = {x = 1, y = 2}
for k, v in pairs(t) do
  t[k] = v + 1
end
print(t.x, t.y)          -- 2  3
