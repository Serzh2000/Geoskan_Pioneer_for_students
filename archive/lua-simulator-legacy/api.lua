local API = {}

function API.setup(simulator_state)
    local state = simulator_state
    
    -- Event constants
    _G.Ev = {
        MCE_PREFLIGHT = 1,
        MCE_TAKEOFF = 2,
        MCE_LANDING = 3,
        ENGINES_ARM = 4,
        ENGINES_DISARM = 5,
        TAKEOFF_COMPLETE = 6,
        COPTER_LANDED = 7,
        LOW_VOLTAGE = 8,
        STATE_CHANGED = 9
    }

    -- Autopilot (ap)
    _G.ap = {
        push = function(event)
            table.insert(state.command_queue, event)
            print("[SIM-AP] Command pushed: " .. event)
        end
    }

    -- Timer module
    _G.Timer = {
        timers = {},
        
        new = function(period, callback)
            local timer = {
                period = period,
                callback = callback,
                next_trigger = 0,
                running = false
            }
            function timer:start()
                self.running = true
                self.next_trigger = state.current_time + self.period
            end
            function timer:stop()
                self.running = false
            end
            table.insert(_G.Timer.timers, timer)
            return timer
        end,
        
        callLater = function(delay, callback)
            local timer = _G.Timer.new(delay, callback)
            timer:start()
            -- Auto-stop after one execution logic will be in main loop
            timer.one_shot = true
            return timer
        end,
        
        update = function(currentTime)
            for i, t in ipairs(_G.Timer.timers) do
                if t.running and currentTime >= t.next_trigger then
                    t.callback()
                    if t.one_shot then
                        t.running = false
                    else
                        t.next_trigger = t.next_trigger + t.period
                    end
                end
            end
        end
    }

    -- Sensors module
    _G.Sensors = {
        lpsPosition = function()
            return state.physics.pos.x, state.physics.pos.y, state.physics.pos.z
        end,
        lpsVelocity = function()
            return state.physics.vel.x, state.physics.vel.y, state.physics.vel.z
        end,
        accel = function()
            -- Simulated accelerometer (simplified)
            return 0, 0, state.physics.g 
        end,
        gyro = function()
            return state.physics.ang_vel.roll, state.physics.ang_vel.pitch, state.physics.ang_vel.yaw
        end,
        orientation = function()
            return state.physics.ori.roll, state.physics.ori.pitch, state.physics.ori.yaw
        end,
        range = function()
            return state.physics.pos.z
        end
    }

    -- Ledbar module
    _G.Ledbar = {
        new = function(count)
            local ledbar = {
                count = count,
                leds = {}
            }
            for i=0, count-1 do ledbar.leds[i] = {0,0,0,0} end
            
            function ledbar:set(index, r, g, b, w)
                self.leds[index] = {r, g, b, w or 0}
            end
            return ledbar
        end
    }

    -- Initialize callback if not present
    if not _G.callback then
        _G.callback = function(event) end
    end
end

return API
