local function changeColor(color)
  for i = 0, ledNumber - 1 do
    leds:set(i, table.unpack(color))
  end
end
