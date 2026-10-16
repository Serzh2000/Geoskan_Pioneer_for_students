-- Loiter: небольшая окружность r=0.2 на фиксированной высоте
local r, z, angle = 0.2, 0.8, 0             -- радиус, высота, угол
pointT = Timer.new(0.1, function()           -- периодический таймер
  angle = (angle + 6) % 360                  -- приращение угла
  local th = angle * math.pi / 180           -- радианы
  ap.goToLocalPoint(r*math.cos(th), r*math.sin(th), z) -- команда полёта
end)
ap.push(Ev.MCE_PREFLIGHT)                    -- предстарт
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
function callback(event)                      -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then        -- старт после взлёта
    Timer.callLater(2, function()             -- стабилизация
      pointT:start()                          -- включить удержание по кругу
    end)
  end
end
