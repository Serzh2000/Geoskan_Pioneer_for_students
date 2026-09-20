local ledNumber = 29
local leds = Ledbar.new(ledNumber)
function callback(event)
  if (event == Ev.COPTER_LANDED) then
    for i=0, ledNumber-1 do leds:set(i, 0, 0, 0) end
  end
end
