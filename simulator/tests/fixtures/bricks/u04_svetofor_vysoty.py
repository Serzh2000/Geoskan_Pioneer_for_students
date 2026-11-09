
from pioneer_sdk2 import Pioneer
pioneer = Pioneer()

def hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
    if hex_color.startswith("#"):
        hex_color = hex_color[1:]
    if len(hex_color) != 6:
        raise ValueError("Hex color must be in format #RRGGBB")

    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    return (b, g, r)

from time import sleep

print("Начало программы")
try:
    while True:
      if pioneer.get_dist_sensor_data() < 0.5:
        pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#00ff00")][::-1])
      elif pioneer.get_dist_sensor_data() < 1:
        pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#ffaa00")][::-1])
      else:
        pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#ff0000")][::-1])
      sleep(0.5)
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