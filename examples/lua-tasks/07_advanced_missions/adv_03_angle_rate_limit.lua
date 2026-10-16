-- Ограничение максимальной скорости изменения угла окружности
local angle, maxStep = 0, 10                 -- текущий угол и максимальный шаг (градусы)
function advanceAngle(requestedStep)         -- функция безопасного приращения
  local step = math.max(-maxStep, math.min(maxStep, requestedStep)) -- ограничение шага
  angle = (angle + step) % 360               -- обновление угла с нормализацией
  return angle                               -- вернуть новый угол
end
 
