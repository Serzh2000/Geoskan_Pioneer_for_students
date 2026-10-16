local leds = Ledbar.new(29)

-- Функция для очистки (выключения всех)
local function clear()
    for i=0, 28 do leds:set(i, 0,0,0) end
end

clear()
-- Включаем индекс 0
leds:set(0, 1, 0, 0) 
-- Если загорелся не тот, который вы ожидали — поменяйте 0 на другой индекс от 0 до 28
