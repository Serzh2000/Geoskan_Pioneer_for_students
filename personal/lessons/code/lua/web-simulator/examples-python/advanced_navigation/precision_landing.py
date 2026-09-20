import numpy as np
import time

class LowPassFilter:
    """
    Simple Exponential Moving Average (EMA) filter.
    """
    def __init__(self, alpha=0.5):
        self.alpha = alpha
        self.value = None

    def update(self, new_value):
        if self.value is None:
            self.value = new_value
        else:
            self.value = self.alpha * new_value + (1 - self.alpha) * self.value
        return self.value

class NavigationSystem:
    def __init__(self):
        # Filters for X, Y, Z, Yaw
        self.filter_x = LowPassFilter(alpha=0.3)
        self.filter_y = LowPassFilter(alpha=0.3)
        self.filter_z = LowPassFilter(alpha=0.3)
        self.filter_yaw = LowPassFilter(alpha=0.1) # Smoother yaw

    def update(self, tvec, rvec):
        """
        Takes raw tvec/rvec from Aruco and returns filtered local coordinates.
        """
        if tvec is None:
            return None
        
        # Raw values
        x, y, z = tvec[0][0], tvec[1][0], tvec[2][0]
        
        # Apply filter
        fx = self.filter_x.update(x)
        fy = self.filter_y.update(y)
        fz = self.filter_z.update(z)
        
        # Basic yaw estimation (rotation vector magnitude)
        # Note: Proper yaw extraction requires Rodrigues to Matrix conversion
        # This is a simplified placeholder
        yaw_raw = rvec[2][0] 
        fyaw = self.filter_yaw.update(yaw_raw)
        
        return fx, fy, fz, fyaw

if __name__ == "__main__":
    # Simulation of noisy data
    nav = NavigationSystem()
    
    true_x = 1.0
    print(f"True X: {true_x}")
    print("Measurement | Filtered")
    print("-" * 25)
    
    for i in range(10):
        # Add noise
        noise = np.random.normal(0, 0.1)
        measured_x = true_x + noise
        
        # Mocking tvec structure [[x], [y], [z]]
        tvec = np.array([[measured_x], [0], [1.0]])
        rvec = np.array([[0], [0], [0]])
        
        fx, _, _, _ = nav.update(tvec, rvec)
        
        print(f"{measured_x:.4f}    | {fx:.4f}")
        time.sleep(0.1)
