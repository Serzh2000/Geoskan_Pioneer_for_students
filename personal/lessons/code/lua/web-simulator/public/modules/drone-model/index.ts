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

export function createDroneModel() {
    const droneGroup = new THREE.Group();
    
    // Materials
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.3 });
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.6 });
    const plasticMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.1, metalness: 1.0 });
    const propMatCW = new THREE.MeshStandardMaterial({ color: 0xff6600, transparent: false, opacity: 1.0 });
    const propMatCCW = new THREE.MeshStandardMaterial({ color: 0xff6600, transparent: false, opacity: 1.0 });

    const modelOffset = DRONE_MODEL_OFFSET;
    
    const frame = createFrame(carbonMat, pcbMat, plasticMat);
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

export function updateLEDs(droneMesh: THREE.Object3D, droneState: any) {
    if (!droneState.leds || droneState.leds.length === 0) return;

    // Update Base LEDs (0-3)
    for (let i = 0; i < 4; i++) {
        const led = droneState.leds[i] || {r:0, g:0, b:0, w:0};
        const ledMesh = droneMesh.getObjectByName(`base_led_${i}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined;
        
        if (ledMesh) {
            const r = (led.r || 0) / 255;
            const g = (led.g || 0) / 255;
            const b = (led.b || 0) / 255;
            const color = new THREE.Color(r, g, b);
            ledMesh.material.color.set(color);
            
            const light = ledMesh.getObjectByName(`base_led_light_${i}`) as THREE.PointLight | undefined;
            if (light) {
                light.color.set(color);
                light.intensity = (r + g + b > 0) ? 0.6 : 0;
            }
        }
    }

    // Update Matrix LEDs (4-28) using physical meshes
    for (let i = 0; i < 25; i++) {
        const stateIdx = i + 4;
        if (stateIdx >= droneState.leds.length) break;
        
        const led = droneState.leds[stateIdx];
        if (!led) continue;

        const ledMesh = droneMesh.getObjectByName(`matrix_led_${i}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined;
        if (ledMesh) {
            const r = (led.r || 0) / 255;
            const g = (led.g || 0) / 255;
            const b = (led.b || 0) / 255;
            ledMesh.material.color.setRGB(r, g, b);
        }
    }
}

export function animateRotors(droneMesh: THREE.Object3D, dt: number, droneState: any) {
    if (shouldSpinRotors(droneState)) {
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
