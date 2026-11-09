from pioneer_rknn import ModelRegistry
from pprint import pprint

registry = ModelRegistry()                 # по умолчанию url="http://127.0.0.1:7777/model"

models = registry.list_model()             # словарь с описанием моделей или None при ошибке
if models is None:
    raise SystemExit("Регистр моделей недоступен: проверьте, что сервис запущен на дроне")

print("Ответ регистра целиком:")
pprint(models)

for name in ("yolov8n", "yolov8n-seg", "yolov8n-pose", "PP-OCRv5_mobile_det"):
    info = registry.get_model_info(name=name)  # подробности по одной модели или None
    print("\n" + "-" * 60)
    print(name, "->", "нет в регистре" if info is None else "")
    if info is not None:
        pprint(info)
