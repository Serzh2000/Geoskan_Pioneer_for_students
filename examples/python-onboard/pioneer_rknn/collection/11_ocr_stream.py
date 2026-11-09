"""Распознавание текста (PaddleOCR): рамки текстовых областей и распознанные строки."""
import time
import cv2
import numpy as np
from pioneer_rknn import PaddleOCR
from pioneer_sdk2 import Camera, ImageViewer

MIN_SCORE = 0.6                  # строки с меньшей уверенностью распознавания отбрасываем
PRINT_PERIOD = 1.0               # не чаще раза в секунду печатаем текст в терминал

camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/ocr/")
ocr = PaddleOCR(det_model_name="PP-OCRv5_mobile_det",          # модель поиска текстовых областей
                rec_model_name="eslav_PP-OCRv5_mobile_rec")    # распознавание: кириллица + латиница
last_print = 0.0

try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        quads, texts = ocr.run(img=frame)       # на вход — кадр целиком, без resize: модель сделает это сама
        lines = []
        if quads is not None:
            for quad, candidates in zip(quads, texts):
                pts = np.asarray(quad, dtype=np.int32).reshape(-1, 1, 2)    # 4 угла области
                best = max(candidates, key=lambda c: c[1], default=None)    # (текст, уверенность)
                ok = best is not None and best[1] >= MIN_SCORE
                cv2.polylines(frame, [pts], True, (0, 220, 0) if ok else (0, 0, 255), 2)
                if ok:
                    lines.append(f"{best[0]}  ({best[1]:.2f})")

        if lines and time.monotonic() - last_print > PRINT_PERIOD:
            print("\n".join(["-" * 40] + lines))
            last_print = time.monotonic()
        viewer.imshow("ocr", frame)   # трансляция: 10.42.0.1:8889/ocr
except KeyboardInterrupt:
    pass
finally:
    viewer.close()
    camera.stop()
