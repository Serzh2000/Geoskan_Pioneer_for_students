-- LED2 red: a periodic callback ran BEFORE explicit :start().
-- LED1 red: a callback ran AFTER :stop() returned (queued tail).
-- LED3 green: observation window finished. No motor commands.
local leds = Ledbar.new(4)
local started, stopped, hits = false, false, 0
for i = 0, 3 do leds:set(i, 0, 0, 0) end
local timer = Timer.new(0.25, function()
    hits = hits + 1
    if not started then leds:set(2, 1, 0, 0) end
    if stopped then leds:set(1, 1, 0, 0) end
    leds:set(0, 0, (hits % 4) / 3, 0)
    if type(print) == "function" then print("TICK", time(), hits, stopped) end
end)
Timer.callLater(1, function() started = true; timer:start() end)
Timer.callLater(1.6, function()
    timer:stop()
    stopped = true
    if type(print) == "function" then print("STOP", time(), hits) end
end)
Timer.callLater(2.5, function() leds:set(3, 0, 1, 0) end)
function callback(event) end
