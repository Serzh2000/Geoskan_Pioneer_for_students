-- LED0 red: inside sleeping callback; blue afterwards = no periodic ticks
-- during sleep; green afterwards = other callbacks progressed during sleep.
local leds = Ledbar.new(4)
local ticks = 0
local periodic = Timer.new(0.1, function() ticks = ticks + 1 end)
periodic:start()
Timer.callLater(0.35, function()
    local before = ticks
    leds:set(0, 1, 0, 0)
    sleep(0.5)
    local advanced = ticks - before
    leds:set(0, 0, advanced > 0 and 1 or 0, advanced == 0 and 1 or 0)
    if type(print) == "function" then print("TICKS_DURING_SLEEP", advanced, time()) end
end)
Timer.callLater(1.5, function() periodic:stop() end)
function callback(event) end
