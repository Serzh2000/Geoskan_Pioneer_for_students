local flags = {true, false, true, true}
local cnt = 0
for _, v in ipairs(flags) do
  if v then cnt = cnt + 1 end
end
