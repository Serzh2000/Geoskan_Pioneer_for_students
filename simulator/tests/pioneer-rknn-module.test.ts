/**
 * Python-часть pioneer_rknn (python/pioneer-rknn-module.ts) на настоящем CPython: вместо Pyodide и JS-моста подставлен
 * модуль js, который отвечает заготовленными строками. Проверяются формы входа и ответа из сборника «Pioneer-RKNN»
 * (pioneer_rknn 1.10.0), ошибки и ограничение «только Пионер Мини 2». Нужны Python 3 и numpy; без них тесты пропускаются.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PIONEER_RKNN_PRELUDE } from '../public/modules/python/pioneer-rknn-module.js';
import { findPython } from './helpers/python-sdk-harness.js';

const python = findPython();
const numpyReady = python ? spawnSync(python, ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0 : false;
const withPython = python && numpyReady ? test : test.skip;

const STUB_JS = `
import json, os

class Rows:
    def __init__(self, rows):
        self.rows = rows
    def to_py(self):
        return self.rows

SIM_DRONE_ID = "drone_1"
CONFIG = json.loads(os.environ["RKNN_STUB"])
LOG = []
CALLS = []

def pioneer2_drone_model(drone_id):
    return CONFIG.get("model", "pioneer-mini2")

def pioneer2_log(text):
    LOG.append(text)

def pioneer_rknn_detect(drone_id, w, h, obj, nms):
    CALLS.append(["detect", w, h, obj, nms])
    return Rows(CONFIG.get("detect", []))

def pioneer_rknn_seg(drone_id, w, h, obj, nms):
    CALLS.append(["seg", w, h, obj, nms])
    return Rows(CONFIG.get("seg", []))

def pioneer_rknn_pose(drone_id, w, h, obj, nms):
    CALLS.append(["pose", w, h, obj, nms])
    return Rows(CONFIG.get("pose", []))

def pioneer_rknn_ocr(drone_id, w, h):
    CALLS.append(["ocr", w, h])
    return Rows(CONFIG.get("ocr", []))
`;

function run(program: string, stub: Record<string, unknown> = {}): { ok: boolean; out: any; stderr: string } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rknn-py-'));
    try {
        fs.writeFileSync(path.join(dir, 'js.py'), STUB_JS, 'utf8');
        fs.writeFileSync(path.join(dir, 'prelude.py'), PIONEER_RKNN_PRELUDE, 'utf8');
        const driver = `
import json, sys
sys.path.insert(0, ${JSON.stringify(dir)})
import numpy as np
import js
exec(open(${JSON.stringify(path.join(dir, 'prelude.py'))}, encoding="utf-8").read())
from pioneer_rknn import Yolo, YoloSeg, YoloPose, PaddleOCR, ModelRegistry, ModelContainer
out = {}
${program}
print("@@OUT@@" + json.dumps(out, ensure_ascii=False, default=str))
`;
        fs.writeFileSync(path.join(dir, 'driver.py'), driver, 'utf8');
        const result = spawnSync(python!, ['-X', 'utf8', path.join(dir, 'driver.py')], {
            encoding: 'utf8',
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', RKNN_STUB: JSON.stringify(stub) }
        });
        const marker = result.stdout.lastIndexOf('@@OUT@@');
        return { ok: result.status === 0 && marker >= 0, out: marker >= 0 ? JSON.parse(result.stdout.slice(marker + 7)) : null, stderr: result.stderr };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const PICTURE = 'np.ones((1, 640, 640, 3), dtype=np.uint8)';

describe('pioneer_rknn: Yolo', () => {
    withPython('run возвращает (рамки Nx4, классы, уверенности) в пикселях входа 640x640', () => {
        const result = run(`
model = Yolo(model_name="yolov8n")
boxes, classes, scores = model.run([${PICTURE}])
out["shapes"] = [list(boxes.shape), list(classes.shape), list(scores.shape)]
out["first"] = [boxes[0].tolist(), int(classes[0]), round(float(scores[0]), 2)]
out["calls"] = list(js.CALLS)
out["thresholds"] = [model.object_thresh, model.nms_thresh]
model.object_thresh, model.nms_thresh = 0.6, 0.2
model.run([${PICTURE}])
out["changed"] = js.CALLS[-1]
`, { detect: [[10, 20, 110, 220, 0, 0.9], [300, 40, 400, 140, 2, 0.6]] });
        expect(result.stderr).toBe('');
        expect(result.out.shapes).toEqual([[2, 4], [2], [2]]);
        expect(result.out.first).toEqual([[10, 20, 110, 220], 0, 0.9]);
        expect(result.out.calls).toEqual([['detect', 640, 640, 0.25, 0.45]]);
        expect(result.out.thresholds).toEqual([0.25, 0.45]);
        expect(result.out.changed).toEqual(['detect', 640, 640, 0.6, 0.2]);
    });

    withPython('пороги и ядро NPU из конструктора', () => {
        const result = run(`
model = Yolo(model_name="yolov8n", npu_core=[1], object_thresh=0.5, nms_thresh=0.3)
model.run([${PICTURE}])
out["calls"] = js.CALLS
out["core"] = model.npu_core
`);
        expect(result.out.calls).toEqual([['detect', 640, 640, 0.5, 0.3]]);
        expect(result.out.core).toEqual([1]);
    });

    withPython('если объектов нет, run возвращает None; на чёрном входе - тоже', () => {
        const none = run('out["none"] = Yolo(model_name="yolov8n").run([' + PICTURE + ']) is None', { detect: [] });
        expect(none.out.none).toBe(true);
        const black = run('out["black"] = Yolo(model_name="yolov8n").run([np.zeros((1, 640, 640, 3), dtype=np.uint8)]) is None', { detect: [[1, 2, 3, 4, 0, 0.9]] });
        expect(black.out.black).toBe(true);
    });

    withPython('вход проверяется: нужен список из одного массива (1, 640, 640, 3)', () => {
        const result = run(`
model = Yolo(model_name="yolov8n")
messages = []
for bad in ([np.ones((640, 640, 3), dtype=np.uint8)], [np.ones((1, 480, 640, 3))], [np.ones((1, 640, 640, 3)), np.ones((1, 640, 640, 3))], "кадр"):
    try:
        model.run(bad)
        messages.append("нет ошибки")
    except ValueError as e:
        messages.append(str(e))
out["messages"] = messages
`);
        expect(result.out.messages).toHaveLength(4);
        for (const message of result.out.messages) expect(message).toContain('(1, 640, 640, 3)');
    });

    withPython('ошибки создания модели: как в книге (ValueError / FileNotFoundError), неверное ядро NPU завершает программу', () => {
        const result = run(`
errors = {}
for key, make in {
    "unknown": lambda: Yolo(model_name="yolov5"),
    "pose_for_yolo": lambda: Yolo(model_name="yolov8n-pose"),
    "yolo_for_pose": lambda: YoloPose(model_name="yolov8n"),
    "path": lambda: Yolo(model_path="/home/pioneermini/best.rknn"),
    "core": lambda: Yolo(model_name="yolov8n", npu_core=[5]),
    "neither": lambda: Yolo(),
}.items():
    try:
        make()
        errors[key] = "нет ошибки"
    except Exception as e:
        errors[key] = type(e).__name__ + ": " + str(e)
    except SystemExit as e:
        errors[key] = "SystemExit " + str(e.code)
out["errors"] = errors
`);
        expect(result.out.errors.unknown).toMatch(/^FileNotFoundError: .*yolov8n, yolov8n-seg, yolov8n-pose/);
        expect(result.out.errors.pose_for_yolo).toMatch(/^ValueError: .*архитектура yolov8-pose/);
        expect(result.out.errors.yolo_for_pose).toMatch(/^ValueError: .*yolov8-pose/);
        expect(result.out.errors.path).toMatch(/^FileNotFoundError: .*model_name/);
        expect(result.out.errors.core).toBe('SystemExit 1');
        expect(result.out.errors.neither).toMatch(/^ValueError/);
    });

    withPython('после release() Yolo ничего не находит, ModelContainer.run даёт пустой список; повторный release() безопасен', () => {
        const result = run(`
model = Yolo(model_name="yolov8n")
model.release()
model.release()
out["yolo"] = model.run([${PICTURE}]) is None
out["raw"] = ModelContainer.run(model, [${PICTURE}])
`, { detect: [[1, 2, 3, 4, 0, 0.9]] });
        expect(result.out.yolo).toBe(true);
        expect(result.out.raw).toEqual([]);
    });

    withPython('у других дронов библиотека останавливается подсказкой про Пионер Мини 2', () => {
        const result = run(`
try:
    Yolo(model_name="yolov8n")
    out["error"] = "нет ошибки"
except RuntimeError as e:
    out["error"] = str(e)
`, { model: 'pioneer-basic' });
        expect(result.out.error).toContain('pioneer_rknn - библиотека Пионера Мини 2');
    });

    withPython('при создании модели симулятор один раз за запуск говорит, что нейросеть заменена зрением', () => {
        const result = run(`
Yolo(model_name="yolov8n")
YoloPose(model_name="yolov8n-pose")
out["log"] = js.LOG
`);
        expect(result.out.log).toHaveLength(1);
        expect(result.out.log[0]).toContain('[симулятор]');
        expect(result.out.log[0]).toContain('не по пикселям');
    });
});

describe('pioneer_rknn: YoloSeg', () => {
    withPython('run возвращает 4 массива, маски 640x640 из 0/1 обрезаны по рамке и лежат внутри контура', () => {
        const result = run(`
model = YoloSeg(model_name="yolov8n-seg", object_thresh=0.3)
boxes, classes, scores, masks = model.run([${PICTURE}])
out["shapes"] = [list(boxes.shape), list(classes.shape), list(scores.shape), list(masks.shape)]
mask = masks[0]
out["values"] = sorted(set(int(v) for v in np.unique(mask)))
ys, xs = np.nonzero(mask)
out["extent"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
out["area"] = int(mask.sum())
out["inside_center"] = int(mask[300, 200])
out["outside_corner"] = int(mask[10, 10])
`, { seg: [[100, 100, 300, 500, 0, 0.9, 100, 100, 300, 100, 300, 500, 100, 500]] });
        expect(result.stderr).toBe('');
        expect(result.out.shapes).toEqual([[1, 4], [1], [1], [1, 640, 640]]);
        expect(result.out.values).toEqual([0, 1]);
        expect(result.out.extent[0]).toBeGreaterThanOrEqual(100);
        expect(result.out.extent[2]).toBeLessThanOrEqual(300);
        expect(result.out.area).toBeGreaterThan(0.9 * 200 * 400);
        expect(result.out.inside_center).toBe(1);
        expect(result.out.outside_corner).toBe(0);
    });

    withPython('никого нет - None', () => {
        const result = run('out["none"] = YoloSeg(model_name="yolov8n-seg").run([' + PICTURE + ']) is None', { seg: [] });
        expect(result.out.none).toBe(true);
    });
});

describe('pioneer_rknn: YoloPose', () => {
    const KEYPOINTS = Array.from({ length: 17 }, (_, i) => [100 + i, 50 + i * 10, 0.9]).flat();

    withPython('run возвращает людей с classId, score, рамкой и keypoint 17x3', () => {
        const result = run(`
model = YoloPose(model_name="yolov8n-pose")
people = model.run([${PICTURE}]) or []
person = people[0]
out["count"] = len(people)
out["fields"] = [round(person.score, 2), person.xmin, person.ymin, person.xmax, person.ymax]
out["class_id"] = person.classId
out["defaults"] = [model.object_thresh, model.nms_thresh]
out["wrist_const"] = YoloPose.LEFT_WRIST
out["shape"] = list(person.keypoint.shape)
out["kp0"] = [round(float(v), 1) for v in person.keypoint[0]]
`, { pose: [[90, 40, 200, 400, 0.88, ...KEYPOINTS]] });
        expect(result.stderr).toBe('');
        expect(result.out.count).toBe(1);
        expect(result.out.fields).toEqual([0.88, 90, 40, 200, 400]);
        expect(result.out.class_id).toBe(0);
        expect(result.out.defaults).toEqual([0.4, 0.5]);
        expect(result.out.wrist_const).toBe(9);
        expect(result.out.shape).toEqual([17, 3]);
        expect(result.out.kp0).toEqual([100, 50, 0.9]);
    });

    withPython('никого нет - пустой список', () => {
        const result = run('out["people"] = YoloPose(model_name="yolov8n-pose").run([' + PICTURE + '])', { pose: [] });
        expect(result.out.people).toEqual([]);
    });
});

describe('pioneer_rknn: PaddleOCR', () => {
    withPython('run(img=...) возвращает четырёхугольники строк и варианты прочтения (текст, уверенность)', () => {
        const result = run(`
ocr = PaddleOCR(det_model_name="PP-OCRv5_mobile_det", rec_model_name="eslav_PP-OCRv5_mobile_rec")
boxes, results = ocr.run(img=np.ones((360, 640, 3), dtype=np.uint8))
out["boxes"] = [list(b.shape) for b in boxes]
out["results"] = results
out["calls"] = js.CALLS
`, { ocr: [[[10, 10, 200, 10, 200, 40, 10, 40], 'ПОСАДКА', 0.91], [[10, 60, 90, 60, 90, 80, 10, 80], 'шум', 0.3]] });
        expect(result.stderr).toBe('');
        expect(result.out.boxes).toEqual([[4, 2]]);
        expect(result.out.results).toEqual([[['ПОСАДКА', 0.91]]]);
        expect(result.out.calls).toEqual([['ocr', 640, 360]]);
    });

    withPython('кадр без текста - (None, None); не изображение или неверное имя модели - ValueError', () => {
        const result = run(`
ocr = PaddleOCR(det_model_name="PP-OCRv5_mobile_det", rec_model_name="eslav_PP-OCRv5_mobile_rec", npu_core=[0])
out["empty"] = list(ocr.run(np.ones((360, 640, 3), dtype=np.uint8)))
try:
    ocr.run(np.ones((1, 640, 640, 3), dtype=np.uint8))
except ValueError as e:
    out["shape_error"] = str(e)
try:
    PaddleOCR(det_model_name="yolov8n", rec_model_name="eslav_PP-OCRv5_mobile_rec")
except ValueError as e:
    out["name_error"] = str(e)
`);
        expect(result.out.empty).toEqual([null, null]);
        expect(result.out.shape_error).toContain('одно изображение');
        expect(result.out.name_error).toContain('PaddleOCR');
    });
});

describe('pioneer_rknn: ModelRegistry и ModelContainer', () => {
    withPython('list_model - список словарей, get_model_info(name=) - сведения или None, upload_model и delete_model работают с записями', () => {
        const result = run(`
registry = ModelRegistry()
models = registry.list_model()
out["is_list"] = isinstance(models, list)
out["names"] = sorted(m["name"] for m in models)
out["info"] = registry.get_model_info(name="yolov8n")
out["missing"] = registry.get_model_info("нет такой")
uploaded = registry.upload_model(name="cifar_net", version="", filepath="net.onnx", arch="custom")
out["uploaded"] = uploaded
out["after_upload"] = registry.get_model_info("cifar_net") is not None
out["deleted"] = registry.delete_model("cifar_net")["name"]
out["delete_again"] = registry.delete_model("cifar_net")
try:
    registry.upload_model("x", "1", "net.txt", "custom")
except ValueError as e:
    out["bad_file"] = str(e)
`);
        expect(result.stderr).toBe('');
        expect(result.out.is_list).toBe(true);
        expect(result.out.names).toEqual(['PP-OCRv5_mobile_det', 'eslav_PP-OCRv5_mobile_rec', 'yolov8n', 'yolov8n-pose', 'yolov8n-seg']);
        expect(result.out.info).toMatchObject({ name: 'yolov8n', arch: 'yolov8', version: '1.0.0' });
        expect(result.out.info.filename).toContain('yolov8n_1.0.0.rknn');
        expect(result.out.missing).toBeNull();
        expect(result.out.uploaded).toMatchObject({ name: 'cifar_net', arch: 'custom', version: '1.0.0' });
        expect(result.out.after_upload).toBe(true);
        expect(result.out.deleted).toBe('cifar_net');
        expect(result.out.delete_again).toBeNull();
        expect(result.out.bad_file).toContain('.onnx');
    });

    withPython('ModelContainer.run даёт «сырые» выходы нужной формы; своя модель в браузере не считается', () => {
        const result = run(`
model = Yolo(model_name="yolov8n")
raw = ModelContainer.run(model, [${PICTURE}])
out["shapes"] = [list(t.shape) for t in raw]
out["cls_cell"] = float(raw[1].max()) + float(raw[4].max()) + float(raw[7].max())
out["seg_outputs"] = len(ModelContainer.run(YoloSeg(model_name="yolov8n-seg"), [${PICTURE}]))
out["pose_shapes"] = [list(t.shape) for t in ModelContainer.run(YoloPose(model_name="yolov8n-pose"), [${PICTURE}])]
try:
    ModelContainer(model_name="yolov8n")
except ValueError as e:
    out["base_arch"] = str(e)

class Mine(ModelContainer):
    arch = ["custom"]

registry = ModelRegistry()
registry.upload_model("cifar_net", "", "net.onnx", "custom")
mine = Mine(model_name="cifar_net", npu_core=None)
try:
    mine.run([np.zeros((1, 32, 32, 3), dtype=np.float32)])
except NotImplementedError as e:
    out["custom"] = str(e)
registry.delete_model("cifar_net")
`, { detect: [[100, 100, 300, 400, 0, 0.8]] });
        expect(result.stderr).toBe('');
        expect(result.out.shapes).toEqual([[1, 64, 80, 80], [1, 80, 80, 80], [1, 1, 80, 80], [1, 64, 40, 40], [1, 80, 40, 40], [1, 1, 40, 40], [1, 64, 20, 20], [1, 80, 20, 20], [1, 1, 20, 20]]);
        // Рамка закодирована в одной из трёх сеток: класс 0 с уверенностью 0.8 лежит ровно в одной клетке.
        expect(result.out.cls_cell).toBeCloseTo(0.8, 5);
        expect(result.out.seg_outputs).toBe(13);
        expect(result.out.pose_shapes).toEqual([[1, 65, 80, 80], [1, 65, 40, 40], [1, 65, 20, 20], [1, 17, 3, 8400]]);
        expect(result.out.base_arch).toContain('custom');
        expect(result.out.custom).toContain('своя модель');
    });

    withPython('рамка из «сырых» выходов декодируется быстрой постобработкой примера 18 почти так же (в пределах шага сетки)', () => {
        const result = run(`
SIZE = 640
GRID = np.arange(16, dtype=np.float32)[None, :, None]
model = Yolo(model_name="yolov8n")
outputs = ModelContainer.run(model, [${PICTURE}])
boxes = []
for i in range(3):
    box, cls = outputs[3 * i], outputs[3 * i + 1]
    h, w = cls.shape[2:]
    stride = SIZE // h
    cls = cls[0].reshape(80, -1)
    best = cls.argmax(0)
    score = cls[best, np.arange(cls.shape[1])]
    idx = np.nonzero(score >= 0.25)[0]
    if idx.size == 0:
        continue
    d = box[0].reshape(4, 16, -1)[:, :, idx]
    d = np.exp(d - d.max(1, keepdims=True))
    d = (d / d.sum(1, keepdims=True) * GRID).sum(1)
    gx, gy = idx % w + 0.5, idx // w + 0.5
    boxes.append([float((gx - d[0])[0] * stride), float((gy - d[1])[0] * stride), float((gx + d[2])[0] * stride), float((gy + d[3])[0] * stride), int(best[idx][0])])
out["boxes"] = boxes
`, { detect: [[100, 120, 300, 520, 2, 0.8]] });
        expect(result.out.boxes).toHaveLength(1);
        const [x1, y1, x2, y2, cls] = result.out.boxes[0];
        expect(cls).toBe(2);
        for (const [got, want] of [[x1, 100], [y1, 120], [x2, 300], [y2, 520]]) expect(Math.abs(got - want)).toBeLessThanOrEqual(16);
    });
});

describe('pioneer_rknn: примеры для Мини 2 вызывают библиотеку так, как она это умеет', () => {
    const root = path.resolve('..', 'examples', 'python-onboard', 'pioneer_rknn');
    const files = [
        ...fs.readdirSync(root).filter((f) => f.endsWith('.py')).map((f) => path.join(root, f)),
        ...fs.readdirSync(path.join(root, 'collection')).filter((f) => f.endsWith('.py')).map((f) => path.join(root, 'collection', f))
    ];

    test('в папках примеров есть 5 примеров книги и 15 примеров сборника, не работающие в браузере лежат отдельно', () => {
        expect(files).toHaveLength(20);
        expect(fs.readdirSync(path.join(root, 'board-only')).sort()).toEqual([
            '13a_train_export.py', '13b_custom_classifier.py', '16_pipeline_profiler.py', '17_model_pool.py', '18_fast_pipeline.py'
        ]);
    });

    withPython('каждый пример разбирается; конструкторы pioneer_rknn и методы ModelRegistry принимают те аргументы, что в примере', () => {
        const result = run(`
import ast, inspect
problems = []
checked = 0
for file in ${JSON.stringify(files)}:
    tree = ast.parse(open(file, encoding="utf-8").read(), file)
    registries = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) and getattr(node.value.func, "id", None) == "ModelRegistry":
            registries |= {t.id for t in node.targets if isinstance(t, ast.Name)}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        target = None
        if isinstance(node.func, ast.Name) and node.func.id in ("Yolo", "YoloSeg", "YoloPose", "PaddleOCR", "ModelRegistry"):
            target = getattr(__import__("pioneer_rknn"), node.func.id).__init__
        elif isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id in registries:
            target = getattr(ModelRegistry, node.func.attr, None)
            if target is None:
                problems.append(file.split("/")[-1] + ": нет ModelRegistry." + node.func.attr)
                continue
        if target is None:
            continue
        args = [None] * (len(node.args) + 1)
        kwargs = {k.arg: None for k in node.keywords if k.arg}
        try:
            inspect.signature(target).bind(*args, **kwargs)
            checked += 1
        except TypeError as e:
            problems.append(file.split("/")[-1] + ": " + str(e))
out["problems"] = problems
out["checked"] = checked
`);
        expect(result.stderr).toBe('');
        expect(result.out.problems).toEqual([]);
        expect(result.out.checked).toBeGreaterThan(20);
    });
});
