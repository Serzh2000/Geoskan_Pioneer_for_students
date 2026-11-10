import * as THREE from 'three';
import { OBJECT_TYPE } from '../shared/object-types.js';

/*
 * «Истина сцены» для pioneer_rknn (см. pioneer-rknn-module.ts). Настоящие нейросети смотрят на пиксели кадра; в браузере
 * модели .rknn не запустить, зато симулятор знает, где стоит каждый человек, машина и площадка с надписью. Поэтому детектор
 * проецирует такие объекты в кадр виртуальной камеры дрона и отдаёт рамки в формате настоящей библиотеки: класс COCO,
 * уверенность, 17 ключевых точек скелета, четырёхугольники строк текста.
 *
 * Что считается «увиденным»: объект целиком или хотя бы на 45 % площади в кадре, достаточно крупный в пикселях, не закрытый
 * чем-то между камерой и его центром. Уверенность растёт с размером объекта в кадре и падает у обрезанных рамок. Этот файл
 * чистый (только three.js): сцену, камеру и случайность ему передают.
 */

/** Кадр виртуальной камеры дрона - тот же, что отдаёт Camera.get_cv_frame (pioneer-js-bridge-camera-render.ts). */
export const FRAME_WIDTH = 640;
export const FRAME_HEIGHT = 360;

/** 80 классов набора COCO, на которых обучена yolov8n: номер в ответе Yolo.run - индекс в этом списке. */
export const COCO_CLASSES: readonly string[] = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
    'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
    'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
    'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
    'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
    'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
    'hair drier', 'toothbrush'
];

/** Классы COCO, которые в сцене симулятора есть. Деревьев, зданий и грузов в COCO нет, yolov8n их не находит. */
export const COCO = { person: 0, car: 2, bus: 5, train: 6, truck: 7 } as const;

export type SceneTarget = {
    id: string;
    cls: number;
    /** Точки объекта в мире: рамка в кадре - охват их проекций. */
    points: THREE.Vector3[];
    center: THREE.Vector3;
    /** Объект сцены (его собственные меши не считаются преградой); null у машин потока - они инстансы. */
    root: THREE.Object3D | null;
};

export type PersonTarget = SceneTarget & {
    /** 17 точек COCO в мире; null, если устройство фигуры незнакомо и скелет берётся по пропорциям рамки. */
    joints: THREE.Vector3[] | null;
    /** Куда смотрит человек (единичный вектор на плоскости земли). */
    forward: THREE.Vector3;
};

export type TextTarget = {
    id: string;
    text: string;
    /** Левый верхний, правый верхний, правый нижний, левый нижний углы надписи в мире. */
    corners: THREE.Vector3[];
    center: THREE.Vector3;
    normal: THREE.Vector3;
    root: THREE.Object3D | null;
};

export type SceneTruth = { objects: SceneTarget[]; people: PersonTarget[]; texts: TextTarget[] };

/** Машина потока (инстанс в world/runtime.ts): объекта сцены у неё нет, есть только коробка. */
export type FleetCarTruth = { id: number; cls: number; x: number; y: number; z: number; heading: number; length: number; width: number; height: number };

export type Detection = { box: [number, number, number, number]; cls: number; score: number; /** Выпуклый контур объекта в пикселях кадра (для YoloSeg). */ hull?: Array<[number, number]> };
export type PoseDetection = { box: [number, number, number, number]; score: number; keypoints: Array<[number, number, number]> };
export type TextDetection = { corners: Array<[number, number]>; text: string; score: number };

export type Occluded = (target: { center: THREE.Vector3; root: THREE.Object3D | null; extent: number }) => boolean;

export type Sensor = {
    camera: THREE.PerspectiveCamera;
    width: number;
    height: number;
    rng?: () => number;
    occluded?: Occluded;
};

/** Размеры человека из world/person-model.ts (метры, ступни на z = 0, перёд = +X, левая сторона = +Y). */
const HEIGHT = 1.75;
const HEAD = HEIGHT / 7.5;
const HIP_Z = 0.82;
const FOREARM = 0.25;

const MIN_SIDE_PX = 14;
const MIN_VISIBLE = 0.45;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const smooth = (a: number, b: number, value: number) => {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};
const jitter = (rng: () => number) => (rng() + rng() + rng() - 1.5) / 1.5;

// ---------------------------------------------------------------- сбор объектов сцены

/** Углы коробки объекта в его собственных осях (учитывает поворот машины, а не раздувается до осевой коробки мира). */
export function orientedBoxPoints(object: THREE.Object3D): THREE.Vector3[] | null {
    object.updateWorldMatrix(true, true);
    const inverse = new THREE.Matrix4().copy(object.matrixWorld).invert();
    const local = new THREE.Box3();
    const part = new THREE.Box3();
    const matrix = new THREE.Matrix4();
    object.traverseVisible((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || !mesh.geometry) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) return;
        matrix.multiplyMatrices(inverse, mesh.matrixWorld);
        local.union(part.copy(mesh.geometry.boundingBox).applyMatrix4(matrix));
    });
    if (local.isEmpty()) return null;
    const { min, max } = local;
    const points: THREE.Vector3[] = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
        points.push(new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld));
    }
    return points;
}

function centroid(points: THREE.Vector3[]): THREE.Vector3 {
    const sum = new THREE.Vector3();
    for (const point of points) sum.add(point);
    return sum.divideScalar(points.length || 1);
}

/** Коробка машины потока по её положению, курсу и размерам. */
export function fleetCarTarget(car: FleetCarTruth): SceneTarget {
    const cos = Math.cos(car.heading);
    const sin = Math.sin(car.heading);
    const points: THREE.Vector3[] = [];
    for (const along of [-car.length / 2, car.length / 2]) for (const across of [-car.width / 2, car.width / 2]) for (const up of [0, car.height]) {
        points.push(new THREE.Vector3(car.x + along * cos - across * sin, car.y + along * sin + across * cos, car.z + up));
    }
    return { id: `fleet:${car.id}`, cls: car.cls, points, center: centroid(points), root: null };
}

/** Тип работы аварийной службы -> класс COCO: пожарная и ремонтная машины - truck, полицейская - car. */
function serviceClass(kind: unknown): number {
    return kind === 'police' ? COCO.car : COCO.truck;
}

type PadLine = { text: string; cx: number; cy: number; width: number; height: number };

/** Надписи площадки (pads.ts, холст 512 x 512): крупная буква по центру и подпись внизу, размеры - по шрифтам холста. */
function padLines(object: THREE.Object3D): PadLine[] | null {
    const type = object.userData?.type;
    let big: string | null = null;
    let caption: string | null;
    if (type === OBJECT_TYPE.HELIPORT) { big = 'H'; caption = 'ПОСАДКА'; }
    else if (type === OBJECT_TYPE.CHARGE_STATION) { caption = 'ЗАРЯДКА'; }
    else if (type === OBJECT_TYPE.START_POSITION) {
        big = String(object.userData.value ?? '1');
        caption = `СТАРТ / ${big}`;
    } else return null;
    const lines: PadLine[] = [];
    if (big) lines.push({ text: big, cx: 256, cy: 247, width: Math.max(130, big.length * 108), height: 130 });
    if (caption) lines.push({ text: caption, cx: 256, cy: 425, width: caption.length * 13.5, height: 16 });
    return lines;
}

function padTargets(object: THREE.Object3D): TextTarget[] {
    const lines = padLines(object);
    if (!lines) return [];
    object.updateWorldMatrix(true, false);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(object.matrixWorld);
    // Плоскость 2 x 2 м с текстурой 512 px: пиксель холста -> локальные координаты (верх холста = +Y).
    const at = (px: number, py: number) => new THREE.Vector3((px - 256) / 256, -(py - 256) / 256, 0).applyMatrix4(object.matrixWorld);
    return lines.map((line, index) => {
        const halfW = line.width / 2;
        const halfH = line.height / 2;
        const corners = [at(line.cx - halfW, line.cy - halfH), at(line.cx + halfW, line.cy - halfH), at(line.cx + halfW, line.cy + halfH), at(line.cx - halfW, line.cy + halfH)];
        return { id: `${object.uuid}:text${index}`, text: line.text, corners, center: centroid(corners), normal, root: object };
    });
}

/** 17 точек COCO по устройству фигуры из world/actors.ts: root -> body -> [upper, нога П, нога Л], upper -> [торс, рука П, рука Л]. */
export function personJoints(root: THREE.Object3D): THREE.Vector3[] | null {
    const body = root.children[0];
    if (!body || body.children.length < 3) return null;
    const [upper, legR, legL] = body.children;
    if (!upper || upper.children.length < 3) return null;
    const [, armR, armL] = upper.children;
    const elbowOf = (arm: THREE.Object3D) => arm.children[1];
    const kneeOf = (leg: THREE.Object3D) => leg.children[1];
    const ankleOf = (knee: THREE.Object3D | undefined) => knee?.children[1];
    const parts = [armR, armL, legR, legL, elbowOf(armR), elbowOf(armL), kneeOf(legR), kneeOf(legL), ankleOf(kneeOf(legR)), ankleOf(kneeOf(legL))];
    if (parts.some((part) => !part)) return null;
    root.updateWorldMatrix(true, true);
    const place = (node: THREE.Object3D) => node.getWorldPosition(new THREE.Vector3());
    // Голова в осях таза: центр на высоте HEIGHT - 0.55 HEAD над землёй, таз - на HIP_Z.
    const headZ = HEIGHT - HEAD * 0.55 - HIP_Z;
    const head = (x: number, y: number, z: number) => upper.localToWorld(new THREE.Vector3(x, y, headZ + z));
    const wrist = (elbow: THREE.Object3D) => elbow.localToWorld(new THREE.Vector3(0, 0, -FOREARM));
    return [
        head(0.1, 0, -0.01),                       // 0 нос
        head(0.085, 0.035, 0.04), head(0.085, -0.035, 0.04),   // 1 левый глаз, 2 правый
        head(0, 0.08, 0.01), head(0, -0.08, 0.01),             // 3, 4 уши
        place(armL), place(armR),                  // 5, 6 плечи
        place(elbowOf(armL)), place(elbowOf(armR)),            // 7, 8 локти
        wrist(elbowOf(armL)), wrist(elbowOf(armR)),            // 9, 10 запястья
        place(legL), place(legR),                  // 11, 12 бёдра
        place(kneeOf(legL)), place(kneeOf(legR)),              // 13, 14 колени
        place(ankleOf(kneeOf(legL))!), place(ankleOf(kneeOf(legR))!)   // 15, 16 лодыжки
    ];
}

/** Обход сцены: люди, машины, площадки с надписями. Скрытые поддеревья пропускаются. */
export function collectSceneTruth(root: THREE.Object3D, fleetCars: FleetCarTruth[] = []): SceneTruth {
    const truth: SceneTruth = { objects: [], people: [], texts: [] };
    root.updateWorldMatrix(true, false);

    const walk = (node: THREE.Object3D) => {
        if (!node.visible) return;
        const data = node.userData || {};
        if (data.person) {
            const points = orientedBoxPoints(node);
            if (!points) return;
            const forward = new THREE.Vector3(1, 0, 0).transformDirection(node.matrixWorld);
            forward.z = 0;
            forward.normalize();
            const target: PersonTarget = { id: node.uuid, cls: COCO.person, points, center: centroid(points), root: node, joints: personJoints(node), forward };
            truth.people.push(target);
            truth.objects.push(target);
            return;
        }
        if (data.type === OBJECT_TYPE.CAR || data.type === OBJECT_TYPE.TRAIN || data.serviceKind) {
            const points = orientedBoxPoints(node);
            if (points) {
                const cls = data.type === OBJECT_TYPE.TRAIN ? COCO.train : data.serviceKind ? serviceClass(data.serviceKind) : COCO.car;
                truth.objects.push({ id: node.uuid, cls, points, center: centroid(points), root: node });
            }
            return;
        }
        truth.texts.push(...padTargets(node));
        for (const child of node.children) walk(child);
    };
    walk(root);
    for (const car of fleetCars) truth.objects.push(fleetCarTarget(car));
    return truth;
}

// ---------------------------------------------------------------- проекция

type Projection = { rect: [number, number, number, number]; clipped: [number, number, number, number]; visible: number };

function prepareCamera(camera: THREE.PerspectiveCamera) {
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
}

/** Пиксели точки или null, если она позади камеры. Ось Y кадра направлена вниз. */
function toPixel(point: THREE.Vector3, camera: THREE.PerspectiveCamera, width: number, height: number): [number, number] | null {
    const inCamera = point.clone().applyMatrix4(camera.matrixWorldInverse);
    if (inCamera.z > -camera.near) return null;
    const ndc = point.clone().project(camera);
    return [(ndc.x + 1) / 2 * width, (1 - ndc.y) / 2 * height];
}

/** Охват проекций точек. null - объект частично позади камеры. clipped - то же в границах кадра, visible - доля площади в кадре. */
export function projectRect(points: THREE.Vector3[], camera: THREE.PerspectiveCamera, width: number, height: number): Projection | null {
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const point of points) {
        const pixel = toPixel(point, camera, width, height);
        if (!pixel) return null;
        x1 = Math.min(x1, pixel[0]); y1 = Math.min(y1, pixel[1]);
        x2 = Math.max(x2, pixel[0]); y2 = Math.max(y2, pixel[1]);
    }
    const area = Math.max(1e-6, (x2 - x1) * (y2 - y1));
    const clipped: [number, number, number, number] = [clamp(x1, 0, width), clamp(y1, 0, height), clamp(x2, 0, width), clamp(y2, 0, height)];
    const clippedArea = Math.max(0, clipped[2] - clipped[0]) * Math.max(0, clipped[3] - clipped[1]);
    return { rect: [x1, y1, x2, y2], clipped, visible: clippedArea / area };
}

/** Уверенность по большей стороне рамки (px) и доле видимой площади: мелкое и обрезанное модель оценивает ниже. */
export function confidenceFor(size: number, visible: number, rng: () => number = Math.random): number {
    const base = 0.45 + 0.5 * smooth(10, 110, size);
    return clamp(base * (0.7 + 0.3 * visible) + jitter(rng) * 0.03, 0.05, 0.98);
}

function extentOf(points: THREE.Vector3[]): number {
    let far = 0;
    for (const a of points) for (const b of points) far = Math.max(far, a.distanceTo(b));
    return far;
}

function inFrameBox(projection: Projection): { size: number } | null {
    const [x1, y1, x2, y2] = projection.clipped;
    const width = x2 - x1;
    const height = y2 - y1;
    if (Math.max(width, height) < MIN_SIDE_PX || projection.visible < MIN_VISIBLE) return null;
    return { size: Math.max(width, height) };
}

function iou(a: number[], b: number[]): number {
    const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
    const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    if (w <= 0 || h <= 0) return 0;
    const inter = w * h;
    return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter);
}

/** NMS: из перекрывающихся рамок одного класса остаётся самая уверенная (nmsThresh - порог IoU). */
export function nonMaxSuppression<T extends { box: number[]; cls: number; score: number }>(items: T[], nmsThresh: number): T[] {
    const sorted = [...items].sort((a, b) => b.score - a.score);
    const kept: T[] = [];
    for (const item of sorted) {
        if (!kept.some((other) => other.cls === item.cls && iou(other.box, item.box) > nmsThresh)) kept.push(item);
    }
    return kept;
}

function jitterBox(box: [number, number, number, number], rng: () => number): [number, number, number, number] {
    const width = box[2] - box[0];
    const height = box[3] - box[1];
    const dx = width * 0.02;
    const dy = height * 0.02;
    return [box[0] + jitter(rng) * dx, box[1] + jitter(rng) * dy, box[2] + jitter(rng) * dx, box[3] + jitter(rng) * dy];
}

function seen(target: SceneTarget, sensor: Sensor): { projection: Projection; size: number } | null {
    const projection = projectRect(target.points, sensor.camera, sensor.width, sensor.height);
    if (!projection) return null;
    const box = inFrameBox(projection);
    if (!box) return null;
    if (sensor.occluded?.({ center: target.center, root: target.root, extent: extentOf(target.points) })) return null;
    return { projection, size: box.size };
}

// ---------------------------------------------------------------- детекторы

/** Yolo: рамки объектов COCO в пикселях кадра. objectThresh отбрасывает неуверенное, nmsThresh - перекрытия. */
export function detectObjects(truth: SceneTruth, sensor: Sensor, objectThresh = 0.25, nmsThresh = 0.45, withHull = false): Detection[] {
    const rng = sensor.rng ?? Math.random;
    prepareCamera(sensor.camera);
    const found: Detection[] = [];
    for (const target of truth.objects) {
        const view = seen(target, sensor);
        if (!view) continue;
        const score = confidenceFor(view.size, view.projection.visible, rng);
        if (score < objectThresh) continue;
        found.push({ box: jitterBox(view.projection.clipped, rng), cls: target.cls, score, ...(withHull ? { hull: silhouette(target, sensor) } : {}) });
    }
    return nonMaxSuppression(found, nmsThresh);
}

function convexHull(points: Array<[number, number]>): Array<[number, number]> {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3) return sorted;
    const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const build = (list: Array<[number, number]>) => {
        const chain: Array<[number, number]> = [];
        for (const point of list) {
            while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0) chain.pop();
            chain.push(point);
        }
        chain.pop();
        return chain;
    };
    return [...build(sorted), ...build(sorted.reverse())];
}

/**
 * Контур для маски YoloSeg: выпуклая оболочка проекции объекта. У человека - оболочка суставов с отступом 9 см (силуэт руки-ноги-голова
 * вокруг скелета), у машины - оболочка проекции габаритной коробки. Это приближение: настоящая маска идёт по пикселям.
 */
export function silhouette(target: SceneTarget, sensor: Sensor): Array<[number, number]> {
    let points = target.points;
    const joints = (target as PersonTarget).joints;
    if (joints) {
        const right = new THREE.Vector3().setFromMatrixColumn(sensor.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(sensor.camera.matrixWorld, 1);
        points = joints.flatMap((joint) => [
            joint.clone().addScaledVector(right, 0.09), joint.clone().addScaledVector(right, -0.09),
            joint.clone().addScaledVector(up, 0.09), joint.clone().addScaledVector(up, -0.09)
        ]);
    }
    const pixels: Array<[number, number]> = [];
    for (const point of points) {
        const pixel = toPixel(point, sensor.camera, sensor.width, sensor.height);
        if (pixel) pixels.push(pixel);
    }
    return convexHull(pixels);
}

/** YoloPose: человек с 17 точками скелета. Точка вне кадра или на спине у человека, стоящего спиной, получает низкую уверенность. */
export function detectPoses(truth: SceneTruth, sensor: Sensor, objectThresh = 0.25, nmsThresh = 0.45): PoseDetection[] {
    const rng = sensor.rng ?? Math.random;
    prepareCamera(sensor.camera);
    const cameraPosition = new THREE.Vector3().setFromMatrixPosition(sensor.camera.matrixWorld);
    const found: Array<PoseDetection & { cls: number }> = [];
    for (const person of truth.people) {
        const view = seen(person, sensor);
        if (!view) continue;
        const score = confidenceFor(view.size, view.projection.visible, rng);
        if (score < objectThresh) continue;
        const box = jitterBox(view.projection.clipped, rng);
        const toCamera = cameraPosition.clone().sub(person.center);
        toCamera.z = 0;
        const facing = toCamera.lengthSq() > 1e-9 ? person.forward.dot(toCamera.normalize()) : 1;
        const joints: Array<THREE.Vector3 | [number, number]> = person.joints ?? proportionalSkeleton(view.projection.rect);
        const keypoints = joints.map((joint, index): [number, number, number] => {
            const pixel = joint instanceof THREE.Vector3 ? toPixel(joint, sensor.camera, sensor.width, sensor.height) : joint;
            if (!pixel) return [box[0], box[1], 0.02];
            const inside = pixel[0] >= 0 && pixel[0] <= sensor.width && pixel[1] >= 0 && pixel[1] <= sensor.height;
            // Лицо (0-2) не видно, если человек стоит спиной к камере; уши (3, 4) и тело видны почти всегда.
            const hiddenFace = index <= 2 && facing < -0.2;
            const confidence = inside ? (hiddenFace ? 0.2 : clamp(0.55 + 0.4 * smooth(20, 150, view.size) + jitter(rng) * 0.04, 0.05, 0.97)) : 0.04;
            return [pixel[0] + jitter(rng) * 0.4, pixel[1] + jitter(rng) * 0.4, confidence];
        });
        found.push({ box, score, keypoints, cls: 0 });
    }
    return nonMaxSuppression(found.map((item) => ({ ...item, box: item.box as number[] })), nmsThresh) as unknown as PoseDetection[];
}

/** Скелет по рамке, если устройство фигуры незнакомо: грубые пропорции стоящего человека (пиксели, а не точки мира). */
function proportionalSkeleton(rect: [number, number, number, number]): Array<[number, number]> {
    const [x1, y1, x2, y2] = rect;
    const cx = (x1 + x2) / 2;
    const w = x2 - x1;
    const h = y2 - y1;
    const at = (fx: number, fy: number): [number, number] => [cx + fx * w, y1 + fy * h];
    return [
        at(0, 0.06), at(0.06, 0.04), at(-0.06, 0.04), at(0.12, 0.06), at(-0.12, 0.06),
        at(0.2, 0.2), at(-0.2, 0.2), at(0.25, 0.37), at(-0.25, 0.37), at(0.25, 0.52), at(-0.25, 0.52),
        at(0.12, 0.52), at(-0.12, 0.52), at(0.12, 0.73), at(-0.12, 0.73), at(0.12, 0.95), at(-0.12, 0.95)
    ];
}

/** PaddleOCR: надписи, которые видно целиком, обращены к камере и достаточно высоки в пикселях. */
export function detectTexts(truth: SceneTruth, sensor: Sensor): TextDetection[] {
    const rng = sensor.rng ?? Math.random;
    prepareCamera(sensor.camera);
    const cameraPosition = new THREE.Vector3().setFromMatrixPosition(sensor.camera.matrixWorld);
    const found: TextDetection[] = [];
    for (const target of truth.texts) {
        const toCamera = cameraPosition.clone().sub(target.center);
        const distance = toCamera.length();
        const facing = distance > 0 ? target.normal.dot(toCamera.divideScalar(distance)) : 0;
        if (facing < 0.25) continue;
        const pixels = target.corners.map((corner) => toPixel(corner, sensor.camera, sensor.width, sensor.height));
        if (pixels.some((pixel) => !pixel)) continue;
        const quad = pixels as Array<[number, number]>;
        if (quad.some(([x, y]) => x < 0 || x > sensor.width || y < 0 || y > sensor.height)) continue;
        // Высота строки: левая сторона четырёхугольника (от верха к низу).
        const lineHeight = Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]);
        if (lineHeight < 9) continue;
        if (sensor.occluded?.({ center: target.center, root: target.root, extent: 0.5 })) continue;
        const score = clamp((0.5 + 0.45 * smooth(9, 42, lineHeight)) * (0.8 + 0.2 * facing) + jitter(rng) * 0.02, 0.05, 0.99);
        found.push({ corners: quad.map(([x, y]): [number, number] => [x + jitter(rng) * 0.5, y + jitter(rng) * 0.5]), text: target.text, score });
    }
    // Строки идут сверху вниз, как их отдаёт настоящий детектор текста.
    return found.sort((a, b) => a.corners[0][1] - b.corners[0][1]);
}
