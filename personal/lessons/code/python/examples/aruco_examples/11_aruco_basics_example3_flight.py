import cv2
import cv2.aruco as aruco
from pioneer_sdk import Pioneer, Camera
import threading
import time

class DroneFlightThread:
    def __init__(self):
        self.camera = Camera()
        self.drone = Pioneer()
        self.running = True
        self.latest_frame = None
        self.processed_frame = None
        self.frame_lock = threading.Lock()
        self.detected_ids = []
        
        # ArUco setup
        self.aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_6X6_50)
        
        if hasattr(aruco, 'DetectorParameters_create'):
            self.parameters = aruco.DetectorParameters_create()
        else:
            self.parameters = aruco.DetectorParameters()

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

            gray = cv2.cvtColor(frame_to_process, cv2.COLOR_BGR2GRAY)
            corners, ids, rejected = self.detect_markers_compat(gray)

            current_ids = []
            if ids is not None:
                aruco.drawDetectedMarkers(frame_to_process, corners, ids)
                current_ids = ids.flatten().tolist()
            
            # Update shared state
            self.detected_ids = current_ids

            with self.frame_lock:
                self.processed_frame = frame_to_process

    def flight_logic(self):
        print("Арминг и взлет...")
        self.drone.arm()
        time.sleep(1) # Даем автопилоту перейти в режим готовности
        self.drone.takeoff()
        time.sleep(2)
        
        print("Летим в точку наблюдения...")
        self.drone.go_to_local_point(x=0, y=0, z=1, yaw=0)
        
        landing_marker_id = 42
        
        while self.running:
            if landing_marker_id in self.detected_ids:
                print(f"Посадочный маркер ({landing_marker_id}) найден! Сажусь...")
                self.drone.land()
                self.running = False # Stop other threads
                break
            
            time.sleep(0.1)

    def run(self):
        print("Запуск полетной миссии... Нажмите ESC для выхода.")
        
        t_capture = threading.Thread(target=self.capture_thread)
        t_process = threading.Thread(target=self.processing_thread)
        t_flight = threading.Thread(target=self.flight_logic)
        
        t_capture.daemon = True
        t_process.daemon = True
        t_flight.daemon = True # Flight logic runs in background
        
        t_capture.start()
        t_process.start()
        t_flight.start()

        try:
            while self.running:
                display_frame = None
                with self.frame_lock:
                    if self.processed_frame is not None:
                        display_frame = self.processed_frame.copy()
                    elif self.latest_frame is not None:
                        display_frame = self.latest_frame.copy()
                
                if display_frame is not None:
                    cv2.imshow('Pioneer Camera', display_frame)

                if cv2.waitKey(1) == 27:
                    print("Принудительная посадка...")
                    self.drone.land()
                    self.running = False
                    break
                
                time.sleep(0.03)
                
        finally:
            self.running = False
            # Wait a bit for threads to notice
            time.sleep(0.5)
            cv2.destroyAllWindows()
            self.drone.close_connection()

if __name__ == "__main__":
    mission = DroneFlightThread()
    mission.run()
