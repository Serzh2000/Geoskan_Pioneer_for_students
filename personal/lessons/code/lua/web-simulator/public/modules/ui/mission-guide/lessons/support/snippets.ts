export const LUA_LED_SINGLE_EXAMPLE = `local leds = Ledbar.new(29)
leds:set(0, 1, 0, 0)

function callback(event)
end`;

export const LUA_LED_SEQUENCE_EXAMPLE = `local leds = Ledbar.new(29)

Timer.callLater(1.0, function()
    leds:set(0, 0, 0, 1)
end)

Timer.callLater(2.0, function()
    leds:set(0, 0, 1, 0)
end)

Timer.callLater(3.0, function()
    leds:set(0, 1, 0, 0)
end)

function callback(event)
end`;

export const LUA_PREFLIGHT_EXAMPLE = `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        print('Двигатели запущены')
    end
end`;

export const LUA_TAKEOFF_EXAMPLE = `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end
end`;

export const LUA_MISSION_EXAMPLE = `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end

    if event == Ev.POINT_REACHED then
        ap.push(Ev.MCE_LANDING)
    end
end`;

export const PYTHON_LED_SINGLE_EXAMPLE = `pioneer.led_control(r=255, g=0, b=0)`;

export const PYTHON_LED_SEQUENCE_EXAMPLE = `pioneer.led_control(r=0, g=0, b=255)
time.sleep(0.5)
pioneer.led_control(r=0, g=255, b=0)
time.sleep(0.5)
pioneer.led_control(r=255, g=0, b=0)`;

export const PYTHON_ARM_EXAMPLE = `if pioneer.arm():
    print("Двигатели готовы")`;

export const PYTHON_TAKEOFF_EXAMPLE = `if pioneer.arm():
    time.sleep(1)
    pioneer.takeoff()`;

export const PYTHON_MISSION_EXAMPLE = `if pioneer.arm():
    time.sleep(1)
    pioneer.takeoff()

time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)

while not pioneer.point_reached():
    time.sleep(0.05)

pioneer.land()`;
