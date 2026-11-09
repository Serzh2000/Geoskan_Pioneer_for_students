# Метод класса KalmanFilter1D; весь класс и опыт с ним -
# в файле examples/python/advanced_navigation/kalman_filter.py
def update(self, measurement):
    # 1. Предсказание: модель «величина не меняется», неопределённость растёт на Q
    x_pred = self.x
    P_pred = self.P + self.Q

    # 2. Коррекция: коэффициент Калмана K решает, насколько верить измерению
    K = P_pred / (P_pred + self.R)
    self.x = x_pred + K * (measurement - x_pred)
    self.P = (1 - K) * P_pred
    return self.x
