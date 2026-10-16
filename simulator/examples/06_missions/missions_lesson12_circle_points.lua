-- Полёт по окружности из 12 точек с индикацией этапов
local ledNumber = 29
local leds = Ledbar.new(ledNumber)
local unpack = table.unpack

local function changeColor(color)
  for i = 0, ledNumber - 1 do leds:set(i, unpack(color)) end
end

local colors = {
  red = {1, 0, 0}, white = {1, 1, 1}, green = {0, 1, 0},
  blue = {0, 0, 1}, off = {0, 0, 0}
}

-- точки окружности: 12 штук через 30 град.
local r = 0.5
local height = 0.8
local points = {}
for i = 1, 12 do
  local a = math.rad(i * 30)
  points[i] = {r * math.cos(a), r * math.sin(a), height}
end

local curr_point = 1
local state = "PREPARE"                    -- PREPARE -> FLIGHT -> LANDING; при ударе EMERGENCY

local function nextPoint()
  if curr_point <= #points then
    ap.goToLocalPoint(unpack(points[curr_point]))
    curr_point = curr_point + 1
  else
    state = "LANDING"
    changeColor(colors.blue)               -- синий: садимся
    ap.push(Ev.MCE_LANDING)
  end
end

function callback(event)
  if event == Ev.TAKEOFF_COMPLETE and state == "PREPARE" then
    state = "FLIGHT"
    changeColor(colors.green)              -- зелёный: маршрут
    nextPoint()
  end
  if event == Ev.POINT_REACHED and state == "FLIGHT" then
    nextPoint()
  end
  if event == Ev.COPTER_LANDED and state == "LANDING" then
    changeColor(colors.off)                -- сели: погасить
  end
  if event == Ev.SHOCK then
    state = "EMERGENCY"                    -- маршрут больше не продолжаем
    changeColor(colors.red)                -- авария: красный и выключить моторы
    ap.push(Ev.ENGINES_DISARM)
  end
end

changeColor(colors.red)                    -- красный: программа загружена
Timer.callLater(2, function()
  changeColor(colors.white)                -- белый: предстарт
  ap.push(Ev.MCE_PREFLIGHT)
end)
Timer.callLater(4, function() ap.push(Ev.MCE_TAKEOFF) end)
