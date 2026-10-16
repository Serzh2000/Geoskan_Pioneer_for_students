local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function fill(r, g, b)
  for i = 0, ledNumber - 1 do leds:set(i, r, g, b) end
end

fill(1, 1, 1)                                   -- белый: подготовка
ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)

function callback(event)
  if event == Ev.TAKEOFF_COMPLETE then
    fill(0, 1, 0)                               -- зелёный: летим к точке
    ap.goToLocalPoint(0, 0.5, 0.8)
  end
  if event == Ev.POINT_REACHED then
    fill(0, 0, 1)                               -- синий: садимся
    ap.push(Ev.MCE_LANDING)
  end
  if event == Ev.COPTER_LANDED then
    fill(0, 0, 0)                               -- сели: погасить
  end
end
