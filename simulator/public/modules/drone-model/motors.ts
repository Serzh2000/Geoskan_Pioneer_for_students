import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import motor1306Url from '../../assets/models/pioneer/motor-1306.stl?url';
import prop5030CcwUrl from '../../assets/models/pioneer/prop-5030-ccw.stl?url';
import prop5030CwUrl from '../../assets/models/pioneer/prop-5030-cw.stl?url';
import {
    CAD_MM_TO_SCENE_SCALE,
    FRAME_COMPONENTS_Z_OFFSET,
    FRAME_PLATE_THICKNESS,
    HUB_PLACEMENTS,
    MOTOR_ANCHOR_POSITIONS,
    PROPELLER_PLACEMENTS
} from './layout.js';

const MOTOR_MOUNT_BASE_Z = 0.024 - FRAME_PLATE_THICKNESS;
const MOTOR_MOUNT_Z = MOTOR_MOUNT_BASE_Z + FRAME_COMPONENTS_Z_OFFSET;
const FALLBACK_MOTOR_CENTER_Z = MOTOR_MOUNT_Z + 0.01;
const FALLBACK_PROPELLER_TILT = 0.1;

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
        const propPlacement = PROPELLER_PLACEMENTS[i];
        const hubPlacement = HUB_PLACEMENTS[i];
        propGroup.position.set(...hubPlacement.position);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8), hubMat);
        if (hubPlacement.rotation) {
            hub.rotation.set(...hubPlacement.rotation);
        }
        propGroup.add(hub);

        const isDiag1 = i === 0 || i === 1;
        const bladeMat = isDiag1 ? propMatCW : propMatCCW;
        const bladeGeom = new THREE.BoxGeometry(0.12, 0.015, 0.001);

        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.name = `rotor_fallback_blade_${i}`;
        blade.position.set(
            propPlacement.position[0] - hubPlacement.position[0],
            propPlacement.position[1] - hubPlacement.position[1],
            propPlacement.position[2] - hubPlacement.position[2]
        );
        blade.rotation.x = FALLBACK_PROPELLER_TILT * (isDiag1 ? 1 : -1);
        if (propPlacement.rotation) {
            blade.rotation.x += propPlacement.rotation[0];
            blade.rotation.y = propPlacement.rotation[1];
            blade.rotation.z = propPlacement.rotation[2];
        }
        propGroup.add(blade);

        motorsGroup.add(propGroup);
    });

    void attachCadMotors(motorsGroup, fallbackMotors, motorMat);
    void attachCadPropellers(motorsGroup, propMatCW, propMatCCW);
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

async function attachCadPropellers(
    motorsGroup: THREE.Group,
    propMatCW: THREE.Material,
    propMatCCW: THREE.Material
) {
    try {
        const [propGeometryCW, propGeometryCCW] = await Promise.all([
            loadCadGeometry(prop5030CwUrl),
            loadCadGeometry(prop5030CcwUrl)
        ]);

        for (let i = 0; i < PROPELLER_PLACEMENTS.length; i += 1) {
            const rotor = motorsGroup.getObjectByName(`rotor_${i}`) as THREE.Group | undefined;
            if (!rotor) continue;
            const propPlacement = PROPELLER_PLACEMENTS[i];
            const hubPlacement = HUB_PLACEMENTS[i];

            const fallbackBlade = rotor.getObjectByName(`rotor_fallback_blade_${i}`);
            if (fallbackBlade) {
                fallbackBlade.visible = false;
            }

            const isDiag1 = i === 0 || i === 1;
            const propMesh = new THREE.Mesh(
                (isDiag1 ? propGeometryCW : propGeometryCCW).clone(),
                isDiag1 ? propMatCW : propMatCCW
            );
            propMesh.name = `rotor_prop_${i}`;
            propMesh.scale.setScalar(CAD_MM_TO_SCENE_SCALE);
            propMesh.position.set(
                propPlacement.position[0] - hubPlacement.position[0],
                propPlacement.position[1] - hubPlacement.position[1],
                propPlacement.position[2] - hubPlacement.position[2]
            );
            if (propPlacement.rotation) {
                propMesh.rotation.set(...propPlacement.rotation);
            }
            propMesh.castShadow = true;
            propMesh.receiveShadow = true;
            rotor.add(propMesh);
        }
    } catch (error) {
        console.warn('[DroneModel] Failed to load propeller CAD assets.', error);
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
