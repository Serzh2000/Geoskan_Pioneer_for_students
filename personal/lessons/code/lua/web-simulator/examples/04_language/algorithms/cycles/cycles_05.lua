local a = {1, 2, 3, 4}
local rev = {}
for i = #a, 1, -1 do
  rev[#rev + 1] = a[i]
end
