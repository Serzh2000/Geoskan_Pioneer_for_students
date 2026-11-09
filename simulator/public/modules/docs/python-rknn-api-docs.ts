import type { ApiDoc } from './api-docs-types.js';

/*
 * Справочник pioneer_rknn - нейросетей на NPU Пионера Мини 2 (на дроне pioneer_rknn 1.10.0). Источник - сборник примеров
 * «Pioneer-RKNN», проверенный на дроне. Где симулятор ведёт себя иначе, чем дрон, это сказано в описании («В симуляторе: ...»).
 */

type Entry = [desc: string, syntax: string, params: string, returns: string, example: string, insertText: string, aliases?: string[]];

function method([desc, syntax, params, returns, example, insertText, aliases]: Entry, kind = 'Method'): ApiDoc {
    return { desc, syntax, params, returns, example, insertText, kind, ...(aliases ? { aliases } : {}) };
}

const VISION_NOTE = ' В симуляторе: модель .rknn не запускается, результат строится по объектам сцены (люди, машины, надписи), попавшим в поле зрения камеры дрона, а не по пикселям переданного массива; полностью чёрный вход ничего не даёт.';

const RELEASE_NOTE = ' Вызывайте в finally, как close_connection(): тогда NPU освобождается и после Ctrl+C, и после ошибки.';

const SHARED_ARGS = 'model_name - имя модели из регистра; model_path - путь к своему файлу .rknn (только на дроне; нужен один из двух, иначе ValueError); npu_core - ядро NPU [0], [1], [0, 1] или None (у RK3576 два ядра; неверный номер завершает программу); object_thresh - порог уверенности 0..1; nms_thresh - порог перекрытия рамок (IoU); img_width, img_height - размер входа модели (640x640)';

export const pythonRknnApiDocs: Record<string, ApiDoc> = {
    'Yolo': method([
        'Поиск объектов нейросетью YOLO (архитектуры yolov8, yolov11, yolov26). Модель yolov8n обучена на COCO, 80 классов: человек 0, машина 2, собака 16, бутылка 39. Модель берут из регистра по имени (model_name) или из файла .rknn (model_path). object_thresh (0.25) отбрасывает находки с меньшей уверенностью, nms_thresh (0.45) задаёт перекрытие рамок, при котором остаётся одна, самая уверенная. Оба порога - обычные атрибуты объекта: model.object_thresh = 0.5 меняет их без перезагрузки модели. Нет имени и пути - ValueError, имени нет в регистре - FileNotFoundError, архитектура не подходит классу - ValueError.'
            + VISION_NOTE + ' Из классов COCO в сцене есть: person (0), car (2), bus (5), train (6), truck (7); деревьев и зданий в COCO нет, yolov8n их не находит. Файлов .rknn в симуляторе нет: model_path недоступен, работает model_name.',
        'Yolo(model_path=None, model_name=None, npu_core=None, object_thresh=0.25, nms_thresh=0.45, img_width=640, img_height=640)',
        SHARED_ARGS,
        'объект Yolo',
        'from pioneer_rknn import Yolo\nmodel = Yolo(model_name="yolov8n")',
        'Yolo(model_name="${1:yolov8n}")',
        ['нейросеть', 'yolo', 'распознавание', 'детектор', 'rknn', 'npu']
    ], 'Class'),
    'Yolo.run': method([
        'Запуск нейросети на одном кадре. Вход - список из одного массива формы (1, 640, 640, 3): кадр, сжатый до 640x640, с измерением пакета (np.expand_dims(cv2.resize(frame, (640, 640)), 0)). Другая форма - ValueError. Возвращает кортеж (boxes, classes, scores): рамки - массив Nx4 из (x1, y1, x2, y2) в пикселях входа 640x640, классы - номера COCO, уверенности - числа 0..1. Если объектов нет, возвращает None (проверяйте result is None or result[0] is None). Рамки пересчитывают в координаты кадра: x * ширина_кадра / 640, y * высота_кадра / 640.'
            + VISION_NOTE,
        'model.run(inputs) -> (boxes, classes, scores) | None',
        'inputs - [np.ndarray формы (1, 640, 640, 3)]',
        '(boxes, classes, scores) или None, если ничего не найдено',
        'tensor = np.expand_dims(cv2.resize(frame, (640, 640)), 0)\nresult = model.run([tensor])\nif result is not None and result[0] is not None:\n    for (x1, y1, x2, y2), cls, score in zip(*result):\n        print(int(cls), round(float(score), 2))',
        'run([${1:np.expand_dims(cv2.resize(frame, (640, 640)), 0)}])',
        ['запуск нейросети', 'найти объекты']
    ]),
    'Yolo.release': method([
        'Освободить нейропроцессор (NPU).' + RELEASE_NOTE,
        'model.release()',
        'нет',
        'None',
        'try:\n    ...\nfinally:\n    model.release()',
        'release()',
        ['освободить', 'npu']
    ]),
    'YoloSeg': method([
        'Сегментация экземпляров (архитектуры yolov8-seg, yolov11-seg, yolov26-seg, модель yolov8n-seg): как Yolo, но к каждой рамке добавлена маска объекта. Аргументы те же, что у Yolo.'
            + VISION_NOTE + ' Маска в симуляторе - выпуклый контур проекции объекта (у человека - оболочка скелета с отступом, у машины - оболочка габаритной коробки), а не контур по пикселям.',
        'YoloSeg(model_path=None, model_name=None, npu_core=None, object_thresh=0.25, nms_thresh=0.45, img_width=640, img_height=640)',
        SHARED_ARGS,
        'объект YoloSeg',
        'from pioneer_rknn import YoloSeg\nmodel = YoloSeg(model_name="yolov8n-seg")',
        'YoloSeg(model_name="${1:yolov8n-seg}")',
        ['сегментация', 'маски']
    ], 'Class'),
    'YoloSeg.run': method([
        'Запуск на одном кадре (вход как у Yolo.run). Возвращает четыре массива (boxes, classes, scores, masks) или None. masks - массив N x 640 x 640 из 0 и 1: маска каждого объекта уже растянута до 640x640 и обрезана по рамке; к кадру её растягивают cv2.resize(..., interpolation=cv2.INTER_NEAREST).'
            + VISION_NOTE,
        'model.run(inputs) -> (boxes, classes, scores, masks) | None',
        'inputs - [np.ndarray формы (1, 640, 640, 3)]',
        '(boxes, classes, scores, masks) или None',
        'result = model.run([tensor])\nif result is not None and result[0] is not None:\n    boxes, classes, scores, masks = result\n    print(masks.shape)',
        'run([${1:tensor}])',
        ['маски объектов']
    ]),
    'YoloSeg.release': method([
        'Освободить нейропроцессор (NPU).' + RELEASE_NOTE,
        'model.release()',
        'нет',
        'None',
        'finally:\n    model.release()',
        'release()',
        ['освободить', 'npu']
    ]),
    'YoloPose': method([
        'Поиск людей и 17 ключевых точек скелета каждого (архитектура yolov8-pose, модель yolov8n-pose). Аргументы те же, что у Yolo; пороги по умолчанию object_thresh=0.4, nms_thresh=0.5.'
            + VISION_NOTE + ' Точки скелета в симуляторе берутся с шарнирной фигуры человека сцены (плечи, локти, запястья, бёдра, колени, лодыжки - из положения суставов; нос, глаза и уши - по пропорциям головы), поэтому поза честная: поднятые руки в сцене дают запястья выше плеч. Точки вне кадра имеют уверенность около 0, лицо у стоящего спиной - низкую.',
        'YoloPose(model_path=None, model_name=None, npu_core=None, object_thresh=0.4, nms_thresh=0.5, img_width=640, img_height=640)',
        SHARED_ARGS,
        'объект YoloPose',
        'from pioneer_rknn import YoloPose\nmodel = YoloPose(model_name="yolov8n-pose")',
        'YoloPose(model_name="${1:yolov8n-pose}")',
        ['поза', 'скелет', 'человек', 'ключевые точки']
    ], 'Class'),
    'YoloPose.run': method([
        'Запуск на одном кадре (вход как у Yolo.run). Возвращает список найденных людей (DetectBox); пустой список - никого. У каждого: classId, score (уверенность), xmin, ymin, xmax, ymax (рамка в пикселях входа 640x640) и keypoint - массив 17x3: x, y и уверенность каждой точки. Номера точек по COCO: 0 нос, 1-2 глаза, 3-4 уши, 5-6 плечи (левое, правое), 7-8 локти, 9-10 запястья, 11-12 бёдра, 13-14 колени, 15-16 лодыжки. Ось y направлена вниз: «выше» значит «меньше по y».'
            + VISION_NOTE,
        'model.run(inputs) -> list[DetectBox]',
        'inputs - [np.ndarray формы (1, 640, 640, 3)]',
        'список людей (classId, score, xmin, ymin, xmax, ymax, keypoint)',
        'people = model.run([tensor])\nfor person in people:\n    k = person.keypoint\n    hands_up = k[9][1] < k[5][1] and k[10][1] < k[6][1]\n    print(round(person.score, 2), hands_up)',
        'run([${1:tensor}])',
        ['поза человека', 'руки вверх']
    ]),
    'YoloPose.release': method([
        'Освободить нейропроцессор (NPU).' + RELEASE_NOTE,
        'model.release()',
        'нет',
        'None',
        'finally:\n    model.release()',
        'release()',
        ['освободить', 'npu']
    ]),
    'DetectBox': method([
        'Один человек в ответе YoloPose.run (YoloPose.DetectBox). Поля: classId, score - уверенность, xmin, ymin, xmax, ymax - рамка в пикселях входа 640x640, keypoint - массив 17x3 (x, y, уверенность) в тех же пикселях.',
        'person.score, person.xmin, person.ymin, person.xmax, person.ymax, person.keypoint',
        'нет',
        'поля результата',
        'person = people[0]\nnose_x, nose_y, nose_score = person.keypoint[0]',
        'DetectBox',
        ['человек', 'результат позы']
    ], 'Class'),
    'PaddleOCR': method([
        'Чтение текста (OCR, PP-OCRv5): две нейросети подряд - детектор находит строки текста и обводит их четырёхугольниками, распознаватель читает буквы. Названия моделей должны совпадать с именами в регистре; строки с уверенностью ниже drop_score = 0.5 библиотека отбрасывает сама.'
            + VISION_NOTE + ' Текст в сцене симулятора есть только на площадках: хелипорт («H», «ПОСАДКА»), станция заряда («ЗАРЯДКА»), стартовая позиция (номер и «СТАРТ / N»). Строка читается, если видна целиком, обращена к камере и выше 9 пикселей (подпись площадки - около 6 см, поэтому читается вблизи, 1-2 м).',
        'PaddleOCR(det_model_name="PP-OCRv5_mobile_det", rec_model_name="eslav_PP-OCRv5_mobile_rec", npu_core=None, det_model_path=None, rec_model_path=None)',
        'det_model_name - модель-детектор строк; rec_model_name - модель-распознаватель (eslav - кириллица и латиница); npu_core - ядро NPU; *_model_path - файлы .rknn (только на дроне)',
        'объект PaddleOCR',
        'from pioneer_rknn import PaddleOCR\nocr = PaddleOCR(det_model_name="PP-OCRv5_mobile_det",\n                rec_model_name="eslav_PP-OCRv5_mobile_rec")',
        'PaddleOCR(det_model_name="${1:PP-OCRv5_mobile_det}", rec_model_name="${2:eslav_PP-OCRv5_mobile_rec}")',
        ['ocr', 'текст', 'распознавание текста', 'надпись']
    ], 'Class'),
    'PaddleOCR.run': method([
        'Читает текст на кадре. В отличие от Yolo получает кадр камеры целиком (высота x ширина x 3), без подготовки и resize. Возвращает два списка: четырёхугольники строк (массивы 4x2: углы по часовой стрелке от левого верхнего) и варианты прочтения для каждой строки - списки пар (текст, уверенность); первый вариант самый вероятный. Если текста нет, возвращает (None, None).'
            + VISION_NOTE,
        'ocr.run(img=frame) -> (boxes, results) | (None, None)',
        'img - кадр камеры, np.ndarray (высота, ширина, 3)',
        '(boxes, results) или (None, None)',
        'boxes, results = ocr.run(img=frame)\nfor variants in results or []:\n    text, score = variants[0]\n    print(text, round(score, 2))',
        'run(img=${1:frame})',
        ['прочитать текст']
    ]),
    'PaddleOCR.release': method([
        'Освободить нейропроцессор (NPU).' + RELEASE_NOTE + ' В сборнике для PaddleOCR не показан; в симуляторе метод есть для единообразия.',
        'ocr.release()',
        'нет',
        'None',
        'finally:\n    ocr.release()',
        'release()',
        ['освободить', 'npu']
    ]),
    'ModelContainer': method([
        'Базовый класс: загрузка модели .rknn и запуск на NPU; от него наследуют Yolo, YoloSeg, YoloPose и свои модели. Нужен model_path или model_name. У класса есть атрибут arch (у базового ["custom"]), по нему проверяется архитектура модели в регистре; в наследниках он обязателен. Напрямую нужен для «сырых» выходов NPU (ModelContainer.run(model, [tensor])) и своих сетей.'
            + ' В симуляторе: «сырые» выходы считаются только у моделей YOLO из регистра (формы настоящие; у yolov8n значения собраны из найденного в сцене, у -seg и -pose нулевые); своя модель в браузере не запускается.',
        'ModelContainer(model_path=None, model_name=None, npu_core=None)',
        'model_name - имя из регистра; model_path - путь к файлу .rknn (только на дроне); npu_core - ядро NPU',
        'объект ModelContainer',
        'from pioneer_rknn import ModelContainer\nraw = ModelContainer.run(model, [tensor])  # только NPU, без постобработки',
        'ModelContainer(model_name="${1:yolov8n}")',
        ['контейнер модели', 'npu', 'сырые выходы']
    ], 'Class'),
    'ModelContainer.run': method([
        'Только NPU, без постобработки: список «сырых» выходов модели. Принимает список входов и одиночный массив. После release() возвращает пустой список. У yolov8n выходов 9: (1,64,80,80), (1,80,80,80), (1,1,80,80) и так для сеток 40x40 и 20x20; у yolov8n-seg 13; у yolov8n-pose 4.',
        'ContainerClass.run(model, inputs) -> list[ndarray]',
        'inputs - список входов или массив',
        'список массивов',
        'raw = ModelContainer.run(model, [tensor])\nprint([tuple(t.shape) for t in raw])',
        'run(${1:model}, [${2:tensor}])',
        ['сырые выходы']
    ]),
    'ModelContainer.release': method([
        'Освободить ресурсы NPU, занятые моделью.' + RELEASE_NOTE,
        'model.release()',
        'нет',
        'None',
        'finally:\n    model.release()',
        'release()',
        ['освободить', 'npu']
    ]),
    'ModelRegistry': method([
        'Регистр моделей - служба на борту дрона (адрес http://127.0.0.1:7777/model), где хранятся файлы .rknn. По имени из регистра модель и загружают: Yolo(model_name="yolov8n"). В симуляторе в регистре пять предустановленных моделей: yolov8n, yolov8n-seg, yolov8n-pose, PP-OCRv5_mobile_det, eslav_PP-OCRv5_mobile_rec.',
        'ModelRegistry(url="http://127.0.0.1:7777/model")',
        'url - адрес сервиса (по умолчанию верный)',
        'объект ModelRegistry',
        'from pioneer_rknn import ModelRegistry\nregistry = ModelRegistry()',
        'ModelRegistry()',
        ['регистр моделей', 'модели на дроне']
    ], 'Class'),
    'ModelRegistry.list_model': method([
        'Модели регистра: список словарей, по одному на модель. При ошибке (регистр не отвечает) возвращает None. Запустите перед работой с моделями: имена в программах должны совпадать с теми, что напечатает список. Поля словаря: name, version, arch, filename.',
        'registry.list_model() -> list[dict] | None',
        'нет',
        'список моделей или None',
        'models = registry.list_model()\nif models is None:\n    print("Регистр не отвечает")\nelse:\n    for model in models:\n        print(model["name"], model["arch"], model["version"])',
        'list_model()',
        ['список моделей']
    ]),
    'ModelRegistry.get_model_info': method([
        'Сведения об одной модели регистра: словарь name, version, arch, filename. При ошибке (например, такой модели нет) возвращает None.',
        'registry.get_model_info(name) -> dict | None',
        'name - имя модели',
        'сведения о модели или None',
        'print(registry.get_model_info(name="yolov8n"))',
        'get_model_info(name="${1:yolov8n}")',
        ['сведения о модели', 'архитектура модели']
    ]),
    'ModelRegistry.upload_model': method([
        'Добавляет свою модель в регистр: имя, версия (пустая строка - предыдущая + 1), путь к файлу ONNX (opset 19) или .rknn и архитектура ("yolov8", "yolov8-pose" и т.д. или "custom" для своей сети). Конвертацию ONNX в .rknn выполняет сервис регистра. В симуляторе упрощено: файл не читается, в регистре появляется только запись (её видно в list_model и get_model_info), а запустить свою сеть в браузере нельзя.',
        'registry.upload_model(name, version, filepath, arch)',
        'name - имя в регистре; version - версия или ""; filepath - файл .onnx или .rknn; arch - архитектура',
        'словарь с записью о модели',
        'registry.upload_model(name="my_net", version="", filepath="net.onnx", arch="custom")',
        'upload_model(name="${1:my_net}", version="", filepath="${2:net.onnx}", arch="${3:custom}")',
        ['загрузить модель', 'своя модель']
    ]),
    'ModelRegistry.delete_model': method([
        'Удаляет модель из регистра. Возвращает словарь с результатом или None (модели нет). В симуляторе предустановленные модели не удаляются (возвращается None).',
        'registry.delete_model(name) -> dict | None',
        'name - имя модели',
        'словарь с результатом или None',
        'registry.delete_model(name="my_net")',
        'delete_model(name="${1:my_net}")',
        ['удалить модель']
    ])
};
