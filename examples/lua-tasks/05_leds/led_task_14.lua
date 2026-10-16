local unpack = table.unpack
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function changeColor(col)
    for i=0, ledNumber - 1, 1 do
        leds:set(i, unpack(col))
    end
end

-- Задание 14: Сигнал SOS (... --- ...)
-- 0.2s - точка, 0.6s - тире, 0.2s - пауза между сигналами, 2.0s - пауза между словами

-- Глобальные переменные состояния
t14_sequence = {
    {1, 0.2}, {0, 0.2}, {1, 0.2}, {0, 0.2}, {1, 0.2}, {0, 0.2}, -- ...
    {1, 0.6}, {0, 0.2}, {1, 0.6}, {0, 0.2}, {1, 0.6}, {0, 0.2}, -- ---
    {1, 0.2}, {0, 0.2}, {1, 0.2}, {0, 0.2}, {1, 0.2}, {0, 2.0}  -- ...
}
t14_step = 1

-- Используем рекурсивный callLater, сохраняя ссылку в глобальную переменную
function playNextStep()
    if t14_step > #t14_sequence then t14_step = 1 end
    
    local state = t14_sequence[t14_step][1]
    local duration = t14_sequence[t14_step][2]
    
    if state == 1 then
        changeColor({1, 1, 1})
    else
        changeColor({0, 0, 0})
    end
    
    t14_step = t14_step + 1
    
    -- Сохраняем таймер в глобальную переменную
    t14_timer = Timer.callLater(duration, playNextStep)
end

playNextStep()

function callback(event)
end
