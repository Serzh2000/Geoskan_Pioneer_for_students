local value = 3                           -- шаг приращения угла (градусы)
local i = 0                               -- текущий угол для курса
angleT = Timer.new(0.1, function()        -- таймер обновления курса
  ap.updateYaw(-i/180*math.pi)            -- курс в радианах (из градусов i)
  i = i + value                           -- приращение угла курса
end)

local r = 0.3                             -- радиус окружности
local angle = 0                           -- текущий угол точки (градусы)
local height = 0.7                        -- высота полёта
pointT = Timer.new(0.1, function()        -- таймер обновления точки
  angle = (angle + value) % 360           -- приращение угла точки
  local x = r*math.cos(angle * math.pi / 180) -- X по окружности
  local y = r*math.sin(angle * math.pi / 180) -- Y по окружности
  ap.goToLocalPoint(x, y, height)         -- команда на точку
end)

ap.push(Ev.MCE_PREFLIGHT)                 -- предстарт
Timer.callLater(2, function ()            -- через 2 секунды
  ap.push(Ev.MCE_TAKEOFF)                 -- взлёт
end)

function callback(event)                   -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then     -- после взлёта
    angleT:start()                         -- запуск таймера курса
    pointT:start()                         -- запуск таймера точки
    Timer.callLater(6, function ()         -- завершить через 6 секунд
      pointT:stop()                        -- остановить таймер точки
      angleT:stop()                        -- остановить таймер курса
      ap.goToLocalPoint(0, 0, height)      -- вернуться в центр
      ap.push(Ev.MCE_LANDING)              -- посадка
    end)
  end
end
