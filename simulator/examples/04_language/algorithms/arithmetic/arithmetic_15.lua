local a = {1, 7, 3, 9, 2}
local max = a[1]
for i = 2, #a do
  if a[i] > max then max = a[i] end
end
