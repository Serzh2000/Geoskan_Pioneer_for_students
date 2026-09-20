# См. полный код в examples/advanced_navigation/kalman_filter.py
def update(self, measurement):
    # 1. Prediction
    x_pred = self.x
    P_pred = self.P + self.Q

    # 2. Update
    K = P_pred / (P_pred + self.R) # Kalman Gain
    self.x = x_pred + K * (measurement - x_pred)
    self.P = (1 - K) * P_pred
    return self.x
