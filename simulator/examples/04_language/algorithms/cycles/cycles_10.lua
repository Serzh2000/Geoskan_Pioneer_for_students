local t = {x = 1, y = 2}
local copy = {}
for k, v in pairs(t) do
  copy[k] = v + 1
end
