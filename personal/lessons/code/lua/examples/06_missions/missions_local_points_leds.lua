local boardNumber = boardNumber            -- номер борта (если используется)
local unpack = table.unpack                -- распаковка таблиц
local points = {                           -- заранее заданные точки
  {-0.6, 0.3, 0.2}, {0.6, 0.3, 0.2}, {0, 0, 0.5}, {0.6, -0.3, 0.2}
}
local curr_point = 1                       -- текущая точка

local function nextPoint()                 -- переход к следующей точке
  if(#points >= curr_point) then           -- есть непройденные точки
    ap.goToLocalPoint(unpack(points[curr_point])) -- полёт к точке
    curr_point = curr_point + 1            -- увеличить индекс
  else
    ap.push(Ev.MCE_LANDING)                -- завершение — посадка
  end
end

function callback(event)                   -- обработчик событий
  if(event == Ev.TAKEOFF_COMPLETE) then nextPoint() end    -- старт маршрута
  if(event == Ev.POINT_REACHED) then nextPoint() end       -- шаг по событию
end

local leds = Ledbar.new(29)                -- объект линейки (буфер 29)
local blink = 0                            -- состояние мигания
for i=0,3 do leds:set(i,1,1,1) end         -- начальный белый цвет
timerBlink = Timer.new(1, function ()      -- таймер мигания, период 1с
  blink = (blink == 1) and 0 or 1          -- переключение состояния
  for i=0,3 do leds:set(i, blink, 0, 0) end  -- мигание красным
end)
timerBlink:start()                         -- запуск мигания
ap.push(Ev.MCE_PREFLIGHT)                  -- предстарт
Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
