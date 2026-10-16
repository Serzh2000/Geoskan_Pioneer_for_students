local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 2: Отложенный запуск (синий через 3 сек)
changeColor({0, 0, 0}) -- сначала выключим

-- Используем глобальную переменную для таймера
t2_timer = Timer.callLater(3.0, function()
    changeColor({0, 0, 1})
end)

function callback(event)
end
