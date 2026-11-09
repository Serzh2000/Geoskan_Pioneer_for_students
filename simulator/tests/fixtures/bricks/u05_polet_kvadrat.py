
from pioneer_sdk2 import Pioneer
pioneer = Pioneer()

print("Начало программы")
try:
    pioneer.arm()
    pioneer.takeoff()
    pioneer.go_to_local_point(0,0,1,0,0)
    while not pioneer.point_reached():
        pass
    pioneer.go_to_local_point(1,0,1,0,0)
    while not pioneer.point_reached():
        pass
    pioneer.go_to_local_point(1,1,1,0,0)
    while not pioneer.point_reached():
        pass
    pioneer.go_to_local_point(0,1,1,0,0)
    while not pioneer.point_reached():
        pass
    pioneer.go_to_local_point(0,0,1,0,0)
    while not pioneer.point_reached():
        pass
    pioneer.land()
except Exception as e:
    print(e)
finally:
    pio = locals().get("pioneer")
    if pio is not None:
        try:
            pio.wait_callback = False
            pio.land()
            pio.close_connection()
        except Exception:
            pass

    for cam_name in ("cam_main", "cam_opt"):
        cam = locals().get(cam_name)
        if cam is not None:
            try:
                cam.stop()
            except Exception:
                pass

    viewer = locals().get("iv")
    if viewer is not None:
        try:
            viewer.close()
        except Exception:
            pass
        del viewer

    if pio is not None:
        del pio
    print("Конец программы")