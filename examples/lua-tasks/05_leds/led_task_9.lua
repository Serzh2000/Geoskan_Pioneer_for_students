local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

-- Задание 9: Полицейская мигалка (попеременное мигание пар)
-- Глобальная переменная состояния
t9_state = false

-- Глобальная переменная таймера
t9_timer = Timer.new(0.3, function()
    if t9_state then
        -- Четные - Красный, Нечетные - Синий
        for i=0, ledNumber-1 do
            if i % 2 == 0 then leds:set(i, 1, 0, 0) else leds:set(i, 0, 0, 1) end
        end
    else
        -- Четные - Синий, Нечетные - Красный
        for i=0, ledNumber-1 do
            if i % 2 == 0 then leds:set(i, 0, 0, 1) else leds:set(i, 1, 0, 0) end
        end
    end
    t9_state = not t9_state
end)
t9_timer:start()

function callback(event)
end
