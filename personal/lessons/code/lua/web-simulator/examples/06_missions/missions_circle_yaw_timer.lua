local r = 0.3                             -- радиус окружности, м
local height = 0.7                        -- высота полёта, м
local step = 3                            -- шаг угла за тик, градусы
local angle = 0                           -- текущий угол точки, градусы
local state = "CIRCLE"                    -- CIRCLE -> RETURN -> LANDING

-- дрон действительно в точке (x, y, z)? допуск 0.2 м
local function near(x, y, z)
  local px, py, pz = Sensors.lpsPosition()
  return math.sqrt((px - x)^2 + (py - y)^2 + (pz - z)^2) < 0.2
end

circleTimer = Timer.new(0.1, function()   -- каждые 0.1 с: новая точка и новый курс
  if state ~= "CIRCLE" then return end    -- лишний тик после stop() не должен затереть возврат в центр
  angle = (angle + step) % 360
  local rad = angle * math.pi / 180       -- градусы -> радианы
  ap.updateYaw(rad + math.pi / 2)         -- нос по касательной к окружности
  ap.goToLocalPoint(r * math.cos(rad), r * math.sin(rad), height)
end)

ap.push(Ev.MCE_PREFLIGHT)                 -- предстарт
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт через 2 с

function callback(event)
  if event == Ev.TAKEOFF_COMPLETE then
    circleTimer:start()                   -- начинаем кружить
    Timer.callLater(12, function()        -- один круг: 360 / 3 шага * 0.1 с = 12 с
      circleTimer:stop()
      state = "RETURN"
      ap.goToLocalPoint(0, 0, height)     -- возвращаемся в центр
    end)
  end
  -- садимся только над центром: запоздалый POINT_REACHED точки круга не в счёт
  if event == Ev.POINT_REACHED and state == "RETURN" and near(0, 0, height) then
    state = "LANDING"
    ap.push(Ev.MCE_LANDING)
  end
end
