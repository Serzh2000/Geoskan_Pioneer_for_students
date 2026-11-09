print('Высота по дальномеру, м: ' + str(pioneer.get_dist_sensor_data()))
for count in range(3):
  for i in range(4):
    pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#000000")][::-1])
    pioneer.led_control(i, *[c / 255 for c in hex_to_bgr("#ffaa00")][::-1])
    sleep(0.3)
pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#000000")][::-1])
