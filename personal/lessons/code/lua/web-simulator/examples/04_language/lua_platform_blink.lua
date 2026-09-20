local ledNumber = 29
local leds = Ledbar.new(ledNumber)
on = false
function updateBlink()
  local r = on and 1 or 0
  for i=0, ledNumber-1 do leds:set(i, r, 0, 0) end
  on = not on
end
blinkTimer = Timer.new(0.5, updateBlink)
blinkTimer:start()

function callback(event)
end
