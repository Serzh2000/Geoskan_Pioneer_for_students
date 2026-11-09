"""Текстовые команды на табличке: покажите камере слово — дрон выполнит действие.

Распознавание неидеально, поэтому сравниваем без учёта регистра, заменяем латинские буквы-двойники
на русские и допускаем 1–2 ошибки; команду выполняем, только если она прочитана несколько раз подряд.
"""
import time
import cv2
import numpy as np
from pioneer_rknn import PaddleOCR
from pioneer_sdk2 import Pioneer, Camera, ImageViewer

CONFIRMATIONS = 3               # сколько кадров подряд нужно увидеть одну и ту же команду
COOLDOWN = 3.0                  # пауза после выполнения команды, с
LATIN = {"КРАСНЫЙ": "RED", "ЗЕЛЕНЫЙ": "GREEN", "СИНИЙ": "BLUE", "СТОП": "STOP"}  # cv2.putText не рисует кириллицу


def levenshtein(a, b):
    """Минимальное число вставок, удалений и замен символов, превращающих a в b."""
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def make_commands(drone):
    return {
        "КРАСНЫЙ": lambda: drone.led_control(r=1),
        "ЗЕЛЕНЫЙ": lambda: drone.led_control(g=1),
        "СИНИЙ":   lambda: drone.led_control(b=1),
        "СТОП":    lambda: drone.led_control(),
    }


# Латинские буквы, которые выглядят как русские: OCR легко их путает (проверено на дроне: «КРАCНЬИ»)
LOOKALIKES = str.maketrans("ABCEHKMOPTXY", "АВСЕНКМОРТХУ")


def normalize(word):
    return word.upper().translate(LOOKALIKES).replace("Ё", "Е").strip(" .,!")


def find_command(words, commands):
    for word in words:
        normalized = normalize(word)
        for command in commands:
            allowed = 2 if len(command) >= 6 else 1      # длинным словам прощаем 2 ошибки, коротким — 1
            if levenshtein(normalized, command) <= allowed:
                return command
    return None


drone = Pioneer()
drone.set_logger(False)
camera = Camera()
viewer = ImageViewer()                   # окно просмотра: http://10.42.0.1:8889/ocr_commands/
print("Окно просмотра: http://10.42.0.1:8889/ocr_commands/")
ocr = PaddleOCR(det_model_name="PP-OCRv5_mobile_det", rec_model_name="eslav_PP-OCRv5_mobile_rec")
commands = make_commands(drone)
streak_word, streak, last_exec = None, 0, 0.0

try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        quads, texts = ocr.run(img=frame)
        words = [text for group in (texts or []) for text, score in group if score > 0.5]
        command = find_command(words, commands)

        streak = streak + 1 if command is not None and command == streak_word else int(command is not None)
        streak_word = command
        if command and streak >= CONFIRMATIONS and time.monotonic() - last_exec > COOLDOWN:
            print("Команда:", command)
            commands[command]()
            last_exec, streak = time.monotonic(), 0

        for quad in quads or []:                       # рамки найденного текста
            cv2.polylines(frame, [np.asarray(quad, dtype=np.int32).reshape(-1, 1, 2)], True, (0, 220, 0), 2)
        label = f"command: {LATIN.get(command, '-')}  ({streak}/{CONFIRMATIONS})"
        cv2.putText(frame, label, (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        viewer.imshow("ocr_commands", frame, fps=10)   # трансляция: 10.42.0.1:8889/ocr_commands
except KeyboardInterrupt:
    pass
finally:
    drone.led_control()
    viewer.close()
    camera.stop()
    drone.close_connection()
