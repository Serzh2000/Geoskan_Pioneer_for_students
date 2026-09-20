-- умножаем элементы массива на 2
local a = {10, 20, 30}
for i, v in ipairs(a) do
  a[i] = v * 2
end
-- увеличиваем значения словаря на 1
local t = {x=1, y=2}
for k, v in pairs(t) do
  t[k] = v + 1
end
