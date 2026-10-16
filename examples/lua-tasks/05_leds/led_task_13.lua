local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 13: Заполнение (0 -> 3 -> Выкл)
-- Глобальная переменная состояния
t13_count = 0

-- Глобальная переменная таймера
t13_timer = Timer.new(0.1, function() -- Чуть быстрее (0.1с)
    if t13_count == 0 then changeColor({0,0,0}) end 
    
    if t13_count < ledNumber then
        -- Чтобы эффект был плавным и четким, обновляем всю полосу
        for i=0, ledNumber-1 do
            if i <= t13_count then
                leds:set(i, 0, 1, 0) -- Зеленый для заполненной части
            else
                leds:set(i, 0, 0, 0) -- Выключено для остальной
            end
        end
        t13_count = t13_count + 1
    else
        changeColor({0,0,0}) -- Сброс
        t13_count = 0
    end
end)
t13_timer:start()

function callback(event)
end
