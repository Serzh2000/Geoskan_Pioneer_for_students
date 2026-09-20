local ledNumber = 29
local leds = Ledbar.new(ledNumber)
local on = false
function updateBlink()
  local r,g,b = (on and 1 or 0), 0, 0
  for i=0, ledNumber-1 do leds:set(i, r, g, b) end
  on = not on
end
blinkTimer = Timer.new(0.5, updateBlink)  -- 0.5 секунды
blinkTimer:start()

function callback(event)
end
