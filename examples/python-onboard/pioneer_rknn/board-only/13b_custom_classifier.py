"""(Запускается на ДРОНЕ) Собственная модель через наследование ModelContainer.

Перед запуском загрузите cifar_net.onnx в регистр под именем "cifar_net" с arch="custom".
"""
import cv2
import numpy as np
from pioneer_rknn import ModelContainer
from pioneer_sdk2 import Camera, ImageViewer

CLASSES = ("plane", "car", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck")


class CifarClassifier(ModelContainer):
    arch = ["custom"]                  # обязательно: по этому имени проверяется модель в регистре

    def __init__(self, model_name="cifar_net", npu_core=None, top_k=3):
        super().__init__(model_path=None, model_name=model_name, npu_core=npu_core)
        self.top_k = top_k

    @staticmethod
    def pre_process(frame):
        """BGR-кадр -> (1, 32, 32, 3) float32 RGB в диапазоне 0..1 — так сеть обучалась."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        small = cv2.resize(rgb, (32, 32), interpolation=cv2.INTER_AREA)
        return np.expand_dims(small.astype(np.float32) / 255.0, 0)

    def post_process(self, outputs):
        """Логиты -> список (класс, вероятность) лучших top_k вариантов."""
        logits = np.asarray(outputs[0]).reshape(-1)
        probs = np.exp(logits - logits.max())
        probs /= probs.sum()                                  # softmax
        best = np.argsort(probs)[::-1][:self.top_k]
        return [(CLASSES[i], float(probs[i])) for i in best]

    def run(self, frame):
        outputs = super().run([self.pre_process(frame)])      # «сырые» выходы NPU
        if not outputs:                                       # пустой список — ресурсы уже освобождены
            return None
        return self.post_process(outputs)


camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/classify/")
model = CifarClassifier()

try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue
        top = model.run(frame)
        if top:
            for i, (name, p) in enumerate(top):
                cv2.putText(frame, f"{name}: {p:.0%}", (10, 30 + 28 * i), cv2.FONT_HERSHEY_SIMPLEX,
                            0.8, (0, 255, 0) if i == 0 else (200, 200, 200), 2)
        viewer.imshow("classify", frame)   # трансляция: 10.42.0.1:8889/classify
except KeyboardInterrupt:
    pass
finally:
    viewer.close()
    camera.stop()
    model.release()
