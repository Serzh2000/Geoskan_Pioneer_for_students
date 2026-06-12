import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import ws2812bUrl from '../../assets/models/pioneer/reference/ws2812b.obj?url';
import {
    BASE_LED_PLACEMENTS,
    CAD_MM_TO_SCENE_SCALE,
    LED_MATRIX_PANEL_PLACEMENT,
    PlacementConfig
} from './layout.js';

const objLoader = new OBJLoader();
const baseLedModelCache = new Map<string, Promise<THREE.Group>>();
const BASE_LED_PACKAGE_TOP_Z = 1.57 * CAD_MM_TO_SCENE_SCALE;
const BASE_LED_LIGHT_Z = BASE_LED_PACKAGE_TOP_Z;
const BASE_LED_MODEL_Z_OFFSET = 0.00015;
const MATRIX_GLOW_LIGHT_Z = 0.02;

export function createLEDs() {
    const ledGroup = new THREE.Group();
    
    // 4 discrete WS2812B LEDs mounted directly on the frame plate.
    BASE_LED_PLACEMENTS.forEach((config, i) => {
        ledGroup.add(createLedAssembly(`base_led_${i}`, `base_led_body_${i}`, `base_led_light_${i}`, config, true));
    });

    // LED Matrix 5x5 Module (Top)
    const ledMatrixGroup = new THREE.Group();
    ledMatrixGroup.name = 'led_matrix_group';
    applyPlacement(ledMatrixGroup, LED_MATRIX_PANEL_PLACEMENT);
    const matrixBoardGeom = new THREE.BoxGeometry(0.07, 0.07, 0.002);
    const matrixBoardMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const matrixBoard = new THREE.Mesh(matrixBoardGeom, matrixBoardMat);
    matrixBoard.castShadow = true;
    ledMatrixGroup.add(matrixBoard);

    const matrixGlowLight = new THREE.PointLight(0x000000, 0, 0.26);
    matrixGlowLight.name = 'led_matrix_glow_light';
    matrixGlowLight.position.z = MATRIX_GLOW_LIGHT_Z;
    ledMatrixGroup.add(matrixGlowLight);

    // 5x5 Physical LED meshes
    const ledSpacing = 0.012;
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const index = row * 5 + col;
            const xOffset = (col - 2) * ledSpacing;
            const yOffset = (2 - row) * ledSpacing;

            ledMatrixGroup.add(createLedAssembly(
                `matrix_led_${index}`,
                `matrix_led_body_${index}`,
                undefined,
                { position: [xOffset, yOffset, 0.002] }
            ));
        }
    }
    
    ledGroup.add(ledMatrixGroup);
    void attachCadLedModels(ledGroup, 'base_led', 4);
    void attachCadLedModels(ledGroup, 'matrix_led', 25);
    return ledGroup;
}

function createLedAssembly(
    objectName: string,
    bodyName: string,
    lightName: string | undefined,
    config: PlacementConfig,
    withPointLight = false
) {
    const ledContainer = new THREE.Group();
    ledContainer.name = objectName;
    applyPlacement(ledContainer, config);

    const fallbackBody = new THREE.Mesh(
        new THREE.BoxGeometry(5.4 * CAD_MM_TO_SCENE_SCALE, 5.0 * CAD_MM_TO_SCENE_SCALE, 1.57 * CAD_MM_TO_SCENE_SCALE),
        new THREE.MeshStandardMaterial({
            color: 0xf5f5f5,
            roughness: 0.45,
            metalness: 0.03
        })
    );
    fallbackBody.name = bodyName;
    fallbackBody.position.z = BASE_LED_PACKAGE_TOP_Z / 2;
    fallbackBody.castShadow = true;
    fallbackBody.receiveShadow = true;
    ledContainer.add(fallbackBody);

    if (withPointLight && lightName) {
        const light = new THREE.PointLight(0x000000, 0, 0.24);
        light.name = lightName;
        light.position.z = BASE_LED_LIGHT_Z;
        ledContainer.add(light);
    }

    return ledContainer;
}

function applyPlacement(object: THREE.Object3D, config: PlacementConfig) {
    object.position.set(...config.position);

    if (!config.rotation) return;
    object.rotation.set(...config.rotation);
}

async function attachCadLedModels(ledGroup: THREE.Group, objectPrefix: string, count: number) {
    try {
        const template = await loadBaseLedModel();
        for (let i = 0; i < count; i++) {
            const ledContainer = ledGroup.getObjectByName(`${objectPrefix}_${i}`) as THREE.Group | undefined;
            if (!ledContainer) continue;

            const fallbackBody = ledContainer.getObjectByName(`${objectPrefix}_body_${i}`);
            if (fallbackBody) {
                fallbackBody.visible = false;
            }

            const model = cloneBaseLedModel(template);
            model.name = `${objectPrefix}_model_${i}`;
            model.position.z = BASE_LED_MODEL_Z_OFFSET;
            ledContainer.add(model);
        }
    } catch (error) {
        console.warn('[DroneModel] Failed to load WS2812B LED CAD asset.', error);
    }
}

function loadBaseLedModel() {
    const cached = baseLedModelCache.get(ws2812bUrl);
    if (cached) return cached;

    const next = fetch(ws2812bUrl)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch LED CAD asset: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then((text) => {
            const object = objLoader.parse(text);
            const template = normalizeBaseLedModel(object);
            template.scale.setScalar(CAD_MM_TO_SCENE_SCALE);
            return template;
        });

    baseLedModelCache.set(ws2812bUrl, next);
    return next;
}

function normalizeBaseLedModel(source: THREE.Group) {
    const template = source.clone(true);
    template.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(template);
    const center = box.getCenter(new THREE.Vector3());
    const bottomZ = box.min.z;

    template.position.set(-center.x, -center.y, -bottomZ);

    template.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;

        child.geometry.computeVertexNormals();

        child.material = new THREE.MeshStandardMaterial({
            color: 0xe8e8e8,
            emissive: 0x000000,
            emissiveIntensity: 0,
            roughness: 0.22,
            metalness: 0.03,
            side: THREE.DoubleSide
        });
        child.castShadow = true;
        child.receiveShadow = true;
    });

    return template;
}

function cloneBaseLedModel(template: THREE.Group) {
    const clone = template.clone(true);
    clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
            child.material = child.material.clone();
        }
    });
    return clone;
}
