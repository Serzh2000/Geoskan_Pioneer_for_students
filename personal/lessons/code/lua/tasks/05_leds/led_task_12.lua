local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 12: Аварийный строб при низком заряде
-- Глобальная переменная состояния
t12_state = false

-- Глобальная переменная таймера (объявляем, но запускаем позже)
t12_timer = Timer.new(0.05, function()
    if t12_state then changeColor({1, 0, 0}) else changeColor({0, 0, 0}) end
    t12_state = not t12_state
end)

function callback(event)
    if event == Ev.LOW_VOLTAGE2 then
        t12_timer:start()
    end
end
