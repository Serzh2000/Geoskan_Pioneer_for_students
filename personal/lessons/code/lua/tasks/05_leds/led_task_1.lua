local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 1: Зеленый свет (включаем все 29 светодиодов)
changeColor({0, 1, 0})
