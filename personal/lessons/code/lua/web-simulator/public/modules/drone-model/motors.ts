import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import motor1306Url from '../../assets/models/pioneer/motor-1306.stl?url';
import { CAD_MM_TO_SCENE_SCALE, FRAME_COMPONENTS_Z_OFFSET, FRAME_PLATE_THICKNESS, MOTOR_ANCHOR_POSITIONS } from './layout.js';

const MOTOR_MOUNT_BASE_Z = 0.024 - FRAME_PLATE_THICKNESS;
const MOTOR_MOUNT_Z = MOTOR_MOUNT_BASE_Z + FRAME_COMPONENTS_Z_OFFSET;
const FALLBACK_MOTOR_CENTER_Z = MOTOR_MOUNT_Z + 0.01;
const ROTOR_Z = MOTOR_MOUNT_Z + 18.1 * CAD_MM_TO_SCENE_SCALE;

const cadLoader = new STLLoader();
const cadGeometryCache = new Map<string, Promise<THREE.BufferGeometry>>();

export function createMotors(
    motorMat: THREE.Material,
    hubMat: THREE.Material,
    propMatCW: THREE.Material,
    propMatCCW: THREE.Material
) {
    const motorsGroup = new THREE.Group();
    motorsGroup.name = 'motors_group';

    const fallbackMotors = createFallbackMotors(motorMat);
    motorsGroup.add(fallbackMotors);

    MOTOR_ANCHOR_POSITIONS.forEach((offset, i) => {
        const propGroup = new THREE.Group();
        propGroup.name = `rotor_${i}`;
        propGroup.position.set(offset[0], offset[1], ROTOR_Z);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8), hubMat);
        hub.rotation.x = Math.PI / 2;
        propGroup.add(hub);

        const isDiag1 = i === 0 || i === 1;
        const bladeMat = isDiag1 ? propMatCW : propMatCCW;
        const bladeGeom = new THREE.BoxGeometry(0.12, 0.015, 0.001);

        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.rotation.x = 0.1 * (isDiag1 ? 1 : -1);
        propGroup.add(blade);

        motorsGroup.add(propGroup);
    });

    void attachCadMotors(motorsGroup, fallbackMotors, motorMat);
    return motorsGroup;
}

function createFallbackMotors(motorMat: THREE.Material) {
    const fallbackGroup = new THREE.Group();
    const motorGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16);

    MOTOR_ANCHOR_POSITIONS.forEach(([x, y]) => {
        const motor = new THREE.Mesh(motorGeom, motorMat);
        motor.position.set(x, y, FALLBACK_MOTOR_CENTER_Z);
        motor.rotation.x = Math.PI / 2;
        motor.castShadow = true;
        motor.receiveShadow = true;
        fallbackGroup.add(motor);
    });

    return fallbackGroup;
}

async function attachCadMotors(
    motorsGroup: THREE.Group,
    fallbackMotors: THREE.Group,
    motorMat: THREE.Material
) {
    try {
        const cadMotors = await buildCadMotors(motorMat);
        fallbackMotors.visible = false;
        motorsGroup.add(cadMotors);
    } catch (error) {
        console.warn('[DroneModel] Failed to load motor CAD asset.', error);
    }
}

async function buildCadMotors(motorMat: THREE.Material) {
    const geometry = await loadCadGeometry(motor1306Url, false);
    const cadMotors = new THREE.Group();
    cadMotors.name = 'pioneer_cad_motors';

    MOTOR_ANCHOR_POSITIONS.forEach(([x, y]) => {
        const motor = new THREE.Mesh(geometry.clone(), motorMat);
        motor.scale.setScalar(CAD_MM_TO_SCENE_SCALE);
        motor.position.set(x, y, MOTOR_MOUNT_Z);
        motor.rotation.x = Math.PI / 2;
        motor.castShadow = true;
        motor.receiveShadow = true;
        cadMotors.add(motor);
    });

    return cadMotors;
}

function loadCadGeometry(url: string, centerGeometry = true): Promise<THREE.BufferGeometry> {
    const cached = cadGeometryCache.get(url);
    if (cached) return cached;

    const next = fetch(url)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch CAD asset: ${response.status} ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then((buffer) => {
            const geometry = cadLoader.parse(buffer);
            geometry.computeVertexNormals();
            return centerGeometry ? centerCadGeometry(geometry) : geometry;
        });

    cadGeometryCache.set(url, next);
    return next;
}

function centerCadGeometry(source: THREE.BufferGeometry) {
    const geometry = source.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return geometry;

    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.computeBoundingBox();
    return geometry;
}
