local speed = 1.5
local level
if speed < 1 then
  level = "slow"
elseif speed < 2 then
  level = "medium"
else
  level = "fast"
end
