/*
 * Вспомогательный Python для блоков Bricks, которых нет в проектах-образцах u01..u10 (ни один из
 * них не использует блоки «Координаты объекта», «Размер объекта», «Цветовая маска» и так далее).
 * Функции написаны здесь по описанию блоков в палитре Bricks, а не взяты из его вывода: на дроне
 * они работают на обычных numpy/cv2, но вид кода Bricks для этих блоков может отличаться.
 */

export const OBJECT_BOX = String.raw`def object_box(obj, ident=0):
    # Рамка (x1, y1, x2, y2) в пикселях кадра: маркер ArUco с этим ID, рамка Yolo с этим номером или контур с этим индексом.
    ident = int(ident)
    if isinstance(obj, dict) and "corners" in obj:
        ids = obj["ids"]
        if ids is None or len(ids) == 0:
            return None
        found = [int(i) for i in ids.flatten()]
        if ident not in found:
            return None
        points = np.asarray(obj["corners"][found.index(ident)]).reshape(-1, 2)
    elif isinstance(obj, dict) and "boxes" in obj:
        if len(obj["boxes"]) <= ident:
            return None
        left, top, right, bottom = [float(c) for c in obj["boxes"][ident]]
        size = globals().get("IMG_SIZE", (640, 640))
        height, width = obj["orig_shape"]
        return (left * width / size[0], top * height / size[1], right * width / size[0], bottom * height / size[1])
    else:
        if obj is None or len(obj) <= ident:
            return None
        points = np.asarray(obj[ident]).reshape(-1, 2)
    return (float(points[:, 0].min()), float(points[:, 1].min()), float(points[:, 0].max()), float(points[:, 1].max()))`;

export const OBJECT_COORDS = String.raw`def object_coords(obj, mode="center", ident=0):
    box = object_box(obj, ident)
    if box is None:
        return None
    x = int((box[0] + box[2]) / 2)
    y = int((box[1] + box[3]) / 2)
    if mode == "x":
        return x
    if mode == "y":
        return y
    return (x, y)`;

export const OBJECT_SIZE = String.raw`def object_size(obj, mode="length", ident=0):
    box = object_box(obj, ident)
    if box is None:
        return None
    width = int(box[2] - box[0])
    height = int(box[3] - box[1])
    if mode == "width":
        return width
    if mode == "height":
        return height
    return max(width, height)`;

export const CONTOUR_SHAPE = String.raw`def contour_shape(contours, index=0):
    if contours is None or len(contours) <= int(index):
        return "нет контура"
    contour = contours[int(index)]
    approx = cv2.approxPolyDP(contour, 0.04 * cv2.arcLength(contour, True), True)
    corners = len(approx)
    if corners == 3:
        return "треугольник"
    if corners == 4:
        x, y, w, h = cv2.boundingRect(approx)
        return "квадрат" if 0.95 <= w / float(h) <= 1.05 else "прямоугольник"
    if corners == 5:
        return "пятиугольник"
    return "круг"`;

export const COLOR_MASK = String.raw`def color_mask(img, lower, upper):
    def to_hsv(color):
        b, g, r = hex_to_bgr(color) if isinstance(color, str) else color
        return cv2.cvtColor(np.uint8([[[b, g, r]]]), cv2.COLOR_BGR2HSV)[0][0]
    low, high = to_hsv(lower), to_hsv(upper)
    return cv2.inRange(cv2.cvtColor(img, cv2.COLOR_BGR2HSV), np.minimum(low, high), np.maximum(low, high))`;

export const BINARY_MASK = String.raw`def binary_mask(img, threshold=127):
    gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)[1]`;
