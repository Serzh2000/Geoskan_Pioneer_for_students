-- "Окно безопасности": ограничение обновления точки при слишком большом yaw-вкладе
local maxYawRate = math.pi/6               -- максимальная скорость курса (рад/с)
local lastYaw = 0                          -- предыдущий курс (рад)
function safeUpdate(x,y,z, yawRad)         -- безопасное обновление точки
  if math.abs(yawRad - lastYaw) <= maxYawRate * 0.1 then -- ограничение шага за тик
    ap.updateYaw(yawRad)                   -- обновить курс
    ap.goToLocalPoint(x,y,z)               -- задать точку полёта
    lastYaw = yawRad                       -- сохранить курс
  end
end
