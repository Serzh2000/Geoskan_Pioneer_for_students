"""Загрузка собственной ONNX-модели в регистр, проверка и (по желанию) удаление.

python3 02_registry_upload.py net.onnx my_classifier
"""
import sys
from pprint import pprint
from pioneer_rknn import ModelRegistry

onnx_path = sys.argv[1] if len(sys.argv) > 1 else "net.onnx"
model_name = sys.argv[2] if len(sys.argv) > 2 else "my_classifier"

registry = ModelRegistry()

result = registry.upload_model(
    name=model_name,      # под этим именем модель будет доступна в ModelContainer(model_name=...)
    version="",           # пустая строка — версия выставится автоматически (предыдущая + 1)
    filepath=onnx_path,   # файл ONNX, экспортированный с opset_version=19
    arch="custom",        # архитектура: "yolov8", "yolov8-pose", ... или "custom" для своей сети
)
print("Результат загрузки:")
pprint(result)

info = registry.get_model_info(name=model_name)
print("\nИнформация о модели:")
pprint(info)

if input("\nУдалить модель из регистра? [y/N] ").strip().lower() == "y":
    pprint(registry.delete_model(name=model_name))
