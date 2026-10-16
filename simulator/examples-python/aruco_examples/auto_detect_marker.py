import cv2
import cv2.aruco as aruco
import numpy as np
from pioneer_sdk import Camera
import threading
import time

class MarkerDetector:
    def __init__(self):
        self.camera = Camera()
        self.running = True
        self.latest_frame = None
        self.processed_frame = None
        self.frame_lock = threading.Lock()
        
        # Список словарей ArUco для проверки
        self.aruco_dicts = {
            "DICT_4X4_50": aruco.DICT_4X4_50,
            "DICT_4X4_100": aruco.DICT_4X4_100,
            "DICT_4X4_250": aruco.DICT_4X4_250,
            "DICT_4X4_1000": aruco.DICT_4X4_1000,
            "DICT_5X5_50": aruco.DICT_5X5_50,
            "DICT_5X5_100": aruco.DICT_5X5_100,
            "DICT_5X5_250": aruco.DICT_5X5_250,
            "DICT_5X5_1000": aruco.DICT_5X5_1000,
            "DICT_6X6_50": aruco.DICT_6X6_50,
            "DICT_6X6_100": aruco.DICT_6X6_100,
            "DICT_6X6_250": aruco.DICT_6X6_250,
            "DICT_6X6_1000": aruco.DICT_6X6_1000,
            "DICT_7X7_50": aruco.DICT_7X7_50,
            "DICT_7X7_100": aruco.DICT_7X7_100,
            "DICT_7X7_250": aruco.DICT_7X7_250,
            "DICT_7X7_1000": aruco.DICT_7X7_1000,
            "DICT_ARUCO_ORIGINAL": aruco.DICT_ARUCO_ORIGINAL,
            "DICT_APRILTAG_16h5": aruco.DICT_APRILTAG_16h5,
            "DICT_APRILTAG_25h9": aruco.DICT_APRILTAG_25h9,
            "DICT_APRILTAG_36h10": aruco.DICT_APRILTAG_36h10,
            "DICT_APRILTAG_36h11": aruco.DICT_APRILTAG_36h11
        }

        # Обеспечение совместимости разных версий OpenCV
        if hasattr(aruco, 'DetectorParameters_create'):
            self.parameters = aruco.DetectorParameters_create()
        else:
            self.parameters = aruco.DetectorParameters()

    # Функция получения словаря (совместимость)
    def get_dict(self, enum_val):
        if hasattr(aruco, 'Dictionary_get'):
            return aruco.Dictionary_get(enum_val)
        else:
            return aruco.getPredefinedDictionary(enum_val)

    # Функция детекции (совместимость с OpenCV 4.7+)
    def detect_markers_compat(self, image, dictionary, params):
        if hasattr(aruco, 'ArucoDetector'):
            # Новый API (OpenCV 4.7+)
            detector = aruco.ArucoDetector(dictionary, params)
            return detector.detectMarkers(image)
        else:
            # Старый API
            return aruco.detectMarkers(image, dictionary, parameters=params)

    def capture_thread(self):
        """Поток захвата кадров с камеры"""
        while self.running:
            frame = self.camera.get_cv_frame()
            if frame is not None:
                with self.frame_lock:
                    self.latest_frame = frame.copy()
            # Небольшая пауза, чтобы не грузить CPU
            time.sleep(0.01)

    def processing_thread(self):
        """Поток обработки кадров (поиск маркеров)"""
        while self.running:
            frame_to_process = None
            
            with self.frame_lock:
                if self.latest_frame is not None:
                    frame_to_process = self.latest_frame.copy()
            
            if frame_to_process is None:
                time.sleep(0.01)
                continue

            # Конвертация в оттенки серого
            gray = cv2.cvtColor(frame_to_process, cv2.COLOR_BGR2GRAY)
            
            # Перебор всех доступных словарей
            for name, dict_enum in self.aruco_dicts.items():
                if not self.running: break
                
                aruco_dict = self.get_dict(dict_enum)
                corners, ids, rejected = self.detect_markers_compat(gray, aruco_dict, self.parameters)
                
                if ids is not None and len(ids) > 0:
                    # Отрисовка
                    aruco.drawDetectedMarkers(frame_to_process, corners, ids)
                    
                    for i in range(len(ids)):
                        marker_id = ids[i][0]
                        # Вывод текста на экран
                        c = corners[i][0]
                        center_x = int(c[:, 0].mean())
                        center_y = int(c[:, 1].mean())
                        
                        text = f"{name}: {marker_id}"
                        cv2.putText(frame_to_process, text, (center_x - 50, center_y - 20), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Сохраняем обработанный кадр для отображения
            with self.frame_lock:
                self.processed_frame = frame_to_process

    def run(self):
        print("Запуск автоматического сканирования маркеров (многопоточный режим)... Нажмите 'q' для выхода.")
        
        # Запуск потоков
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
                         # Если обработанного еще нет, показываем сырой
                        display_frame = self.latest_frame.copy()
                
                if display_frame is not None:
                    cv2.imshow('Auto Detect Marker Type (Threaded)', display_frame)

                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.running = False
                    break
                
                # Ограничение FPS отрисовки интерфейса (чтобы не фризило GUI)
                time.sleep(0.03)
                
        finally:
            self.running = False
            t_capture.join(timeout=1.0)
            t_process.join(timeout=1.0)
            cv2.destroyAllWindows()

if __name__ == "__main__":
    detector = MarkerDetector()
    detector.run()
