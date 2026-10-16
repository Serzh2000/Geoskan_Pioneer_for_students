local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 3: Мигание 3 раза (КРАСНЫМ)
changeColor({0, 0, 0})

-- Глобальная переменная
t3_timer = Timer.new(0.5, function()
    -- Этот таймер здесь не используется для логики, мы используем рекурсию ниже
end)

-- Рекурсивная функция для мигания
function blink(n)
    if n <= 0 then return end
    changeColor({1, 0, 0}) -- Красный
    t3_timer = Timer.callLater(0.5, function()
        changeColor({0, 0, 0})
        t3_timer = Timer.callLater(0.5, function()
            blink(n-1)
        end)
    end)
end

blink(3)

function callback(event)
end
