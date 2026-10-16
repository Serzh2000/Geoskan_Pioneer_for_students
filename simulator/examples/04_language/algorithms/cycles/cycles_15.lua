local fibs = {1, 1}
for i = 3, 10 do
  fibs[i] = fibs[i - 1] + fibs[i - 2]
end
