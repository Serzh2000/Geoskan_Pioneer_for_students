local r = 1.0                             -- радиус, м
local height = 1.0                        -- высота, м
local angle = 0                           -- текущий угол, градусы
local state = "CIRCLE"                    -- CIRCLE -> RETURN -> LANDING

-- дрон действительно в точке (x, y, z)? допуск 0.2 м
local function near(x, y, z)
  local px, py, pz = Sensors.lpsPosition()
  return math.sqrt((px - x)^2 + (py - y)^2 + (pz - z)^2) < 0.2
end

circleTimer = Timer.new(0.1, function()   -- тик каждые 0.1 с
  if state ~= "CIRCLE" then return end    -- лишний тик после stop() ничего не делает
  if angle >= 360 then                    -- круг пройден
    circleTimer:stop()
    state = "RETURN"
    ap.goToLocalPoint(0, 0, height)       -- возвращаемся в центр
    return
  end
  local rad = math.rad(angle)             -- градусы -> радианы
  ap.goToLocalPoint(r * math.cos(rad), r * math.sin(rad), height)
  angle = angle + 5                       -- шаг 5 град.: полный круг за 72 тика
end)

ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)

function callback(event)
  if event == Ev.TAKEOFF_COMPLETE then
    circleTimer:start()
  end
  -- POINT_REACHED последней точки круга мог прийти уже после перехода в RETURN,
  -- поэтому садимся, только если дрон действительно над центром
  if event == Ev.POINT_REACHED and state == "RETURN" and near(0, 0, height) then
    state = "LANDING"
    ap.push(Ev.MCE_LANDING)               -- центр достигнут — садимся
  end
end
