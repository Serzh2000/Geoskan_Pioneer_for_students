local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 5: Светофор (Красный -> Желтый -> Зеленый)
-- Глобальные переменные состояния
colors = {
    {1, 0, 0}, -- Красный
    {1, 1, 0}, -- Желтый
    {0, 1, 0}  -- Зеленый
}
idx = 1

-- Глобальная переменная таймера
t5_timer = Timer.new(1.0, function()
    changeColor(colors[idx])
    idx = idx + 1
    if idx > #colors then idx = 1 end
end)
t5_timer:start()

function callback(event)
end
