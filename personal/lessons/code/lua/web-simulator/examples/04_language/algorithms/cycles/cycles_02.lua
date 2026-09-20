local a = {3, 7, 2, 9, 5}
local max = a[1]
for i = 2, #a do
  if a[i] > max then max = a[i] end
end
