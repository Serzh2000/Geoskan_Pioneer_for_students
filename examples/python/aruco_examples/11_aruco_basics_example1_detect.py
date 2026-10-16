import cv2
import cv2.aruco as aruco
import numpy as np
from pioneer_sdk import Camera
import threading
import time

class ArucoDetectorThread:
    def __init__(self):
        self.camera = Camera()
        self.running = True
        self.latest_frame = None
        self.processed_frame = None
        self.frame_lock = threading.Lock()
        
        # 1. Настройка словаря ArUco (6x6, 50 маркеров - стандарт для Pioneer)
        self.aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_6X6_50)
        
        # Обеспечение совместимости разных версий OpenCV
        if hasattr(aruco, 'DetectorParameters_create'):
            self.parameters = aruco.DetectorParameters_create()
        else:
            self.parameters = aruco.DetectorParameters()

    def detect_markers_compat(self, image):
        if hasattr(aruco, 'ArucoDetector'):
            # Новый API (OpenCV 4.7+)
            detector = aruco.ArucoDetector(self.aruco_dict, self.parameters)
            return detector.detectMarkers(image)
        else:
            # Старый API
            return aruco.detectMarkers(image, self.aruco_dict, parameters=self.parameters)

    def capture_thread(self):
        while self.running:
            frame = self.camera.get_cv_frame()
            if frame is not None:
                with self.frame_lock:
                    self.latest_frame = frame.copy()
            time.sleep(0.01)

    def processing_thread(self):
        while self.running:
            frame_to_process = None
            with self.frame_lock:
                if self.latest_frame is not None:
                    frame_to_process = self.latest_frame.copy()
            
            if frame_to_process is None:
                time.sleep(0.01)
                continue

            # Переводим в оттенки серого (для ускорения)
            gray = cv2.cvtColor(frame_to_process, cv2.COLOR_BGR2GRAY)

            # 3. Детекция маркеров
            corners, ids, rejected = self.detect_markers_compat(gray)

            # Если маркеры найдены
            if ids is not None:
                # Рисуем рамки вокруг маркеров
                aruco.drawDetectedMarkers(frame_to_process, corners, ids)
                # Выводим ID найденных маркеров в консоль (можно закомментировать, если спамит)
                # print(f"Вижу маркеры: {ids.flatten()}")

            with self.frame_lock:
                self.processed_frame = frame_to_process

    def run(self):
        print("Запуск детекции маркеров... Нажмите ESC для выхода.")
        
        t_capture = threading.Thread(target=self.capture_thread)
        t_process = threading.Thread(target=self.processing_thread)
        
        t_capture.daemon = True
        t_process.daemon = True
        
        t_capture.start()
        t_process.start()

        try:
            while True:
                display_frame = None
                with self.frame_lock:
                    if self.processed_frame is not None:
                        display_frame = self.processed_frame.copy()
                    elif self.latest_frame is not None:
                        display_frame = self.latest_frame.copy()
                
                if display_frame is not None:
                    cv2.imshow('Pioneer Camera', display_frame)

                if cv2.waitKey(1) == 27:
                    self.running = False
                    break
                
                time.sleep(0.03)
                
        finally:
            self.running = False
            t_capture.join(timeout=1.0)
            t_process.join(timeout=1.0)
            cv2.destroyAllWindows()

if __name__ == "__main__":
    detector = ArucoDetectorThread()
    detector.run()
