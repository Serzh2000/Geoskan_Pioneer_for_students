servo.set_angle(angle=15)
sleep(2)
img = cam_main.get_cv_frame()

cv2.imwrite("/mnt/media/photos/" + 'ugol_plus15' + ".jpg", img.copy())
servo.set_angle(angle=-45)
sleep(2)
img = cam_main.get_cv_frame()

cv2.imwrite("/mnt/media/photos/" + 'ugol_minus45' + ".jpg", img.copy())
servo.set_angle(angle=0)
