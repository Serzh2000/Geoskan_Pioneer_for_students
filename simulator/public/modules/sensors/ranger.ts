import * as THREE from 'three';
import { envGroup } from '../environment/index.js';
import { bodyPlanarToWorld } from '../physics/frames.js';
import { measureSurfaceBelow } from './downward.js';
import type { DroneState } from '../core/state.js';

/*
 * Модуль дальномеров Ranger Пионера Мини 2 (pioneer_sdk2.get_ranger_data):
 * пять лазерных дальномеров - вправо, влево, вперёд, назад и вниз.
 * Каждый измеряет расстояние до ближайшей поверхности сцены по своему лучу.
 */

/** Дальше этого лазерный дальномер ничего не видит и отдаёт свой предел, м. */
export const RANGER_MAX_RANGE = 4.0;
/** Лучи начинаются у края корпуса, а не в центре дрона. */
const BODY_OFFSET = 0.05;

const raycaster = new THREE.Raycaster();

export type RangerReading = { right: number; left: number; front: number; back: number; below: number };

function castRange(origin: THREE.Vector3, direction: THREE.Vector3): number {
    if (!envGroup) return RANGER_MAX_RANGE;
    raycaster.set(origin, direction);
    raycaster.near = BODY_OFFSET;
    raycaster.far = RANGER_MAX_RANGE;
    for (const hit of raycaster.intersectObjects(envGroup.children, true)) {
        const mesh = hit.object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) continue;
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (material && 'opacity' in material && material.transparent && (material.opacity ?? 1) < 0.2) continue;
        return Math.min(RANGER_MAX_RANGE, hit.distance);
    }
    return RANGER_MAX_RANGE;
}

export function readRanger(drone: DroneState): RangerReading {
    const origin = new THREE.Vector3(drone.pos.x, drone.pos.y, Math.max(0.03, drone.pos.z));
    const along = (right: number, forward: number) => {
        const world = bodyPlanarToWorld(right, forward, drone.orientation.yaw);
        return castRange(origin, new THREE.Vector3(world.x, world.y, 0).normalize());
    };
    return {
        right: along(1, 0),
        left: along(-1, 0),
        front: along(0, 1),
        back: along(0, -1),
        below: Math.min(RANGER_MAX_RANGE, measureSurfaceBelow(drone.pos).range)
    };
}
