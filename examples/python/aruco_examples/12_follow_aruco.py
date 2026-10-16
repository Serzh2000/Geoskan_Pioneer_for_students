import cv2
import cv2.aruco as aruco
import numpy as np
from pioneer_sdk import Pioneer, Camera
import threading
import time
from collections import deque

def load_coefficients(path):
    try:
        cv_file = cv2.FileStorage(path, cv2.FILE_STORAGE_READ)
        camera_matrix = cv_file.getNode("mtx").mat()
        dist_coeffs = cv_file.getNode("dist").mat()
        cv_file.release()
        return camera_matrix, dist_coeffs
    except Exception:
        print("Warning: Calibration file not found, using dummy values.")
        return np.eye(3), np.zeros((5, 1))

class FollowArucoThread:
    def __init__(self, camera_matrix, dist_coeffs):
        self.camera = Camera()
        self.drone = Pioneer()
        self.running = True
        self.latest_frame = None
        self.processed_frame = None
        self.frame_lock = threading.Lock()
        
        self.camera_matrix = camera_matrix
        self.dist_coeffs = dist_coeffs
        
        # Flight control variables
        self.latest_coordinates = None # [x, y, z] relative to camera
        self.x_center = None
        
        # ArUco setup
        self.aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_4X4_50)
        
        if hasattr(aruco, 'DetectorParameters_create'):
            self.parameters = aruco.DetectorParameters_create()
        else:
            self.parameters = aruco.DetectorParameters()
            
        self.size_of_marker = 0.1 # m
        self.points_of_marker = np.array([
            (self.size_of_marker / 2, -self.size_of_marker / 2, 0),
            (-self.size_of_marker / 2, -self.size_of_marker / 2, 0),
            (-self.size_of_marker / 2, self.size_of_marker / 2, 0),
            (self.size_of_marker / 2, self.size_of_marker / 2, 0),
        ])

        # FPS calculation
        self.frame_times = deque(maxlen=30)
        self.last_fps_log_time = time.time()

    def detect_markers_compat(self, image):
        if hasattr(aruco, 'ArucoDetector'):
            detector = aruco.ArucoDetector(self.aruco_dict, self.parameters)
            return detector.detectMarkers(image)
        else:
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

            try:
                corners, ids, _ = self.detect_markers_compat(frame_to_process)

                if ids is not None and len(corners) > 0:
                    # Calculate center for visualization
                    x_c = int(sum([p[0] for p in corners[0][0]]) / 4)
                    y_c = int(sum([p[1] for p in corners[0][0]]) / 4)
                    
                    # Draw visual feedback
                    dot_size = 5
                    frame_to_process[y_c - dot_size:y_c + dot_size, x_c - dot_size:x_c + dot_size] = [0, 0, 255]
                    aruco.drawDetectedMarkers(frame_to_process, corners)

                    # Solve PnP
                    success, rvecs, tvecs = cv2.solvePnP(
                        self.points_of_marker, corners[0], self.camera_matrix, self.dist_coeffs
                    )
                    
                    if success:
                        self.latest_coordinates = [tvecs.item(0), tvecs.item(1), tvecs.item(2)]
                        self.x_center = x_c
                    else:
                        self.latest_coordinates = None
                        self.x_center = None
                else:
                    self.latest_coordinates = None
                    self.x_center = None

                # FPS Logging
                now = time.time()
                self.frame_times.append(now)
                if now - self.last_fps_log_time > 2.0 and len(self.frame_times) > 1:
                    fps = len(self.frame_times) / (self.frame_times[-1] - self.frame_times[0])
                    # print(f"[Video Thread] FPS: {fps:.2f}")
                    self.last_fps_log_time = now

                with self.frame_lock:
                    self.processed_frame = frame_to_process
                    
            except cv2.error as e:
                print(f"OpenCV error: {e}")

    def control_loop(self):
        """Main control loop for following the marker"""
        # Note: This logic assumes we want to control the drone based on vision.
        # Implementation depends on specific requirements (e.g., keep marker in center).
        
        # Simple P-controller constants
        k_p_yaw = 0.1
        k_p_fwd = 0.2
        target_dist = 1.0
        
        while self.running:
            if self.latest_coordinates is not None:
                x, y, z = self.latest_coordinates
                dist = z # Z in camera frame is distance forward
                
                # Simple logic: 
                # 1. Rotate to keep x near 0 (center of image horizontally)
                # 2. Move forward/back to keep z near target_dist
                
                yaw_cmd = 0 # Calculate based on x
                vx_cmd = 0  # Calculate based on z
                
                # Placeholder for actual control logic
                # self.drone.set_manual_speed(vx=vx_cmd, vy=0, vz=0, yaw_rate=yaw_cmd)
                pass
            
            time.sleep(0.05)

    def run(self):
        print("Запуск следования за маркером... Нажмите ESC для выхода.")
        
        t_capture = threading.Thread(target=self.capture_thread)
        t_process = threading.Thread(target=self.processing_thread)
        t_control = threading.Thread(target=self.control_loop)
        
        t_capture.daemon = True
        t_process.daemon = True
        t_control.daemon = True
        
        t_capture.start()
        t_process.start()
        t_control.start()

        try:
            while self.running:
                display_frame = None
                with self.frame_lock:
                    if self.processed_frame is not None:
                        display_frame = self.processed_frame.copy()
                    elif self.latest_frame is not None:
                        display_frame = self.latest_frame.copy()
                
                if display_frame is not None:
                    cv2.imshow('Follow ArUco', display_frame)

                if cv2.waitKey(1) == 27:
                    self.running = False
                    break
                
                time.sleep(0.03)
                
        finally:
            self.running = False
            time.sleep(0.5)
            cv2.destroyAllWindows()
            self.drone.close_connection()

if __name__ == "__main__":
    camera_matrix, dist_coeffs = load_coefficients("data.yml")
    follower = FollowArucoThread(camera_matrix, dist_coeffs)
    follower.run()
