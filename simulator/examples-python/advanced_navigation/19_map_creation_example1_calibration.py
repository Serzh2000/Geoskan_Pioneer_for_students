#!/usr/bin/python3

"""
Калибровка камеры по шахматной доске: матрица камеры и коэффициенты
дисторсии сохраняются в data.yml (узлы mtx и dist).
Нужна полная библиотека OpenCV (pip install opencv-contrib-python) и настоящая
камера - дрона или компьютера. Камера симулятора - идеальная модель без
дисторсии, калибровать её не нужно.
Подробнее: https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html
"""

import cv2
import numpy as np
import glob
import time
from pioneer_sdk import Camera


def get_images_from_folder(folder_name, file_type="*.jpg"):
    """Загрузить снимки доски из папки `folder_name`."""
    images_list = glob.glob(folder_name + "/" + file_type)
    images = []
    for fname in images_list:
        img = cv2.imread(fname)
        images.append(img)
    return images


def get_images_from_drone_camera(camera, save=False):
    """Снимать кадры с камеры дрона: клавиша 1 - сохранить кадр, Esc или q - закончить."""
    images = []
    print("Press '1' to take frame\nPress ESC or 'q' to finish")
    while True:
        frame = camera.get_cv_frame()
        if frame is not None:
            cv2.imshow("frames", frame)

            key = cv2.waitKey(1)
            if key == 27 or key == ord("q"):
                cv2.destroyAllWindows()
                return images
            if key == ord("1"):
                images.append(frame)
                print("Frame #" + str(len(images)))
                if save:
                    cv2.imwrite("frame_" + str(len(images)) + ".jpg", frame)
                time.sleep(1)


def get_images_from_computer_camera(capture, save=False):
    """То же с веб-камерой компьютера (cv2.VideoCapture)."""
    images = []
    print("Press '1' to take frame\nPress ESC or 'q' to finish")
    while True:
        ret, frame = capture.read()
        cv2.imshow("frames", frame)

        key = cv2.waitKey(1)
        if key == 27 or key == ord("q"):
            cv2.destroyAllWindows()
            return images
        if key == ord("1"):
            images.append(frame)
            print("Frame #" + str(len(images)))
            if save:
                cv2.imwrite("frame_" + str(len(images)) + ".jpg", frame)
            time.sleep(1)


def calibrate(images):
    # Число ВНУТРЕННИХ углов доски: 6 x 9 углов - это доска 7 x 10 клеток
    CHECKERBOARD = (6, 9)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

    objpoints = []  # 3D-координаты углов доски (в клетках) для каждого снимка
    imgpoints = []  # те же углы на изображении, пиксели

    # Углы доски в её собственной системе: (0,0,0), (1,0,0), ... - доска плоская, z = 0
    objp = np.zeros((1, CHECKERBOARD[0] * CHECKERBOARD[1], 3), np.float32)
    objp[0, :, :2] = np.mgrid[0 : CHECKERBOARD[0], 0 : CHECKERBOARD[1]].T.reshape(-1, 2)

    gray = None
    for img in images:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # ret = True, если найдены все углы доски
        ret, corners = cv2.findChessboardCorners(
            gray,
            CHECKERBOARD,
            cv2.CALIB_CB_ADAPTIVE_THRESH
            + cv2.CALIB_CB_FAST_CHECK
            + cv2.CALIB_CB_NORMALIZE_IMAGE,
        )

        if ret == True:
            objpoints.append(objp)
            # Уточняем положение углов до долей пикселя
            corners2 = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)

            imgpoints.append(corners2)

            # Показываем найденные углы
            img = cv2.drawChessboardCorners(img, CHECKERBOARD, corners2, ret)

        cv2.imshow("img", img)
        cv2.waitKey(0)

    cv2.destroyAllWindows()

    if len(objpoints) < 10:
        raise RuntimeError("Доска найдена на %d снимках, нужно хотя бы 10" % len(objpoints))

    ret, mtx, dist, rvecs, tvecs = cv2.calibrateCamera(
        objpoints, imgpoints, gray.shape[::-1], None, None
    )
    # ret - средняя ошибка репроекции в пикселях: хорошая калибровка - меньше 1
    print("Снимков с доской:", len(objpoints))
    print("Ошибка репроекции, пиксели: %.3f" % ret)

    return mtx, dist


def save_coefficients(mtx, dist, path):
    """Сохранить матрицу камеры и коэффициенты дисторсии в файл."""
    cv_file = cv2.FileStorage(path, cv2.FILE_STORAGE_WRITE)
    cv_file.write("mtx", mtx)
    cv_file.write("dist", dist)
    cv_file.release()


def load_coefficients(path):
    """Прочитать матрицу камеры и коэффициенты дисторсии из файла."""
    cv_file = cv2.FileStorage(path, cv2.FILE_STORAGE_READ)

    # .mat() превращает узел файла в матрицу numpy
    camera_matrix = cv_file.getNode("mtx").mat()
    dist_coeffs = cv_file.getNode("dist").mat()

    cv_file.release()
    return camera_matrix, dist_coeffs


def main():
    """
    В этом примере изображения берутся с камеры дрона.
    Однако вы можете изменить источник изображений, заменив
    функцию `get_images_from_drone_camera` на другую, например:

    ```
    # Загрузить изображения из папки
    images = get_images_from_folder('images')
    # ...
    ```

    ```
    # Получить изображения с веб-камеры компьютера
    capture = cv2.VideoCapture(0)
    images = get_images_from_computer_camera(capture)
    capture.release()
    # ...
    ```
    """

    # Снимки с камеры дрона
    camera = Camera()
    images = get_images_from_drone_camera(camera)

    mtx, dist = calibrate(images)

    save_coefficients(mtx, dist, "data.yml")


if __name__ == "__main__":
    main()
