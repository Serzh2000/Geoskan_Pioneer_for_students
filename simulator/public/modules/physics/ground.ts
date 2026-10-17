import * as THREE from 'three';
import { getObstacles } from '../drone/index.js';
import { trainingHeightAt } from '../environment/training/world-plan.js';
import type { TrainingLayout } from '../environment/training/layout.js';
import { measureSurfaceBelow } from '../sensors/downward.js';
import type { DroneState } from '../core/state.js';

/*
 * Где у дрона земля. Раньше физика считала землёй плоскость z = 0, а у
 * учебных карт есть рельеф (в «Целом городе» холмы до ~4 м): дрон, стоящий
 * на холме, проваливался в него, а на взлёте «врезался» в склон и
 * разбивался. Дрон, поставленный на крышу, падал сквозь неё на землю внутри
 * здания - и тоже разбивался на взлёте.
 *
 * terrainHeightAt - рельеф учебных карт, аналитически (без лучей, дёшево -
 * хватает на каждый шаг физики). supportHeightBelow - опора дрона в покое:
 * рельеф или любая поверхность сцены под ним (крыша, площадка), лучом вниз.
 */

const groundMeshes = new WeakMap<THREE.Object3D, THREE.Object3D | null>();
const probe = new THREE.Vector3();

function trainingGroundOf(root: THREE.Object3D): THREE.Object3D | null {
    if (groundMeshes.has(root)) return groundMeshes.get(root) ?? null;
    let found: THREE.Object3D | null = null;
    root.traverse((node) => {
        if (!found && node.userData?.trainingGround) found = node;
    });
    groundMeshes.set(root, found);
    return found;
}

/** Высота рельефа учебных карт в точке (x, y), м. Без карты - 0. */
export function terrainHeightAt(x: number, y: number): number {
    let height = 0;
    for (const root of getObstacles()) {
        if (!root.visible || !root.userData?.trainingLayout) continue;
        const ground = trainingGroundOf(root);
        if (!ground) continue;
        const layout = ground.userData.trainingGround as TrainingLayout;
        ground.updateWorldMatrix(true, false);
        const local = ground.worldToLocal(probe.set(x, y, 0));
        if (Math.max(Math.abs(local.x), Math.abs(local.y)) > layout.size / 2) continue;
        const localHeight = trainingHeightAt(layout, local.x, local.y);
        if (localHeight <= 0) continue;
        const world = ground.localToWorld(probe.set(local.x, local.y, localHeight));
        height = Math.max(height, world.z);
    }
    return height;
}

// Опора в покое ищется лучом; пока дрон стоит на месте, луч не повторяется.
const supportCache = new WeakMap<DroneState, { key: string; height: number }>();

/**
 * Высота опоры под дроном в покое: рельеф или верх поверхности под ним
 * (крыша, площадка, капот поезда). Луч - от чуть выше дрона, чтобы дрон,
 * стоящий вровень с крышей, её видел.
 */
export function supportHeightBelow(drone: DroneState): number {
    const { x, y, z } = drone.pos;
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    const cached = supportCache.get(drone);
    if (cached?.key === key) return cached.height;
    const terrain = terrainHeightAt(x, y);
    let height = terrain;
    if (z > terrain + 1e-3) {
        const from = { x, y, z: z + 0.05 };
        const surface = from.z - measureSurfaceBelow(from).range;
        height = Math.max(terrain, Math.min(z, surface));
    }
    supportCache.set(drone, { key, height });
    return height;
}

/** Что под дроном на высоте его опоры - для правила «не врезаться в то, с чего взлетаешь». */
export function supportObjectBelow(x: number, y: number, supportZ: number): THREE.Object3D | null {
    return measureSurfaceBelow({ x, y, z: supportZ + 0.05 }).object;
}
