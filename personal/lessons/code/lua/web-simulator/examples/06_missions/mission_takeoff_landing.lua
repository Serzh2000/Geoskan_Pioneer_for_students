ap.push(Ev.MCE_PREFLIGHT)                 -- предстарт
Timer.callLater(1, function()             -- через 1 секунду
  ap.push(Ev.MCE_TAKEOFF)                 -- инициировать взлёт
end)

function callback(event)                   -- обработчик системных событий
  if event == Ev.TAKEOFF_COMPLETE then     -- взлёт завершён
    ap.push(Ev.MCE_LANDING)                -- выполнить посадку
  end
  if event == Ev.COPTER_LANDED then        -- посадка завершена
    ap.push(Ev.ENGINES_DISARM)             -- выключить двигатели
  end
end
