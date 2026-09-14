-- Демонстрация: старт по RC, окружность ~2 минуты, посадка, отчёт индикацией
local rc = Sensors.rc                        -- чтение RC-каналов
local leds = Ledbar.new(29)                  -- объект управления линейкой
local function setAll(r,g,b)                 -- утилита установки цвета
  for i=0,28 do leds:set(i,r,g,b) end
end
local running, angle, r, z = false, 0, 0.3, 0.8 -- флаг, угол, радиус, высота
pointT = Timer.new(0.1, function()           -- таймер окружности
  angle = (angle + 6) % 360                  -- приращение угла
  local th = angle * math.pi / 180           -- радианы
  ap.goToLocalPoint(r*math.cos(th), r*math.sin(th), z) -- команда полёта
end)
startTimer = Timer.new(0.5, function()       -- опрос RC раз в 0.5с
  local chans = table.pack(rc())             -- считать каналы
  if chans[8] > 0 and not running then       -- старт по тумблеру
    running = true                           -- установить флаг
    setAll(1,1,1)                            -- белый: подготовка
    ap.push(Ev.MCE_PREFLIGHT)                -- предстарт
    Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт через 2с
  elseif running and angle >= 6*60*2 then    -- прошло ~2 минуты при 6°/тик
    pointT:stop()                            -- останов таймера
    setAll(1,1,0)                            -- жёлтый: посадка
    ap.goToLocalPoint(0,0,z)                 -- возврат в центр
    ap.push(Ev.MCE_LANDING)                  -- посадка
    running = false                          -- снять флаг
  end
end)
startTimer:start()                           -- запуск опроса RC

function callback(event)
end
