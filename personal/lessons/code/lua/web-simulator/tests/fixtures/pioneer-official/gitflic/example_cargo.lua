-- инициализация управление модулем груза порт PC15 на плате версии 1.6
local magneto = Gpio.new(Gpio.C, 15, Gpio.OUTPUT)

-- инициализируем управление модулем груза порт PC3 на плате версии 1.2-1.4
-- local magneto = Gpio.new(Gpio.C, 3, Gpio.OUTPUT)

-- инициализируем управление модулем груза порт PA1 на плате версии 1.1
-- local magneto = Gpio.new(Gpio.A, 1, Gpio.OUTPUT)

-- задаем количество светодиодов (4 на базовой плате и еще 4 на модуле груза)
local led_number = 8
-- инициализируем светодиоды
local leds = Ledbar.new(led_number)
local rc = Sensors.rc
local blink = 0
function callback(event)
end

-- функция смены цвета светодиодов
local function changeColor(red, green, blue)
    for i=0, led_number - 1, 1 do
        leds:set(i, red, green, blue)
    end
end

cargoTimer = Timer.new(0.1, function () -- создаем таймер, который будет вызывать нашу функцию 10 раз в секунуду
    _, _, _, _, _, _, _, ch8 = rc() -- считываем сигнал с 8 канала на пульте, значение от -1 до 1
    if(ch8 < 0) then  -- если сигнал с пульта -1 (SWA вверх), то включаем
        magneto:set()
        changeColor(0, 1, 0) -- и сигнализируем об активации зеленым цветом
    else if(ch8 > 0) then -- если сигнал с пульта 1 (SWA вниз), то выключаем
        magneto:reset()
        changeColor(1, 0, 0) -- когда магнит отключен, светодиоды горят красным
    else -- синий мигающий цвет светодиодов сигнализирует об отсутствии сигнала на восьмом канале
        if(blink < 5) then
            changeColor(0, 0, 1)
           blink = blink + 1
        else
            changeColor(0, 0, 0)
            blink = 0
        end
    end
end

end)
 -- запускаем таймер
cargoTimer:start()