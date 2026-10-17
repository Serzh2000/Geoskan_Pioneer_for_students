import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import pioneerUrl from '../../assets/models/pioneer/pioneer-basic.glb?url';
import mini2Url from '../../assets/models/pioneer/pioneer-mini2.glb?url';
import type { DroneModelId } from '../core/drone-models.js';
import { createLedGlowSprite } from './led-glow.js';
import { CAD_MM_TO_SCENE_SCALE } from './layout.js';
import { setupEsp32Module } from './esp32-module.js';

const MODULE_LED_GLOW_DIAMETER = 5.5 * CAD_MM_TO_SCENE_SCALE;
const MODULE_LED_GLOW_Z_OFFSET = 0.0015;
/** Meshes whose bounding sphere is smaller than this (scene units, 2 per metre) do not cast a shadow. */
const MIN_SHADOW_CASTER_RADIUS = 0.006;
const FPV_CAMERA_FOV = 80;
/** Как в camera-views.ts (bottomCameraOf): нижняя камера смотрит прямо вниз, верх кадра — нос дрона. */
const BOTTOM_CAMERA_FOV = 72;

/**
 * Чем различаются GLB-модели дронов. Все ассеты в одной системе координат: Z вверх, вперёд +Y, 2 единицы сцены
 * на метр, опоры на z=0; rotor_0..3 стоят в тех же углах, что у Базового (0 — спереди справа, 1 — сзади слева,
 * 2 — спереди слева, 3 — сзади справа), поэтому animateRotors крутит их одинаково.
 */
type BlenderAssetSpec = {
    url: string;
    /** Исходный .blend — для userData.modelSource. */
    source: string;
    /** Сколько светодиодов base_led_N на корпусе. */
    baseLedCount: number;
    baseLedGlowDiameter: number;
    /** Куда сдвинуть ореол светодиода от центра его линзы (наружу из корпуса). */
    glowOffset: (index: number, center: THREE.Vector3) => THREE.Vector3;
    /**
     * Цвет выключенного светодиода как доля исходного цвета материала; null — тёмно-серый, как у Базового.
     * У Мини 2 линзы индикаторов янтарные и в выключенном состоянии.
     */
    ledOffTint: number | null;
    /** Модуль ESP32 с камерой (Python на Базовом). */
    esp32: boolean;
    /** Камера на сервоприводе: узел camera_gimbal с fpv_lens. */
    gimbal: boolean;
};

const ASSETS: Record<DroneModelId, BlenderAssetSpec> = {
    'pioneer-basic': {
        url: pioneerUrl,
        source: 'pioneer-basic.blend',
        baseLedCount: 4,
        baseLedGlowDiameter: 15 * CAD_MM_TO_SCENE_SCALE,
        // Верхние светодиоды светят вверх, нижние — вниз.
        glowOffset: (index) => new THREE.Vector3(0, 0, index < 2 ? 0.004 : -0.004),
        ledOffTint: null,
        esp32: true,
        gimbal: false
    },
    'pioneer-mini2': {
        url: mini2Url,
        source: 'Pioneer_Mini_2_reworked.blend',
        baseLedCount: 2,
        // Линза 2,2 x 7,8 мм на скруглённом переднем плече корпуса: ореол чуть вперёд и наружу.
        baseLedGlowDiameter: 10 * CAD_MM_TO_SCENE_SCALE,
        glowOffset: (_index, center) => new THREE.Vector3(Math.sign(center.x) * 0.6, 1, 0).normalize().multiplyScalar(0.003),
        ledOffTint: 0.55,
        esp32: false,
        gimbal: true
    }
};

const templatePromises = new Map<DroneModelId, Promise<THREE.Group>>();
const pendingModels = new WeakMap<THREE.Object3D, Promise<void>>();

function loadTemplate(droneModel: DroneModelId): Promise<THREE.Group> {
    let promise = templatePromises.get(droneModel);
    if (!promise) {
        promise = new GLTFLoader().loadAsync(ASSETS[droneModel].url)
            .then(({ scene }) => scene)
            .catch((error) => {
                templatePromises.delete(droneModel);
                throw error;
            });
        templatePromises.set(droneModel, promise);
    }
    return promise;
}

/** Stable rotor objects are needed by the RC wizard before the GLB arrives. */
export function createBlenderModel(fallback: () => THREE.Group, droneModel: DroneModelId = 'pioneer-basic'): THREE.Group {
    const model = new THREE.Group();
    const motors = new THREE.Group();
    motors.name = 'motors_group';
    model.add(motors);
    for (let i = 0; i < 4; i++) {
        const rotor = new THREE.Group();
        rotor.name = `rotor_${i}`;
        motors.add(rotor);
    }
    const ready = loadTemplate(droneModel).then((template) => {
        attachBlenderModel(model, template, droneModel);
        model.userData.modelSource = ASSETS[droneModel].source;
    });
    pendingModels.set(model, ready);
    void ready.catch((error: unknown) => {
        console.error(`[DroneModel] Failed to load the ${droneModel} Blender model; using CAD fallback.`, error);
        const legacy = fallback();
        legacy.getObjectByName('led_matrix_group')?.removeFromParent();
        const fallbackMotors = legacy.getObjectByName('motors_group');
        if (fallbackMotors) fallbackMotors.name = 'fallback_motors_group';
        // Keep the rotor references already captured by preview consumers.
        for (let i = 0; i < 4; i++) {
            const oldRotor = legacy.getObjectByName(`rotor_${i}`);
            const rotor = motors.getObjectByName(`rotor_${i}`)!;
            if (!oldRotor) continue;
            legacy.updateMatrixWorld(true);
            rotor.position.copy(oldRotor.getWorldPosition(new THREE.Vector3()));
            oldRotor.position.set(0, 0, 0);
            oldRotor.name = `fallback_rotor_${i}`;
            rotor.add(oldRotor);
        }
        model.add(legacy);
        model.userData.modelSource = 'cad-fallback';
    });
    return model;
}

/** Clone materials per instance: LEDs and crash visuals must not affect other drones. */
export function attachBlenderModel(model: THREE.Group, template: THREE.Group, droneModel: DroneModelId = 'pioneer-basic'): void {
    const spec = ASSETS[droneModel];
    const instance = template.clone(true);
    // Validate before changing the visible model, so a broken asset falls back cleanly.
    const required = ['frame', ...Array.from({ length: 4 }, (_, i) => `rotor_${i}`),
        ...Array.from({ length: spec.baseLedCount }, (_, i) => `base_led_${i}`),
        ...(spec.gimbal ? ['camera_gimbal', 'fpv_lens'] : [])];
    for (const name of required) {
        if (!instance.getObjectByName(name)) throw new Error(`Pioneer asset is missing ${name}`);
    }
    instance.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material)
            ? object.material.map((material) => material.clone())
            : object.material.clone();
        // Parts smaller than a few millimetres leave no visible shadow, but each one is a draw call in the shadow pass.
        if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
        object.castShadow = object.geometry.boundingSphere!.radius >= MIN_SHADOW_CASTER_RADIUS;
        object.receiveShadow = true;
    });
    for (let i = 0; i < 4; i++) {
        const source = instance.getObjectByName(`rotor_${i}`);
        const target = model.getObjectByName(`rotor_${i}`);
        if (!source || !target) throw new Error(`Pioneer asset is missing rotor_${i}`);
        target.position.copy(source.position);
        // Preserve any angle already advanced while the asset was loading.
        target.add(...source.children);
    }
    const frame = instance.getObjectByName('frame');
    if (!frame) throw new Error('Pioneer asset is missing its frame');
    model.add(frame);
    const leds = new THREE.Group();
    leds.name = 'leds';
    for (let i = 0; i < spec.baseLedCount; i++) {
        const led = instance.getObjectByName(`base_led_${i}`);
        if (!led) throw new Error(`Pioneer asset is missing base_led_${i}`);
        if (spec.ledOffTint !== null) rememberLedOffColor(led, spec.ledOffTint);
        // No PointLight here: even at zero intensity every light is evaluated for every pixel of every material in the
        // scene (five per drone). The emissive material and the glow sprite carry the look.
        const center = new THREE.Box3().setFromObject(led).getCenter(new THREE.Vector3());
        const glow = createLedGlowSprite(spec.baseLedGlowDiameter);
        glow.position.copy(center).add(spec.glowOffset(i, center));
        led.add(glow);
        leds.add(led);
    }
    // Optional accessory board (05B in the source .blend): only present once a
    // program actually drives more than the 4 onboard LEDs. Real geometry
    // supersedes the synthetic teaching matrix when the asset provides it.
    const ledModule = instance.getObjectByName('led_module');
    if (ledModule && ledModule.children.length > 0) {
        model.getObjectByName('led_matrix_group')?.removeFromParent();
        for (let i = 0; i < 25; i++) {
            const pixel = ledModule.getObjectByName(`module_led_${i}`);
            if (!pixel) continue;
            const pixelCenter = new THREE.Box3().setFromObject(pixel).getCenter(new THREE.Vector3());
            const pixelGlow = createLedGlowSprite(MODULE_LED_GLOW_DIAMETER);
            pixelGlow.position.copy(pixelCenter);
            pixelGlow.position.z += MODULE_LED_GLOW_Z_OFFSET;
            pixel.add(pixelGlow);
        }
        ledModule.visible = false;
        ledModule.userData.showWhenActive = true;
        leds.add(ledModule);
    }
    model.add(leds);
    if (spec.gimbal) setupCameraGimbal(model, instance);
    setupBottomCamera(model, instance);
    // Без модуля ESP32 setEsp32Attached для этой модели ничего не делает (нет userData.esp32).
    if (spec.esp32) setupEsp32Module(model, instance);
}

/** Выключенная линза сохраняет свой цвет (приглушённый), а не становится серой. */
function rememberLedOffColor(led: THREE.Object3D, tint: number) {
    led.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (material instanceof THREE.MeshStandardMaterial) {
                material.userData.ledOffColor = material.color.clone().multiplyScalar(tint);
            }
        }
    });
}

/**
 * Камера на сервоприводе (Мини 2): camera_gimbal — шарнир на оси наклона (поперечная ось X), внутри него корпус
 * камеры с объективом и fpv_camera у стекла. Наклон задаёт setDroneCameraTilt; угол, заданный до загрузки GLB,
 * применяется здесь.
 */
function setupCameraGimbal(model: THREE.Object3D, instance: THREE.Object3D) {
    const gimbal = instance.getObjectByName('camera_gimbal')!;
    const lens = gimbal.getObjectByName('fpv_lens')!;
    model.add(gimbal);
    if (!model.getObjectByName('fpv_camera')) {
        const camera = new THREE.PerspectiveCamera(FPV_CAMERA_FOV, 16 / 9, 0.01, 1000);
        camera.name = 'fpv_camera';
        camera.position.copy(lens.position);
        camera.position.y += 0.004; // чуть впереди стекла
        camera.up.set(0, 0, 1);
        // Пока у камеры нет родителя, lookAt работает в системе шарнира: при нулевом наклоне — строго вперёд (+Y).
        camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 1, 0)));
        gimbal.add(camera);
    }
    const tilt = model.userData.cameraTiltDeg;
    model.userData.cameraTiltCurrentDeg = typeof tilt === 'number' ? tilt : 0;
    gimbal.rotation.x = THREE.MathUtils.degToRad(model.userData.cameraTiltCurrentDeg);
}

/** Точка нижней камеры (оптический поток), если ассет её задаёт; иначе bottomCameraOf создаст камеру сам. */
function setupBottomCamera(model: THREE.Object3D, instance: THREE.Object3D) {
    const mount = instance.getObjectByName('bottom_camera_mount');
    if (!mount) return;
    let camera = model.getObjectByName('bottom_camera');
    if (!camera) {
        const created = new THREE.PerspectiveCamera(BOTTOM_CAMERA_FOV, 16 / 9, 0.01, 200);
        created.name = 'bottom_camera';
        created.up.set(0, 1, 0);
        created.lookAt(0, 0, -1);
        model.add(created);
        camera = created;
    }
    camera.position.copy(mount.position);
}

/** Exporters must wait for the real asset, rather than exporting an empty shell. */
export async function whenDroneModelReady(model: THREE.Object3D): Promise<void> {
    await pendingModels.get(model);
}
