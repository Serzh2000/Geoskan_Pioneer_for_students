local ledNumber = 29
local leds = Ledbar.new(ledNumber)

-- пока программа работает, линейка горит белым
for i = 0, ledNumber - 1 do leds:set(i, 1, 1, 1) end

function callback(event)
  if event == Ev.COPTER_LANDED then                        -- дрон сел
    for i = 0, ledNumber - 1 do leds:set(i, 0, 0, 0) end   -- погасить линейку
  end
end
