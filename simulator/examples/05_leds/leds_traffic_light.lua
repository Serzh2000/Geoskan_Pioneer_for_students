local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function fill(color)
  for i = 0, ledNumber - 1 do leds:set(i, table.unpack(color)) end
end

-- состояния автомата и цвет каждого из них
local colors = {RED = {1, 0, 0}, YELLOW = {1, 1, 0}, GREEN = {0, 1, 0}}
-- таблица переходов: из какого состояния в какое
local nextState = {RED = "YELLOW", YELLOW = "GREEN", GREEN = "RED"}

state = "RED"                              -- текущее состояние (глобальная переменная)
fill(colors[state])

trafficTimer = Timer.new(2, function()     -- событие "прошло 2 секунды"
  state = nextState[state]                 -- переход в следующее состояние
  fill(colors[state])                      -- действие нового состояния
end)
trafficTimer:start()

function callback(event)
end
