"""Одномерный фильтр Калмана и экспоненциальное сглаживание на модельных данных.

Запуск на компьютере: python kalman_filter.py
Нужен numpy; если установлен matplotlib, программа ещё и нарисует график.
Опыт: дрон висит на высоте 1.5 м, измерения шумят; на шаге JUMP_AT
дрон «толкнули», и настоящая высота скачком стала 2.0 м.
"""
import numpy as np

# Параметры опыта - их и меняйте в заданиях.
PROCESS_NOISE = 0.001      # Q: насколько мы не доверяем модели «высота постоянна»
MEASUREMENT_NOISE = 0.2    # R: насколько мы не доверяем датчику
ALPHA = 0.1                # коэффициент экспоненциального сглаживания
SENSOR_SIGMA = 0.2         # настоящий шум датчика, м
N_SAMPLES = 100
JUMP_AT = 50
HEIGHT_BEFORE, HEIGHT_AFTER = 1.5, 2.0


class KalmanFilter1D:
    def __init__(self, process_noise=0.01, measurement_noise=0.1, initial_value=0.0):
        self.x = initial_value     # текущая оценка
        self.P = 1.0               # неопределённость оценки
        self.Q = process_noise
        self.R = measurement_noise

    def update(self, measurement):
        # 1. Предсказание: модель «величина не меняется», неопределённость растёт на Q
        x_pred = self.x
        P_pred = self.P + self.Q
        # 2. Коррекция: коэффициент Калмана K решает, насколько верить измерению
        K = P_pred / (P_pred + self.R)
        self.x = x_pred + K * (measurement - x_pred)
        self.P = (1 - K) * P_pred
        return self.x


class ExponentialFilter:
    """Экспоненциальное скользящее среднее: new = a*z + (1-a)*old."""

    def __init__(self, alpha=0.1):
        self.alpha = alpha
        self.value = None

    def update(self, measurement):
        if self.value is None:
            self.value = measurement
        else:
            self.value = self.alpha * measurement + (1 - self.alpha) * self.value
        return self.value


def reaction_steps(estimates, start, target, share=0.9):
    """Через сколько шагов после скачка оценка прошла share пути до новой высоты."""
    level = HEIGHT_BEFORE + share * (target - HEIGHT_BEFORE)
    for step, value in enumerate(estimates[start:]):
        if value >= level:
            return step
    return None


def main():
    np.random.seed(42)
    truth = np.where(np.arange(N_SAMPLES) < JUMP_AT, HEIGHT_BEFORE, HEIGHT_AFTER)
    measurements = truth + np.random.normal(0, SENSOR_SIGMA, N_SAMPLES)

    kalman = KalmanFilter1D(PROCESS_NOISE, MEASUREMENT_NOISE, initial_value=measurements[0])
    smooth = ExponentialFilter(ALPHA)
    kf = [kalman.update(z) for z in measurements]
    ema = [smooth.update(z) for z in measurements]

    calm = slice(10, JUMP_AT)   # участок до скачка, когда фильтры уже «разогрелись»
    print(f"Разброс измерений:     {np.std(measurements[calm]):.3f} м")
    print(f"Разброс оценки Калмана: {np.std(kf[calm]):.3f} м")
    print(f"Разброс сглаживания:    {np.std(ema[calm]):.3f} м")
    for name, values in (("Калман", kf), ("Сглаживание", ema)):
        steps = reaction_steps(values, JUMP_AT, HEIGHT_AFTER)
        result = "не успел до конца опыта" if steps is None else f"{steps} шагов"
        print(f"{name}: реакция на скачок - {result}")

    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return
    plt.plot(measurements, ".", color="gray", label="измерения")
    plt.plot(truth, "k--", label="правда")
    plt.plot(kf, label="Калман")
    plt.plot(ema, label="сглаживание")
    plt.xlabel("шаг")
    plt.ylabel("высота, м")
    plt.legend()
    plt.show()


if __name__ == "__main__":
    main()
