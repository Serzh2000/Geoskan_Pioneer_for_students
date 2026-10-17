// Питоновская часть заглушки cv2 и работа с кадрами живут отдельно от pioneer_sdk:
// это самый объёмный кусок прелюдии, и держать его в одном файле с Pioneer/Camera
// значит упираться в лимит длины файла на каждой правке камеры.
export const PIONEER_CV_PRELUDE = `
_np_module = None
_np_checked = False
_frame_tokens = {}

def _remember_frame(frame, token):
    _frame_tokens[id(frame)] = int(token or 0)
    if len(_frame_tokens)>64:
        del _frame_tokens[next(iter(_frame_tokens))]
    return frame

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
            self.data = bytearray(data)
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
        return bytes(self.data)

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
        if isinstance(key, tuple) and len(key)==2 and self.data:
            row, col = key
            if 0<=row<self.height and 0<=col<self.width:
                offset=(row*self.width+col)*3
                self.data[offset:offset+3]=bytes(value)
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

def _aruco_detect(dictionary, frame=None):
    # Симулятор знает, где на сцене лежат маркеры: при съёмке кадра он проецирует их
    # в изображение камеры (видно целиком, повёрнут к камере, не закрыт). Результат
    # в том же виде, что у OpenCV: corners - по массиву (1, 4, 2) на маркер,
    # углы по часовой с верхнего левого; ids - массив (N, 1) или None.
    raw = js.pioneer_cv_detect_markers(_aruco_dictionary_name(dictionary), _frame_tokens.get(id(frame), 0))
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
        return _aruco_detect(self.dictionary, frame)

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
        return _aruco_detect(dictionary, image)

    @staticmethod
    def drawDetectedMarkers(frame, corners, ids=None):
        for marker in corners:
            points=marker[0]
            for i in range(4):
                _cv2_line(frame, points[i], points[(i+1)%4], (0,255,0), 1)
        return frame

cv2 = types.ModuleType('cv2')
cv2.IMREAD_COLOR = 1
cv2.FILE_STORAGE_READ = 0
cv2.error = Exception
cv2.aruco = _ArucoNamespace()
cv2.FileStorage = _CvFileStorage

def _cv2_imshow(name, frame):
    if frame is None: return None
    shape=getattr(frame, 'shape', None)
    if shape is not None and hasattr(frame, 'tobytes'):
        texts = _frame_texts.pop(id(frame), None)
        # Буфер, а не list(frame.tobytes()): список из сотен тысяч чисел стоил ~40 мс на кадр.
        # numpy сразу собирает RGBA для canvas: векторно это ~1 мс, поэлементный цикл в JS - ~8 мс.
        np = _numpy_or_none()
        if np is not None and isinstance(frame, np.ndarray) and frame.ndim == 3 and frame.shape[2] == 3:
            rgba = np.empty((int(shape[0]), int(shape[1]), 4), dtype=np.uint8)
            rgba[..., 0] = frame[..., 2]
            rgba[..., 1] = frame[..., 1]
            rgba[..., 2] = frame[..., 0]
            rgba[..., 3] = 255
            return js.pioneer_cv_imshow_pixels(name, int(shape[1]), int(shape[0]), rgba, texts, "rgba")
        return js.pioneer_cv_imshow_pixels(name, int(shape[1]), int(shape[0]), frame.tobytes(), texts)
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

def _cv2_line(frame, start, end, color, thickness=1):
    x0,y0=[int(round(float(v))) for v in start]
    x1,y1=[int(round(float(v))) for v in end]
    steps=max(abs(x1-x0),abs(y1-y0),1)
    for i in range(steps+1):
        x=int(round(x0+(x1-x0)*i/steps)); y=int(round(y0+(y1-y0)*i/steps))
        if 0<=y<frame.shape[0] and 0<=x<frame.shape[1]: frame[y,x]=color
    return frame

def _cv2_circle(frame, center, radius, color, thickness=1):
    x,y=[int(round(float(v))) for v in center]
    radius=max(1,int(radius))
    for dy in range(-radius,radius+1):
        for dx in range(-radius,radius+1):
            distance=(dx*dx+dy*dy)**0.5
            if distance<=radius and (thickness<0 or distance>=radius-thickness):
                if 0<=y+dy<frame.shape[0] and 0<=x+dx<frame.shape[1]: frame[y+dy,x+dx]=color
    js.pioneer_cv_annotation(x,y)
    return frame

def _cv2_destroy_all_windows():
    return js.pioneer_cv_destroy_all_windows()

# Подписи cv2.putText рисует окно предпросмотра (шрифт браузера), а не пиксели
# кадра: они запоминаются при кадре и уходят в imshow вместе с ним.
_frame_texts = {}

def _cv2_put_text(frame, text, org, font_face=0, font_scale=1.0, color=(255, 255, 255), thickness=1, *args, **kwargs):
    texts = _frame_texts.setdefault(id(frame), [])
    x, y = [int(round(float(v))) for v in org]
    texts.append([str(text), x, y, float(font_scale), [int(c) for c in list(color)[:3]], int(thickness)])
    if len(_frame_texts) > 16:
        del _frame_texts[next(iter(_frame_texts))]
    return frame

def _cv2_rectangle(frame, pt1, pt2, color, thickness=1, *args, **kwargs):
    x0, y0 = [int(round(float(v))) for v in pt1]
    x1, y1 = [int(round(float(v))) for v in pt2]
    x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1))
    h, w = frame.shape[0], frame.shape[1]
    x0, x1 = max(0, x0), min(w - 1, x1); y0, y1 = max(0, y0), min(h - 1, y1)
    if x0 > x1 or y0 > y1:
        return frame
    colour = list(color)[:3]
    if thickness < 0:
        frame[y0:y1 + 1, x0:x1 + 1] = colour
        return frame
    t = max(1, int(thickness))
    frame[y0:min(y0 + t, y1 + 1), x0:x1 + 1] = colour
    frame[max(y1 - t + 1, y0):y1 + 1, x0:x1 + 1] = colour
    frame[y0:y1 + 1, x0:min(x0 + t, x1 + 1)] = colour
    frame[y0:y1 + 1, max(x1 - t + 1, x0):x1 + 1] = colour
    return frame

def _cv2_resize(image, size, *args, **kwargs):
    np = _numpy_or_none()
    w, h = int(size[0]), int(size[1])
    rows = (np.arange(h) * image.shape[0] // h).astype(int)
    cols = (np.arange(w) * image.shape[1] // w).astype(int)
    return image[rows][:, cols].copy()

def _cv2_cvt_color(image, code):
    np = _numpy_or_none()
    if code == cv2.COLOR_BGR2RGB:
        return image[..., ::-1].copy()
    if code == cv2.COLOR_BGR2GRAY:
        gray = image[..., 0] * 0.114 + image[..., 1] * 0.587 + image[..., 2] * 0.299
        return gray.astype(np.uint8)
    if code == cv2.COLOR_GRAY2BGR:
        return np.stack([image, image, image], axis=-1)
    return image.copy()

cv2.FONT_HERSHEY_SIMPLEX = 0
cv2.FONT_HERSHEY_PLAIN = 1
cv2.LINE_AA = 16
cv2.FILLED = -1
cv2.COLOR_BGR2RGB = 4
cv2.COLOR_RGB2BGR = 4
cv2.COLOR_BGR2GRAY = 6
cv2.COLOR_GRAY2BGR = 8
cv2.putText = _cv2_put_text
cv2.rectangle = _cv2_rectangle
cv2.resize = _cv2_resize
cv2.cvtColor = _cv2_cvt_color

cv2.imwrite = lambda *args, **kwargs: True
cv2.imdecode = lambda buffer, flags=1: SimCvFrame({"buffer_size": len(buffer) if buffer is not None else 0, "flags": flags})
cv2.imshow = _cv2_imshow
cv2.circle = _cv2_circle
cv2.line = _cv2_line
cv2.destroyAllWindows = _cv2_destroy_all_windows
cv2.waitKey = lambda delay=0: int(js.pioneer_cv_wait_key(delay))
cv2.solvePnP = lambda *args, **kwargs: (False, None, None)
sys.modules['cv2'] = cv2
`;
