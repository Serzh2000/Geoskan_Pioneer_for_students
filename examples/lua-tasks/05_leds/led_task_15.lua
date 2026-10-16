local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

-- Задание 15: Двоичный счетчик (0 -> 2^4-1, используем 4 бита)
-- Глобальная переменная состояния
t15_counter = 0

-- Глобальная переменная таймера
t15_timer = Timer.new(1.0, function()
    local val = t15_counter 
    
    -- Проходим по битам числа
    for i=0, ledNumber-1 do
        -- Получаем i-й бит числа (сдвигаем вправо на i и берем остаток от 2)
        local bit = math.floor(val / (2^i)) % 2
        
        if bit == 1 then
            leds:set(i, 1, 1, 1)
        else
            leds:set(i, 0, 0, 0)
        end
    end
    
    t15_counter = t15_counter + 1
end)
t15_timer:start()

function callback(event)
end
