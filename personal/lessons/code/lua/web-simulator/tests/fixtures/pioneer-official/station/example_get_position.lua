-- Скрипт реализует вывод координат коптера в системе позиционирования

-- Упрощение вызова функции взятия абсолютного значения из модуля math
local abs = math.abs
-- Количество светодиодов на базовой плате
local ledNumber = 4
-- Создание порта управления светодиодами
local leds = Ledbar.new(ledNumber)

-- Максимальное значение координаты ультразвуковой системы навигации по X
local maxX = 3	
-- Максимальное значение координаты ультразвуковой системы навигации по Y 
local maxY = 2.5
-- Максимальное значение координаты ультразвуковой системы навигации по Z
local maxZ = 3.3

-- Функция смены цвета светодиодов в зависимости от оси и яркости
local function changeColor(value, brightness)
	-- Условие проверки оси, для которой задается цвет
    if value == x then -- Если ось X
    	if value > 0 then -- Если координата положительная
    		leds:set(0, 0, brightness, 0) -- Смена цвета светодиода 1 на зеленый
    	else -- Если координата отрицательная
    		leds:set(0, brightness, brightness, 0) -- Смена цвета светодиода 1 на желтый
    	end
    elseif value == y then -- Ось Y
    	if value > 0 then
	    	leds:set(3, 0, 0, brightness) -- Смена цвета светодиода 4 на синий
	    else
	    	leds:set(3, brightness, 0, brightness) -- Смена цвета светодиода 4 на фиолетовый
	    end
	elseif value == z then -- Ось Z
		leds:set(1, brightness, 0, 0) -- Смена цвета светодиода 2 на красный
    	leds:set(2, brightness, 0, 0) -- Смена цвета светодиода 3 на красный
    end
end 

local function getPosition()
    -- Считывание значений положения по 3-м осям
    x, y, z = Sensors.lpsPosition()
    brightnessX, brightnessY, brightnessZ = 0, 0, 0
    -- Вывод координаты по оси X
    brightnessX = 0.5 * abs(x) / maxX -- Яркость светодиода в зависимости от величины координаты
    changeColor(x, brightnessX)		  -- Смена цвета светодиода
    -- Вывод координаты по оси Y
    brightnessY = 0.5 * abs(y) / maxY
    changeColor(y, brightnessY)
    -- Вывод координаты по оси Z
    brightnessZ = 0.5 * z / maxZ
    changeColor(z, brightnessZ)
end

-- Обязательная функция обработки событий
function callback (event)
end

-- Создание таймера, вызывающего функцию каждую 0.1 секунды
getPositionTimer = Timer.new(0.1, function() getPosition() end)
-- Запуск таймера
getPositionTimer:start()
