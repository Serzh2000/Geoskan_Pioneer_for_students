import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import pioneerUrl from '../../assets/models/pioneer/pioneer-basic.glb?url';
import { createLedGlowSprite } from './led-glow.js';
import { CAD_MM_TO_SCENE_SCALE } from './layout.js';
import { setupEsp32Module } from './esp32-module.js';

const BASE_LED_GLOW_DIAMETER = 15 * CAD_MM_TO_SCENE_SCALE;
const MODULE_LED_GLOW_DIAMETER = 5.5 * CAD_MM_TO_SCENE_SCALE;
const MODULE_LED_GLOW_Z_OFFSET = 0.0015;
/** Meshes whose bounding sphere is smaller than this (scene units, 2 per metre) do not cast a shadow. */
const MIN_SHADOW_CASTER_RADIUS = 0.006;

let templatePromise: Promise<THREE.Group> | undefined;
const pendingModels = new WeakMap<THREE.Object3D, Promise<void>>();

function loadTemplate(): Promise<THREE.Group> {
    templatePromise ??= new GLTFLoader().loadAsync(pioneerUrl)
        .then(({ scene }) => scene)
        .catch((error) => {
            templatePromise = undefined;
            throw error;
        });
    return templatePromise;
}

/** Stable rotor objects are needed by the RC wizard before the GLB arrives. */
export function createBlenderModel(fallback: () => THREE.Group): THREE.Group {
    const model = new THREE.Group();
    const motors = new THREE.Group();
    motors.name = 'motors_group';
    model.add(motors);
    for (let i = 0; i < 4; i++) {
        const rotor = new THREE.Group();
        rotor.name = `rotor_${i}`;
        motors.add(rotor);
    }
    const ready = loadTemplate().then((template) => {
        attachBlenderModel(model, template);
        model.userData.modelSource = 'pioneer-basic.blend';
    });
    pendingModels.set(model, ready);
    void ready.catch((error: unknown) => {
        console.error('[DroneModel] Failed to load Pioneer Blender model; using CAD fallback.', error);
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
export function attachBlenderModel(model: THREE.Group, template: THREE.Group): void {
    const instance = template.clone(true);
    // Validate before changing the visible model, so a broken asset falls back cleanly.
    for (const name of ['frame', ...Array.from({ length: 4 }, (_, i) => `rotor_${i}`),
        ...Array.from({ length: 4 }, (_, i) => `base_led_${i}`)]) {
        if (!instance.getObjectByName(name)) throw new Error(`Pioneer asset is missing ${name}`);
    }
    instance.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material)
            ? object.material.map((material) => material.clone())
            : object.material.clone();
        // Parts smaller than a few millimetres leave no visible shadow, but each one is a draw call in the shadow pass.
        object.geometry.boundingSphere ?? object.geometry.computeBoundingSphere();
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
    for (let i = 0; i < 4; i++) {
        const led = instance.getObjectByName(`base_led_${i}`);
        if (!led) throw new Error(`Pioneer asset is missing base_led_${i}`);
        // No PointLight here: even at zero intensity every light is evaluated for every pixel of every material in the
        // scene (five per drone). The emissive material and the glow sprite carry the look.
        const center = new THREE.Box3().setFromObject(led).getCenter(new THREE.Vector3());
        const glow = createLedGlowSprite(BASE_LED_GLOW_DIAMETER);
        glow.position.copy(center);
        glow.position.z += i < 2 ? 0.004 : -0.004;
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
    setupEsp32Module(model, instance);
}

/** Exporters must wait for the real asset, rather than exporting an empty shell. */
export async function whenDroneModelReady(model: THREE.Object3D): Promise<void> {
    await pendingModels.get(model);
}
