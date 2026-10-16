-- Перезапуск миссии после события COPTER_LANDED
function callback(event)                     -- обработчик событий
  if event == Ev.COPTER_LANDED then         -- завершена посадка
    Timer.callLater(3, function()           -- перезапуск через 3 секунды
      ap.push(Ev.MCE_TAKEOFF)               -- инициировать новый взлёт
    end)
  end
end
