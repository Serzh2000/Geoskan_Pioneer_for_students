ap.push(Ev.MCE_PREFLIGHT)                 -- безопасная предстартовая подготовка
Timer.callLater(1, function()             -- отложить действие на 1 секунду
  ap.push(Ev.ENGINES_ARM)                 -- команда запуска двигателей (без взлёта)
end)

function callback(event)
end
