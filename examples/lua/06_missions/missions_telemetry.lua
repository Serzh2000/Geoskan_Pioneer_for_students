-- Телеметрия: цель, измерение, ошибка, допуск и причина остановки
local target = {2, 0, 1}                  -- цель x, y, z, м
local tolerance = 0.15                    -- допуск прибытия, м
local timeout = 20                        -- предел ожидания перелёта, с
local arrived = false

local function report(label)              -- строка журнала: подпись и измерение
  local x, y, z = Sensors.lpsPosition()
  print(string.format("%s: %.2f, %.2f, %.2f", label, x, y, z))
end

-- раз в 0.5 с: ошибка по X = цель минус измерение
measureTimer = Timer.new(0.5, function()
  local x = Sensors.lpsPosition()         -- первое из трёх чисел — x
  print(string.format("Ошибка X: %.2f", target[1] - x))
end)

report("Старт")
ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)

-- тайм-аут перелёта: цель не достигнута вовремя — называем причину и садимся
local function onTimeout()
  if not arrived then
    measureTimer:stop()
    print("тайм-аут: цель не достигнута за " .. timeout .. " с")
    ap.push(Ev.MCE_LANDING)
  end
end

function callback(event)
  if event == Ev.TAKEOFF_COMPLETE then
    report("После взлёта")
    print(string.format("Цель: %g, %g, %g", target[1], target[2], target[3]))
    ap.goToLocalPoint(target[1], target[2], target[3])
    measureTimer:start()
    Timer.callLater(timeout, onTimeout)   -- отсчёт с начала перелёта
  elseif event == Ev.POINT_REACHED and not arrived then
    arrived = true
    measureTimer:stop()
    report("Прибытие")
    local x = Sensors.lpsPosition()
    if math.abs(target[1] - x) <= tolerance then  -- сравниваем с допуском, а не на равенство
      print("Цель достигнута")
    else
      print("Остановка вне допуска")
    end
    ap.push(Ev.MCE_LANDING)
  elseif event == Ev.COPTER_LANDED then
    report("После посадки")
  end
end
