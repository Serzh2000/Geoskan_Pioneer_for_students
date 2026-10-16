local unpack = table.unpack               -- распаковка таблицы
local r = 0.6                             -- радиус описанной окружности
local z = 0.9                             -- высота полёта
local angles = {0, 120, 240}              -- углы вершин (градусы)
local points = {}                         -- массив координат вершин
for i=1, #angles do                       -- вычисление координат
  local a = angles[i] * math.pi / 180     -- радианы
  points[i] = {r*math.cos(a), r*math.sin(a), z} -- (x,y,z) вершины
end
local curr = 1                            -- текущая вершина
local function nextPoint()                -- переход к следующей
  if curr <= #points then                 -- если есть вершины
    ap.goToLocalPoint(unpack(points[curr])) -- команда полёта
    curr = curr + 1                       -- увеличить индекс
  else
    ap.push(Ev.MCE_LANDING)               -- завершение — посадка
  end
end
ap.push(Ev.MCE_PREFLIGHT)                 -- предстарт
Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
function callback(event)                   -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then nextPoint() end     -- первый шаг
  if event == Ev.POINT_REACHED then nextPoint() end        -- шаг по событию
end
