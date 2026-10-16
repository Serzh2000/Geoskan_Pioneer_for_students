-- LOW_VOLTAGE2: останов миссии, посадка, индикация
local ledNumber = 29                         -- размер буфера линейки
local leds = Ledbar.new(ledNumber)           -- объект управления линейкой
function callback(event)                     -- обработчик событий
  if event == Ev.LOW_VOLTAGE2 then           -- событие: низкое напряжение
    if pointT then pointT:stop() end         -- останов таймера миссии, если есть
    for i=0, ledNumber-1 do                  -- индексы 0..28
      leds:set(i, 1, 0, 0)                   -- красный цвет
    end
    ap.goToLocalPoint(0, 0, 0.8)             -- безопасная точка перед посадкой
    ap.push(Ev.MCE_LANDING)                  -- команда посадки
  end
end
