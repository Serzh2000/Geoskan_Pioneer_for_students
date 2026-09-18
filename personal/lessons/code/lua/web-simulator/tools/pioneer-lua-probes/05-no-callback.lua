-- Deliberately omits callback(event). No AP commands: tests only VM lifecycle.
-- LED0 red: main chunk ran. LED0 green: delayed callback ran successfully.
-- Compare with the same script plus an empty callback(event) definition.
local leds = Ledbar.new(4)
leds:set(0, 1, 0, 0)
Timer.callLater(1, function() leds:set(0, 0, 1, 0) end)
