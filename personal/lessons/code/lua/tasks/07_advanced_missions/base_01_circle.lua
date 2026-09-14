-- Окружность r=0.5, z=1.0, периодическое обновление точки
local r, z = 0.5, 1.0                  -- радиус и высота полёта
local angle = 0                        -- текущий угол в градусах
pointT = Timer.new(0.1, function()     -- периодический таймер 0.1с
  angle = (angle + 5) % 360            -- приращение угла и нормализация 0..359
  local x = r * math.cos(angle * math.pi / 180) -- X по формуле x=r*cos(theta)
  local y = r * math.sin(angle * math.pi / 180) -- Y по формуле y=r*sin(theta)
  ap.goToLocalPoint(x, y, z)           -- команда полёта к локальной точке (x,y,z)
end)
ap.push(Ev.MCE_PREFLIGHT)              -- предстартовая подготовка (без движения)
Timer.callLater(2, function()          -- отложенный вызов через 2 секунды
  ap.push(Ev.MCE_TAKEOFF)              -- команда взлёта до штатной высоты
end)
function callback(event)               -- обработчик системных событий
  if event == Ev.TAKEOFF_COMPLETE then -- событие: взлёт завершён
    Timer.callLater(2, function()      -- стабилизация после взлёта
      pointT:start()                   -- запуск таймера окружности
    end)
  end
end
