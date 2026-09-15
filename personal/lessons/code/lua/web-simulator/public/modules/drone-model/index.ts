/**
 * Сборка 3D-модели дрона «Геоскан Пионер Базовый».
 *
 * Модель низкополигональная и собрана из примитивов: неподвижные детали,
 * окрашенные одним материалом, склеены в общие геометрии, а 29 светодиодов
 * живут в одном InstancedMesh. Благодаря этому весь дрон стоит около десятка
 * вызовов отрисовки вместо нескольких сотен, как прежняя CAD-сборка.
 */
import * as THREE from 'three';
import { shouldSpinRotors } from '../autopilot/fsm.js';
import { createAccentStructure, createFrameStructure, createMetalStructure } from './frame.js';
import { createGuards } from './guards.js';
import { createLEDs, findLedInstances, LED_MATRIX_GLOW_LIGHT_NAME, LED_OFF_COLOR } from './leds.js';
import { createCameraAndAntenna } from './camera-antenna.js';
import { createMotors } from './motors.js';
import { createDroneMaterials } from './materials.js';
import { BASE_LED_COUNT, DRONE_MODEL_OFFSET, TOTAL_LED_COUNT } from './layout.js';

const BASE_LED_LIGHT_INTENSITY = 0.75;
const MATRIX_GLOW_LIGHT_INTENSITY = 1.1;

export function createDroneModel() {
    const droneGroup = new THREE.Group();
    droneGroup.name = 'pioneer_drone';

    const materials = createDroneMaterials();
    // Материалы принадлежат конкретному экземпляру модели.
    droneGroup.userData.droneMaterials = materials;

    // Неподвижная часть корпуса: рама, акценты, металл и защита винтов.
    const frame = new THREE.Group();
    frame.name = 'frame';
    frame.add(createFrameStructure(materials));
    frame.add(createAccentStructure(materials));
    frame.add(createMetalStructure(materials));
    frame.add(createGuards(materials));
    droneGroup.add(frame);

    droneGroup.add(createLEDs(materials));
    droneGroup.add(createCameraAndAntenna(materials));
    droneGroup.add(createMotors(materials));

    // Ставим модель так, чтобы пятки шасси оказались на уровне пола.
    droneGroup.children.forEach((child) => {
        child.position.z += DRONE_MODEL_OFFSET;
    });

    return droneGroup;
}

const reusableColor = new THREE.Color();
const matrixAccumulatedColor = new THREE.Color();

/**
 * Переносит состояние drone.leds (массив {r,g,b} в диапазоне 0..255)
 * в цвета инстансов светодиодов и в интенсивность подсветки.
 */
export function updateLEDs(droneMesh: THREE.Object3D, droneState: any) {
    const leds = droneState?.leds;
    if (!leds || leds.length === 0) return;

    const instances = findLedInstances(droneMesh);
    if (!instances || !instances.instanceColor) return;

    matrixAccumulatedColor.setRGB(0, 0, 0);
    let matrixActiveCount = 0;
    let matrixBrightnessSum = 0;

    const count = Math.min(TOTAL_LED_COUNT, leds.length);
    for (let index = 0; index < count; index += 1) {
        const led = leds[index];
        if (!led) continue;

        const r = (led.r || 0) / 255;
        const g = (led.g || 0) / 255;
        const b = (led.b || 0) / 255;
        const strength = Math.max(r, g, b);

        if (strength > 0) {
            reusableColor.setRGB(r, g, b);
        } else {
            // Погашенный светодиод показывает свой светло-серый корпус.
            reusableColor.copy(LED_OFF_COLOR);
        }
        instances.setColorAt(index, reusableColor);

        if (index < BASE_LED_COUNT) {
            const light = droneMesh.getObjectByName(`base_led_light_${index}`) as THREE.PointLight | undefined;
            if (light) {
                light.color.setRGB(r, g, b);
                light.intensity = strength > 0 ? BASE_LED_LIGHT_INTENSITY * strength : 0;
            }
            continue;
        }

        if (strength > 0) {
            matrixAccumulatedColor.r += r;
            matrixAccumulatedColor.g += g;
            matrixAccumulatedColor.b += b;
            matrixBrightnessSum += strength;
            matrixActiveCount += 1;
        }
    }

    instances.instanceColor.needsUpdate = true;

    const matrixGlowLight = droneMesh.getObjectByName(LED_MATRIX_GLOW_LIGHT_NAME) as THREE.PointLight | undefined;
    if (!matrixGlowLight) return;

    if (matrixActiveCount > 0) {
        matrixGlowLight.color.copy(matrixAccumulatedColor.multiplyScalar(1 / matrixActiveCount));
        matrixGlowLight.intensity = (matrixBrightnessSum / matrixActiveCount) * MATRIX_GLOW_LIGHT_INTENSITY;
    } else {
        matrixGlowLight.intensity = 0;
    }
}

export function animateRotors(droneMesh: THREE.Object3D, dt: number, droneState: any) {
    if (!shouldAnimateRotors(droneState)) return;

    for (let i = 0; i < 4; i += 1) {
        const rotor = droneMesh.getObjectByName(`rotor_${i}`);
        if (!rotor) continue;

        const dir = (i === 0 || i === 1) ? 1 : -1;
        const speed = (droneState.fsmState === 'PREFLIGHT') ? 15 : 40; // рад/с
        rotor.rotation.z += speed * dir * dt;
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
