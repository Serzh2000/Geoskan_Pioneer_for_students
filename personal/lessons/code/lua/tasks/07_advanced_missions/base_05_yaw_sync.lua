-- Сопровождение yaw синхронизировано с окружностью
local r, z, angle = 0.3, 0.8, 0             -- радиус, высота, угол (градусы)
pointT = Timer.new(0.1, function()           -- периодический таймер
  angle = (angle + 10) % 360                 -- приращение угла
  ap.updateYaw(angle * math.pi / 180)        -- курс в радианах
  local th = angle * math.pi / 180           -- радианы для координат
  local x = r * math.cos(th)                 -- X траектории
  local y = r * math.sin(th)                 -- Y траектории
  ap.goToLocalPoint(x, y, z)                 -- команда на точку (x,y,z)
end)
ap.push(Ev.MCE_PREFLIGHT)                    -- предстарт
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
function callback(event)
  if event == Ev.TAKEOFF_COMPLETE then
    Timer.callLater(2, function() pointT:start() end) -- стабилизация
  end
end
