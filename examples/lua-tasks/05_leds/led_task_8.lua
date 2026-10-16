local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

-- Задание 8: Чет/Нечет (0,2.. - Красный; 1,3.. - Синий)
local function setLeds()
    for i=0, ledNumber-1 do
        if i % 2 == 0 then
            leds:set(i, 1, 0, 0) -- Четные - Красный
        else
            leds:set(i, 0, 0, 1) -- Нечетные - Синий
        end
    end
end

setLeds()
