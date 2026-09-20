local a = {1, 2, 3, 4, 5, 6}
local count = 0
for _, v in ipairs(a) do
  if v % 2 == 0 then count = count + 1 end
end
