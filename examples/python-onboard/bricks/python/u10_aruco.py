while True:
  img = cam_main.get_cv_frame()

  markers = aruco_find_on_image('img', img, cv2.aruco.DICT_4X4_50)
  draw_aruco_on_image(img, markers, None, color=(0,255,0))
  iv.imshow(name='aruco', frame=img)
