local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 4: Бегущий огонь (по всем светодиодам)
-- Глобальная переменная состояния
currentLed = 0

-- Глобальная переменная таймера
t4_timer = Timer.new(0.1, function()
    -- Выключаем все
    changeColor({0, 0, 0})
    -- Включаем текущий
    leds:set(currentLed, 1, 0.5, 0) -- Оранжевый огонек
    
    currentLed = currentLed + 1
    if currentLed >= ledNumber then
        currentLed = 0
    end
end)
t4_timer:start()

function callback(event)
end
