local Physics = {}

function Physics.new(params)
    local self = {
        mass = params.mass or 0.5, -- kg
        g = 9.81, -- m/s^2
        drag_coeff = params.drag_coeff or 0.1,
        max_thrust = params.max_thrust or 15.0, -- N
        
        -- State: position (m), velocity (m/s), orientation (rad, Euler: roll, pitch, yaw)
        pos = {x = 0, y = 0, z = 0},
        vel = {x = 0, y = 0, z = 0},
        ori = {roll = 0, pitch = 0, yaw = 0},
        ang_vel = {roll = 0, pitch = 0, yaw = 0},
        
        -- Control inputs (normalized 0..1)
        thrust_input = 0,
        roll_input = 0,
        pitch_input = 0,
        yaw_input = 0,
        
        motors_armed = false,
        battery_level = 100.0 -- %
    }

    function self:update(dt)
        if not self.motors_armed then
            self.thrust_input = 0
            self.roll_input = 0
            self.pitch_input = 0
            self.yaw_input = 0
        end

        -- Simplistic physics update
        -- Thrust in body frame (assuming z is up in body frame when roll/pitch=0)
        local total_thrust = self.thrust_input * self.max_thrust
        
        -- Convert orientation to acceleration (very simplified for a quadcopter model)
        -- In reality, we'd use rotation matrices. For a basic sim, let's assume small angles.
        local ax = total_thrust / self.mass * math.sin(self.ori.pitch)
        local ay = -total_thrust / self.mass * math.sin(self.ori.roll)
        local az = (total_thrust / self.mass * math.cos(self.ori.pitch) * math.cos(self.ori.roll)) - self.g
        
        -- Add drag
        ax = ax - (self.drag_coeff * self.vel.x / self.mass)
        ay = ay - (self.drag_coeff * self.vel.y / self.mass)
        az = az - (self.drag_coeff * self.vel.z / self.mass)

        -- Update velocity
        self.vel.x = self.vel.x + ax * dt
        self.vel.y = self.vel.y + ay * dt
        self.vel.z = self.vel.z + az * dt

        -- Update position
        self.pos.x = self.pos.x + self.vel.x * dt
        self.pos.y = self.pos.y + self.vel.y * dt
        self.pos.z = self.pos.z + self.vel.z * dt
        
        -- Ground collision
        if self.pos.z < 0 then
            self.pos.z = 0
            self.vel.z = math.max(0, self.vel.z)
            self.vel.x = self.vel.x * 0.9 -- friction
            self.vel.y = self.vel.y * 0.9
        end

        -- Update orientation (simplified control to orientation mapping)
        -- In a real quad, we control torque. Here we'll simulate attitude control for simplicity
        -- so user input directly influences angular velocity or target angle.
        -- Let's assume input is rate of change for now.
        self.ori.roll = self.ori.roll + self.roll_input * dt * 2.0
        self.ori.pitch = self.ori.pitch + self.pitch_input * dt * 2.0
        self.ori.yaw = self.ori.yaw + self.yaw_input * dt * 2.0
        
        -- Battery drain
        if self.motors_armed then
            self.battery_level = self.battery_level - (0.01 + self.thrust_input * 0.05) * dt
        end
        self.battery_level = math.max(0, self.battery_level)
    end

    return self
end

return Physics
