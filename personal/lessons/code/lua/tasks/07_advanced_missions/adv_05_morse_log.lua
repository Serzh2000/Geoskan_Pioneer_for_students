-- «Морзянка» этапов миссии на линейке
local leds = Ledbar.new(29)                 -- объект управления линейкой
local function blink(times, r,g,b)          -- мигание times раз цветом (r,g,b)
  local i = 0                               -- счётчик состояний
  local function step()                     -- шаг мигания (внутренняя функция)
    i = i + 1                               -- инкремент
    for j=0,28 do                           -- проход по индексам 0..28
      leds:set(j, (i%2==1) and r or 0, (i%2==1) and g or 0, (i%2==1) and b or 0) -- включить/выключить
    end
    if i < times*2 then                     -- пока не завершили все включения/выключения
      Timer.callLater(0.2, step)            -- запланировать следующий шаг
    end
  end
  Timer.callLater(0.1, step)                -- старт первого шага
end

function callback(event)
end
