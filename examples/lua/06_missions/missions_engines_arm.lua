ap.push(Ev.MCE_PREFLIGHT)                 -- подготовка (arm): моторы запускаются, дрон стоит

function callback(event)                   -- обработчик событий
  if event == Ev.ENGINES_STARTED then      -- автопилот подтвердил подготовку
    print("Моторы запущены")
  end
end
