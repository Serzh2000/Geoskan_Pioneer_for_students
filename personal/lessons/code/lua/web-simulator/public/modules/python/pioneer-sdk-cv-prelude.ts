// Питоновская часть заглушки cv2 и работа с кадрами живут отдельно от pioneer_sdk:
// это самый объёмный кусок прелюдии, и держать его в одном файле с Pioneer/Camera
// значит упираться в лимит длины файла на каждой правке камеры.
export const PIONEER_CV_PRELUDE = `
_np_module = None
_np_checked = False

def _numpy_or_none():
    # numpy подгружается лениво на стороне JS, поэтому единственный надёжный признак
    # доступности — попробовать импорт по факту, а не полагаться на флаг.
    global _np_module, _np_checked
    if not _np_checked:
        _np_checked = True
        try:
            import numpy
            _np_module = numpy
        except Exception:
            _np_module = None
    return _np_module

def _js_bytes(value):
    # Буфер из JS приходит как JsProxy: to_bytes даёт копию без промежуточного списка,
    # остальные варианты — запасные пути на случай обычного массива чисел.
    if value is None:
        return b''
    to_bytes = getattr(value, 'to_bytes', None)
    if callable(to_bytes):
        try:
            return to_bytes()
        except Exception:
            pass
    if hasattr(value, 'to_py'):
        value = value.to_py()
    try:
        return bytes(value)
    except Exception:
        return b''

class SimCvFrame:
    # Замена numpy-массиву, когда пакет не подгрузился: хранит те же реальные пиксели BGR,
    # чтобы индексация кадра в ученическом коде давала настоящий цвет, а не ноль.
    def __init__(self, payload=None, data=None, width=0, height=0):
        self.payload = payload or {}
        if data and int(width) > 0 and int(height) > 0:
            self.data = bytes(data)
            self.width = int(width)
            self.height = int(height)
        else:
            self.data = b''
            self.width = 640
            self.height = 480
        self.shape = (self.height, self.width, 3)

    def copy(self):
        return SimCvFrame(dict(self.payload), self.data, self.width, self.height)

    def tobytes(self):
        return self.data

    def _pixel(self, row, col):
        if not self.data or row < 0 or col < 0 or row >= self.height or col >= self.width:
            return (0, 0, 0)
        offset = (row * self.width + col) * 3
        chunk = self.data[offset:offset + 3]
        if len(chunk) < 3:
            return (0, 0, 0)
        return (chunk[0], chunk[1], chunk[2])

    def _row(self, row):
        return [self._pixel(row, col) for col in range(self.width)]

    def __len__(self):
        return self.height

    def __getitem__(self, key):
        if isinstance(key, tuple):
            if len(key) >= 3:
                return self._pixel(key[0], key[1])[key[2]]
            if len(key) == 2:
                return self._pixel(key[0], key[1])
            key = key[0]
        if isinstance(key, slice):
            return [self._row(row) for row in range(*key.indices(self.height))]
        return self._row(key)

    def __setitem__(self, key, value):
        return None

class _CvNode:
    def mat(self):
        return None

class _CvFileStorage:
    def __init__(self, path, mode):
        self.path = path
        self.mode = mode

    def getNode(self, name):
        return _CvNode()

    def release(self):
        return None

class _ArucoDictionary:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return 'aruco.Dictionary(%s)' % self.name

def _aruco_dictionary_name(dictionary):
    if isinstance(dictionary, _ArucoDictionary):
        return dictionary.name
    if isinstance(dictionary, dict):
        return str(dictionary.get('kind', ''))
    return str(dictionary or '')

def _aruco_detect(dictionary):
    # Симулятор знает, где на сцене лежат маркеры: при съёмке кадра он проецирует их
    # в изображение камеры (видно целиком, повёрнут к камере, не закрыт). Результат
    # в том же виде, что у OpenCV: corners - по массиву (1, 4, 2) на маркер,
    # углы по часовой с верхнего левого; ids - массив (N, 1) или None.
    raw = js.pioneer_cv_detect_markers(_aruco_dictionary_name(dictionary))
    found = raw.to_py() if hasattr(raw, 'to_py') else list(raw or [])
    numpy = _numpy_or_none()
    corners = []
    ids = []
    for marker_id, points in found:
        pts = [[float(x), float(y)] for x, y in points]
        corners.append(numpy.array([pts], dtype=numpy.float32) if numpy is not None else [pts])
        ids.append(int(marker_id))
    if not ids:
        return tuple(), None, tuple()
    ids_out = numpy.array([[i] for i in ids], dtype=numpy.int32) if numpy is not None else [[i] for i in ids]
    return tuple(corners), ids_out, tuple()

class _ArucoDetector:
    def __init__(self, dictionary=None, params=None):
        self.dictionary = dictionary
        self.params = params

    def detectMarkers(self, frame):
        return _aruco_detect(self.dictionary)

class _ArucoNamespace:
    DICT_4X4_50 = 'DICT_4X4_50'
    DICT_4X4_100 = 'DICT_4X4_100'
    DICT_4X4_250 = 'DICT_4X4_250'
    DICT_4X4_1000 = 'DICT_4X4_1000'
    DICT_5X5_50 = 'DICT_5X5_50'
    DICT_5X5_100 = 'DICT_5X5_100'
    DICT_5X5_250 = 'DICT_5X5_250'
    DICT_5X5_1000 = 'DICT_5X5_1000'
    DICT_6X6_50 = 'DICT_6X6_50'
    DICT_6X6_100 = 'DICT_6X6_100'
    DICT_6X6_250 = 'DICT_6X6_250'
    DICT_6X6_1000 = 'DICT_6X6_1000'
    DICT_7X7_50 = 'DICT_7X7_50'
    DICT_7X7_100 = 'DICT_7X7_100'
    DICT_7X7_250 = 'DICT_7X7_250'
    DICT_7X7_1000 = 'DICT_7X7_1000'
    DICT_ARUCO_ORIGINAL = 'DICT_ARUCO_ORIGINAL'
    DICT_APRILTAG_16h5 = 'DICT_APRILTAG_16h5'
    DICT_APRILTAG_25h9 = 'DICT_APRILTAG_25h9'
    DICT_APRILTAG_36h10 = 'DICT_APRILTAG_36h10'
    DICT_APRILTAG_36h11 = 'DICT_APRILTAG_36h11'

    @staticmethod
    def getPredefinedDictionary(kind):
        return _ArucoDictionary(_aruco_dictionary_name(kind))

    @staticmethod
    def Dictionary_get(kind):
        return _ArucoDictionary(_aruco_dictionary_name(kind))

    @staticmethod
    def DetectorParameters():
        return {}

    @staticmethod
    def DetectorParameters_create():
        return {}

    @staticmethod
    def ArucoDetector(dictionary, params=None):
        return _ArucoDetector(dictionary, params)

    @staticmethod
    def detectMarkers(image, dictionary, parameters=None, **kwargs):
        return _aruco_detect(dictionary)

    @staticmethod
    def drawDetectedMarkers(frame, corners, ids=None):
        return frame

cv2 = types.ModuleType('cv2')
cv2.IMREAD_COLOR = 1
cv2.FILE_STORAGE_READ = 0
cv2.error = Exception
cv2.aruco = _ArucoNamespace()
cv2.FileStorage = _CvFileStorage

def _cv2_imshow(name, frame):
    # Окно предпросмотра текстовое, поэтому настоящий кадр (numpy-массив) туда не отдать:
    # вместо сырых пикселей уходит описание кадра, иначе окно получит бесполезный прокси.
    payload = getattr(frame, "payload", None)
    if payload is None:
        shape = getattr(frame, "shape", None)
        payload = {
            "connected": True,
            "source": "cv-frame",
            "shape": list(shape) if shape is not None else None
        }
    return js.pioneer_cv_imshow(name, payload)

def _cv2_destroy_all_windows():
    return js.pioneer_cv_destroy_all_windows()

cv2.imwrite = lambda *args, **kwargs: True
cv2.imdecode = lambda buffer, flags=1: SimCvFrame({"buffer_size": len(buffer) if buffer is not None else 0, "flags": flags})
cv2.imshow = _cv2_imshow
cv2.destroyAllWindows = _cv2_destroy_all_windows
cv2.waitKey = lambda delay=0: int(js.pioneer_cv_wait_key(delay))
cv2.solvePnP = lambda *args, **kwargs: (False, None, None)
sys.modules['cv2'] = cv2
`;
