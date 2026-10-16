-- Восьмёрка: две окружности с противоположным направлением и точкой соединения
local r, z = 0.4, 0.9                        -- радиус и высота
local angle, phase = 0, "FIRST"               -- угол (градусы) и фаза траектории
local centerX, centerY = -0.4, 0.0            -- центр первой окружности
pointT = Timer.new(0.1, function()            -- периодический таймер
  local th = angle * math.pi / 180            -- перевод угла в радианы
  local x = centerX + r * math.cos(th)        -- X с учётом центра
  local y = centerY + r * math.sin(th)        -- Y с учётом центра
  ap.goToLocalPoint(x, y, z)                  -- команда на точку
  angle = angle + (phase=="FIRST" and 6 or -6) -- шаг: вперёд для первой, назад для второй
  if angle >= 360 and phase=="FIRST" then     -- завершение первой окружности
    phase = "SECOND"                          -- переключаемся на вторую
    angle = 0                                 -- сбрасываем угол
    centerX = 0.4; centerY = 0.0              -- центр второй окружности
  elseif angle <= -360 and phase=="SECOND" then-- завершение второй окружности
    pointT:stop()                             -- остановка таймера
    ap.goToLocalPoint(0, 0, z)                -- возврат в центр
    ap.push(Ev.MCE_LANDING)                   -- посадка
  end
end)
ap.push(Ev.MCE_PREFLIGHT)                     -- предстарт
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт через 2с
function callback(event)                      -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then        -- после взлёта
    Timer.callLater(2, function()             -- стабилизация после взлёта
      pointT:start()                          -- запуск траектории восьмёрки
    end)
  end
end
