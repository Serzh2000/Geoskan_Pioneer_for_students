print('Высота по дальномеру, м: ' + str(pioneer.get_dist_sensor_data()))
print("Выбрана модель:YoloPose")
IMG_SIZE = (640, 640)

model_yolopose = YoloPose(model_name=model_name_picker("YoloPose"))
while True:
  img = cam_main.get_cv_frame()

  if pose_compare(find_poses(img, (results_img := infer_cache_per_frame("results_img", img, lambda fr: model_yolopose.run([resize_img_yolopose(fr)]))))
  , "two_hand_up", last_cmds):
    pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#00ff00")][::-1])
  else:
    pioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#000000")][::-1])
  draw_poses(img, find_poses(img, (results_img := infer_cache_per_frame("results_img", img, lambda fr: model_yolopose.run([resize_img_yolopose(fr)]))))
  , tracker_state)
  iv.imshow(name='pose', frame=img)
