-- Авария SHOCK: останов таймеров, красная индикация, выключение двигателей
local ledNumber = 29                         -- размер буфера линейки
local leds = Ledbar.new(ledNumber)           -- объект управления линейкой
function callback(event)                     -- обработчик событий
  if event == Ev.SHOCK then                  -- событие: столкновение/удар
    if pointT then pointT:stop() end         -- останов таймера миссии, если есть
    for i=0, ledNumber-1 do                  -- пройти по всем индексам
      leds:set(i, 1, 0, 0)                   -- включить красный цвет (авария)
    end
    ap.push(Ev.ENGINES_DISARM)               -- выключить двигатели
  end
end
