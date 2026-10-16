local unpack = table.unpack               -- сокращение для распаковки
local points = {                          -- набор точек (маршрут)
  {0.0, 0.5, 0.8}, {0.5, 0.5, 0.8}, {0.5, 0.0, 0.8}, {0.0, 0.0, 0.8}
}
local curr = 1                            -- индекс текущей точки

local function nextPoint()                -- функция перехода к следующей точке
  if curr <= #points then                 -- если есть непройденные точки
    ap.goToLocalPoint(unpack(points[curr])) -- команда полёта
    curr = curr + 1                       -- увеличить индекс
  else
    ap.push(Ev.MCE_LANDING)               -- иначе посадка
  end
end

ap.push(Ev.MCE_PREFLIGHT)                 -- предстарт
Timer.callLater(1, function()             -- через 1 секунду
  ap.push(Ev.MCE_TAKEOFF)                 -- взлёт
end)

function callback(event)                   -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then nextPoint() end -- старт маршрута
  if event == Ev.POINT_REACHED then nextPoint() end    -- шаг по достижению точки
end
