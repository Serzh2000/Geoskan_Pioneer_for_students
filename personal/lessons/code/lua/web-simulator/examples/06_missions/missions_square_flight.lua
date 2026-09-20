local unpack = table.unpack               -- распаковка таблиц
local a = 1.0                             -- длина стороны квадрата
local z = 0.9                             -- высота полёта
local h = a/2                             -- половина стороны (координаты ±h)
local points = {                          -- вершины квадрата по часовой стрелке
  {-h, -h, z}, {h, -h, z}, {h,  h, z}, {-h,  h, z}
}
local curr = 1                            -- индекс текущей вершины
local function nextPoint()                -- переход к следующей вершине
  if curr <= #points then                 -- если есть вершины
    ap.goToLocalPoint(unpack(points[curr])) -- полёт к вершине
    curr = curr + 1                       -- увеличить индекс
  else
    ap.push(Ev.MCE_LANDING)               -- завершение — посадка
  end
end
ap.push(Ev.MCE_PREFLIGHT)                 -- предстарт
Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
function callback(event)                   -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then nextPoint() end     -- первый шаг
  if event == Ev.POINT_REACHED then nextPoint() end        -- шаг по достижению
end
