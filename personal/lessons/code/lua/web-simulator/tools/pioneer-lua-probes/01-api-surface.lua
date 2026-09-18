-- Bench probe: no flight, motor, GPIO or persistent configuration commands.
-- LEDs 0..3: green = API present, red = absent.
local leds = Ledbar.new(4)
local names = {"Timer.callAt", "Timer.callAtGlobal", "Sensors.altitude", "Sensors.lpsYaw"}
local values = {Timer.callAt, Timer.callAtGlobal, Sensors.altitude, Sensors.lpsYaw}
for i = 1, 4 do
    local found = type(values[i]) == "function"
    leds:set(i - 1, found and 0 or 1, found and 1 or 0, 0)
    if type(print) == "function" then print(names[i], type(values[i])) end
end
if type(print) == "function" then
    print("VM", _VERSION, math.maxinteger, type(boardNumber), boardNumber)
    print("TIME", time(), deltaTime(), launchTime())
    for name, value in pairs(Ev) do print("EVENT_CONSTANT", name, value) end
end
function callback(event)
    if type(print) == "function" then print("EVENT", time(), event) end
end
