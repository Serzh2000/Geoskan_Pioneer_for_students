import time
from pioneer_sdk import Pioneer

def main():
    drone = Pioneer()
    try:
        drone.arm()
        time.sleep(1) # Даем автопилоту перейти в режим готовности
        drone.takeoff()
        time.sleep(3)
        
        # ... Ваш код ...
        
        drone.land()
    except Exception as e:
        print(f"Error: {e}")
        drone.land()
    finally:
        drone.disarm()
        drone.close_connection()

if __name__ == "__main__":
    main()
