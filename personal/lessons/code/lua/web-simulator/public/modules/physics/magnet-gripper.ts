import * as THREE from 'three';
import type { DroneState } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import { simulateDetachedCargoStep, type CargoVelocity } from './cargo-contact.js';
import {
    DEFAULT_CARGO_MASS_KG,
    DEFAULT_CARGO_PHYSICS_MATERIAL,
    GROUND_PHYSICS_MATERIAL
} from './materials.js';
import { OBJECT_TYPE } from '../shared/object-types.js';

const CARGO_TYPES = new Set([OBJECT_TYPE.CARGO_SMALL, OBJECT_TYPE.CARGO]);
const CARGO_AIR_DRAG = 0.2;
const MAGNET_ATTACH_OFFSET_Z = 0.15;
const MAGNET_CAPTURE_RADIUS_XY = 0.28;
const MAGNET_CAPTURE_HEIGHT = 0.38;

function isCargoObject(obj: THREE.Object3D) {
    return CARGO_TYPES.has(obj.userData?.type);
}

function getCargoVelocity(obj: THREE.Object3D): CargoVelocity {
    const vel = obj.userData?.physicsVelocity as Partial<CargoVelocity> | undefined;
    return {
        x: typeof vel?.x === 'number' ? vel.x : 0,
        y: typeof vel?.y === 'number' ? vel.y : 0,
        z: typeof vel?.z === 'number' ? vel.z : 0
    };
}

function setCargoVelocity(obj: THREE.Object3D, velocity: CargoVelocity) {
    obj.userData.physicsVelocity = velocity;
}

function getCargoMassKg(obj: THREE.Object3D) {
    const massKg = obj.userData?.massKg;
    return typeof massKg === 'number' && massKg > 0 ? massKg : DEFAULT_CARGO_MASS_KG;
}

export function updateDetachedCargoPhysics(dt: number, getObstacles: () => THREE.Object3D[]) {
    const obstacles = getObstacles();
    for (const obj of obstacles) {
        if (!isCargoObject(obj) || obj.userData?.attachedToDrone) continue;

        const velocity = getCargoVelocity(obj);
        const isMoving = Math.abs(velocity.x) > 0.001 || Math.abs(velocity.y) > 0.001 || Math.abs(velocity.z) > 0.001;
        const isAboveGround = obj.position.z > 0;
        if (!isMoving && !isAboveGround) continue;

        const step = simulateDetachedCargoStep({
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            velocity,
            dt,
            airDrag: CARGO_AIR_DRAG,
            cargoMassKg: getCargoMassKg(obj),
            cargoMaterial: obj.userData?.physicsMaterial ?? DEFAULT_CARGO_PHYSICS_MATERIAL,
            groundMaterial: GROUND_PHYSICS_MATERIAL
        });

        obj.position.set(step.position.x, step.position.y, step.position.z);
        setCargoVelocity(obj, step.velocity);
    }
}

export function updateMagnetGripper(
    drone: DroneState,
    getObstacles: () => THREE.Object3D[]
) {
    if (!drone.magnetGripper.active) {
        if (drone.magnetGripper.attachedObjectId) {
            const obj = getObstacles().find((item) => item.uuid === drone.magnetGripper.attachedObjectId);
            if (obj) {
                obj.userData.attachedToDrone = null;
                setCargoVelocity(obj, { ...drone.vel });
                log('[Magnet] Объект отпущен', 'info');
            }
            drone.magnetGripper.attachedObjectId = null;
        }
        return;
    }

    if (drone.magnetGripper.attachedObjectId) {
        const obj = getObstacles().find((item) => item.uuid === drone.magnetGripper.attachedObjectId);
        if (obj) {
            obj.position.set(drone.pos.x, drone.pos.y, drone.pos.z - MAGNET_ATTACH_OFFSET_Z);
            obj.rotation.set(drone.orientation.pitch, drone.orientation.roll, drone.orientation.yaw, 'ZYX');
        }
        return;
    }

    const obstacles = getObstacles();
    const magnetPos = new THREE.Vector3(drone.pos.x, drone.pos.y, drone.pos.z - MAGNET_ATTACH_OFFSET_Z);
    for (const obj of obstacles) {
        // Захватываем перетаскиваемые объекты или специальные грузики
        if (obj.userData?.draggable || isCargoObject(obj)) {
            const planarDistance = Math.hypot(magnetPos.x - obj.position.x, magnetPos.y - obj.position.y);
            const verticalDistance = Math.abs(magnetPos.z - obj.position.z);
            if (planarDistance <= MAGNET_CAPTURE_RADIUS_XY && verticalDistance <= MAGNET_CAPTURE_HEIGHT) {
                drone.magnetGripper.attachedObjectId = obj.uuid;
                obj.userData.attachedToDrone = drone.id;
                setCargoVelocity(obj, { x: 0, y: 0, z: 0 });
                log(`[Magnet] Объект "${obj.userData.type || 'Груз'}" захвачен`, 'success');
                break;
            }
        }
    }
}
