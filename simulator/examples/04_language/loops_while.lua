-- while: увеличиваем x, пока он меньше 5
local x = 0
while x < 5 do
  x = x + 1
end
print(x)  -- 5

-- repeat ... until: тело выполняется минимум один раз
repeat
  x = x - 1
until x == 0
print(x)  -- 0
