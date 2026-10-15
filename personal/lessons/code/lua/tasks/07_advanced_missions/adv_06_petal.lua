-- Траектория "лепесток": r = r0 * (1 + 0.2 * sin(k*theta))
local r0, k, z, angle = 0.4, 3, 0.8, 0      -- базовый радиус, множитель, высота, угол
pointT = Timer.new(0.1, function()          -- периодический таймер
  angle = (angle + 8) % 360                 -- приращение угла
  local theta = angle * math.pi / 180       -- перевод в радианы
  local r = r0 * (1 + 0.2 * math.sin(k * theta)) -- радиус по формуле лепестка
  local x = r * math.cos(theta)             -- X траектории
  local y = r * math.sin(theta)             -- Y траектории
  ap.goToLocalPoint(x, y, z)                -- команда полёта к точке (x,y,z)
end)

function callback(event)
end
