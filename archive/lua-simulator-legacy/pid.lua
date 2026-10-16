local PID = {}

function PID.new(kp, ki, kd, output_limit)
    local self = {
        kp = kp or 1.0,
        ki = ki or 0.0,
        kd = kd or 0.0,
        output_limit = output_limit or 1.0,
        
        integral = 0,
        prev_error = 0,
        target = 0
    }

    function self:setTarget(target)
        self.target = target
    end

    function self:update(current, dt)
        local error = self.target - current
        
        -- Integral term with anti-windup (simple clamp)
        self.integral = self.integral + error * dt
        self.integral = math.max(-self.output_limit, math.min(self.output_limit, self.integral))
        
        -- Derivative term
        local derivative = (error - self.prev_error) / dt
        self.prev_error = error
        
        -- Final output
        local output = (self.kp * error) + (self.ki * self.integral) + (self.kd * derivative)
        
        -- Clamp output
        return math.max(-self.output_limit, math.min(self.output_limit, output))
    end

    function self:reset()
        self.integral = 0
        self.prev_error = 0
    end

    return self
end

return PID
