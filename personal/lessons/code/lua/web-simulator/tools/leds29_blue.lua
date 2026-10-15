-- Загрузка из симулятора: все светодиоды синие.
local leds = Ledbar.new(29)
for i = 0, 28 do
  leds:set(i, 0, 0, 1)
end
