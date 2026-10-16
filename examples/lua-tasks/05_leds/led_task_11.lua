local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 11: Выключение при посадке
-- Глобальная переменная таймера
t11_timer = Timer.new(0.5, function() 
    changeColor({math.random(), 0, 0}) 
end)
t11_timer:start()

function callback(event)
    if event == Ev.COPTER_LANDED then
        t11_timer:stop()
        changeColor({0, 0, 0})
    end
end
