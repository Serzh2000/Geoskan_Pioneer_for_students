print("Выбрана модель:Yolo")
IMG_SIZE = (640, 640)

model_yolo = Yolo(model_name=model_name_picker("Yolo"))
while True:
  img = cam_main.get_cv_frame()

  people = yolo_find_on_image(img, (results_img := infer_cache_per_frame("results_img", img, lambda fr: model_yolo.run([resize_img_yolo(fr)]))), classNames_yolo, class_filter=["person"])

  draw_yolo_on_image(img, people, hex_to_bgr("#00ff00"))
  iv.imshow(name='people', frame=img)
