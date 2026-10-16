-- Скрипт реализует управление магнитом на модуле груза

-- Создание порта управления магнитом - порт PC3 на плате версии 1.2
local magnet = Gpio.new(Gpio.C, 3, Gpio.OUTPUT)
-- Создание порта управления магнитом - порт PA1 на плате версии 1.1 (необходимо раскомментировать строчку ниже и закомментировать строчку выше)
-- local magnet = Gpio.new(Gpio.A, 1, Gpio.OUTPUT)

-- Количество светодиодов (4 на базовой плате и еще 4 на модуле груза)
local led_number = 8 
-- Создание порта управления светодиодами
local leds = Ledbar.new(led_number) 
-- Состояние магнита (изначально он находится во включенном состоянии)
local magnet_state = true

-- Функция, устанавливающая цвет светодиодов в зависимости от состояния магнита
local function setLed(state)
    if (state == true) then
        color = {1,1,1}                  -- Если магнит включен, то белый цвет
    else
        color = {0,0,0}                  -- Если магнит выключен, то черный (светодиоды не горят)
    end
    for i = 4, led_number - 1, 1 do      -- Для каждого из 4 светодиодов задаем цвет
        leds:set(i, table.unpack(color)) 
    end
end

-- Функция переключения магнита
local function toggleMagnet()
    if (magnet_state == true) then  -- Если магнит включен, то выключаем его
        magnet:reset()
    else                            -- Если выключен, то включаем
        magnet:set()
    end
    magnet_state = not magnet_state -- Инвертируем переменную состояния
end

-- Обязательная функция обработки событий
function callback(event)
end

-- Создание таймера, вызывающего функцию каждую секунуду
cargoTimer = Timer.new(1, function ()
    toggleMagnet()
    setLed(magnet_state)
end)
-- Запуск таймера
cargoTimer:start()
