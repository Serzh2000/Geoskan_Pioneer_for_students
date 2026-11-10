/**
 * «Зрение» pioneer_rknn: что камера дрона находит в сцене (python/pioneer-rknn-scene.ts) - рамки Yolo, скелет YoloPose,
 * строки PaddleOCR. Сцена и камера собираются из настоящих фигур людей (world/actors.ts) и обычных three.js-объектов.
 */
import * as THREE from 'three';
import {
    COCO, collectSceneTruth, confidenceFor, detectObjects, detectPoses, detectTexts, fleetCarTarget,
    nonMaxSuppression, type Sensor
} from '../public/modules/python/pioneer-rknn-scene.js';
import { createPerson, placePerson, poseNow } from '../public/modules/world/actors.js';

const W = 640;
const H = 360;
const still = () => 0.5;

/** Камера на высоте 1.2 м смотрит вдоль +X (мир: Z вверх), как передняя камера дрона. */
function frontCamera(x = 0, y = 0, z = 1.2): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(72, W / H, 0.05, 500);
    camera.up.set(0, 0, 1);
    camera.position.set(x, y, z);
    camera.lookAt(x + 10, y, z);
    camera.updateMatrixWorld(true);
    return camera;
}

/** Камера смотрит вниз, верх кадра - на +Y. */
function downCamera(z: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(72, W / H, 0.05, 500);
    camera.up.set(0, 1, 0);
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    return camera;
}

function sensor(camera: THREE.PerspectiveCamera, extra: Partial<Sensor> = {}): Sensor {
    return { camera, width: W, height: H, rng: still, ...extra };
}

function personAt(x: number, y: number, facingCamera: boolean, mode: 'idle' | 'handsUp' = 'idle') {
    const person = createPerson('civilian', 3);
    placePerson(person, x, y, 0, facingCamera ? Math.PI : 0);
    for (let i = 0; i < 40; i++) poseNow(person, mode, 0.05);
    const scene = new THREE.Group();
    scene.add(person.root);
    scene.updateMatrixWorld(true);
    return { person, scene };
}

describe('Yolo: объекты в поле зрения', () => {
    test('человек в 8 м перед камерой найден по центру кадра с классом 0', () => {
        const { scene } = personAt(8, 0, true);
        const found = detectObjects(collectSceneTruth(scene), sensor(frontCamera()));
        expect(found).toHaveLength(1);
        const [x1, y1, x2, y2] = found[0].box;
        expect(found[0].cls).toBe(0);
        expect(found[0].score).toBeGreaterThan(0.5);
        expect(found[0].score).toBeLessThanOrEqual(0.98);
        expect((x1 + x2) / 2).toBeGreaterThan(280);
        expect((x1 + x2) / 2).toBeLessThan(360);
        // Человек выше, чем шире: рамка вытянута по вертикали.
        expect(y2 - y1).toBeGreaterThan((x2 - x1) * 1.5);
    });

    test('человек сбоку от оси смещает рамку в сторону: ось Y мира влево, значит левее в кадре', () => {
        const left = detectObjects(collectSceneTruth(personAt(8, 2, true).scene), sensor(frontCamera()));
        const right = detectObjects(collectSceneTruth(personAt(8, -2, true).scene), sensor(frontCamera()));
        expect(left).toHaveLength(1);
        expect(right).toHaveLength(1);
        expect(left[0].box[0]).toBeLessThan(right[0].box[0]);
    });

    test('человека позади камеры, вне поля зрения и слишком далёкого модель не видит', () => {
        const camera = frontCamera();
        expect(detectObjects(collectSceneTruth(personAt(-8, 0, true).scene), sensor(camera))).toEqual([]);
        expect(detectObjects(collectSceneTruth(personAt(8, 40, true).scene), sensor(camera))).toEqual([]);
        expect(detectObjects(collectSceneTruth(personAt(250, 0, true).scene), sensor(camera))).toEqual([]);
    });

    test('чем дальше человек, тем ниже уверенность', () => {
        const near = detectObjects(collectSceneTruth(personAt(5, 0, true).scene), sensor(frontCamera()));
        const far = detectObjects(collectSceneTruth(personAt(25, 0, true).scene), sensor(frontCamera()), 0.1);
        expect(near[0].score).toBeGreaterThan(far[0].score);
        expect(confidenceFor(20, 1, still)).toBeLessThan(confidenceFor(100, 1, still));
        expect(confidenceFor(80, 0.5, still)).toBeLessThan(confidenceFor(80, 1, still));
    });

    test('object_thresh отбрасывает неуверенное', () => {
        const truth = collectSceneTruth(personAt(20, 0, true).scene);
        expect(detectObjects(truth, sensor(frontCamera()), 0.1)).toHaveLength(1);
        expect(detectObjects(truth, sensor(frontCamera()), 0.99)).toEqual([]);
    });

    test('преграда между камерой и человеком прячет его', () => {
        const truth = collectSceneTruth(personAt(8, 0, true).scene);
        expect(detectObjects(truth, sensor(frontCamera(), { occluded: () => true }))).toEqual([]);
        expect(detectObjects(truth, sensor(frontCamera(), { occluded: () => false }))).toHaveLength(1);
    });

    test('скрытый человек (visible = false, как спящие в толпе) в сцену не попадает', () => {
        const { person, scene } = personAt(8, 0, true);
        person.root.visible = false;
        expect(collectSceneTruth(scene).people).toHaveLength(0);
    });

    test('машины потока: легковая - car (2), автобус - bus (5), грузовик - truck (7)', () => {
        const base = { id: 1, x: 12, y: 0, z: 0, heading: 0, length: 4.5, width: 1.8, height: 1.5 };
        const truth = collectSceneTruth(new THREE.Group(), [
            { ...base, cls: COCO.car },
            { ...base, id: 2, y: 3, length: 10.5, height: 3.1, cls: COCO.bus },
            { ...base, id: 3, y: -3, length: 7.2, height: 3.1, cls: COCO.truck }
        ]);
        const classes = detectObjects(truth, sensor(frontCamera())).map((d) => d.cls).sort();
        expect(classes).toEqual([2, 5, 7]);
    });

    test('поставленная в редакторе машина (тип «Автомобиль») - car, поезд - train, аварийная служба - truck', () => {
        const root = new THREE.Group();
        const make = (userData: Record<string, unknown>, y: number) => {
            const group = new THREE.Group();
            Object.assign(group.userData, userData);
            const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 1.4), new THREE.MeshBasicMaterial());
            body.position.z = 0.7;
            group.add(body);
            group.position.set(14, y, 0);
            root.add(group);
        };
        make({ type: 'Автомобиль' }, 0);
        make({ type: 'Поезд' }, 4);
        make({ serviceKind: 'fire' }, -4);
        make({ serviceKind: 'police' }, 8);
        root.updateMatrixWorld(true);
        const classes = collectSceneTruth(root).objects.map((o) => o.cls).sort();
        expect(classes).toEqual([COCO.car, COCO.car, COCO.train, COCO.truck].sort());
    });

    test('рамка машины следует её курсу, а не раздувается до осевой коробки', () => {
        const straight = fleetCarTarget({ id: 1, cls: COCO.car, x: 12, y: 0, z: 0, heading: 0, length: 4.5, width: 1.8, height: 1.5 });
        const turned = fleetCarTarget({ id: 2, cls: COCO.car, x: 12, y: 0, z: 0, heading: Math.PI / 2, length: 4.5, width: 1.8, height: 1.5 });
        const width = (t: typeof straight) => {
            const ys = t.points.map((p) => p.y);
            return Math.max(...ys) - Math.min(...ys);
        };
        expect(width(straight)).toBeCloseTo(1.8, 5);
        expect(width(turned)).toBeCloseTo(4.5, 5);
    });
});

describe('NMS', () => {
    test('из перекрывающихся рамок одного класса остаётся самая уверенная, другие классы не мешают', () => {
        const items = [
            { box: [100, 100, 200, 300], cls: 0, score: 0.6 },
            { box: [105, 102, 205, 305], cls: 0, score: 0.8 },
            { box: [102, 100, 202, 300], cls: 2, score: 0.5 },
            { box: [400, 100, 450, 200], cls: 0, score: 0.4 }
        ];
        const kept = nonMaxSuppression(items, 0.45);
        expect(kept.map((k) => k.score)).toEqual([0.8, 0.5, 0.4]);
        expect(nonMaxSuppression(items, 0.99)).toHaveLength(4);
    });
});

describe('YoloPose: скелет по фигуре', () => {
    test('17 точек, при поднятых руках запястья выше плеч (меньше по y), при опущенных - ниже', () => {
        const up = detectPoses(collectSceneTruth(personAt(5, 0, true, 'handsUp').scene), sensor(frontCamera()));
        const down = detectPoses(collectSceneTruth(personAt(5, 0, true, 'idle').scene), sensor(frontCamera()));
        expect(up).toHaveLength(1);
        expect(down).toHaveLength(1);
        expect(up[0].keypoints).toHaveLength(17);
        const handsUp = (k: Array<[number, number, number]>) => k[9][1] < k[5][1] && k[10][1] < k[6][1];
        expect(handsUp(up[0].keypoints)).toBe(true);
        expect(handsUp(down[0].keypoints)).toBe(false);
    });

    test('голова выше плеч, плечи выше бёдер, бёдра выше колен, колени выше лодыжек', () => {
        const [pose] = detectPoses(collectSceneTruth(personAt(5, 0, true).scene), sensor(frontCamera()));
        const y = (i: number) => pose.keypoints[i][1];
        expect(y(0)).toBeLessThan(y(5));
        expect(y(5)).toBeLessThan(y(11));
        expect(y(11)).toBeLessThan(y(13));
        expect(y(13)).toBeLessThan(y(15));
        expect(pose.keypoints.every(([, , c]) => c >= 0 && c <= 1)).toBe(true);
        expect(pose.score).toBeGreaterThan(0.5);
    });

    test('лицо у человека спиной к камере читается хуже, чем у лицом к камере', () => {
        const front = detectPoses(collectSceneTruth(personAt(5, 0, true).scene), sensor(frontCamera()))[0];
        const back = detectPoses(collectSceneTruth(personAt(5, 0, false).scene), sensor(frontCamera()))[0];
        expect(front.keypoints[0][2]).toBeGreaterThan(0.5);
        expect(back.keypoints[0][2]).toBeLessThan(0.3);
        expect(back.keypoints[5][2]).toBeGreaterThan(0.5);
    });

    test('человека, которого нет в кадре, в ответе нет', () => {
        expect(detectPoses(collectSceneTruth(personAt(-5, 0, true).scene), sensor(frontCamera()))).toEqual([]);
    });
});

describe('PaddleOCR: надписи на площадках', () => {
    function pad(type: string, value?: string) {
        const object = new THREE.Object3D();
        object.userData.type = type;
        if (value) object.userData.value = value;
        object.position.z = 0.0012;
        const root = new THREE.Group();
        root.add(object);
        root.updateMatrixWorld(true);
        return root;
    }

    test('с высоты 1.2 м читаются и крупная «H», и подпись «ПОСАДКА»; строки идут сверху вниз', () => {
        const found = detectTexts(collectSceneTruth(pad('Хелипорт')), sensor(downCamera(1.2)));
        expect(found.map((f) => f.text)).toEqual(['H', 'ПОСАДКА']);
        expect(found[0].corners).toHaveLength(4);
        expect(found[1].score).toBeGreaterThan(0.4);
        // Углы по часовой стрелке от левого верхнего.
        const [tl, tr, br, bl] = found[1].corners;
        expect(tr[0]).toBeGreaterThan(tl[0]);
        expect(bl[1]).toBeGreaterThan(tl[1]);
        expect(br[0]).toBeGreaterThan(bl[0]);
    });

    test('с высоты 2.5 м мелкая подпись уже не читается, крупная буква - да', () => {
        const found = detectTexts(collectSceneTruth(pad('Хелипорт')), sensor(downCamera(2.5)));
        expect(found.map((f) => f.text)).toEqual(['H']);
    });

    test('стартовая позиция: номер и подпись «СТАРТ / N», станция заряда - «ЗАРЯДКА»', () => {
        const start = detectTexts(collectSceneTruth(pad('Стартовая позиция', '3')), sensor(downCamera(1.2)));
        expect(start.map((f) => f.text)).toEqual(['3', 'СТАРТ / 3']);
        const charge = detectTexts(collectSceneTruth(pad('Станция заряда')), sensor(downCamera(1.2)));
        expect(charge.map((f) => f.text)).toEqual(['ЗАРЯДКА']);
    });

    test('площадку не видно, если камера смотрит вперёд, а не на неё', () => {
        expect(detectTexts(collectSceneTruth(pad('Хелипорт')), sensor(frontCamera()))).toEqual([]);
    });

    test('камера под площадкой (обратная сторона) надпись не читает', () => {
        const camera = new THREE.PerspectiveCamera(72, W / H, 0.05, 500);
        camera.position.set(0, 0, -1.2);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld(true);
        expect(detectTexts(collectSceneTruth(pad('Хелипорт')), sensor(camera))).toEqual([]);
    });
});
