import cv2
import numpy as np
from pioneer_sdk import Camera
import cv2.aruco as aruco
import threading
import time

def load_coefficients(path):
    cv_file = cv2.FileStorage(path, cv2.FILE_STORAGE_READ)
    camera_matrix = cv_file.getNode("mtx").mat()
    dist_coeffs = cv_file.getNode("dist").mat()
    cv_file.release()
    return camera_matrix, dist_coeffs

class PoseEstimatorThread:
    def __init__(self, camera_matrix, dist_coeffs):
        self.camera = Camera()
        self.running = True
        self.latest_frame = None
        self.processed_frame = None
        self.frame_lock = threading.Lock()
        
        self.camera_matrix = camera_matrix
        self.dist_coeffs = dist_coeffs
        
        # Dictionary of aruco-markers
        self.aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_6X6_50)
        
        # Parameters for marker detection
        if hasattr(aruco, 'DetectorParameters_create'):
            self.parameters = aruco.DetectorParameters_create()
        else:
            self.parameters = aruco.DetectorParameters()
            
        self.size_of_marker = 0.05  # side length in meters
        
        # Coordinates of marker corners
        self.points_of_marker = np.array([
            (self.size_of_marker / 2, -self.size_of_marker / 2, 0),
            (-self.size_of_marker / 2, -self.size_of_marker / 2, 0),
            (-self.size_of_marker / 2, self.size_of_marker / 2, 0),
            (self.size_of_marker / 2, self.size_of_marker / 2, 0),
        ])

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

            # Detect markers
            corners, ids, rejected = self.detect_markers_compat(frame_to_process)
            
            if ids is not None and len(ids) > 0:
                # Calculate pose for first detected marker
                success, rvecs, tvecs = cv2.solvePnP(
                    self.points_of_marker, corners[0], self.camera_matrix, self.dist_coeffs
                )
                
                if success:
                    # Draw axes
                    cv2.drawFrameAxes(frame_to_process, self.camera_matrix, self.dist_coeffs, rvecs, tvecs, 0.1)
                    # print(f"Marker Pose: {tvecs.T}") # Optional logging

            with self.frame_lock:
                self.processed_frame = frame_to_process

    def run(self):
        print("Запуск оценки позы... Нажмите ESC для выхода.")
        
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
                    cv2.imshow("Pose Estimation", display_frame)

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
    # Ensure data.yml exists or provide correct path
    try:
        camera_matrix, dist_coeffs = load_coefficients("data.yml")
        estimator = PoseEstimatorThread(camera_matrix, dist_coeffs)
        estimator.run()
    except Exception as e:
        print(f"Ошибка загрузки калибровки или запуска: {e}")
        print("Убедитесь, что файл 'data.yml' с параметрами калибровки существует.")
