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
local angle = 0                            -- текущий угол точки (градусы)
local r = 0.5                              -- радиус окружности (метры)
local height = 0.8                         -- высота полёта (метры)

pointT = Timer.new(0.1, function()         -- таймер движения по траектории
  angle = angle + value                    -- приращение угла
  if angle > 360 then angle = angle - 360 end -- нормализация
  
  local xCord = r * math.cos(angle * math.pi / 180)   -- расчёт X
  local yCord = r * math.sin(angle * math.pi / 180)   -- расчёт Y
  
  -- Для полёта "головой вперед" курс должен быть касательным к окружности.
  -- Касательный угол ψ = angle + 90 градусов.
  local yaw = (angle + 90) * math.pi / 180
  
  ap.updateYaw(yaw)                        -- установка курса
  ap.goToLocalPoint(xCord, yCord, height)  -- команда полёта в точку
end)

action = {                                 -- таблица состояний
  ["PREPARE_FLIGHT"] = function(x)         -- подготовка полёта
    changeColor(colors[2])                 -- белый
    Timer.callLater(2, function () ap.push(Ev.MCE_PREFLIGHT) end) -- предстарт
    Timer.callLater(4, function () changeColor(colors[3]) end)    -- зелёный
    Timer.callLater(6, function ()        -- через 6 секунд
      ap.push(Ev.MCE_TAKEOFF)             -- взлёт
      ap.goToLocalPoint(0,0,height)       -- выход в центр
      curr_state = "FLIGHT_TO_CIRCLE"     -- переход к полёту
    end)
  end,
  ["FLIGHT_TO_CIRCLE"] = function (x)      -- выход на начальную точку круга
    changeColor(colors[4])                 -- жёлтый
    local startX = r * math.cos(0)
    local startY = r * math.sin(0)
    ap.goToLocalPoint(startX, startY, height) -- летим в (r, 0)
    curr_state = "CIRCLE_FLIGHT"           -- ждем POINT_REACHED
  end,
  ["CIRCLE_FLIGHT"] = function (x)         -- полёт по кругу
    changeColor(colors[5])                 -- фиолетовый
    curr_state = "FLYING_CIRCLE"           -- меняем состояние, чтобы не реагировать на POINT_REACHED
    pointT:start()                         -- запуск таймера траектории
    Timer.callLater(12, function ()        -- летим один полный круг (360/3 * 0.1 = 12с)
      curr_state = "PIONEER_LANDING"       -- переход к посадке
      action[curr_state]()                 -- запуск логики посадки
    end)
  end,
  ["FLYING_CIRCLE"] = function (x)         -- пустое состояние, чтобы игнорировать POINT_REACHED
  end,
  ["PIONEER_LANDING"] = function (x)       -- состояние посадки
    changeColor(colors[2])                 -- белый
    pointT:stop()                          -- остановить таймер точки
    ap.goToLocalPoint(0, 0, height)        -- возврат в центр
    Timer.callLater(2, function ()         -- через 2 секунды
      ap.push(Ev.MCE_LANDING)              -- посадка
    end)
  end
}

function callback(event)                   -- обработчик системных событий
  if (event == Ev.TAKEOFF_COMPLETE) then action[curr_state]() end -- запуск логики
  if (event == Ev.SHOCK) then              -- авария
    changeColor(colors[1])                 -- красный
    pointT:stop()                          -- останов таймера траектории
  end
  if (event == Ev.POINT_REACHED) then action[curr_state]() end -- шаг логики
  if (event == Ev.COPTER_LANDED) then changeColor(colors[7]) end -- выключение индикации
end

changeColor(colors[1])                     -- начальный красный цвет
Timer.callLater(2, function () action[curr_state]() end) -- старт автомата через 2с
