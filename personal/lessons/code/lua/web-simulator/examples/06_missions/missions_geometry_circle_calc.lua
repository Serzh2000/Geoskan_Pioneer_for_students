local angle = 0          -- угол в градусах
local r = 1.0            -- радиус 1 метр

-- Внутри таймера:
angle = angle + 5        -- шаг 5 градусов
local rad = math.rad(angle)
local x = r * math.cos(rad)
local y = r * math.sin(rad)
ap.goToLocalPoint(x, y, 1.0)
