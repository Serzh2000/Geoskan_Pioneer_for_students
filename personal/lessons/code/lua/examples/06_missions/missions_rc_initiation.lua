local unpack = table.unpack                -- распаковка таблицы
local rc = Sensors.rc                      -- чтение RC-каналов
local points = {{0,2,1},{0,1,1},{0,2,1},{0,1,1}} -- маршрут по точкам
local curr_point = 1                       -- индекс текущей точки

local function nextPoint()                 -- переход к следующей точке
  if(curr_point <= #points) then           -- если есть точки впереди
    Timer.callLater(1, function()          -- задержка перед командой
      ap.goToLocalPoint(unpack(points[curr_point])) -- команда полёта
      curr_point = curr_point + 1          -- увеличить индекс
    end)
  else
    Timer.callLater(1, function() ap.push(Ev.MCE_LANDING) end) -- посадка
  end
end

function callback(event)                   -- обработчик событий
  if(event == Ev.TAKEOFF_COMPLETE) then Timer.callLater(5, nextPoint) end -- старт
  if(event == Ev.POINT_REACHED) then Timer.callLater(5, nextPoint) end    -- шаг
end

startTimer = Timer.new(1, function()       -- опрос RC каждую секунду
  rc_chans = table.pack(rc())              -- считанные каналы
  if rc_chans[8] > 0 then                  -- тумблер включён
    curr_point = 1                         -- сброс маршрута
    ap.push(Ev.MCE_PREFLIGHT)              -- предстарт
    Timer.callLater(6, function() ap.push(Ev.MCE_TAKEOFF) end) -- взлёт
  end
end)
startTimer:start()                         -- запуск опроса RC
