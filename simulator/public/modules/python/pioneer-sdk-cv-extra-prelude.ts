// Расширение эмуляции cv2: цветовые пространства, маски, морфология, контуры, моменты,
// склейка кадров и оценка позы по точкам (solvePnP). Всё на numpy, без циклов по пикселям
// там, где это можно векторизовать. Выполняется в том же пространстве имён, что и
// pioneer-sdk-cv-prelude.ts (там создаётся модуль cv2, _numpy_or_none и _cv2_line),
// поэтому в этом тексте нет обратных кавычек, обратных слэшей и подстановок.
export const PIONEER_CV_EXTRA_PRELUDE = `
def _cvx_np():
    np = _numpy_or_none()
    if np is None:
        raise cv2.error('cv2: для этой функции в симуляторе нужен numpy')
    return np

for _name, _value in {
    'COLOR_BGR2BGRA': 0, 'COLOR_BGRA2BGR': 1, 'COLOR_RGB2GRAY': 7, 'COLOR_GRAY2RGB': 8,
    'COLOR_BGR2HSV': 40, 'COLOR_RGB2HSV': 41, 'COLOR_HSV2BGR': 54, 'COLOR_HSV2RGB': 55,
    'COLOR_BGR2HSV_FULL': 66, 'COLOR_HSV2BGR_FULL': 70,
    'MORPH_ERODE': 0, 'MORPH_DILATE': 1, 'MORPH_OPEN': 2, 'MORPH_CLOSE': 3,
    'MORPH_GRADIENT': 4, 'MORPH_TOPHAT': 5, 'MORPH_BLACKHAT': 6,
    'MORPH_RECT': 0, 'MORPH_CROSS': 1, 'MORPH_ELLIPSE': 2,
    'RETR_EXTERNAL': 0, 'RETR_LIST': 1, 'RETR_CCOMP': 2, 'RETR_TREE': 3,
    'CHAIN_APPROX_NONE': 1, 'CHAIN_APPROX_SIMPLE': 2,
    'INTER_NEAREST': 0, 'INTER_LINEAR': 1, 'INTER_AREA': 3,
    'SOLVEPNP_ITERATIVE': 0, 'SOLVEPNP_EPNP': 1, 'SOLVEPNP_P3P': 2, 'SOLVEPNP_DLS': 3,
    'SOLVEPNP_UPNP': 4, 'SOLVEPNP_AP3P': 5, 'SOLVEPNP_IPPE': 6, 'SOLVEPNP_IPPE_SQUARE': 7, 'SOLVEPNP_SQPNP': 8,
}.items():
    if not hasattr(cv2, _name):
        setattr(cv2, _name, _value)

# ---------- цветовые пространства ----------

def _cvx_bgr_to_hsv(image, full=False):
    np = _cvx_np()
    img = image.astype(np.float32)
    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    v = np.maximum(np.maximum(b, g), r)
    delta = v - np.minimum(np.minimum(b, g), r)
    safe_v = np.where(v == 0, 1.0, v)
    safe_d = np.where(delta == 0, 1.0, delta)
    s = np.where(v == 0, 0.0, 255.0 * delta / safe_v)
    h = np.where(v == r, (g - b) / safe_d, np.where(v == g, 2.0 + (b - r) / safe_d, 4.0 + (r - g) / safe_d))
    h = np.where(delta == 0, 0.0, h) * 60.0
    h = np.where(h < 0, h + 360.0, h)
    scale = 255.0 / 360.0 if full else 0.5
    hue = np.round(h * scale).astype(np.int32) % (256 if full else 180)
    return np.stack([hue, np.round(s).astype(np.int32), np.round(v).astype(np.int32)], axis=-1).astype(np.uint8)

def _cvx_hsv_to_bgr(image, full=False):
    np = _cvx_np()
    img = image.astype(np.float32)
    h = img[..., 0] * (360.0 / 255.0 if full else 2.0)
    s = img[..., 1] / 255.0
    v = img[..., 2]
    sector = (h / 60.0) % 6.0
    i = np.floor(sector).astype(np.int32)
    f = sector - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.clip(np.round(np.stack([b, g, r], axis=-1)), 0, 255).astype(np.uint8)

def _cv2_cvt_color_ext(image, code, *args, **kwargs):
    np = _cvx_np()
    if code == 40: return _cvx_bgr_to_hsv(image)
    if code == 41: return _cvx_bgr_to_hsv(image[..., ::-1])
    if code == 66: return _cvx_bgr_to_hsv(image, True)
    if code == 54: return _cvx_hsv_to_bgr(image)
    if code == 55: return _cvx_hsv_to_bgr(image)[..., ::-1].copy()
    if code == 70: return _cvx_hsv_to_bgr(image, True)
    if code == 7:
        gray = image[..., 0] * 0.299 + image[..., 1] * 0.587 + image[..., 2] * 0.114
        return gray.astype(np.uint8)
    if code == 0:
        alpha = np.full(image.shape[:2] + (1,), 255, dtype=image.dtype)
        return np.concatenate([image, alpha], axis=-1)
    if code == 1: return image[..., :3].copy()
    if code == 8: return np.stack([image, image, image], axis=-1)
    return _cv2_cvt_color(image, code)

cv2.cvtColor = _cv2_cvt_color_ext

# ---------- маски и побитовые операции ----------

def _cv2_in_range(src, lowerb, upperb):
    np = _cvx_np()
    src = np.asarray(src)
    lo = np.asarray(lowerb, dtype=np.float64).reshape(-1)
    hi = np.asarray(upperb, dtype=np.float64).reshape(-1)
    if src.ndim == 2:
        inside = (src >= lo[0]) & (src <= hi[0])
    else:
        inside = np.all((src >= lo[:src.shape[2]]) & (src <= hi[:src.shape[2]]), axis=-1)
    return inside.astype(np.uint8) * 255

def _cv2_bitwise(op):
    def run(src1, src2, dst=None, mask=None):
        np = _cvx_np()
        result = op(src1, src2)
        if mask is not None:
            keep = np.asarray(mask) != 0
            if result.ndim == 3: keep = keep[..., None]
            result = np.where(keep, result, 0 if dst is None else dst).astype(result.dtype)
        if dst is not None:
            dst[...] = result
            return dst
        return result
    return run

def _cv2_bitwise_not(src, dst=None, mask=None):
    np = _cvx_np()
    result = np.invert(np.asarray(src))
    if dst is not None:
        dst[...] = result
        return dst
    return result

def _cv2_count_non_zero(src):
    return int(_cvx_np().count_nonzero(src))

def _cv2_add_weighted(src1, alpha, src2, beta, gamma, dst=None, dtype=-1):
    np = _cvx_np()
    result = np.asarray(src1, dtype=np.float32) * alpha + np.asarray(src2, dtype=np.float32) * beta + gamma
    src_dtype = np.asarray(src1).dtype
    if src_dtype == np.uint8: result = np.clip(np.rint(result), 0, 255)
    result = result.astype(src_dtype)
    if dst is not None:
        dst[...] = result
        return dst
    return result

def _cv2_concat(arrays, axis):
    np = _cvx_np()
    arrays = [np.asarray(a) for a in arrays]
    if not arrays:
        raise cv2.error('cv2: нечего склеивать (пустой список)')
    other = 1 - axis
    if any(a.shape[other] != arrays[0].shape[other] or a.dtype != arrays[0].dtype for a in arrays):
        raise cv2.error('cv2: кадры для склейки должны совпадать по ' + ('ширине' if axis == 0 else 'высоте') + ' и типу')
    return np.concatenate(arrays, axis=axis)

cv2.inRange = _cv2_in_range
cv2.bitwise_and = _cv2_bitwise(lambda a, b: a & b)
cv2.bitwise_or = _cv2_bitwise(lambda a, b: a | b)
cv2.bitwise_xor = _cv2_bitwise(lambda a, b: a ^ b)
cv2.bitwise_not = _cv2_bitwise_not
cv2.countNonZero = _cv2_count_non_zero
cv2.addWeighted = _cv2_add_weighted
cv2.vconcat = lambda src: _cv2_concat(src, 0)
cv2.hconcat = lambda src: _cv2_concat(src, 1)

# ---------- морфология ----------

def _cv2_structuring_element(shape, ksize, anchor=(-1, -1)):
    np = _cvx_np()
    cols, rows = int(ksize[0]), int(ksize[1])
    kernel = np.zeros((rows, cols), dtype=np.uint8)
    if shape == 1:
        kernel[rows // 2, :] = 1
        kernel[:, cols // 2] = 1
    elif shape == 2:
        r, c = rows // 2, cols // 2
        inv_r2 = 1.0 / (r * r) if r else 0.0
        for i in range(rows):
            dy = i - r
            if abs(dy) <= r:
                dx = int(round(c * ((r * r - dy * dy) * inv_r2) ** 0.5))
                kernel[i, max(c - dx, 0):min(c + dx + 1, cols)] = 1
    else:
        kernel[...] = 1
    return kernel

def _cvx_kernel(kernel):
    np = _cvx_np()
    if kernel is None:
        return np.ones((3, 3), dtype=np.uint8)
    return np.asarray(kernel)

def _cvx_shift_reduce(src, kernel, reduce_fn, border):
    # Минимум/максимум по окрестности из ненулевых элементов ядра: столько срезов, сколько единиц в ядре.
    np = _cvx_np()
    src = np.asarray(src)
    kernel = _cvx_kernel(kernel)
    kh, kw = kernel.shape
    ay, ax = kh // 2, kw // 2
    h, w = src.shape[:2]
    pad = [(ay, kh - 1 - ay), (ax, kw - 1 - ax)] + [(0, 0)] * (src.ndim - 2)
    padded = np.pad(src, pad, mode='constant', constant_values=border(src.dtype))
    result = None
    for dy, dx in zip(*np.nonzero(kernel)):
        part = padded[dy:dy + h, dx:dx + w]
        result = part.copy() if result is None else reduce_fn(result, part)
    return src.copy() if result is None else result

def _cvx_max_value(dtype):
    np = _cvx_np()
    return np.iinfo(dtype).max if np.issubdtype(dtype, np.integer) else np.inf

def _cvx_min_value(dtype):
    np = _cvx_np()
    return np.iinfo(dtype).min if np.issubdtype(dtype, np.integer) else -np.inf

def _cv2_erode(src, kernel=None, dst=None, anchor=None, iterations=1, *args, **kwargs):
    np = _cvx_np()
    out = np.asarray(src)
    for _ in range(max(1, int(iterations))):
        out = _cvx_shift_reduce(out, kernel, np.minimum, _cvx_max_value)
    return out

def _cv2_dilate(src, kernel=None, dst=None, anchor=None, iterations=1, *args, **kwargs):
    np = _cvx_np()
    out = np.asarray(src)
    for _ in range(max(1, int(iterations))):
        out = _cvx_shift_reduce(out, kernel, np.maximum, _cvx_min_value)
    return out

def _cv2_morphology_ex(src, op, kernel=None, dst=None, anchor=None, iterations=1, *args, **kwargs):
    np = _cvx_np()
    if op == 0: return _cv2_erode(src, kernel, iterations=iterations)
    if op == 1: return _cv2_dilate(src, kernel, iterations=iterations)
    if op == 2: return _cv2_dilate(_cv2_erode(src, kernel, iterations=iterations), kernel, iterations=iterations)
    if op == 3: return _cv2_erode(_cv2_dilate(src, kernel, iterations=iterations), kernel, iterations=iterations)
    wide = np.asarray(src).astype(np.int32)
    if op == 4:
        diff = _cv2_dilate(src, kernel, iterations=iterations).astype(np.int32) - _cv2_erode(src, kernel, iterations=iterations).astype(np.int32)
    elif op == 5:
        diff = wide - _cv2_morphology_ex(src, 2, kernel, iterations=iterations).astype(np.int32)
    elif op == 6:
        diff = _cv2_morphology_ex(src, 3, kernel, iterations=iterations).astype(np.int32) - wide
    else:
        raise cv2.error('cv2.morphologyEx: неизвестная операция ' + str(op))
    return np.clip(diff, 0, 255).astype(np.asarray(src).dtype)

cv2.getStructuringElement = _cv2_structuring_element
cv2.erode = _cv2_erode
cv2.dilate = _cv2_dilate
cv2.morphologyEx = _cv2_morphology_ex

# ---------- контуры (алгоритм Сузуки-Абе, как в OpenCV) ----------

# Соседи по часовой стрелке на экране, начиная с востока: (строка, столбец).
_CVX_RING = ((0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1))
_CVX_RING_INDEX = dict((offset, index) for index, offset in enumerate(_CVX_RING))

def _cvx_trace(f, i, j, i2, j2, mark):
    # Обход границы из (i, j); (i2, j2) - соседний нулевой пиксель, с которого начинается поиск.
    start = (i, j)
    first = None
    k0 = _CVX_RING_INDEX[(i2 - i, j2 - j)]
    for step in range(8):
        di, dj = _CVX_RING[(k0 + step) % 8]
        if f[i + di][j + dj] != 0:
            first = (i + di, j + dj)
            break
    if first is None:
        f[i][j] = -mark
        return [(j - 1, i - 1)]
    points = []
    prev = first
    cur = start
    while True:
        points.append((cur[1] - 1, cur[0] - 1))
        k = _CVX_RING_INDEX[(prev[0] - cur[0], prev[1] - cur[1])]
        east_zero = False
        nxt = None
        for step in range(1, 9):
            index = (k - step) % 8
            di, dj = _CVX_RING[index]
            if f[cur[0] + di][cur[1] + dj] != 0:
                nxt = (cur[0] + di, cur[1] + dj)
                break
            if index == 0:
                east_zero = True
        if east_zero:
            f[cur[0]][cur[1]] = -mark
        elif f[cur[0]][cur[1]] == 1:
            f[cur[0]][cur[1]] = mark
        if nxt == start and cur == first:
            return points
        prev, cur = cur, nxt

def _cvx_simplify(points):
    count = len(points)
    if count < 3:
        return points
    keep = []
    for n in range(count):
        a, b, c = points[n - 1], points[n], points[(n + 1) % count]
        if (b[0] - a[0], b[1] - a[1]) != (c[0] - b[0], c[1] - b[1]):
            keep.append(b)
    return keep or points[:1]

def _cvx_find_borders(image):
    np = _cvx_np()
    binary = (np.asarray(image) != 0).astype(np.int32)
    if binary.ndim == 3:
        binary = binary.any(axis=2).astype(np.int32)
    h, w = binary.shape
    padded = np.zeros((h + 2, w + 2), dtype=np.int32)
    padded[1:-1, 1:-1] = binary
    left = padded[1:-1, 1:-1] & (padded[1:-1, :-2] == 0)
    right = padded[1:-1, 1:-1] & (padded[1:-1, 2:] == 0)
    candidates = left | right
    borders = [None, None]
    lnbd_of = {}
    f = padded.tolist()
    rows, cols = np.nonzero(candidates)
    for ri, ci in zip(rows.tolist(), cols.tolist()):
        i, j = ri + 1, ci + 1
        value = f[i][j]
        if value < 1:
            continue
        outer = value == 1 and left[ri, ci]
        if not outer and not right[ri, ci]:
            continue
        mark = len(borders)
        # LNBD: номер последней границы, встреченной слева в этой строке (1 - рамка кадра).
        lnbd = 1
        row = f[i]
        for x in range(j, 0, -1):
            if abs(row[x]) > 1:
                lnbd = abs(row[x])
                break
        points = _cvx_trace(f, i, j, i, j - 1, mark) if outer else _cvx_trace(f, i, j, i, j + 1, mark)
        previous = borders[lnbd]
        previous_outer = previous is not None and previous['outer']
        if previous is None:
            parent = -1
        elif outer:
            parent = previous['parent'] if previous_outer else lnbd
        else:
            parent = lnbd if previous_outer else previous['parent']
        borders.append({'outer': outer, 'parent': parent, 'points': points, 'mark': mark})
    return borders[2:]

def _cv2_find_contours(image, mode, method, contours=None, hierarchy=None, offset=None):
    np = _cvx_np()
    borders = _cvx_find_borders(image)
    chosen = []
    for border in borders:
        if mode == 0 and not (border['outer'] and border['parent'] in (-1, 1)):
            continue
        chosen.append(border)
    # Как в OpenCV 4: контуры идут в порядке, обратном обнаружению (снизу вверх).
    chosen.reverse()
    ids = dict((border['mark'], index) for index, border in enumerate(chosen))
    result = []
    for border in chosen:
        pts = border['points']
        if method == 2:
            pts = _cvx_simplify(pts)
        arr = np.array(pts, dtype=np.int32).reshape(-1, 1, 2)
        if offset is not None:
            arr = arr + np.array([offset[0], offset[1]], dtype=np.int32)
        result.append(arr)
    if not chosen:
        return tuple(), None
    count = len(chosen)
    parents = []
    for border in chosen:
        parent = border['parent']
        if mode in (0, 1):
            parent = -1
        elif mode == 2:
            parent = ids.get(parent, -1) if not border['outer'] else -1
            parents.append(parent)
            continue
        parents.append(ids.get(parent, -1))
    info = np.full((1, count, 4), -1, dtype=np.int32)
    last_sibling = {}
    for index in range(count):
        parent = parents[index]
        previous = last_sibling.get(parent, -1)
        info[0, index, 3] = parent
        info[0, index, 1] = previous
        if previous >= 0:
            info[0, previous, 0] = index
        elif parent >= 0:
            info[0, parent, 2] = index
        last_sibling[parent] = index
    return tuple(result), info

cv2.findContours = _cv2_find_contours

def _cvx_points(contour):
    np = _cvx_np()
    return np.asarray(contour, dtype=np.float64).reshape(-1, 2)

def _cv2_contour_area(contour, oriented=False):
    pts = _cvx_points(contour)
    if len(pts) < 3:
        return 0.0
    x, y = pts[:, 0], pts[:, 1]
    area = 0.5 * float((x * _cvx_np().roll(y, -1) - _cvx_np().roll(x, -1) * y).sum())
    return area if oriented else abs(area)

def _cv2_arc_length(curve, closed):
    np = _cvx_np()
    pts = _cvx_points(curve)
    if len(pts) < 2:
        return 0.0
    total = float(np.hypot(*(pts[1:] - pts[:-1]).T).sum())
    if closed:
        total += float(np.hypot(*(pts[0] - pts[-1])))
    return total

def _cv2_bounding_rect(points):
    pts = _cvx_points(points)
    if len(pts) == 0:
        return (0, 0, 0, 0)
    x0, y0 = int(pts[:, 0].min()), int(pts[:, 1].min())
    return (x0, y0, int(pts[:, 0].max()) - x0 + 1, int(pts[:, 1].max()) - y0 + 1)

def _cv2_moments(array, binaryImage=False):
    np = _cvx_np()
    arr = np.asarray(array)
    names = ['m00', 'm10', 'm01', 'm20', 'm11', 'm02', 'm30', 'm21', 'm12', 'm03']
    is_contour = (arr.ndim == 3 and arr.shape[1:] == (1, 2)) or (arr.ndim == 2 and arr.shape[1] == 2 and arr.dtype.kind in 'if' and arr.dtype != np.uint8)
    if is_contour:
        pts = arr.reshape(-1, 2).astype(np.float64)
        x0, y0 = pts[:, 0], pts[:, 1]
        x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
        # Формулы Грина по замкнутому многоугольнику (как contourMoments в OpenCV).
        d = x0 * y1 - x1 * y0
        a = [d.sum(), (d * (x0 + x1)).sum(), (d * (y0 + y1)).sum(),
             (d * (x0 * x0 + x0 * x1 + x1 * x1)).sum(),
             (d * (x0 * (2 * y0 + y1) + x1 * (y0 + 2 * y1))).sum(),
             (d * (y0 * y0 + y0 * y1 + y1 * y1)).sum(),
             (d * (x0 + x1) * (x0 * x0 + x1 * x1)).sum(),
             (d * (x0 * x0 * (3 * y0 + y1) + 2 * x0 * x1 * (y0 + y1) + x1 * x1 * (y0 + 3 * y1))).sum(),
             (d * (y0 * y0 * (3 * x0 + x1) + 2 * y0 * y1 * (x0 + x1) + y1 * y1 * (x0 + 3 * x1))).sum(),
             (d * (y0 + y1) * (y0 * y0 + y1 * y1)).sum()]
        divisors = [2, 6, 6, 12, 24, 12, 20, 60, 60, 20]
        values = [float(v) / k for v, k in zip(a, divisors)]
        if values[0] < 0:
            values = [-v for v in values]
    else:
        img = arr.astype(np.float64)
        if img.ndim == 3:
            img = img[..., 0]
        if binaryImage:
            img = (img != 0).astype(np.float64)
        ys, xs = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(np.float64)
        values = [float(img.sum()), float((img * xs).sum()), float((img * ys).sum()),
                  float((img * xs * xs).sum()), float((img * xs * ys).sum()), float((img * ys * ys).sum()),
                  float((img * xs ** 3).sum()), float((img * xs * xs * ys).sum()),
                  float((img * xs * ys * ys).sum()), float((img * ys ** 3).sum())]
    result = dict(zip(names, values))
    m00 = result['m00']
    if abs(m00) > 1e-300:
        cx, cy = result['m10'] / m00, result['m01'] / m00
        m = result
        mu = {
            'mu20': m['m20'] - cx * m['m10'],
            'mu11': m['m11'] - cx * m['m01'],
            'mu02': m['m02'] - cy * m['m01'],
            'mu30': m['m30'] - 3 * cx * m['m20'] + 2 * cx * cx * m['m10'],
            'mu21': m['m21'] - 2 * cx * m['m11'] - cy * m['m20'] + 2 * cx * cx * m['m01'],
            'mu12': m['m12'] - 2 * cy * m['m11'] - cx * m['m02'] + 2 * cy * cy * m['m10'],
            'mu03': m['m03'] - 3 * cy * m['m02'] + 2 * cy * cy * m['m01'],
        }
    else:
        mu = dict((name, 0.0) for name in ['mu20', 'mu11', 'mu02', 'mu30', 'mu21', 'mu12', 'mu03'])
    result.update(mu)
    for name in mu:
        order = int(name[2]) + int(name[3])
        result['nu' + name[2:]] = mu[name] / (m00 ** (order / 2.0 + 1)) if abs(m00) > 1e-300 else 0.0
    return result

def _cvx_fill_polygon(image, pts, color):
    np = _cvx_np()
    h, w = image.shape[:2]
    x0, x1 = max(0, int(pts[:, 0].min())), min(w - 1, int(pts[:, 0].max()))
    y0, y1 = max(0, int(pts[:, 1].min())), min(h - 1, int(pts[:, 1].max()))
    if x0 > x1 or y0 > y1:
        return
    ys, xs = np.mgrid[y0:y1 + 1, x0:x1 + 1]
    inside = np.zeros(ys.shape, dtype=bool)
    ax, ay = pts[:, 0], pts[:, 1]
    bx, by = np.roll(ax, -1), np.roll(ay, -1)
    for px, py, qx, qy in zip(ax, ay, bx, by):
        if py == qy:
            continue
        crosses = (py > ys) != (qy > ys)
        at = px + (ys - py) * (qx - px) / (qy - py)
        inside ^= crosses & (xs < at)
    image[y0:y1 + 1, x0:x1 + 1][inside] = (list(color)[:image.shape[2]] if image.ndim == 3 else color[0]) if hasattr(color, '__len__') else color

def _cv2_draw_contours(image, contours, contourIdx, color, thickness=1, *args, **kwargs):
    selected = list(contours) if contourIdx < 0 else [contours[contourIdx]]
    for contour in selected:
        pts = _cvx_points(contour)
        if len(pts) == 0:
            continue
        if thickness < 0:
            _cvx_fill_polygon(image, pts, color)
        for n in range(len(pts)):
            _cv2_line(image, pts[n], pts[(n + 1) % len(pts)], color, thickness)
    return image

cv2.contourArea = _cv2_contour_area
cv2.arcLength = _cv2_arc_length
cv2.boundingRect = _cv2_bounding_rect
cv2.moments = _cv2_moments
cv2.drawContours = _cv2_draw_contours

# ---------- поза по точкам: Rodrigues, projectPoints, solvePnP, drawFrameAxes ----------

def _cv2_rodrigues(src, dst=None, jacobian=None):
    np = _cvx_np()
    arr = np.asarray(src, dtype=np.float64)
    if arr.size == 3:
        rvec = arr.reshape(3)
        theta = float(np.linalg.norm(rvec))
        if theta < 1e-12:
            return np.eye(3), None
        k = rvec / theta
        kx = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        return np.eye(3) + np.sin(theta) * kx + (1 - np.cos(theta)) * kx.dot(kx), None
    rot = arr.reshape(3, 3)
    u, _, vt = np.linalg.svd(rot)
    rot = u.dot(vt)
    cos_t = max(-1.0, min(1.0, (np.trace(rot) - 1) / 2))
    theta = float(np.arccos(cos_t))
    if theta < 1e-9:
        return np.zeros((3, 1)), None
    if abs(np.pi - theta) < 1e-6:
        axis = np.sqrt(np.maximum((np.diag(rot) + 1) / 2, 0))
        axis[1] = axis[1] if rot[0, 1] + rot[1, 0] >= 0 else -axis[1]
        axis[2] = axis[2] if rot[0, 2] + rot[2, 0] >= 0 else -axis[2]
        return (axis / (np.linalg.norm(axis) or 1.0) * theta).reshape(3, 1), None
    axis = np.array([rot[2, 1] - rot[1, 2], rot[0, 2] - rot[2, 0], rot[1, 0] - rot[0, 1]]) / (2 * np.sin(theta))
    return (axis * theta).reshape(3, 1), None

def _cvx_project(points, rvec, tvec, matrix, dist):
    np = _cvx_np()
    rot, _ = _cv2_rodrigues(rvec)
    cam = np.asarray(points, dtype=np.float64).reshape(-1, 3).dot(rot.T) + np.asarray(tvec, dtype=np.float64).reshape(1, 3)
    z = np.where(np.abs(cam[:, 2]) < 1e-12, 1e-12, cam[:, 2])
    x, y = cam[:, 0] / z, cam[:, 1] / z
    coef = np.zeros(5)
    if dist is not None:
        flat = np.asarray(dist, dtype=np.float64).reshape(-1)
        coef[:min(5, flat.size)] = flat[:5]
    k1, k2, p1, p2, k3 = coef
    r2 = x * x + y * y
    radial = 1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 ** 3
    xd = x * radial + 2 * p1 * x * y + p2 * (r2 + 2 * x * x)
    yd = y * radial + p1 * (r2 + 2 * y * y) + 2 * p2 * x * y
    k = np.asarray(matrix, dtype=np.float64).reshape(3, 3)
    return np.stack([k[0, 0] * xd + k[0, 2], k[1, 1] * yd + k[1, 2]], axis=-1)

def _cv2_project_points(objectPoints, rvec, tvec, cameraMatrix, distCoeffs=None, *args, **kwargs):
    return _cvx_project(objectPoints, rvec, tvec, cameraMatrix, distCoeffs).reshape(-1, 1, 2), None

def _cvx_undistort_normalized(image_points, matrix, dist):
    np = _cvx_np()
    k = np.asarray(matrix, dtype=np.float64).reshape(3, 3)
    xd = (image_points[:, 0] - k[0, 2]) / k[0, 0]
    yd = (image_points[:, 1] - k[1, 2]) / k[1, 1]
    flat = np.zeros(5)
    if dist is not None:
        raw = np.asarray(dist, dtype=np.float64).reshape(-1)
        flat[:min(5, raw.size)] = raw[:5]
    x, y = xd.copy(), yd.copy()
    if np.any(flat != 0):
        k1, k2, p1, p2, k3 = flat
        for _ in range(8):
            r2 = x * x + y * y
            radial = 1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 ** 3
            dx = 2 * p1 * x * y + p2 * (r2 + 2 * x * x)
            dy = p1 * (r2 + 2 * y * y) + 2 * p2 * x * y
            x, y = (xd - dx) / radial, (yd - dy) / radial
    return np.stack([x, y], axis=-1)

def _cvx_dlt_homography(src, dst):
    np = _cvx_np()
    def normalise(p):
        c = p.mean(axis=0)
        s = np.sqrt(2) / max(np.sqrt(((p - c) ** 2).sum(axis=1)).mean(), 1e-12)
        return np.array([[s, 0, -s * c[0]], [0, s, -s * c[1]], [0, 0, 1]])
    ts, td = normalise(src), normalise(dst)
    sp = (np.c_[src, np.ones(len(src))]).dot(ts.T)[:, :2]
    dp = (np.c_[dst, np.ones(len(dst))]).dot(td.T)[:, :2]
    rows = []
    for (x, y), (u, v) in zip(sp, dp):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
    h = np.linalg.svd(np.array(rows))[2][-1].reshape(3, 3)
    h = np.linalg.inv(td).dot(h).dot(ts)
    return h / h[2, 2]

def _cvx_initial_pose(obj, norm):
    np = _cvx_np()
    centred = obj - obj.mean(axis=0)
    singular = np.linalg.svd(centred, compute_uv=False)
    planar = singular[-1] < 1e-9 * max(singular[0], 1e-12)
    if planar:
        basis = np.linalg.svd(centred)[2]
        plane = centred.dot(basis[:2].T)
        h = _cvx_dlt_homography(plane, norm)
        scale = 2.0 / (np.linalg.norm(h[:, 0]) + np.linalg.norm(h[:, 1]))
        r1, r2, t = h[:, 0] * scale, h[:, 1] * scale, h[:, 2] * scale
        if t[2] < 0:
            r1, r2, t = -r1, -r2, -t
        r3 = np.cross(r1, r2)
        rot = np.c_[r1, r2, r3]
        u, _, vt = np.linalg.svd(rot)
        rot = u.dot(vt)
        if np.linalg.det(rot) < 0:
            rot = u.dot(np.diag([1, 1, -1])).dot(vt)
        # плоскость в базисе SVD -> исходные координаты: R_total = R_plane * [b1 b2 n]^T
        frame = np.c_[basis[0], basis[1], np.cross(basis[0], basis[1])]
        rot_total = rot.dot(frame.T)
        t_total = t - rot_total.dot(obj.mean(axis=0))
        return rot_total, t_total
    if len(obj) < 6:
        return None
    rows = []
    for (x, y, z), (u, v) in zip(obj, norm):
        rows.append([x, y, z, 1, 0, 0, 0, 0, -u * x, -u * y, -u * z, -u])
        rows.append([0, 0, 0, 0, x, y, z, 1, -v * x, -v * y, -v * z, -v])
    p = np.linalg.svd(np.array(rows))[2][-1].reshape(3, 4)
    u_, s_, vt_ = np.linalg.svd(p[:, :3])
    scale = 1.0 / s_.mean()
    rot = u_.dot(vt_)
    t = p[:, 3] * scale
    if np.linalg.det(rot) < 0:
        rot, t = -rot, -t
    return rot, t

def _cvx_refine(obj, norm, rvec, tvec, iterations=30):
    # Levenberg-Marquardt по ошибке репроекции в нормированных координатах (6 параметров).
    np = _cvx_np()
    ident = np.eye(3)
    flat_k = np.eye(3)
    def residual(params):
        return (_cvx_project(obj, params[:3], params[3:], flat_k, None) - norm).reshape(-1)
    params = np.concatenate([np.asarray(rvec, dtype=np.float64).reshape(3), np.asarray(tvec, dtype=np.float64).reshape(3)])
    current = residual(params)
    cost = float(current.dot(current))
    lam = 1e-3
    for _ in range(iterations):
        jac = np.zeros((current.size, 6))
        for n in range(6):
            step = np.zeros(6)
            step[n] = 1e-7
            jac[:, n] = (residual(params + step) - current) / 1e-7
        grad = jac.T.dot(current)
        hess = jac.T.dot(jac)
        try:
            delta = np.linalg.solve(hess + lam * np.diag(np.diag(hess) + 1e-12), -grad)
        except np.linalg.LinAlgError:
            break
        trial = params + delta
        trial_res = residual(trial)
        trial_cost = float(trial_res.dot(trial_res))
        if trial_cost < cost:
            params, current, cost, lam = trial, trial_res, trial_cost, lam * 0.3
            if np.abs(delta).max() < 1e-12:
                break
        else:
            lam *= 10
            if lam > 1e12:
                break
    return params[:3], params[3:]

def _cv2_solve_pnp(objectPoints, imagePoints, cameraMatrix, distCoeffs=None, rvec=None, tvec=None, useExtrinsicGuess=False, flags=0):
    # Приближение настоящего solvePnP: начальная поза из гомографии (плоские точки, в том числе
    # квадрат ArUco для IPPE_SQUARE) или DLT (6+ непланарных точек), затем уточнение по ошибке
    # репроекции (Левенберг-Марквардт). Искажения учитываются; неоднозначность IPPE (две
    # позы у далёкого квадрата) отдельно не разбирается - берётся ближайшее решение.
    np = _cvx_np()
    obj = np.asarray(objectPoints, dtype=np.float64).reshape(-1, 3)
    img = np.asarray(imagePoints, dtype=np.float64).reshape(-1, 2)
    if len(obj) != len(img):
        raise cv2.error('cv2.solvePnP: число 3D и 2D точек должно совпадать')
    if len(obj) < 4:
        raise cv2.error('cv2.solvePnP: нужно минимум 4 точки')
    if flags == 7 and len(obj) != 4:
        raise cv2.error('cv2.solvePnP: IPPE_SQUARE требует ровно 4 точки')
    norm = _cvx_undistort_normalized(img, cameraMatrix, distCoeffs)
    start = _cvx_initial_pose(obj, norm)
    if start is None or not np.all(np.isfinite(start[0])) or not np.all(np.isfinite(start[1])):
        return False, None, None
    r0, _ = _cv2_rodrigues(start[0])
    rv, tv = _cvx_refine(obj, norm, r0, start[1])
    if tv[2] <= 0 or not np.all(np.isfinite(tv)):
        return False, None, None
    return True, rv.reshape(3, 1), tv.reshape(3, 1)

def _cv2_draw_frame_axes(image, cameraMatrix, distCoeffs, rvec, tvec, length, thickness=3):
    np = _cvx_np()
    axes = np.array([[0, 0, 0], [length, 0, 0], [0, length, 0], [0, 0, length]], dtype=np.float64)
    pts = _cvx_project(axes, rvec, tvec, cameraMatrix, distCoeffs)
    if not np.all(np.isfinite(pts)) or np.abs(pts).max() > 20000:
        return image
    for end, color in zip(pts[1:], ((0, 0, 255), (0, 255, 0), (255, 0, 0))):
        _cv2_line(image, pts[0], end, color, thickness)
    return image

def _cv2_estimate_pose_single_markers(corners, markerLength, cameraMatrix, distCoeffs, *args, **kwargs):
    np = _cvx_np()
    half = markerLength / 2.0
    marker = np.array([(-half, half, 0), (half, half, 0), (half, -half, 0), (-half, -half, 0)], dtype=np.float32)
    rvecs, tvecs = [], []
    for item in corners:
        ok, rv, tv = _cv2_solve_pnp(marker, item, cameraMatrix, distCoeffs, flags=7)
        rvecs.append(rv.reshape(1, 3) if ok else np.zeros((1, 3)))
        tvecs.append(tv.reshape(1, 3) if ok else np.zeros((1, 3)))
    return np.array(rvecs), np.array(tvecs), np.zeros((len(rvecs), 4, 3))

cv2.Rodrigues = _cv2_rodrigues
cv2.projectPoints = _cv2_project_points
cv2.solvePnP = _cv2_solve_pnp
cv2.drawFrameAxes = _cv2_draw_frame_axes
cv2.aruco.estimatePoseSingleMarkers = _cv2_estimate_pose_single_markers

# ---------- калибровка камеры симулятора ----------
# Файла data.yml с калибровкой в браузере нет. Примеры вроде 19/20 читают из него mtx и dist,
# поэтому FileStorage отдаёт параметры идеальной камеры симулятора: кадр 640x360, вертикальный
# угол обзора 72 градуса, главная точка в центре, искажений нет.

def _cvx_sim_camera_matrix():
    np = _cvx_np()
    import math as _m
    focal = 180.0 / _m.tan(_m.radians(36.0))
    return np.array([[focal, 0.0, 320.0], [0.0, focal, 180.0], [0.0, 0.0, 1.0]], dtype=np.float64)

class _CvNode:
    def __init__(self, name=''):
        self.name = name

    def mat(self):
        if _numpy_or_none() is None:
            return None
        if self.name in ('mtx', 'camera_matrix', 'cameraMatrix', 'K', 'camera_intrinsics'):
            return _cvx_sim_camera_matrix()
        if self.name in ('dist', 'dist_coeffs', 'distCoeffs', 'distortion', 'D'):
            return _numpy_or_none().zeros((1, 5), dtype=_numpy_or_none().float64)
        return None

    def empty(self):
        return self.mat() is None

class _CvFileStorage:
    def __init__(self, path='', mode=0):
        self.path = path
        self.mode = mode

    def isOpened(self):
        return True

    def getNode(self, name):
        return _CvNode(str(name))

    def release(self):
        return None

cv2.FileStorage = _CvFileStorage
`;
