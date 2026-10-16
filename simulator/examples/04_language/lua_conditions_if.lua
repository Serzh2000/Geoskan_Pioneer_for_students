-- классификация числа x: каскад if / elseif / else
local function classify(x)
  if x > 0 then
    return "positive"
  elseif x == 0 then
    return "zero"
  else
    return "negative"
  end
end

print(classify(5))    -- positive
print(classify(0))    -- zero
print(classify(-3))   -- negative
