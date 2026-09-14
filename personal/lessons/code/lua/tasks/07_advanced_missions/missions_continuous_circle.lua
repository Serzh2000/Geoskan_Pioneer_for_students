local ledNumber = 29                        -- количество диодов
local leds = Ledbar.new(ledNumber)         -- объект управления линейкой
local unpack = table.unpack                -- распаковка таблиц
local curr_state = "PREPARE_FLIGHT"        -- начальное состояние

local function changeColor(color)          -- смена цвета всех диодов
  for i=0, ledNumber - 1 do                -- индексы 0..(ledNumber-1)
    leds:set(i, unpack(color))             -- установить RGB
  end
end

local colors = {                           -- палитра
  {1,0,0}, {1,1,1}, {0,1,0}, {1,1,0},
  {1,0,1}, {0,0,1}, {0,0,0}
}

local value = 3                            -- шаг увеличения угла (градусы)
local i = 0                                -- текущий угол для yaw
angleT = Timer.new(0.1, function()         -- таймер курса
  ap.updateYaw(-i/180*math.pi)             -- курс в радианах
  i = i + value                            -- приращение угла курса
end)

local r = 0.3                              -- радиус окружности
local angle = 0                            -- текущий угол точки
local xCord = 0                            -- текущая X координата
local yCord = 0                            -- текущая Y координата
local height = 0.7                         -- высота полёта
pointT = Timer.new(0.1, function()         -- таймер точки
  angle = angle + value                    -- приращение угла
  if angle > 360 then angle = angle - 360 end -- нормализация
  yCord = r*math.sin(angle * math.pi / 180)   -- расчёт Y
  xCord = r*math.cos(angle * math.pi / 180)   -- расчёт X
  ap.goToLocalPoint(xCord, yCord, height)  -- команда полёта
end)

action = {                                 -- таблица состояний
  ["PREPARE_FLIGHT"] = function(x)         -- подготовка полёта
    changeColor(colors[2])                 -- белый
    Timer.callLater(2, function () ap.push(Ev.MCE_PREFLIGHT) end) -- предстарт
    Timer.callLater(4, function () changeColor(colors[3]) end)    -- зелёный
    Timer.callLater(6, function ()        -- через 6 секунд
      ap.push(Ev.MCE_TAKEOFF)             -- взлёт
      ap.goToLocalPoint(0,0,height)       -- выход в центр
      curr_state = "FLIGHT_TO_FIRST_POINT" -- переход к полёту
    end)
  end,
  ["FLIGHT_TO_FIRST_POINT"] = function (x) -- полёт к первой точке
    changeColor(colors[4])                 -- жёлтый
    Timer.callLater(1, function ()         -- через 1 секунду
      angleT:start()                       -- запуск курса
      pointT:start()                       -- запуск траектории
      sleep(6)                             -- блокирующая задержка (не рекомендуется)
      curr_state = "PIONEER_LANDING"       -- переход к посадке
    end)
  end,
  ["PIONEER_LANDING"] = function (x)       -- состояние посадки
    changeColor(colors[2])                 -- белый
    Timer.callLater(2, function ()         -- через 2 секунды
      pointT:stop()                        -- остановить таймер точки
      angleT:stop()                        -- остановить таймер курса
      ap.goToLocalPoint(0, 0, height)      -- возврат в центр
      ap.push(Ev.MCE_LANDING)              -- посадка
    end)
  end
}

-- вызов функции из таблицы состояний, соответствующей первому состоянию
action[curr_state]()

function callback(event)
end
