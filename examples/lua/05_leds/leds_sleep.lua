local ledNumber = 29
local leds = Ledbar.new(ledNumber)

local function fill(r, g, b)
  for i = 0, ledNumber - 1 do leds:set(i, r, g, b) end
end

fill(1, 0, 0)     -- красный
sleep(1)          -- вся программа стоит одну секунду: ни событий, ни таймеров
fill(0, 1, 0)     -- зелёный
sleep(1)
fill(0, 0, 0)     -- выключить

function callback(event)
end
