local a = {1, 2, 3}
local b = {4, 5}
local c = {}
for i = 1, #a do
  c[#c + 1] = a[i]
end
for i = 1, #b do
  c[#c + 1] = b[i]
end
