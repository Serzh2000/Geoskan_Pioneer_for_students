local unpack = table.unpack
local points = {{0, 2, 1}, {0, 1, 1}, {0, 2, 1}, {0, 1, 1}} -- маршрут
local curr_point = 1
local started = false                      -- миссия уже запущена?

local function nextPoint()
  if curr_point <= #points then
    ap.goToLocalPoint(unpack(points[curr_point]))
    curr_point = curr_point + 1
  else
    ap.push(Ev.MCE_LANDING)                -- точки кончились — посадка
  end
end

function callback(event)
  if event == Ev.TAKEOFF_COMPLETE then Timer.callLater(1, nextPoint) end
  if event == Ev.POINT_REACHED then Timer.callLater(1, nextPoint) end
end

-- опрашиваем тумблер SwA (8-й канал) раз в секунду, пока миссия не запущена
startTimer = Timer.new(1, function()
  local rc_chans = table.pack(Sensors.rc()) -- 8 значений каналов в таблицу
  if rc_chans[8] > 0 and not started then   -- тумблер SwA переключён: значение канала больше нуля
    started = true
    startTimer:stop()                       -- больше не опрашиваем
    ap.push(Ev.MCE_PREFLIGHT)
    Timer.callLater(2, function() ap.push(Ev.MCE_TAKEOFF) end)
  end
end)
startTimer:start()
