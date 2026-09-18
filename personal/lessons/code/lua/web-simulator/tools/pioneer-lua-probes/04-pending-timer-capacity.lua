-- Schedules 20 one-shot callbacks. No extra reporting timer uses a slot.
-- Final count in binary: green LEDs 0..3 = bits 0..3; blue LED3 = bit4.
-- 16 => only LED3 blue. 20 => LED2 green + LED3 blue.
-- Red LED0 means a registration threw an error. Observe after >=2 seconds.
local leds = Ledbar.new(4)
local fired, errors = 0, 0
local function display()
    for i = 0, 3 do
        local green = (fired >> i) & 1
        local blue = i == 3 and ((fired >> 4) & 1) or 0
        leds:set(i, i == 0 and errors > 0 and 1 or 0, green, blue)
    end
end
display()
for i = 1, 20 do
    local ok, err = pcall(function()
        Timer.callLater(1 + i * 0.01, function()
            fired = fired + 1
            display()
            if type(print) == "function" then print("FIRED", fired, time()) end
        end)
    end)
    if not ok then
        errors = errors + 1
        if type(print) == "function" then print("REGISTRATION_ERROR", i, err) end
    end
end
display()
function callback(event) end
