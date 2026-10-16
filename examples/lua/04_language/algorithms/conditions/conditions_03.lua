local temp = 15
local state
if temp < 0 then
  state = "cold"
elseif (temp >= 0) and (temp < 20) then
  state = "cool"
else
  state = "warm"
end
