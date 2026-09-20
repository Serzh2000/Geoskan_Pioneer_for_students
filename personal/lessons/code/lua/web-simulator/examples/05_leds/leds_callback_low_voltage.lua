local ledNumber = 29
local leds = Ledbar.new(ledNumber)
mainTimer = Timer.new(0.1, function () end)
mainTimer:start()
function callback(event)
  if (event == Ev.LOW_VOLTAGE2) then
    mainTimer:stop()
    Timer.callLater(1, function ()
      for i=0, ledNumber-1 do leds:set(i, 1, 0, 0) end
    end)
  end
end
