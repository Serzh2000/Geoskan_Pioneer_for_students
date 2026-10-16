-- Динамический радиус окружности по RC7
local rc = Sensors.rc                         -- функция чтения RC-каналов
local z, angle = 0.8, 0                       -- высота и угол (градусы)
pointT = Timer.new(0.1, function()             -- периодический таймер
  local chans = table.pack(rc())               -- считываем каналы
  local norm = math.max(0, math.min(1, (chans[7] or 0))) -- нормализация 0..1
  local r = 0.2 + 0.8 * norm                   -- радиус из канала 7
  angle = (angle + 8) % 360                    -- приращение угла
  local th = angle * math.pi / 180             -- радианы
  ap.goToLocalPoint(r*math.cos(th), r*math.sin(th), z) -- команда полёта
end)

function callback(event)
end
