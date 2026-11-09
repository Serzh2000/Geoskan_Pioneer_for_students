while True:
  if pioneer.get_dist_sensor_data() < 0.5:
    pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#00ff00")][::-1])
  elif pioneer.get_dist_sensor_data() < 1:
    pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#ffaa00")][::-1])
  else:
    pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#ff0000")][::-1])
  sleep(0.5)
