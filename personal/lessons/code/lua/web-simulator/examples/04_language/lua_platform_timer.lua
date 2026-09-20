local ledNumber = 29
local leds = Ledbar.new(ledNumber)
for i=0, ledNumber-1 do leds:set(i, 0, 0, 0) end
Timer.callLater(3, function ()
  for i=0, ledNumber-1 do leds:set(i, 0, 0, 1) end
end)
function callback(event)
end
