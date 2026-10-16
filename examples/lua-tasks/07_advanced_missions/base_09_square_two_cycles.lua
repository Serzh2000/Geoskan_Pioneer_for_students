-- Квадрат: два цикла, затем посадка
local a, z = 1.0, 0.9                          -- длина стороны и высота
local h = a/2                                   -- половина стороны
local points = {                                -- вершины квадрата
  {-h, -h, z}, {h, -h, z}, {h, h, z}, {-h, h, z}
}
local curr, cycle = 1, 0                        -- текущая вершина и номер цикла
function nextPoint()                             -- переход к следующей точке
  if curr <= #points then                        -- если внутри цикла
    ap.goToLocalPoint(table.unpack(points[curr]))-- команда на точку
    curr = curr + 1                              -- следующая вершина
  else                                           -- завершён обход
    curr = 1                                     -- сброс индекса
    cycle = cycle + 1                            -- увеличить номер цикла
    if cycle < 2 then                            -- если нужно ещё один цикл
      ap.goToLocalPoint(table.unpack(points[curr]))
      curr = curr + 1
    else                                         -- два цикла выполнены
      ap.push(Ev.MCE_LANDING)                    -- посадка
    end
  end
end
ap.push(Ev.MCE_PREFLIGHT)                        -- предстарт
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
function callback(event)                          -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then Timer.callLater(2, nextPoint) end     -- старт после стабилизации
  if event == Ev.POINT_REACHED then nextPoint() end        -- переход по достижению
end
