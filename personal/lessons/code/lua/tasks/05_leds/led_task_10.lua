local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

-- Задание 10: Случайный диско (каждый диод свой цвет)
-- Глобальная переменная таймера
t10_timer = Timer.new(0.2, function()
    for i=0, ledNumber-1 do
        leds:set(i, math.random(), math.random(), math.random())
    end
end)
t10_timer:start()

function callback(event)
end
