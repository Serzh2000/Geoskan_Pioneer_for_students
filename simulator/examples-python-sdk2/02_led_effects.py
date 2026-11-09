from pioneer_sdk2 import Pioneer
import colorsys                     # стандартная библиотека: перевод цвета из HSV в RGB
import time

LED_COUNT = 4                       # светодиоды нумеруются с 0; 255 — все сразу
ALL_LEDS = 255


def rainbow(drone, duration=6.0, step=0.1):
    """Плавно прокручивает «радугу» по всем светодиодам."""
    start = time.time()
    while time.time() - start < duration:
        phase = (time.time() - start) / duration          # 0..1 — доля пройденного времени
        for led in range(LED_COUNT):
            hue = (phase + led / LED_COUNT) % 1.0          # каждый светодиод сдвинут по оттенку
            r, g, b = colorsys.hsv_to_rgb(hue, 1.0, 1.0)   # яркость каналов в диапазоне 0..1
            drone.led_control(led, r=r, g=g, b=b)
        time.sleep(step)


def running_light(drone, r, g, b, laps=3, delay=0.15):
    """«Бегущий огонь»: в каждый момент горит один светодиод."""
    for _ in range(laps):
        for led in range(LED_COUNT):
            drone.led_control(ALL_LEDS)                    # без цвета = выключить все
            drone.led_control(led, r=r, g=g, b=b)
            time.sleep(delay)


def pulse(drone, r, g, b, times=3, steps=10, delay=0.04):
    """Мягкое «дыхание» — яркость растёт и падает."""
    for _ in range(times):
        for k in list(range(steps + 1)) + list(range(steps, -1, -1)):
            level = k / steps
            drone.led_control(ALL_LEDS, r=r * level, g=g * level, b=b * level)
            time.sleep(delay)


drone = Pioneer()
drone.set_logger(False)             # отключаем вывод ответа на каждую команду — их будут сотни

try:
    rainbow(drone)
    running_light(drone, r=0, g=0, b=1)
    pulse(drone, r=1, g=0.4, b=0)   # жёлтый = красный + немного зелёного
finally:
    drone.led_control(ALL_LEDS)     # гасим светодиоды
    drone.close_connection()
