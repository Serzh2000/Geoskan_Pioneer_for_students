from pioneer_sdk2 import Pioneer, RecorderControl, CameraType
import time

PHOTO_POINTS = [(1, 0), (1, 1), (0, 1)]       # в этих точках делаем фото
HEIGHT = 1.2

drone = Pioneer()
recorder = RecorderControl()

configs = recorder.get_camera_recording_configs(CameraType.MAIN)   # доступные режимы: ширина, высота, fps
print("Режимы записи основной камеры:")
for i, config in enumerate(configs):
    print(f"  [{i}] {config}")
config = configs[0] if configs else None      # None — библиотека выберет первый доступный режим


def wait_point():
    while not drone.point_reached():
        time.sleep(0.1)


recording = False
try:
    recorder.start_recording(CameraType.MAIN, config)   # запись идёт параллельно с полётом
    recording = True
    drone.arm()
    drone.takeoff()

    for n, (x, y) in enumerate(PHOTO_POINTS, start=1):
        drone.go_to_local_point(x=x, y=y, z=HEIGHT, yaw=0, time=0)
        wait_point()
        time.sleep(1)                         # гасим раскачку перед снимком
        name = f"point_{n}_{time.strftime('%H%M%S')}.jpg"
        recorder.take_photo(name, CameraType.MAIN, config)
        print("Фото:", name)

    drone.go_to_local_point(x=0, y=0, z=HEIGHT, yaw=0, time=0)
    wait_point()
    drone.land()
finally:
    if recording:
        recorder.stop_recording(CameraType.MAIN)   # видео попадёт в /mnt/media/videos/
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.close_connection()
