print("Выбрана модель:PaddleOCR")
model_ppocr = PaddleOCR(det_model_name=model_name_picker("PaddleOCR")[0],
                  rec_model_name=model_name_picker("PaddleOCR")[1])
while True:
  img = cam_main.get_cv_frame()

  ocr = [results_ppocr_img := infer_cache_per_frame("results_ppocr_img", img, lambda fr: model_ppocr.run(fr))]
  text = "\n".join([text for group in ocr[0][1] for (text, _) in group])
  print(text)
  iv.imshow(name='ocr', frame=img)
  sleep(1)
