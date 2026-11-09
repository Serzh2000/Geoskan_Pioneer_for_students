"""Конвейер детектора ArUco по шагам: серый кадр, порог, контуры, детекция.

Запускается на компьютере с полной библиотекой OpenCV:
    pip install opencv-contrib-python
    python binarization_example.py            # тестовая картинка с тенью
    python binarization_example.py photo.jpg  # своя фотография маркера
В симуляторе cv2 - учебная модель: adaptiveThreshold и findContours там нет.
"""
import sys

import cv2
import numpy as np


def make_test_image():
    """Маркер ID 12 (DICT_6X6_250) на белом листе, освещённом неравномерно."""
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
    marker = cv2.aruco.generateImageMarker(dictionary, 12, 200)
    sheet = np.full((400, 600), 255, np.uint8)
    sheet[100:300, 200:400] = marker
    # Слева светло, справа тень: яркость падает с 100% до 25%.
    shade = np.linspace(1.0, 0.25, sheet.shape[1])
    sheet = (sheet * shade[np.newaxis, :]).astype(np.uint8)
    return cv2.cvtColor(sheet, cv2.COLOR_GRAY2BGR)


def count_quads(binary, min_area=400):
    """Сколько контуров похожи на маркер: 4 вершины, выпуклый, не мелкий."""
    # OpenCV 3 возвращает три значения, OpenCV 4 - два; контуры всегда предпоследние.
    contours = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)[-2]
    quads = 0
    for contour in contours:
        if cv2.contourArea(contour) < min_area:
            continue
        approx = cv2.approxPolyDP(contour, 0.03 * cv2.arcLength(contour, True), True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            quads += 1
    return quads


def detect_ids(gray):
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
    if hasattr(cv2.aruco, "ArucoDetector"):
        detector = cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters())
        corners, ids, _ = detector.detectMarkers(gray)
    else:
        corners, ids, _ = cv2.aruco.detectMarkers(gray, dictionary)
    return [] if ids is None else [int(value[0]) for value in ids]


def main():
    if len(sys.argv) > 1:
        frame = cv2.imread(sys.argv[1])
        if frame is None:
            print("Не удалось прочитать файл:", sys.argv[1])
            return
    else:
        frame = make_test_image()

    # 1. Цвет маркеру не нужен: переходим к оттенкам серого.
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 2а. Один порог на весь кадр: в тени белые клетки становятся «чёрными».
    _, global_binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)

    # 2б. Адаптивный порог: (src, maxValue, method, type, blockSize, C).
    # blockSize - размер окрестности (нечётный), C - поправка к среднему окрестности.
    adaptive_binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 7)

    # 3. Кандидаты в маркеры - выпуклые четырёхугольники.
    print("Четырёхугольников, общий порог:", count_quads(global_binary))
    print("Четырёхугольников, адаптивный порог:", count_quads(adaptive_binary))

    # 4. Полный детектор: выпрямление перспективы и чтение битов по словарю.
    print("Найдены ID:", detect_ids(gray))

    cv2.imshow("gray", gray)
    cv2.imshow("global threshold", global_binary)
    cv2.imshow("adaptive threshold", adaptive_binary)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
