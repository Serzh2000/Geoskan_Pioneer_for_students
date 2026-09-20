import numpy as np
import matplotlib.pyplot as plt

class KalmanFilter1D:
    def __init__(self, process_noise=0.01, measurement_noise=0.1, initial_value=0):
        # Initial state estimate
        self.x = initial_value
        # Initial covariance estimate
        self.P = 1.0
        # Process noise covariance (Q) - uncertainty in the system model
        self.Q = process_noise
        # Measurement noise covariance (R) - uncertainty in the measurement
        self.R = measurement_noise

    def update(self, measurement):
        # 1. Prediction Step
        # In a static 1D model, predicted state is same as previous state
        x_pred = self.x
        # Predicted covariance increases due to process noise
        P_pred = self.P + self.Q

        # 2. Update Step
        # Kalman Gain
        K = P_pred / (P_pred + self.R)
        
        # Update state estimate
        self.x = x_pred + K * (measurement - x_pred)
        
        # Update covariance estimate
        self.P = (1 - K) * P_pred
        
        return self.x

# Simulation
if __name__ == "__main__":
    # True height
    true_height = 1.5 # meters
    
    # Create noisy measurements
    np.random.seed(42)
    n_samples = 100
    measurements = true_height + np.random.normal(0, 0.2, n_samples)
    
    # Initialize filters
    kf = KalmanFilter1D(process_noise=0.001, measurement_noise=0.2, initial_value=0)
    lpf = [] # Low Pass Filter for comparison
    
    kf_estimates = []
    lpf_val = measurements[0]
    alpha = 0.1
    
    for z in measurements:
        # Update Kalman
        kf_estimates.append(kf.update(z))
        
        # Update Low Pass
        lpf_val = alpha * z + (1 - alpha) * lpf_val
        lpf.append(lpf_val)
        
    # Plotting code would go here (omitted for text output)
    print(f"True Height: {true_height}")
    print(f"Final KF Estimate: {kf_estimates[-1]:.3f}")
    print(f"Final LPF Estimate: {lpf[-1]:.3f}")
    print(f"Standard Deviation of Measurements: {np.std(measurements):.3f}")
    print(f"Standard Deviation of KF Estimates: {np.std(kf_estimates):.3f}")
