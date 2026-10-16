-- RC-тумблер для старта/остановки миссии и безопасной посадки
local rc = Sensors.rc                        -- функция чтения RC-каналов
local running = false                        -- флаг: миссия выполняется
pointT = Timer.new(0.1, function() end)      -- заглушка таймера миссии
startTimer = Timer.new(0.5, function()       -- периодический опрос RC
  local chans = table.pack(rc())             -- считываем каналы
  if chans[8] > 0 and not running then       -- тумблер включён, миссия не запущена
    running = true                           -- выставляем флаг
    ap.push(Ev.MCE_PREFLIGHT)                -- предстарт
    Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
  elseif chans[8] <= 0 and running then      -- тумблер выключен, миссия выполнялась
    running = false                          -- снимаем флаг
    pointT:stop()                            -- останов таймера миссии
    ap.goToLocalPoint(0, 0, 0.8)             -- возврат к центру на безопасной высоте
    ap.push(Ev.MCE_LANDING)                  -- посадка
  end
end)
startTimer:start()                           -- запускаем опрос RC

function callback(event)
end
