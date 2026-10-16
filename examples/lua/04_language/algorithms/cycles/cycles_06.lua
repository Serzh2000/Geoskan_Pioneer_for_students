local a = {0, 1, 0, 2, 3}
local res = {}
for _, v in ipairs(a) do
  if v ~= 0 then res[#res + 1] = v end
end
