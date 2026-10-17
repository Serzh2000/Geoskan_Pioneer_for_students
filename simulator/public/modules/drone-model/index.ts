/**
 * Модуль генерации 3D-модели дрона (Pioneer).
 * Собирает итоговую модель из составных частей (рама, моторы, LED, камера).
 */
import * as THREE from 'three';
import { shouldSpinRotors } from '../autopilot/fsm.js';
import { createFrame } from './frame.js';
import { createLEDs } from './leds.js';
import { createCameraAndAntenna } from './camera-antenna.js';
import { createMotors } from './motors.js';
import { DRONE_MODEL_OFFSET } from './layout.js';
import { createBlenderModel } from './blender-model.js';
import { createLEDMatrix } from './leds.js';
import { findLedGlowSprite, updateLedGlowSprite } from './led-glow.js';
import { droneModelProfile, type DroneModelId } from '../core/drone-models.js';

// Lit LEDs need to read clearly as individual points even with no bloom pass
// in the renderer (see led-glow.ts): the material itself goes close to fully
// saturated/emissive when on (instead of staying half-tinted toward the base
// plastic color), and a glow sprite (wired in below) carries the rest.
const LED_MATERIAL_TINT_MIX = 0.9;
const LED_EMISSIVE_INTENSITY = 2.4;
// The studio environment map (scene-init.ts) reflects off every LED package
// regardless of state, so a bright base color made "off" look nearly as lit
// as a dim pixel. Darker base + a material-local cut to how much of that
// environment reflection lands on these specific meshes fixes that; see the
// longer comment in applyLedMaterialState for why toneMapped=false too.
const LED_OFF_BASE_COLOR = 0.16;
const LED_ENV_MAP_INTENSITY = 0.12;
const BASE_LED_LIGHT_INTENSITY = 0.75;
// Kept low and pulled toward white (see updateLEDs): this is only a faint
// ambient bounce off the board, not the primary "which pixel is lit" signal
// — an intensity here anywhere near the old 1.1, in the *averaged* color of
// every active pixel, used to visibly wash the whole board in one blended
// color and made same-frame different-colored pixels harder to tell apart,
// not easier.
const MATRIX_GLOW_LIGHT_INTENSITY = 0.28;
const MATRIX_GLOW_DESATURATION = 0.6;

/**
 * 3D-модель дрона. Без аргумента — Пионер Базовый, как раньше. mesh.userData.droneModel хранит модель:
 * по ней updateLEDs знает, сколько светодиодов на корпусе, а setDroneCameraTilt — есть ли камера на сервоприводе.
 */
export function createDroneModel(model: DroneModelId = 'pioneer-basic') {
    const profile = droneModelProfile(model);
    const mesh = createBlenderModel(createLegacyDroneModel, profile.id);
    mesh.userData.droneModel = profile.id;
    if (profile.ledMatrix) {
        // The supplied Basic assembly has no matrix module. Display the simulator's
        // optional teaching module when a program actually lights its pixels.
        const matrix = createLEDMatrix();
        matrix.position.set(0, 0, 0.23);
        matrix.userData.showWhenActive = true;
        matrix.visible = false;
        mesh.add(matrix);
    }
    return mesh;
}

/**
 * Наклон камеры на сервоприводе (ServoCamera.set_angle): градусы, 0 — прямо вперёд, отрицательные — вниз.
 * Ограничивается диапазоном модели (у Мини 2 от −80 до 30). Модель без такой камеры (Базовый) не меняется.
 * Угол, заданный до загрузки GLB, применяется, когда модель загрузится.
 */
export function setDroneCameraTilt(mesh: THREE.Object3D, degrees: number, options: { smooth?: boolean } = {}) {
    const range = droneModelProfile(mesh.userData.droneModel).servoCamera;
    if (!range || !Number.isFinite(degrees)) return;
    const clamped = THREE.MathUtils.clamp(degrees, range.min, range.max);
    mesh.userData.cameraTiltDeg = clamped;
    // smooth: камеру ведёт сервопривод - угол догоняет цель в updateCameraTilt.
    if (options.smooth) return;
    mesh.userData.cameraTiltCurrentDeg = clamped;
    const gimbal = mesh.getObjectByName('camera_gimbal');
    if (gimbal) gimbal.rotation.x = THREE.MathUtils.degToRad(clamped);
}

/** Скорость сервопривода камеры, градусов в секунду: поворот на весь диапазон - меньше секунды. */
export const CAMERA_SERVO_SPEED_DEG_S = 180;

/** Каждый кадр: сервопривод поворачивает камеру к заданному углу с конечной скоростью. */
export function updateCameraTilt(mesh: THREE.Object3D, dt: number) {
    const target = mesh.userData.cameraTiltDeg;
    if (typeof target !== 'number') return;
    const current = typeof mesh.userData.cameraTiltCurrentDeg === 'number' ? mesh.userData.cameraTiltCurrentDeg : 0;
    if (current === target) return;
    const step = CAMERA_SERVO_SPEED_DEG_S * Math.max(0, dt);
    const next = Math.abs(target - current) <= step ? target : current + Math.sign(target - current) * step;
    mesh.userData.cameraTiltCurrentDeg = next;
    const gimbal = mesh.getObjectByName('camera_gimbal');
    if (gimbal) gimbal.rotation.x = THREE.MathUtils.degToRad(next);
}

function createLegacyDroneModel() {
    const droneGroup = new THREE.Group();
    
    // Materials
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.3 });
    const plasticMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.1, metalness: 1.0 });
    const propMatCW = new THREE.MeshStandardMaterial({ color: 0xff6600, transparent: false, opacity: 1.0 });
    const propMatCCW = new THREE.MeshStandardMaterial({ color: 0xff6600, transparent: false, opacity: 1.0 });

    const modelOffset = DRONE_MODEL_OFFSET;
    
    const frame = createFrame(carbonMat, plasticMat);
    frame.position.z += modelOffset;
    droneGroup.add(frame);

    const leds = createLEDs();
    leds.position.z += modelOffset;
    droneGroup.add(leds);

    const cam = createCameraAndAntenna();
    cam.position.z += modelOffset;
    droneGroup.add(cam);

    const motors = createMotors(motorMat, silverMat, propMatCW, propMatCCW);
    motors.position.z += modelOffset;
    droneGroup.add(motors);

    return droneGroup;
}

const MODULE_LED_COUNT = 25;

export function updateLEDs(droneMesh: THREE.Object3D, droneState: any) {
    if (!droneState.leds || droneState.leds.length === 0) return;

    const matrixAccumulatedColor = new THREE.Color(0, 0, 0);
    let matrixActiveCount = 0;
    let matrixBrightnessSum = 0;

    // Светодиоды на корпусе: 0-3 у Базового, 0-1 (передние индикаторы) у Мини 2.
    const profile = droneModelProfile(droneMesh.userData.droneModel);
    for (let i = 0; i < profile.ledCount; i++) {
        const led = droneState.leds[i] || {r:0, g:0, b:0, w:0};
        const ledObject = droneMesh.getObjectByName(`base_led_${i}`);

        if (ledObject) {
            const r = (led.r || 0) / 255;
            const g = (led.g || 0) / 255;
            const b = (led.b || 0) / 255;
            const color = new THREE.Color(r, g, b);
            const ledStrength = Math.max(r, g, b);
            applyLedMaterialState(ledObject, color, ledStrength);
            updateLedGlowSprite(findLedGlowSprite(ledObject), color, ledStrength);

            const light = ledObject.getObjectByName(`base_led_light_${i}`) as THREE.PointLight | undefined;
            if (light) {
                light.color.set(color);
                light.intensity = ledStrength > 0
                    ? BASE_LED_LIGHT_INTENSITY * ledStrength * (light.userData.intensityScale ?? 1)
                    : 0;
            }
        }
    }

    // Update the LED module (indices 4-28): the real accessory board exported from
    // Blender (`led_module` / `module_led_N`) when the asset provides one, otherwise
    // the synthetic teaching matrix (`led_matrix_group` / `matrix_led_N`).
    const usingRealModule = !!droneMesh.getObjectByName('led_module');
    const moduleLedCount = profile.ledMatrix ? MODULE_LED_COUNT : 0; // модуль 5x5 только у Базового
    for (let i = 0; i < moduleLedCount; i++) {
        const stateIdx = i + 4;
        if (stateIdx >= droneState.leds.length) break;

        const led = droneState.leds[stateIdx];
        if (!led) continue;

        const ledObject = droneMesh.getObjectByName(usingRealModule ? `module_led_${i}` : `matrix_led_${i}`);
        if (ledObject) {
            const r = (led.r || 0) / 255;
            const g = (led.g || 0) / 255;
            const b = (led.b || 0) / 255;
            const color = new THREE.Color(r, g, b);
            const ledStrength = Math.max(r, g, b);
            applyLedMaterialState(ledObject, color, ledStrength);
            updateLedGlowSprite(findLedGlowSprite(ledObject), color, ledStrength);

            if (ledStrength > 0) {
                matrixAccumulatedColor.add(color);
                matrixBrightnessSum += ledStrength;
                matrixActiveCount++;
            }
        }
    }

    const groupName = usingRealModule ? 'led_module' : 'led_matrix_group';
    const glowLightName = usingRealModule ? 'led_module_glow_light' : 'led_matrix_glow_light';
    const matrixGlowLight = droneMesh.getObjectByName(glowLightName) as THREE.PointLight | undefined;
    const matrix = droneMesh.getObjectByName(groupName);
    // The board's presence reflects whether the program set up more than 4
    // LEDs at all (Ledbar.new(count > 4)), not whether a pixel happens to be
    // lit this frame — otherwise a blink loop that turns everything off
    // between frames makes the whole physical board flicker in and out.
    if (matrix?.userData.showWhenActive) matrix.visible = droneState.leds.length > 4;
    if (matrixGlowLight) {
        if (matrixActiveCount > 0) {
            // Desaturated toward white on purpose: this is a faint ambient
            // bounce for the board as a whole, not a readout of any single
            // pixel's color — per-pixel glow sprites (updateLedGlowSprite
            // above) carry that job instead.
            const averageColor = matrixAccumulatedColor.multiplyScalar(1 / matrixActiveCount);
            matrixGlowLight.color.copy(averageColor).lerp(new THREE.Color(0xffffff), MATRIX_GLOW_DESATURATION);
            matrixGlowLight.intensity = (matrixBrightnessSum / matrixActiveCount) * MATRIX_GLOW_LIGHT_INTENSITY;
        } else {
            matrixGlowLight.intensity = 0;
        }
    }
}

function applyLedMaterialState(ledObject: THREE.Object3D, color: THREE.Color, strength: number) {
    ledObject.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;

            // The scene's studio environment map (see scene-init.ts) lights every
            // surface, including an "off" LED — at the old near-white base color
            // that ambient reflection alone made off and dim-lit look almost the
            // same. Darkening the base and cutting how much of that environment
            // reflection this specific material picks up (envMapIntensity) makes
            // "off" read as visibly off. `toneMapped = false` then lets the lit
            // color/emissive punch through the scene's ACES curve undimmed
            // instead of being compressed alongside everything else — same idea
            // as how UI/indicator lights are usually kept out of tone mapping.
            // Both only need setting once; `toneMapped` in particular forces a
            // shader recompile when changed, so it must not be touched every frame.
            if (material.toneMapped) {
                material.toneMapped = false;
                material.needsUpdate = true;
            }
            material.envMapIntensity = LED_ENV_MAP_INTENSITY;

            // Линза, у которой свой цвет и в выключенном состоянии (янтарные индикаторы Мини 2), тускнеет до него.
            const offColor = material.userData.ledOffColor;
            if (offColor instanceof THREE.Color) material.color.copy(offColor);
            else material.color.setScalar(LED_OFF_BASE_COLOR);
            material.color.lerp(color, strength * LED_MATERIAL_TINT_MIX);
            material.emissive.copy(color);
            material.emissiveIntensity = strength > 0 ? LED_EMISSIVE_INTENSITY * strength : 0;
        });
    });
}

export function animateRotors(droneMesh: THREE.Object3D, dt: number, droneState: any) {
    if (shouldAnimateRotors(droneState)) {
        for (let i = 0; i < 4; i++) {
            const rotor = droneMesh.getObjectByName(`rotor_${i}`);
            if (rotor) {
                const dir = (i === 0 || i === 1) ? 1 : -1; 
                const speed = (droneState.fsmState === 'PREFLIGHT') ? 15 : 40; // Rad/s
                rotor.rotation.z += speed * dir * dt;
            }
        }
    }
}

function shouldAnimateRotors(droneState: any) {
    if (shouldSpinRotors(droneState)) return true;

    return (
        droneState?.status === 'IDLE'
        && (droneState?.pos?.z ?? 0) > 0.05
        && (droneState?.target_pos?.z ?? droneState?.target_alt ?? 0) <= 0
    );
}
