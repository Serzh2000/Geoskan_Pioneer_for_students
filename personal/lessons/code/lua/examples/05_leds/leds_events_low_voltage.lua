local ledNumber = 29
local leds = Ledbar.new(ledNumber)
local on = false

local function fill(r, g, b)
  for i = 0, ledNumber - 1 do leds:set(i, r, g, b) end
end

-- штатная работа: мигаем зелёным два раза в секунду
blinkTimer = Timer.new(0.5, function()
  on = not on
  fill(0, on and 1 or 0, 0)
end)
blinkTimer:start()

function callback(event)
  if event == Ev.LOW_VOLTAGE2 then                       -- батарея разряжена
    blinkTimer:stop()                                    -- мигание больше не нужно
    Timer.callLater(1, function() fill(1, 0, 0) end)     -- через секунду — ровный красный
  end
end
