local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 6: Пульсация красным (плавное разгорание/затухание)
-- Глобальные переменные состояния
t6_brightness = 0
t6_step = 0.05

-- Глобальная переменная таймера
t6_timer = Timer.new(0.05, function()
    t6_brightness = t6_brightness + t6_step
    if t6_brightness > 1 or t6_brightness < 0 then
        t6_step = -t6_step
        t6_brightness = t6_brightness + t6_step
    end
    changeColor({t6_brightness, 0, 0})
end)
t6_timer:start()

function callback(event)
end
