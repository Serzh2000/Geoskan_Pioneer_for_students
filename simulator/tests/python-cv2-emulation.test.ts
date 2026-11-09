/**
 * Эмуляция cv2 в Python-рантайме симулятора (pioneer-sdk-cv-prelude.ts + pioneer-sdk-cv-extra-prelude.ts):
 * настоящий текст прелюдии выполняется в CPython с numpy против поддельного моста js.
 * Эталоны посчитаны вручную или взяты из документации OpenCV; без numpy в системе тесты пропускаются.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PIONEER_CV_PRELUDE } from '../public/modules/python/pioneer-sdk-cv-prelude.js';
import { findPython } from './helpers/python-sdk-harness.js';

const python = findPython();
const hasNumpy = python ? spawnSync(python, ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0 : false;
const pythonTest = hasNumpy ? test : test.skip;

const HEADER = `
import sys, types, json, math
js = types.ModuleType('js'); sys.modules['js'] = js
js.pioneer_cv_detect_markers = lambda *a: []
js.pioneer_cv_annotation = lambda *a, **k: None
exec(compile(open(sys.argv[1], encoding='utf-8').read(), 'prelude', 'exec'))
import numpy as np
import cv2
def out(value): print('@@' + json.dumps(value, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o)))
`;

/** Выполняет сценарий и возвращает значение, переданное в out(). */
function run(scenario: string): any {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pioneer-cv2-'));
    try {
        fs.writeFileSync(path.join(dir, 'prelude.py'), PIONEER_CV_PRELUDE, 'utf8');
        fs.writeFileSync(path.join(dir, 'scenario.py'), HEADER + scenario, 'utf8');
        const result = spawnSync(python!, [path.join(dir, 'scenario.py'), path.join(dir, 'prelude.py')], {
            encoding: 'utf8', timeout: 60_000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        if (result.status !== 0) throw new Error(`Python завершился с ошибкой:\n${result.stdout}\n${result.stderr}`);
        const line = result.stdout.split(/\r?\n/).filter((item) => item.startsWith('@@')).pop();
        return line ? JSON.parse(line.slice(2)) : null;
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

describe('cv2: цвет и маски', () => {
    pythonTest('cvtColor BGR->HSV даёт эталонные значения OpenCV (H в 0..179)', () => {
        const got = run(`
px = np.array([[[0, 0, 255], [0, 255, 0], [255, 0, 0], [0, 255, 255], [0, 0, 0], [128, 128, 128]]], dtype=np.uint8)
out(cv2.cvtColor(px, cv2.COLOR_BGR2HSV).reshape(-1, 3).tolist())`);
        expect(got).toEqual([[0, 255, 255], [60, 255, 255], [120, 255, 255], [30, 255, 255], [0, 0, 0], [0, 0, 128]]);
    });

    pythonTest('HSV -> BGR возвращает исходные цвета', () => {
        const got = run(`
px = np.array([[[0, 0, 255], [0, 255, 0], [255, 0, 0], [40, 90, 200]]], dtype=np.uint8)
back = cv2.cvtColor(cv2.cvtColor(px, cv2.COLOR_BGR2HSV), cv2.COLOR_HSV2BGR)
out(np.abs(back.astype(int) - px.astype(int)).max())`);
        expect(got).toBeLessThanOrEqual(4);
    });

    pythonTest('inRange: BGR и HSV, границы включены, результат 0/255 типа uint8', () => {
        const got = run(`
img = np.zeros((2, 3, 3), dtype=np.uint8)
img[0, 0] = (10, 20, 30); img[0, 1] = (11, 20, 30); img[1, 2] = (10, 21, 30)
bgr = cv2.inRange(img, np.array((10, 20, 30)), np.array((10, 20, 30)))
hsv = cv2.cvtColor(np.array([[[0, 0, 255], [255, 0, 0]]], dtype=np.uint8), cv2.COLOR_BGR2HSV)
red = cv2.inRange(hsv, np.array((0, 120, 80)), np.array((10, 255, 255)))
gray = cv2.inRange(np.array([[5, 50, 200]], dtype=np.uint8), 50, 200)
out({'bgr': bgr.tolist(), 'dtype': str(bgr.dtype), 'red': red.tolist(), 'gray': gray.tolist()})`);
        expect(got.bgr).toEqual([[255, 0, 0], [0, 0, 0]]);
        expect(got.dtype).toBe('uint8');
        expect(got.red).toEqual([[255, 0]]);
        expect(got.gray).toEqual([[0, 255, 255]]);
    });

    pythonTest('addWeighted: взвешенная сумма с насыщением, запись в dst и доступ по ключевому слову', () => {
        const got = run(`
a = np.full((1, 2, 3), 200, dtype=np.uint8); b = np.full((1, 2, 3), 100, dtype=np.uint8)
r = cv2.addWeighted(a, 0.5, b, 0.5, 0)
dst = a.copy(); same = cv2.addWeighted(a, 0.5, b, 0.5, 0, dst=dst)
sat = cv2.addWeighted(a, 1.0, a, 1.0, 0)
out({'r': r.reshape(-1)[0], 'dst': dst.reshape(-1)[0], 'is_dst': same is dst, 'sat': sat.reshape(-1)[0], 'dtype': str(r.dtype)})`);
        expect(got).toEqual({ r: 150, dst: 150, is_dst: true, sat: 255, dtype: 'uint8' });
    });

    pythonTest('vconcat и hconcat склеивают кадры и проверяют размеры', () => {
        const got = run(`
a = np.zeros((2, 4, 3), np.uint8); b = np.ones((3, 4, 3), np.uint8)
v = cv2.vconcat([a, b]); h = cv2.hconcat([a, a])
try:
    cv2.vconcat([a, np.zeros((2, 5, 3), np.uint8)]); bad = False
except cv2.error:
    bad = True
out({'v': list(v.shape), 'h': list(h.shape), 'bad': bad})`);
        expect(got).toEqual({ v: [5, 4, 3], h: [2, 8, 3], bad: true });
    });
});

describe('cv2: морфология', () => {
    pythonTest('getStructuringElement: прямоугольник, крест и эллипс 5x5 как в OpenCV', () => {
        const got = run(`
out({'rect': cv2.getStructuringElement(cv2.MORPH_RECT, (3, 2)).tolist(),
     'cross': cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3)).tolist(),
     'ellipse': cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)).tolist()})`);
        expect(got.rect).toEqual([[1, 1, 1], [1, 1, 1]]);
        expect(got.cross).toEqual([[0, 1, 0], [1, 1, 1], [0, 1, 0]]);
        expect(got.ellipse).toEqual([[0, 0, 1, 0, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0]]);
    });

    pythonTest('MORPH_OPEN убирает «соль», но сохраняет блок; MORPH_CLOSE закрывает дыру', () => {
        const got = run(`
m = np.zeros((20, 20), np.uint8); m[5:15, 5:15] = 255; m[1, 1] = 255
opened = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
c = np.zeros((20, 20), np.uint8); c[5:15, 5:15] = 255; c[10, 10] = 0
closed = cv2.morphologyEx(c, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
out({'salt': int(opened[1, 1]), 'block': int(np.count_nonzero(opened)), 'hole': int(closed[10, 10]), 'closed_n': int(np.count_nonzero(closed))})`);
        expect(got).toEqual({ salt: 0, block: 100, hole: 255, closed_n: 100 });
    });

    pythonTest('erode/dilate: результат по границе кадра и число итераций', () => {
        const got = run(`
m = np.zeros((7, 7), np.uint8); m[3, 3] = 255
d = cv2.dilate(m, np.ones((3, 3), np.uint8))
d2 = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=2)
full = np.full((5, 5), 255, np.uint8)
e = cv2.erode(full, np.ones((3, 3), np.uint8))
out({'d': int(np.count_nonzero(d)), 'd2': int(np.count_nonzero(d2)), 'e': int(np.count_nonzero(e))})`);
        expect(got).toEqual({ d: 9, d2: 25, e: 25 });
    });
});

describe('cv2: контуры и моменты', () => {
    pythonTest('findContours RETR_EXTERNAL: два пятна, нижнее первым, углы при CHAIN_APPROX_SIMPLE', () => {
        const got = run(`
m = np.zeros((40, 60), np.uint8); m[5:15, 10:30] = 255; m[25:30, 40:45] = 255
simple, hier = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
none, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
out({'simple': [c.reshape(-1, 2).tolist() for c in simple], 'shape': list(simple[0].shape), 'dtype': str(simple[0].dtype),
     'none': [len(c) for c in none], 'hier': hier.tolist()})`);
        expect(got.simple).toEqual([
            [[40, 25], [40, 29], [44, 29], [44, 25]],
            [[10, 5], [10, 14], [29, 14], [29, 5]]
        ]);
        expect(got.shape).toEqual([4, 1, 2]);
        expect(got.dtype).toBe('int32');
        expect(got.none).toEqual([16, 56]);
        expect(got.hier).toEqual([[[1, -1, -1, -1], [-1, 0, -1, -1]]]);
    });

    pythonTest('findContours: RETR_EXTERNAL пропускает дыры и вложенные, RETR_LIST/TREE/CCOMP их находят', () => {
        const got = run(`
ring = np.zeros((30, 30), np.uint8); ring[3:27, 3:27] = 1; ring[8:22, 8:22] = 0; ring[12:18, 12:18] = 1
counts = {}
for name in ('EXTERNAL', 'LIST', 'CCOMP', 'TREE'):
    contours, hier = cv2.findContours(ring, getattr(cv2, 'RETR_' + name), cv2.CHAIN_APPROX_SIMPLE)
    counts[name] = [len(contours), None if hier is None else hier[0, :, 3].tolist()]
empty, none_h = cv2.findContours(np.zeros((5, 5), np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
counts['empty'] = [len(empty), none_h is None]
out(counts)`);
        expect(got.EXTERNAL[0]).toBe(1);
        expect(got.LIST[0]).toBe(3);
        expect(got.TREE).toEqual([3, [1, 2, -1]]);
        expect(got.CCOMP).toEqual([3, [-1, 2, -1]]);
        expect(got.empty).toEqual([0, true]);
    });

    pythonTest('contourArea: прямоугольник контура, ориентированная площадь, вырожденные случаи', () => {
        const got = run(`
c = np.array([[[0, 0]], [[0, 10]], [[20, 10]], [[20, 0]]], dtype=np.int32)
tri = np.array([[[0, 0]], [[4, 0]], [[0, 3]]], dtype=np.int32)
out({'rect': cv2.contourArea(c), 'tri': cv2.contourArea(tri), 'oriented': cv2.contourArea(tri, True),
     'line': cv2.contourArea(c[:2]), 'arc': cv2.arcLength(c, True), 'box': list(cv2.boundingRect(c))})`);
        expect(got.rect).toBe(200);
        expect(got.tri).toBe(6);
        expect(Math.abs(got.oriented)).toBe(6);
        expect(got.line).toBe(0);
        expect(got.arc).toBe(60);
        expect(got.box).toEqual([0, 0, 21, 11]);
    });

    pythonTest('contourArea пятна на маске равна площади по пиксельному контуру (w-1)*(h-1)', () => {
        const got = run(`
m = np.zeros((50, 50), np.uint8); m[10:30, 5:15] = 255
c, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
out(cv2.contourArea(c[0]))`);
        expect(got).toBe(19 * 9);
    });

    pythonTest('moments: центроид и центральные моменты прямоугольного контура и бинарной картинки', () => {
        const got = run(`
c = np.array([[[0, 0]], [[0, 2]], [[4, 2]], [[4, 0]]], dtype=np.int32)
mc = cv2.moments(c)
img = np.zeros((10, 10), np.uint8); img[2:5, 3:7] = 255
mi = cv2.moments(img, True)
out({'mc': mc, 'mi': mi})`);
        // Контур прямоугольника 4x2: площадь 8, центр (2, 1), mu20 = S*w^2/12, mu02 = S*h^2/12
        expect(got.mc.m00).toBeCloseTo(8, 9);
        expect(got.mc.m10 / got.mc.m00).toBeCloseTo(2, 9);
        expect(got.mc.m01 / got.mc.m00).toBeCloseTo(1, 9);
        expect(got.mc.m20).toBeCloseTo(8 * (16 / 12 + 4), 9);
        expect(got.mc.mu20).toBeCloseTo(8 * 16 / 12, 9);
        expect(got.mc.mu02).toBeCloseTo(8 * 4 / 12, 9);
        expect(got.mc.mu11).toBeCloseTo(0, 9);
        expect(got.mc.nu20).toBeCloseTo((8 * 16 / 12) / 64, 9);
        // Картинка: 12 пикселей, x = 3..6, y = 2..4
        expect(got.mi.m00).toBe(12);
        expect(got.mi.m10 / got.mi.m00).toBeCloseTo(4.5, 9);
        expect(got.mi.m01 / got.mi.m00).toBeCloseTo(3, 9);
        expect(got.mi.mu20).toBeCloseTo(12 * (16 - 1) / 12, 9);
    });

    pythonTest('drawContours закрашивает и обводит', () => {
        const got = run(`
img = np.zeros((20, 20, 3), np.uint8)
c = np.array([[[2, 2]], [[2, 12]], [[12, 12]], [[12, 2]]], dtype=np.int32)
cv2.drawContours(img, [c], -1, (0, 255, 0), -1)
out({'inside': img[7, 7].tolist(), 'outside': img[16, 16].tolist()})`);
        expect(got).toEqual({ inside: [0, 255, 0], outside: [0, 0, 0] });
    });
});

describe('cv2: поза по точкам', () => {
    const SCENE = `
focal = 180 / math.tan(math.radians(36))
K = np.array([[focal, 0, 320], [0, focal, 180], [0, 0, 1]])
half = 0.05
obj = np.array([(-half, half, 0), (half, half, 0), (half, -half, 0), (-half, -half, 0)], dtype=np.float32)
rvec_true = np.array([[0.3], [-0.2], [0.1]]); tvec_true = np.array([[0.12], [-0.07], [1.0]])
`;

    pythonTest('Rodrigues: вектор в матрицу и обратно', () => {
        const got = run(`
R, _ = cv2.Rodrigues(np.array([0.0, 0.0, math.pi / 2]))
back, _ = cv2.Rodrigues(R)
out({'R': np.round(R, 9).tolist(), 'back': np.round(back.reshape(-1), 9).tolist()})`);
        expect(got.R[0][0]).toBeCloseTo(0, 9);
        expect(got.R[0][1]).toBeCloseTo(-1, 9);
        expect(got.R[1][0]).toBeCloseTo(1, 9);
        expect(got.back[2]).toBeCloseTo(Math.PI / 2, 6);
    });

    pythonTest('projectPoints: точка на оптической оси попадает в главную точку', () => {
        const got = run(SCENE + `
pts, _ = cv2.projectPoints(np.array([[0.0, 0.0, 0.0], [0.1, 0.0, 0.0]]), np.zeros(3), np.array([0.0, 0.0, 2.0]), K, None)
out(pts.reshape(-1, 2).tolist())`);
        expect(got[0][0]).toBeCloseTo(320, 6);
        expect(got[0][1]).toBeCloseTo(180, 6);
        expect(got[1][0]).toBeCloseTo(320 + 0.05 * (180 / Math.tan((36 * Math.PI) / 180)), 6);
    });

    pythonTest('solvePnP (IPPE_SQUARE) восстанавливает позу квадрата, расстояние сходится', () => {
        const got = run(SCENE + `
img, _ = cv2.projectPoints(obj, rvec_true, tvec_true, K, None)
ok, rvec, tvec = cv2.solvePnP(obj, img.reshape(-1, 2), K, np.zeros((1, 5)), flags=cv2.SOLVEPNP_IPPE_SQUARE)
out({'ok': ok, 'rvec': rvec.reshape(-1).tolist(), 'tvec': tvec.reshape(-1).tolist(), 'shape': list(tvec.shape),
     'dist': float(np.linalg.norm(tvec))})`);
        expect(got.ok).toBe(true);
        expect(got.shape).toEqual([3, 1]);
        [0.3, -0.2, 0.1].forEach((value, index) => expect(got.rvec[index]).toBeCloseTo(value, 5));
        [0.12, -0.07, 1.0].forEach((value, index) => expect(got.tvec[index]).toBeCloseTo(value, 5));
        expect(got.dist).toBeCloseTo(Math.hypot(0.12, 0.07, 1.0), 5);
    });

    pythonTest('solvePnP устойчив к шуму углов в полпикселя и учитывает искажения', () => {
        const got = run(SCENE + `
rng = np.random.default_rng(3)
img, _ = cv2.projectPoints(obj, rvec_true, tvec_true, K, None)
noisy = img.reshape(-1, 2) + rng.normal(0, 0.35, (4, 2))
ok, rvec, tvec = cv2.solvePnP(obj, noisy, K, None, flags=cv2.SOLVEPNP_IPPE_SQUARE)
dist = np.array([[-0.2, 0.05, 0.001, -0.001, 0.0]])
img_d, _ = cv2.projectPoints(obj, rvec_true, tvec_true, K, dist)
ok2, rvec2, tvec2 = cv2.solvePnP(obj, img_d.reshape(-1, 2), K, dist)
out({'ok': ok, 'err': float(np.linalg.norm(tvec.reshape(-1) - tvec_true.reshape(-1))), 'err2': float(np.linalg.norm(tvec2.reshape(-1) - tvec_true.reshape(-1))), 'ok2': ok2})`);
        expect(got.ok && got.ok2).toBe(true);
        // 0.35 пикселя шума на стороне 10 см в метре от камеры - это единицы сантиметров по глубине
        expect(got.err).toBeLessThan(0.06);
        expect(got.err2).toBeLessThan(1e-4);
    });

    pythonTest('solvePnP: непланарные точки (ITERATIVE, 8 точек), а мало точек - ошибка cv2.error', () => {
        const got = run(SCENE + `
cube = np.array([(x, y, z) for x in (-0.05, 0.05) for y in (-0.05, 0.05) for z in (0.0, 0.1)], dtype=np.float64)
img, _ = cv2.projectPoints(cube, rvec_true, tvec_true, K, None)
ok, rvec, tvec = cv2.solvePnP(cube, img.reshape(-1, 2), K, None)
try:
    cv2.solvePnP(obj[:3], np.zeros((3, 2)), K, None); few = False
except cv2.error:
    few = True
out({'ok': ok, 'tvec': tvec.reshape(-1).tolist(), 'few': few})`);
        expect(got.ok).toBe(true);
        expect(got.few).toBe(true);
        [0.12, -0.07, 1.0].forEach((value, index) => expect(got.tvec[index]).toBeCloseTo(value, 4));
    });

    pythonTest('drawFrameAxes рисует красную ось X, зелёную Y и синюю Z от центра маркера', () => {
        const got = run(SCENE + `
frame = np.zeros((360, 640, 3), np.uint8)
cv2.drawFrameAxes(frame, K, np.zeros((1, 5)), np.zeros((3, 1)), np.array([[0.0], [0.0], [1.0]]), 0.2)
out({'center': frame[180, 320].tolist(), 'x': frame[180, 320 + 40].tolist(), 'y': frame[180 + 40, 320].tolist(),
     'z_drawn': int(np.count_nonzero(frame))})`);
        expect(got.x).toEqual([0, 0, 255]);
        expect(got.y).toEqual([0, 255, 0]);
        expect(got.z_drawn).toBeGreaterThan(80);
    });

    pythonTest('FileStorage отдаёт калибровку камеры симулятора, неизвестные узлы - None', () => {
        const got = run(`
s = cv2.FileStorage('data.yml', cv2.FILE_STORAGE_READ)
mtx = s.getNode('mtx').mat(); dist = s.getNode('dist').mat(); other = s.getNode('foo').mat()
s.release()
out({'mtx': mtx.tolist(), 'dist': dist.reshape(-1).tolist(), 'other': other})`);
        expect(got.mtx[0][2]).toBe(320);
        expect(got.mtx[1][2]).toBe(180);
        expect(got.mtx[0][0]).toBeCloseTo(180 / Math.tan((36 * Math.PI) / 180), 9);
        expect(got.dist).toEqual([0, 0, 0, 0, 0]);
        expect(got.other).toBeNull();
    });
});

describe('примеры Пионера Мини 2 на синтетическом кадре', () => {
    const FAKE = `
import enum
class _Camera:
    def __init__(self, frames=3): self.left = frames
    def get_cv_frame(self, timeout=1.0):
        if self.left <= 0: raise KeyboardInterrupt
        self.left -= 1
        frame = np.full((360, 640, 3), 90, np.uint8)
        frame[150:210, 420:480] = (30, 30, 220)
        frame[10, 10] = (30, 30, 220)
        return frame
`;

    pythonTest('пример 18: поиск красного пятна (HSV + inRange + OPEN + findContours + moments)', () => {
        const got = run(FAKE + `
RED_RANGES = [((0, 120, 80), (10, 255, 255)), ((170, 120, 80), (180, 255, 255))]
def find_color_blob(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for low, high in RED_RANGES:
        mask |= cv2.inRange(hsv, np.array(low), np.array(high))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return None
    biggest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(biggest)
    m = cv2.moments(biggest)
    return int(m["m10"] / m["m00"]), int(m["m01"] / m["m00"]), area, len(contours)
out(find_color_blob(_Camera().get_cv_frame()))`);
        // Пятно 60x60 (x 420..479, y 150..209): центр (449, 179), площадь контура 59*59; одиночный пиксель убран OPEN.
        expect(got).toEqual([449, 179, 59 * 59, 1]);
    });

    pythonTest('примеры 19/20: solvePnP по углам маркера из детектора даёт расстояние и смещение', () => {
        const got = run(`
focal = 180 / math.tan(math.radians(36))
K = np.array([[focal, 0, 320], [0, focal, 180], [0, 0, 1]])
half = 0.05
MARKER_POINTS = np.array([(-half, half, 0), (half, half, 0), (half, -half, 0), (-half, -half, 0)], dtype=np.float32)
a, b = math.radians(20), math.radians(25)
Rz = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]])
Rx = np.array([[1, 0, 0], [0, math.cos(b), -math.sin(b)], [0, math.sin(b), math.cos(b)]])
R = Rx.dot(Rz); t = np.array([0.1, -0.05, 1.0])
cam = MARKER_POINTS.astype(float).dot(R.T) + t
corners_px = [[focal * p[0] / p[2] + 320, focal * p[1] / p[2] + 180] for p in cam]
js.pioneer_cv_detect_markers = lambda *args: [(7, corners_px)]
detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), cv2.aruco.DetectorParameters())
storage = cv2.FileStorage('data.yml', cv2.FILE_STORAGE_READ)
matrix, dist = storage.getNode('mtx').mat(), storage.getNode('dist').mat()
frame = np.zeros((360, 640, 3), np.uint8)
corners, ids, _ = detector.detectMarkers(frame)
ok, rvec, tvec = cv2.solvePnP(MARKER_POINTS, corners[0][0], matrix, dist, flags=cv2.SOLVEPNP_IPPE_SQUARE)
cv2.drawFrameAxes(frame, matrix, dist, rvec, tvec, half)
est = cv2.aruco.estimatePoseSingleMarkers(corners, 0.1, matrix, dist)
out({'ok': ok, 'id': int(ids.flatten()[0]), 'tvec': tvec.flatten().tolist(), 'distance': float(np.linalg.norm(tvec)),
     'legacy': est[1].reshape(-1).tolist(), 'drawn': int(np.count_nonzero(frame))})`);
        expect(got.ok).toBe(true);
        expect(got.id).toBe(7);
        [0.1, -0.05, 1.0].forEach((value, index) => expect(got.tvec[index]).toBeCloseTo(value, 3));
        expect(got.distance).toBeCloseTo(Math.hypot(0.1, 0.05, 1.0), 3);
        [0.1, -0.05, 1.0].forEach((value, index) => expect(got.legacy[index]).toBeCloseTo(value, 3));
        expect(got.drawn).toBeGreaterThan(15);
    });

    pythonTest('пример 14: addWeighted(..., dst=frame) поверх rectangle; пример 15: vconcat миниатюр', () => {
        const got = run(`
frame = np.full((360, 640, 3), 200, np.uint8)
overlay = frame.copy()
cv2.rectangle(overlay, (5, 5), (330, 120), (0, 0, 0), -1)
cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, dst=frame)
thumbs = [cv2.resize(frame, (320, int(360 * 320 / 640))) for _ in range(3)]
sheet = cv2.vconcat(thumbs)
out({'dim': frame[50, 50].tolist(), 'bright': frame[300, 600].tolist(), 'sheet': list(sheet.shape)})`);
        expect(got).toEqual({ dim: [100, 100, 100], bright: [200, 200, 200], sheet: [540, 320, 3] });
    });
});
