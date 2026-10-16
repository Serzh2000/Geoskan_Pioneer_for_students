-- Скрипт реализует вывод линейных скоростей коптера в системе позиционирования

-- Упрощение вызова функции взятия абсолютного значения из модуля math
local abs = math.abs

-- Количество светодиодов на базовой плате
local ledNumber = 4
-- Создание порта управления светодиодами
local leds = Ledbar.new(ledNumber)

-- Максимальные значения скорости по каждой из осей
local maxVx, maxVy, maxVz = 2, 2, 2

local function getVelocity()
    -- Считывание значений скоростей по 3-м осям
    vx, vy, vz = Sensors.lpsVelocity() 
    vx, vy, vz = abs(vx), abs(vy), abs(vz)
    -- Вывод скорости вдоль оси X на 1-й светодиод с помощью уровня интенсивности зеленого цвета
    leds:set(0, 0, vx % maxVx / maxVx, 0)
    -- Вывод скорости вдоль оси Z на 2-й и 3-й светодиоды с помощью уровня интенсивности фиолетового цвета
    leds:set(1, vz % maxVz / maxVz, 0, vz % maxVz / maxVz)
    leds:set(2, vz % maxVz / maxVz, 0, vz % maxVz / maxVz)
    -- Вывод скорости вдоль оси Y на 4-й светодиод с помощью уровня интенсивности синего цвета
    leds:set(3, 0, 0, vy % maxVy / maxVy)
end

-- Обязательная функция обработки событий
function callback (event)
end

-- Создание таймера, вызывающего функцию каждую 0.1 секунды
getVelocityTimer = Timer.new(0.1, function () getVelocity() end)
-- Запуск таймера
getVelocityTimer:start()
