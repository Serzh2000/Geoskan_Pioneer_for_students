/*
 * pioneer_rknn в симуляторе - библиотека нейросетей на NPU Пионера Мини 2 (PyPI-пакета нет; на дроне pioneer_rknn 1.10.0).
 * Источник - сборник примеров «Pioneer-RKNN» (проверено на дроне): формы входа и ответа повторяют настоящую библиотеку:
 *  - Yolo.run([массив (1, 640, 640, 3)]) -> (boxes Nx4, classes N, scores N) или None, если ничего не найдено;
 *  - YoloSeg.run(...) -> (boxes, classes, scores, masks N x 640 x 640) или None;
 *  - YoloPose.run(...) -> список DetectBox: classId, score, xmin, ymin, xmax, ymax, keypoint (17 x 3);
 *  - PaddleOCR.run(img=кадр) -> (четырёхугольники, [[(текст, уверенность)], ...]) или (None, None);
 *  - ModelContainer.run(...) -> список «сырых» выходов NPU (у моделей YOLO - выходы нужной формы, заполненные по сцене);
 *  - ModelRegistry: list_model() (список словарей), get_model_info(name), upload_model(...), delete_model(name).
 *
 * Модели .rknn в браузере не запустить, поэтому нейросеть заменена «зрением» симулятора: результат строится по объектам сцены,
 * попавшим в поле зрения камеры дрона (pioneer-rknn-scene.ts), а не по пикселям переданного массива. Исключение - пустой
 * (полностью чёрный) вход: на нём, как и у настоящей модели, ничего не найдётся.
 * Библиотека доступна только на Пионере Мини 2; у других дронов конструкторы останавливаются с подсказкой.
 */
export const PIONEER_RKNN_PRELUDE = `
import builtins as _builtins, sys as _sys, types as _types
import js as _js

_rknn = _types.ModuleType('pioneer_rknn')

_RK_ROOT = "/usr/local/bin/model-registry/models/"

def _rk_entry(name, arch, version="1.0.0"):
    return {"name": name, "version": version, "arch": arch, "filename": _RK_ROOT + name + "/" + name + "_" + version + ".rknn"}

# Предустановленные модели регистра на дроне (имена и архитектуры YOLO - из сборника; архитектуры OCR-моделей придуманы симулятором).
_RK_MODELS = [
    _rk_entry("yolov8n", "yolov8"),
    _rk_entry("yolov8n-seg", "yolov8-seg"),
    _rk_entry("yolov8n-pose", "yolov8-pose"),
    _rk_entry("PP-OCRv5_mobile_det", "ppocrv5-det"),
    _rk_entry("eslav_PP-OCRv5_mobile_rec", "ppocrv5-rec"),
]
_RK_NPU_CORES = (0, 1)

def _rk_print(text):
    # Мимо пузыря над дроном, в журнал симулятора: так печатает сама библиотека, а не программа.
    getattr(_builtins, "__sim_base_print", print)(text)
    _js.pioneer2_log(text)

_RK_NOTED = {}

def _rk_note(key, text):
    # Раз за запуск программы: раннер заводит для каждого запуска новый список фоновых задач.
    token = id(getattr(_builtins, "__sim_bg_tasks", None))
    if _RK_NOTED.get(key) != token:
        _RK_NOTED[key] = token
        _rk_print("[симулятор] " + text)

def _rk_vision_note():
    _rk_note("vision", "pioneer_rknn: нейросеть заменена зрением симулятора - результат строится по людям, машинам и надписям сцены в поле зрения камеры дрона, а не по пикселям переданного кадра.")

def _rk_drone():
    drone_id = str(_js.SIM_DRONE_ID)
    if str(_js.pioneer2_drone_model(drone_id)) != "pioneer-mini2":
        raise RuntimeError(
            "pioneer_rknn - библиотека Пионера Мини 2 (нейросети на борту), а выбран другой дрон. "
            "Добавьте дрон «Пионер Мини 2» на панели «Рой».")
    return drone_id

def _rk_numpy():
    try:
        import numpy
        return numpy
    except Exception:
        return None

def _rk_has_picture(array):
    # Полностью чёрный вход (np.zeros) - модель не видит ничего. Остальное решает сцена, а не пиксели.
    np = _rk_numpy()
    if np is None:
        return True
    try:
        return bool(np.any(array))
    except Exception:
        return True

def _rk_find(name):
    for entry in _RK_MODELS:
        if entry["name"] == name:
            return entry
    return None

def _rk_check_cores(npu_core):
    if npu_core is None:
        return None
    cores = list(npu_core) if isinstance(npu_core, (list, tuple)) else [npu_core]
    if not cores or any(core not in _RK_NPU_CORES for core in cores):
        # Как в настоящей библиотеке: сообщение и завершение программы, а не исключение.
        _rk_print("Ядра NPU: " + str(npu_core) + ". У RK3576 их два: 0 и 1 (или None).")
        raise SystemExit(1)
    return cores

class ModelContainer:
    """Загруженная модель на NPU. Основа Yolo, YoloSeg, YoloPose; от неё наследуют и свои модели."""
    arch = ["custom"]

    def __init__(self, model_path=None, model_name=None, npu_core=None):
        self._drone = _rk_drone()
        if model_path is None and model_name is None:
            raise ValueError("Укажите model_name (имя из регистра) или model_path (файл .rknn)")
        if model_path is not None:
            raise FileNotFoundError(
                "Файл модели не найден: " + str(model_path) + ". В симуляторе нет файловой системы дрона: "
                "используйте model_name из регистра - его печатает ModelRegistry().list_model().")
        info = _rk_find(model_name)
        if info is None:
            raise FileNotFoundError("Модели «" + str(model_name) + "» нет в регистре дрона. Доступны: " + ", ".join(e["name"] for e in _RK_MODELS) + ".")
        if info["arch"] not in self.arch:
            raise ValueError(
                "Модель «" + str(model_name) + "» (архитектура " + info["arch"] + ") не подходит для " + type(self).__name__
                + ": нужна архитектура " + " или ".join(self.arch) + ".")
        self.model_name = model_name
        self.model_path = None
        self.npu_core = _rk_check_cores(npu_core)
        self._info = dict(info)
        self._released = False

    def run(self, inputs):
        """Только NPU, без постобработки: список «сырых» выходов (пустой после release())."""
        if self._released:
            return []
        np = _rk_numpy()
        batch = inputs[0] if isinstance(inputs, (list, tuple)) else inputs
        arch = self._info["arch"]
        if arch not in ("yolov8", "yolov8-seg", "yolov8-pose"):
            raise NotImplementedError("В симуляторе ModelContainer.run считает «сырые» выходы только у моделей YOLO из регистра; своя модель (" + arch + ") в браузере не запускается.")
        _rk_vision_note()
        _rk_note("raw", "ModelContainer.run: «сырые» выходы NPU собраны из найденного в сцене. У yolov8n они заполнены (рамки закодированы как в настоящей модели), у -seg и -pose формы верные, но значения нулевые.")
        return _rk_raw_outputs(self, batch, arch)

    def release(self):
        self._released = True

def _rk_raw_outputs(model, batch, arch):
    np = _rk_numpy()
    size = 640
    outs = []
    rows = []
    if _rk_has_picture(batch):
        rows = _js.pioneer_rknn_detect(model._drone, size, size, 0.05, 1.0).to_py()
    if arch == "yolov8-pose":
        return [np.zeros((1, 65, n, n), dtype=np.float32) for n in (80, 40, 20)] + [np.zeros((1, 17, 3, 8400), dtype=np.float32)]
    grids = {8: 80, 16: 40, 32: 20}
    box = {s: np.zeros((1, 64, n, n), dtype=np.float32) for s, n in grids.items()}
    cls = {s: np.zeros((1, 80, n, n), dtype=np.float32) for s, n in grids.items()}
    total = {s: np.zeros((1, 1, n, n), dtype=np.float32) for s, n in grids.items()}
    for x1, y1, x2, y2, klass, score in rows:
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        reach = max(cx - x1, cy - y1, x2 - cx, y2 - cy)
        stride = next((s for s in (8, 16, 32) if reach / s <= 14.5), 32)
        n = grids[stride]
        gx, gy = min(n - 1, int(cx // stride)), min(n - 1, int(cy // stride))
        gcx, gcy = (gx + 0.5) * stride, (gy + 0.5) * stride
        for side, dist in enumerate(((gcx - x1), (gcy - y1), (x2 - gcx), (y2 - gcy))):
            bin_ = max(0, min(15, int(round(dist / stride))))
            box[stride][0, side * 16 + bin_, gy, gx] = 20.0
        cls[stride][0, int(klass), gy, gx] = score
        total[stride][0, 0, gy, gx] = score
    for stride in (8, 16, 32):
        outs += [box[stride], cls[stride], total[stride]]
    if arch == "yolov8-seg":
        outs += [np.zeros((1, 32, n, n), dtype=np.float32) for n in (80, 40, 20)] + [np.zeros((1, 32, 160, 160), dtype=np.float32)]
    return outs

class Yolo(ModelContainer):
    """Находит объекты (классы COCO): рамка, класс, уверенность."""
    arch = ["yolov8", "yolov11", "yolov26"]

    def __init__(self, model_path=None, model_name=None, npu_core=None, object_thresh=0.25, nms_thresh=0.45, img_width=640, img_height=640):
        super().__init__(model_path=model_path, model_name=model_name, npu_core=npu_core)
        self.object_thresh = object_thresh
        self.nms_thresh = nms_thresh
        self.img_width = int(img_width)
        self.img_height = int(img_height)
        _rk_vision_note()

    def _batch(self, inputs):
        shape = tuple(getattr(inputs[0], "shape", ())) if isinstance(inputs, (list, tuple)) and len(inputs) == 1 else None
        if shape != (1, self.img_height, self.img_width, 3):
            raise ValueError(
                "Вход " + type(self).__name__ + ": список из одного массива формы (1, " + str(self.img_height) + ", " + str(self.img_width)
                + ", 3) - кадр, сжатый до " + str(self.img_width) + "x" + str(self.img_height) + ", с измерением пакета (np.expand_dims). Получено: "
                + (str(shape) if shape is not None else type(inputs).__name__))
        return inputs[0]

    def _rows(self, function, batch):
        if self._released or not _rk_has_picture(batch):
            return []
        return getattr(_js, function)(self._drone, self.img_width, self.img_height, float(self.object_thresh), float(self.nms_thresh)).to_py()

    def run(self, inputs):
        batch = self._batch(inputs)
        rows = self._rows("pioneer_rknn_detect", batch)
        if not rows:
            return None
        boxes = [list(row[0:4]) for row in rows]
        classes = [int(row[4]) for row in rows]
        scores = [float(row[5]) for row in rows]
        np = _rk_numpy()
        if np is None:
            return boxes, classes, scores
        return np.array(boxes, dtype=np.float32), np.array(classes, dtype=np.int64), np.array(scores, dtype=np.float32)

def _rk_mask(polygon, box, width, height):
    # Маска 0/1 размером height x width, обрезанная по рамке: заливка выпуклого контура.
    np = _rk_numpy()
    mask = np.zeros((height, width), dtype=np.uint8)
    x1, y1 = max(0, int(round(box[0]))), max(0, int(round(box[1])))
    x2, y2 = min(width, int(round(box[2]))), min(height, int(round(box[3])))
    if x2 <= x1 or y2 <= y1:
        return mask
    if len(polygon) < 3:
        mask[y1:y2, x1:x2] = 1
        return mask
    xs, ys = np.meshgrid(np.arange(x1, x2, dtype=np.float32) + 0.5, np.arange(y1, y2, dtype=np.float32) + 0.5)
    area = sum(polygon[i][0] * polygon[(i + 1) % len(polygon)][1] - polygon[(i + 1) % len(polygon)][0] * polygon[i][1] for i in range(len(polygon)))
    sign = 1.0 if area >= 0 else -1.0
    inside = np.ones(xs.shape, dtype=bool)
    for i in range(len(polygon)):
        ax, ay = polygon[i]
        bx, by = polygon[(i + 1) % len(polygon)]
        inside &= sign * ((bx - ax) * (ys - ay) - (by - ay) * (xs - ax)) >= 0
    mask[y1:y2, x1:x2] = inside
    return mask

class YoloSeg(Yolo):
    """Сегментация экземпляров: рамки, классы, уверенности и маски объектов."""
    arch = ["yolov8-seg", "yolov11-seg", "yolov26-seg"]

    def run(self, inputs):
        batch = self._batch(inputs)
        rows = self._rows("pioneer_rknn_seg", batch)
        if not rows:
            return None
        np = _rk_numpy()
        boxes = [list(row[0:4]) for row in rows]
        classes = [int(row[4]) for row in rows]
        scores = [float(row[5]) for row in rows]
        masks = []
        for row in rows:
            flat = list(row[6:])
            polygon = [(flat[i], flat[i + 1]) for i in range(0, len(flat) - 1, 2)]
            masks.append(_rk_mask(polygon, row[0:4], self.img_width, self.img_height))
        return (np.array(boxes, dtype=np.float32), np.array(classes, dtype=np.int64),
                np.array(scores, dtype=np.float32), np.array(masks, dtype=np.uint8))

class DetectBox:
    """Один человек, найденный YoloPose."""
    def __init__(self, classId, score, xmin, ymin, xmax, ymax, keypoint):
        self.classId = classId
        self.score = score
        self.xmin = xmin
        self.ymin = ymin
        self.xmax = xmax
        self.ymax = ymax
        self.keypoint = keypoint

    def __repr__(self):
        return "DetectBox(score=%.2f, box=(%.0f, %.0f, %.0f, %.0f))" % (self.score, self.xmin, self.ymin, self.xmax, self.ymax)

class YoloPose(Yolo):
    """Находит людей и 17 ключевых точек скелета каждого (порядок COCO)."""
    arch = ["yolov8-pose"]
    DetectBox = DetectBox
    NOSE, LEFT_EYE, RIGHT_EYE, LEFT_EAR, RIGHT_EAR = 0, 1, 2, 3, 4
    LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST = 5, 6, 7, 8, 9, 10
    LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE = 11, 12, 13, 14, 15, 16

    def __init__(self, model_path=None, model_name=None, npu_core=None, object_thresh=0.4, nms_thresh=0.5, img_width=640, img_height=640):
        super().__init__(model_path=model_path, model_name=model_name, npu_core=npu_core, object_thresh=object_thresh,
                         nms_thresh=nms_thresh, img_width=img_width, img_height=img_height)

    def run(self, inputs):
        batch = self._batch(inputs)
        rows = self._rows("pioneer_rknn_pose", batch)
        np = _rk_numpy()
        people = []
        for row in rows:
            points = [[row[5 + 3 * i], row[6 + 3 * i], row[7 + 3 * i]] for i in range(17)]
            keypoint = np.array(points, dtype=np.float32) if np is not None else points
            people.append(DetectBox(0, float(row[4]), float(row[0]), float(row[1]), float(row[2]), float(row[3]), keypoint))
        return people

class PaddleOCR:
    """Две нейросети подряд: детектор находит строки текста, распознаватель читает их."""
    def __init__(self, det_model_name=None, rec_model_name=None, npu_core=None, det_model_path=None, rec_model_path=None):
        self._drone = _rk_drone()
        for path, name, arch in ((det_model_path, det_model_name, "ppocrv5-det"), (rec_model_path, rec_model_name, "ppocrv5-rec")):
            if path is None and name is None:
                raise ValueError("Укажите имя модели из регистра (det_model_name, rec_model_name) или путь к файлу")
            if path is not None:
                raise FileNotFoundError("Файл модели не найден: " + str(path) + ". В симуляторе нет файловой системы дрона: используйте имена моделей из регистра.")
            info = _rk_find(name)
            if info is None:
                raise FileNotFoundError("Модели «" + str(name) + "» нет в регистре дрона. Доступны: " + ", ".join(e["name"] for e in _RK_MODELS) + ".")
            if info["arch"] != arch:
                raise ValueError("Модель «" + str(name) + "» (архитектура " + info["arch"] + ") не подходит для PaddleOCR: нужна архитектура " + arch + ".")
        self.det_model_name = det_model_name
        self.rec_model_name = rec_model_name
        self.npu_core = _rk_check_cores(npu_core)
        self.drop_score = 0.5
        self._released = False
        _rk_vision_note()

    def run(self, img):
        shape = tuple(getattr(img, "shape", ()))
        if len(shape) != 3 or shape[2] != 3:
            raise ValueError("PaddleOCR.run получает одно изображение целиком (высота x ширина x 3), например кадр камеры. Получено: " + (str(shape) if shape else type(img).__name__))
        if self._released or not _rk_has_picture(img):
            return None, None
        rows = _js.pioneer_rknn_ocr(self._drone, shape[1], shape[0]).to_py()
        np = _rk_numpy()
        boxes = []
        results = []
        for quad, text, score in rows:
            if score < self.drop_score:
                continue
            points = [[quad[2 * i], quad[2 * i + 1]] for i in range(4)]
            boxes.append(np.array(points, dtype=np.float32) if np is not None else points)
            results.append([(str(text), float(score))])
        if not boxes:
            return None, None
        return boxes, results

    def release(self):
        self._released = True

class ModelRegistry:
    """Регистр моделей на борту дрона."""
    def __init__(self, url="http://127.0.0.1:7777/model"):
        _rk_drone()
        self.url = url

    def list_model(self):
        return [dict(entry) for entry in _RK_MODELS]

    def get_model_info(self, name):
        info = _rk_find(name)
        return dict(info) if info is not None else None

    def upload_model(self, name, version, filepath, arch):
        # Своя модель в симуляторе: файла на диске нет и конвертировать в .rknn нечем, поэтому в регистр попадает только запись.
        if not str(filepath).lower().endswith((".onnx", ".rknn")):
            raise ValueError("Поддерживаются файлы .onnx и .rknn")
        old = _rk_find(name)
        if not version:
            parts = old["version"].split(".") if old else None
            version = "1.0.%d" % (int(parts[-1]) + 1) if parts and parts[-1].isdigit() else "1.0.0"
        if old:
            _RK_MODELS.remove(old)
        entry = _rk_entry(name, arch, version)
        _RK_MODELS.append(entry)
        _rk_note("upload", "upload_model: в симуляторе записана только запись о модели «" + str(name) + "»; сам файл не читается, и запустить свою нейросеть в браузере нельзя.")
        return dict(entry)

    def delete_model(self, name):
        info = _rk_find(name)
        if info is None or name in ("yolov8n", "yolov8n-seg", "yolov8n-pose", "PP-OCRv5_mobile_det", "eslav_PP-OCRv5_mobile_rec"):
            return None
        _RK_MODELS.remove(info)
        return dict(info)

for _name, _value in {
    "ModelContainer": ModelContainer, "Yolo": Yolo, "YoloSeg": YoloSeg, "YoloPose": YoloPose,
    "PaddleOCR": PaddleOCR, "ModelRegistry": ModelRegistry
}.items():
    setattr(_rknn, _name, _value)
_sys.modules['pioneer_rknn'] = _rknn

# Недостающее в cv2 симулятора, что нужно примерам с нейросетями (ставится, только если ещё нет).
_cv2m = _sys.modules.get('cv2')
if _cv2m is not None:
    def _rk_cv2_default(name, value):
        if not hasattr(_cv2m, name):
            setattr(_cv2m, name, value)

    for _const, _number in {"INTER_NEAREST": 0, "INTER_LINEAR": 1, "INTER_AREA": 3, "RETR_EXTERNAL": 0, "CHAIN_APPROX_SIMPLE": 2}.items():
        _rk_cv2_default(_const, _number)

    def _rk_imread(path, flags=1):
        # Файлов в браузере нет: вместо картинки с диска - свежий кадр камеры дрона.
        _rk_note("imread", "cv2.imread: файлов в симуляторе нет, вместо «" + str(path) + "» возвращается кадр камеры дрона.")
        camera = _sys.modules['pioneer_sdk'].Camera(view='front')
        try:
            return camera.get_cv_frame()
        finally:
            camera.disconnect()

    def _rk_polylines(img, pts, isClosed, color, thickness=1, *args, **kwargs):
        for polygon in pts:
            points = [tuple(int(v) for v in point) for point in polygon.reshape(-1, 2)]
            for i in range(len(points) - (0 if isClosed else 1)):
                _cv2m.line(img, points[i], points[(i + 1) % len(points)], color, thickness)
        return img

    def _rk_add_weighted(src1, alpha, src2, beta, gamma, dst=None, *args):
        np = _rk_numpy()
        result = np.clip(src1.astype(np.float32) * alpha + src2.astype(np.float32) * beta + gamma, 0, 255).astype(np.uint8)
        if dst is not None:
            dst[...] = result
            return dst
        return result

    def _rk_find_contours(image, mode, method, *args, **kwargs):
        # Упрощено: один внешний контур по левой и правой границе маски в каждой строке (без дыр и отдельных частей).
        np = _rk_numpy()
        rows = np.nonzero(np.asarray(image).any(axis=1))[0]
        if rows.size == 0:
            return [], None
        left = [(int(np.nonzero(image[r])[0][0]), int(r)) for r in rows]
        right = [(int(np.nonzero(image[r])[0][-1]), int(r)) for r in rows[::-1]]
        return [np.array(left + right, dtype=np.int32).reshape(-1, 1, 2)], None

    def _rk_draw_contours(img, contours, idx, color, thickness=1, *args, **kwargs):
        for contour in contours:
            _rk_polylines(img, [contour], True, color, thickness)
        return img

    _rk_cv2_default("imread", _rk_imread)
    _rk_cv2_default("polylines", _rk_polylines)
    _rk_cv2_default("addWeighted", _rk_add_weighted)
    _rk_cv2_default("findContours", _rk_find_contours)
    _rk_cv2_default("drawContours", _rk_draw_contours)
`;
