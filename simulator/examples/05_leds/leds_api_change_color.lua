local ledNumber = 29
local leds = Ledbar.new(ledNumber)

-- заливка всей линейки одним цветом; color — таблица {r, g, b}
local function changeColor(color)
  for i = 0, ledNumber - 1 do
    leds:set(i, table.unpack(color))
  end
end

changeColor({1, 1, 0})   -- жёлтый: красный + зелёный
