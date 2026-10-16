-- Спираль подъёма: радиус растёт, высота увеличивается линейно
local r, z = 0.1, 0.7                      -- начальный радиус и высота
local dr, dz = 0.01, 0.01                  -- приращения радиуса и высоты на тик
local angle = 0                            -- угол в градусах
local z_max = 1.2                          -- целевая высота завершения
pointT = Timer.new(0.1, function()         -- периодический таймер
  r = r + dr                                -- увеличиваем радиус
  z = z + dz                                -- увеличиваем высоту
  angle = (angle + 8) % 360                 -- вращаемся по кругу
  local th = angle * math.pi / 180          -- радианы
  local x = r * math.cos(th)                -- X
  local y = r * math.sin(th)                -- Y
  ap.goToLocalPoint(x, y, z)                -- обновляем точку полёта
  if z >= z_max then                        -- достигли верхней границы
    pointT:stop()                           -- останов таймера
    ap.goToLocalPoint(0, 0, z)              -- возврат к центру
    ap.push(Ev.MCE_LANDING)                 -- посадка
  end
end)
ap.push(Ev.MCE_PREFLIGHT)                   -- предстарт
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
function callback(event)
  if event == Ev.TAKEOFF_COMPLETE then
    Timer.callLater(2, function() pointT:start() end) -- стабилизация
  end
end
