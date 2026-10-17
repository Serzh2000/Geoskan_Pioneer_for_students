from pioneer_rknn import PaddleOCR
from pioneer_sdk2 import Camera, CameraType

# Две модели: одна находит строки текста, другая читает буквы.
ocr = PaddleOCR(det_model_name="PP-OCRv5_mobile_det",
                rec_model_name="eslav_PP-OCRv5_mobile_rec")
camera = Camera(camera_type=CameraType.MAIN)

last = ""
try:
    while True:
        frame = camera.get_cv_frame()
        # рамки строк и варианты текста
        boxes, results = ocr.run(frame)
        words = []
        for variants in results:
            # первый вариант - самый вероятный
            text, score = variants[0]
            if score > 0.6:
                words.append(text)
        line = " ".join(words)
        if line and line != last:  # печатать только новое
            print("Вижу текст:", line)
            last = line
except KeyboardInterrupt:
    print("Остановлено")
finally:
    camera.stop()
