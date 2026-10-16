-- Многоугольник: N равномерных точек окружности, переходы по POINT_REACHED
local N, r, z = 8, 0.6, 0.9                   -- число вершин, радиус и высота
local points = {}                              -- массив точек траектории
for i=1, N do                                  -- цикл формирования точек
  local a = (i-1) * 360/N                      -- угол в градусах (равномерно по кругу)
  local th = a * math.pi / 180                 -- перевод в радианы
  points[i] = {r*math.cos(th), r*math.sin(th), z} -- координаты (x,y,z)
end
local curr = 1                                 -- индекс текущей точки
ap.push(Ev.MCE_PREFLIGHT)                      -- предстарт
Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт через 2с
function callback(event)                        -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then          -- после взлёта
    Timer.callLater(2, function()                -- стабилизация
      ap.goToLocalPoint(table.unpack(points[curr])) -- первая точка
    end)
  end
  if event == Ev.POINT_REACHED then             -- точка достигнута
    curr = curr + 1                             -- переходим к следующей
    if curr <= #points then                     -- если ещё есть точки
      ap.goToLocalPoint(table.unpack(points[curr])) -- летим далее
    else
      ap.push(Ev.MCE_LANDING)                   -- иначе — посадка
    end
  end
end
