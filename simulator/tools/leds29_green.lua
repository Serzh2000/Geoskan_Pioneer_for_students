-- Загрузка из симулятора: все светодиоды зелёные.
local leds = Ledbar.new(29)
for i = 0, 28 do
  leds:set(i, 0, 1, 0)
end
