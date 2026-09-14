-- «Проверка точности»: измерение времени между достижениями точек
local N, r, z = 8, 0.5, 0.8                 -- число точек, радиус, высота
local points, curr, tprev = {}, 1, nil      -- массив точек, индекс, предыдущее время
for i=1,N do                                 -- генерация точек окружности
  local a = (i-1) * 360/N                    -- угол в градусах
  local th = a * math.pi / 180               -- радианы
  points[i] = {r*math.cos(th), r*math.sin(th), z} -- координаты (x,y,z)
end
function callback(event)                      -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then        -- старт после взлёта
    Timer.callLater(2, function()              -- стабилизация
      ap.goToLocalPoint(table.unpack(points[curr])) -- первая точка
    end)
  end
  if event == Ev.POINT_REACHED then           -- точка достигнута
    local now = os.clock()                    -- текущее время
    if tprev then print("Δt=", now - tprev) end -- печать интервала
    tprev = now                               -- обновить tprev
    curr = curr % N + 1                       -- следующая точка по кругу
    ap.goToLocalPoint(table.unpack(points[curr])) -- команда на следующую
  end
end
