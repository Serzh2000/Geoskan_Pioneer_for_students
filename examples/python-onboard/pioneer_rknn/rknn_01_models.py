from pioneer_rknn import ModelRegistry

# Регистр моделей - служба на борту дрона с файлами .rknn.
registry = ModelRegistry()

models = registry.list_model()
if models is None:
    print("Регистр моделей не отвечает")
else:
    print("Модели на дроне:")
    print(models)
    print(registry.get_model_info("yolov8n"))
