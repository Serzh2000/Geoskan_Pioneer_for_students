local Physics = require("physics")
local PID = require("pid")
local API = require("api")

-- Simulator Configuration
local config = {
    dt = 0.05, -- 20 Hz
    max_time = 30.0, -- Default max sim time in seconds
    takeoff_altitude = 1.0, -- meters
    hover_thrust_factor = 0.65 -- Simplified hover thrust
}

-- Simulator State
local sim_state = {
    current_time = 0,
    physics = Physics.new({mass = 0.5, max_thrust = 10.0}),
    command_queue = {},
    status = "GROUNDED",
    target_alt = 0
}

-- PID Controllers for Autopilot
local alt_pid = PID.new(1.2, 0.2, 0.6, 1.0) -- Altitude PID
alt_pid:setTarget(0)

-- API setup (exposes globals to user script)
API.setup(sim_state)

-- Load User Script
local user_script_path = arg[1]
if not user_script_path then
    print("Error: No user script provided. Usage: lua main.lua <path_to_script>")
    os.exit(1)
end

print("--- Starting Simulator ---")
print("Loading user script: " .. user_script_path)
local chunk, err = loadfile(user_script_path)
if not chunk then
    print("Error loading script: " .. err)
    os.exit(1)
end

-- Execute script (initializes globals and registers callbacks)
local ok, run_err = pcall(chunk)
if not ok then
    print("Error running script: " .. run_err)
    os.exit(1)
end

-- Main Loop
local step = 0
while sim_state.current_time < config.max_time do
    -- 1. Process Command Queue (from ap.push)
    while #sim_state.command_queue > 0 do
        local cmd = table.remove(sim_state.command_queue, 1)
        if cmd == _G.Ev.MCE_PREFLIGHT then
            sim_state.physics.motors_armed = true
            print("[SIM] Preflight: Motors ARMED")
        elseif cmd == _G.Ev.MCE_TAKEOFF then
            sim_state.target_alt = config.takeoff_altitude
            sim_state.status = "TAKING_OFF"
            print("[SIM] Takeoff initiated to " .. config.takeoff_altitude .. "m")
        elseif cmd == _G.Ev.MCE_LANDING then
            sim_state.target_alt = 0
            sim_state.status = "LANDING"
            print("[SIM] Landing initiated")
        elseif cmd == _G.Ev.ENGINES_DISARM then
            sim_state.physics.motors_armed = false
            print("[SIM] Engines DISARMED")
        end
    end

    -- 2. Autopilot Logic (Stabilization & Control)
    if sim_state.physics.motors_armed then
        -- Altitude control
        alt_pid:setTarget(sim_state.target_alt)
        local thrust_out = alt_pid:update(sim_state.physics.pos.z, config.dt)
        
        -- Base hover thrust + PID correction
        local base_thrust = config.hover_thrust_factor
        if sim_state.target_alt == 0 then
            base_thrust = base_thrust * 0.5 -- Reduce base thrust when landing to ensure touchdown
        end
        sim_state.physics.thrust_input = math.max(0, math.min(1.0, base_thrust + thrust_out))
    end

    -- 3. Update Physics
    sim_state.physics:update(config.dt)

    -- 4. Update Timers
    _G.Timer.update(sim_state.current_time)

    -- 5. Check State Transitions for Events
    if sim_state.status == "TAKING_OFF" and math.abs(sim_state.physics.pos.z - sim_state.target_alt) < 0.1 then
        sim_state.status = "HOVERING"
        if _G.callback then _G.callback(_G.Ev.TAKEOFF_COMPLETE) end
    elseif sim_state.status == "LANDING" and sim_state.physics.pos.z <= 0.05 then
        sim_state.status = "GROUNDED"
        if _G.callback then _G.callback(_G.Ev.COPTER_LANDED) end
    end

    -- 6. Visualization & Logging
    if step % 10 == 0 then -- 1 Hz output
        print(string.format("T:%.1fs | Alt:%.2fm | Thr:%.2f | Bat:%.1f%% | Status:%s", 
            sim_state.current_time, sim_state.physics.pos.z, sim_state.physics.thrust_input, 
            sim_state.physics.battery_level, sim_state.status))
    end

    -- 7. Advance Time
    sim_state.current_time = sim_state.current_time + config.dt
    step = step + 1
    
    -- Exit if battery empty
    if sim_state.physics.battery_level <= 0 then
        print("[SIM-ERROR] Battery exhausted! Emergency landing initiated.")
        sim_state.target_alt = 0
        sim_state.status = "EMERGENCY"
    end
    
    -- Exit if landed and motors disarmed (finished)
    if sim_state.status == "GROUNDED" and not sim_state.physics.motors_armed and step > 20 then
        print("--- Flight Completed Successfully ---")
        break
    end
end

if sim_state.current_time >= config.max_time then
    print("--- Simulation Timeout ---")
end
