local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 7: Стробоскоп (20 Гц)
-- Глобальная переменная состояния
t7_state = false

-- Глобальная переменная таймера
t7_timer = Timer.new(0.025, function()
    if t7_state then
        changeColor({1, 1, 1})
    else
        changeColor({0, 0, 0})
    end
    t7_state = not t7_state
end)
t7_timer:start()

function callback(event)
end
