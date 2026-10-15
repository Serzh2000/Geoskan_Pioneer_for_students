-- Патруль между двумя точками с аварийными реакциями
local ledNumber = 29
local leds = Ledbar.new(ledNumber)
local points = {{1, 0, 1}, {-1, 0, 1}}
local curr = 1
local state = "TAKEOFF"                     -- TAKEOFF -> PATROL -> LANDING; при ударе EMERGENCY
local lowBattery = false                    -- разряд пришёл, пока дрон взлетал

local function fill(r, g, b)
  for i = 0, ledNumber - 1 do leds:set(i, r, g, b) end
end

local function nextPoint()
  ap.goToLocalPoint(table.unpack(points[curr]))
  curr = curr % #points + 1                 -- 1 -> 2 -> 1 -> ...
end

local function land()
  state = "LANDING"
  fill(1, 0, 0)
  ap.push(Ev.MCE_LANDING)                   -- садимся там, где летим
end

function callback(event)
  if event == Ev.SHOCK then                 -- удар в любом состоянии: немедленно выключить моторы
    state = "EMERGENCY"
    fill(1, 0, 0)
    ap.push(Ev.ENGINES_DISARM)
  elseif event == Ev.TAKEOFF_COMPLETE and state == "TAKEOFF" then
    if lowBattery then
      land()                                -- батарея села ещё на взлёте: маршрут не начинаем
    else
      state = "PATROL"
      fill(0, 1, 0)                         -- зелёный: патрулируем
      nextPoint()
    end
  elseif event == Ev.POINT_REACHED and state == "PATROL" then
    nextPoint()
  elseif event == Ev.LOW_VOLTAGE2 then
    if state == "PATROL" then
      land()                                -- батарея садится: прекращаем маршрут
    elseif state == "TAKEOFF" then
      lowBattery = true                     -- посадку во время взлёта автопилот не примет: сядем после него
      fill(1, 0, 0)
    end                                     -- в LANDING и EMERGENCY повторное событие ничего не меняет
  end
end

ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)
