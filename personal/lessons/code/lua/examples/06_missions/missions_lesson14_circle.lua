-- Непрерывный полёт по окружности: точка и курс обновляются таймером
local ledNumber = 29
local leds = Ledbar.new(ledNumber)
local unpack = table.unpack

local function changeColor(color)
  for i = 0, ledNumber - 1 do leds:set(i, unpack(color)) end
end

local colors = {
  red = {1, 0, 0}, white = {1, 1, 1}, yellow = {1, 1, 0},
  purple = {1, 0, 1}, blue = {0, 0, 1}, off = {0, 0, 0}
}

local r = 0.5                              -- радиус, м
local height = 0.8                         -- высота, м
local step = 3                             -- градусов за тик
local angle = 0
local state = "PREPARE"                    -- PREPARE -> TO_CIRCLE -> CIRCLE -> RETURN -> LANDING; при ударе EMERGENCY

local function near(x, y, z)               -- дрон действительно в точке? допуск 0.2 м
  local px, py, pz = Sensors.lpsPosition()
  return math.sqrt((px - x)^2 + (py - y)^2 + (pz - z)^2) < 0.2
end

circleTimer = Timer.new(0.1, function()
  if state ~= "CIRCLE" then return end     -- лишний тик после stop() не должен затереть возврат в центр
  angle = (angle + step) % 360
  local rad = math.rad(angle)
  ap.updateYaw(rad + math.pi / 2)          -- нос по касательной к окружности
  ap.goToLocalPoint(r * math.cos(rad), r * math.sin(rad), height)
end)

function callback(event)
  if event == Ev.TAKEOFF_COMPLETE and state == "PREPARE" then
    state = "TO_CIRCLE"
    changeColor(colors.yellow)             -- жёлтый: выходим на окружность
    ap.goToLocalPoint(r, 0, height)
  elseif event == Ev.POINT_REACHED and state == "TO_CIRCLE" then
    state = "CIRCLE"
    changeColor(colors.purple)             -- фиолетовый: кружим
    circleTimer:start()
    Timer.callLater(12, function()         -- один круг: 360 / 3 шага * 0.1 с
      if state ~= "CIRCLE" then return end -- после аварии круг уже прерван
      circleTimer:stop()
      state = "RETURN"
      changeColor(colors.blue)             -- синий: возвращаемся в центр
      ap.goToLocalPoint(0, 0, height)
    end)
  elseif event == Ev.POINT_REACHED and state == "RETURN" and near(0, 0, height) then
    state = "LANDING"
    ap.push(Ev.MCE_LANDING)
  elseif event == Ev.COPTER_LANDED and state == "LANDING" then
    changeColor(colors.off)
  elseif event == Ev.SHOCK then
    state = "EMERGENCY"                    -- никакие таймеры и события больше не ведут маршрут
    circleTimer:stop()
    changeColor(colors.red)                -- авария: красный и выключить моторы
    ap.push(Ev.ENGINES_DISARM)
  end
end

changeColor(colors.white)                  -- белый: предстарт
ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end)
