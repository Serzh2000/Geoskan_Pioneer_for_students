import * as THREE from 'three';
import { envGroup } from '../environment/index.js';
import { getLinearFeatureCurve, getLinearFeatureSurfaceHeight } from '../environment/obstacles.js';
import { VEHICLE_UNIT_NAME, type VehicleConfig } from '../environment/obstacles/vehicles.js';

/*
 * Moves cars and trains along their road / railway.
 *
 * Distance along the route (s, metres) is the state; every frame each unit
 * (car body, locomotive, wagon) is placed on the route curve at its own
 * distance behind the lead, oriented along the curve at that spot - so a
 * train bends through a curve wagon by wagon. Geometry (the order of the
 * units, which way they face) is fixed by the direction at start; running
 * "туда-обратно" just reverses the motion, the train doesn't spin around.
 *
 * Timing follows the simulation: vehicles set to start with the program
 * move after "Запуск", pause on "Стоп", and return to their start on
 * "Сброс". Scripts can override per vehicle (start/stop/speed) through
 * the API in vehicles/api.ts.
 */

type Runtime = {
    /** Lead unit's distance along the route, m. */
    s: number;
    /** Current (signed-less) speed, m/s; eased toward the target. */
    v: number;
    /** Current direction of motion along the route. */
    dir: 1 | -1;
    /** Direction the train faces - fixed at start. */
    facing: 1 | -1;
    /** Script override: null = follow the scene settings. */
    commanded: 'go' | 'stop' | null;
    speedOverride: number | null;
    finished: boolean;
    started: boolean;
    routeKey: string;
};

type RouteGeometry = { key: string; curve: THREE.CatmullRomCurve3; length: number; closed: boolean };

const runtimes = new WeakMap<THREE.Object3D, Runtime>();
const routeGeometry = new WeakMap<THREE.Object3D, RouteGeometry>();
const COUPLING_GAP = 0.45;

let sessionRunning = false;

// ---------------------------------------------------------------- lookup

export function listVehicles(): THREE.Object3D[] {
    if (!envGroup) return [];
    const found: THREE.Object3D[] = [];
    envGroup.traverse((node) => {
        if (node.userData?.isVehicle) found.push(node);
    });
    return found;
}

export function findRoute(id: string | null): THREE.Object3D | null {
    if (!id || !envGroup) return null;
    const route = envGroup.getObjectByProperty('uuid', id) ?? null;
    return route?.userData?.supportsPoints ? route : null;
}

export function routeKindFor(config: VehicleConfig): 'road' | 'rail' {
    return config.kind === 'train' ? 'rail' : 'road';
}

export function isRouteFor(route: THREE.Object3D, config: VehicleConfig): boolean {
    return route.userData?.supportsPoints && (route.userData.featureKind === 'rail' ? 'rail' : 'road') === routeKindFor(config);
}

function geometryOf(route: THREE.Object3D): RouteGeometry {
    const key = JSON.stringify([route.userData.points, !!route.userData.closed]);
    const cached = routeGeometry.get(route);
    if (cached && cached.key === key) return cached;
    const curve = getLinearFeatureCurve(route);
    const fresh = { key, curve, length: curve.getLength(), closed: !!route.userData.closed };
    routeGeometry.set(route, fresh);
    return fresh;
}

function unitsOf(vehicle: THREE.Object3D) {
    return vehicle.children.filter((child) => child.name === VEHICLE_UNIT_NAME);
}

/** Total length from the lead's centre to the last unit's tail. */
function trainSpan(vehicle: THREE.Object3D) {
    const units = unitsOf(vehicle);
    return units.reduce((sum, unit) => sum + Number(unit.userData.unitLength || 0), 0)
        + COUPLING_GAP * Math.max(0, units.length - 1);
}

// ---------------------------------------------------------------- runtime

function initialRuntime(vehicle: THREE.Object3D, geometry: RouteGeometry | null): Runtime {
    const config = vehicle.userData.vehicle as VehicleConfig;
    let s = geometry ? config.startOffset * geometry.length : 0;
    if (geometry && !geometry.closed) {
        // Keep the whole train on an open route at the start.
        const span = trainSpan(vehicle);
        const leadHalf = Number(unitsOf(vehicle)[0]?.userData.unitLength || 0) / 2;
        s = config.direction === 1
            ? THREE.MathUtils.clamp(s, span - leadHalf, geometry.length - leadHalf)
            : THREE.MathUtils.clamp(s, leadHalf, geometry.length - span + leadHalf);
    }
    return {
        s,
        v: 0,
        dir: config.direction,
        facing: config.direction,
        commanded: null,
        speedOverride: null,
        finished: false,
        started: false,
        routeKey: geometry?.key ?? ''
    };
}

function runtimeOf(vehicle: THREE.Object3D, geometry: RouteGeometry | null): Runtime {
    let rt = runtimes.get(vehicle);
    // Not started yet: follow edits live (start offset, direction, route).
    if (!rt || (!rt.started && (rt.routeKey !== (geometry?.key ?? '') || !rt.commanded))) {
        const keep = rt ? { commanded: rt.commanded, speedOverride: rt.speedOverride } : null;
        rt = { ...initialRuntime(vehicle, geometry), ...(keep || {}) };
        runtimes.set(vehicle, rt);
    }
    return rt;
}

function shouldMove(config: VehicleConfig, rt: Runtime) {
    if (rt.finished) return false;
    if (rt.commanded === 'stop') return false;
    if (rt.commanded === 'go') return true;
    return sessionRunning && config.autoStart;
}

function wrapDistance(s: number, geometry: RouteGeometry) {
    if (!geometry.closed) return THREE.MathUtils.clamp(s, 0, geometry.length);
    const L = geometry.length;
    return ((s % L) + L) % L;
}

function advance(vehicle: THREE.Object3D, config: VehicleConfig, rt: Runtime, geometry: RouteGeometry, dt: number) {
    const moving = shouldMove(config, rt);
    const target = moving ? (rt.speedOverride ?? config.speed) : 0;
    const step = config.accel * dt;
    rt.v = rt.v < target ? Math.min(target, rt.v + step) : Math.max(target, rt.v - step);
    if (rt.v <= 0) return;
    if (moving) rt.started = true;

    const L = geometry.length;
    let s = rt.s + rt.dir * rt.v * dt;
    if (geometry.closed) {
        rt.s = wrapDistance(s, geometry);
        return;
    }

    // Open route: the lead must keep the rest of the train on the track.
    const span = trainSpan(vehicle);
    const leadHalf = Number(unitsOf(vehicle)[0]?.userData.unitLength || 0) / 2;
    const tail = rt.facing === 1 ? span - leadHalf : leadHalf;
    const head = rt.facing === 1 ? L - leadHalf : L - span + leadHalf;
    const min = Math.min(tail, head);
    const max = Math.max(tail, head);

    if (s > max || s < min) {
        if (config.mode === 'pingpong') {
            s = s > max ? max - (s - max) : min + (min - s);
            rt.dir = rt.dir === 1 ? -1 : 1;
        } else if (config.mode === 'loop') {
            // Open route "по кругу": reappear at the start end.
            s = rt.dir === 1 ? min : max;
        } else {
            s = THREE.MathUtils.clamp(s, min, max);
            rt.finished = true;
            rt.v = 0;
        }
    }
    rt.s = THREE.MathUtils.clamp(s, min, max);
}

// ---------------------------------------------------------------- placement

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function worldPointAt(route: THREE.Object3D, geometry: RouteGeometry, s: number, out: THREE.Vector3) {
    const u = wrapDistance(s, geometry) / geometry.length;
    out.copy(geometry.curve.getPointAt(Math.min(1, Math.max(0, u))));
    out.z += getLinearFeatureSurfaceHeight(route);
    return route.localToWorld(out);
}

function placeUnits(vehicle: THREE.Object3D, route: THREE.Object3D, geometry: RouteGeometry, rt: Runtime, dt: number) {
    vehicle.position.set(0, 0, 0);
    vehicle.rotation.set(0, 0, 0);
    vehicle.scale.set(1, 1, 1);
    vehicle.updateMatrixWorld();
    const toLocal = vehicle.parent ? new THREE.Matrix4().copy(vehicle.parent.matrixWorld).invert() : null;

    let offset = 0;
    unitsOf(vehicle).forEach((unit, index) => {
        const length = Number(unit.userData.unitLength || 0);
        if (index > 0) offset += Number(unitsOf(vehicle)[index - 1].userData.unitLength || 0) / 2 + COUPLING_GAP + length / 2;
        const center = rt.s - rt.facing * offset;
        const front = worldPointAt(route, geometry, center + rt.facing * length * 0.4, tmpA);
        const back = worldPointAt(route, geometry, center - rt.facing * length * 0.4, tmpB);

        const previous = unit.userData.worldPosition as THREE.Vector3 | undefined;
        const position = front.clone().add(back).multiplyScalar(0.5);
        const velocity = (unit.userData.velocity as THREE.Vector3 | undefined) ?? new THREE.Vector3();
        if (previous && dt > 0) velocity.copy(position).sub(previous).divideScalar(dt);
        else velocity.set(0, 0, 0);
        unit.userData.velocity = velocity;
        unit.userData.worldPosition = position.clone();

        const local = toLocal ? position.clone().applyMatrix4(toLocal) : position;
        unit.position.copy(local);
        unit.rotation.set(0, 0, Math.atan2(front.y - back.y, front.x - back.x));
    });
}

function localBoundsOf(unit: THREE.Object3D): THREE.Box3 {
    let bounds = unit.userData.localBounds as THREE.Box3 | undefined;
    if (bounds) return bounds;
    bounds = new THREE.Box3();
    unit.updateWorldMatrix(true, true);
    const inverse = new THREE.Matrix4().copy(unit.matrixWorld).invert();
    unit.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
        bounds!.union(box);
    });
    unit.userData.localBounds = bounds;
    return bounds;
}

// ---------------------------------------------------------------- public

export function updateVehicles(dt: number) {
    for (const vehicle of listVehicles()) {
        const config = vehicle.userData.vehicle as VehicleConfig;
        const route = findRoute(config.routeId);
        if (!route || !isRouteFor(route, config)) {
            vehicle.visible = true;
            continue;
        }
        const geometry = geometryOf(route);
        if (geometry.length < 0.5) continue;
        const rt = runtimeOf(vehicle, geometry);
        advance(vehicle, config, rt, geometry, dt);
        placeUnits(vehicle, route, geometry, rt, dt);
        vehicle.userData.vehicleState = {
            distance: rt.s,
            speed: rt.v,
            direction: rt.dir,
            routeLength: geometry.length,
            moving: rt.v > 0
        };
    }
}

/** "Запуск": vehicles set to start with the program begin to move. */
export function startVehicleSession() {
    sessionRunning = true;
}

/** "Стоп": everything eases to a halt where it is. */
export function stopVehicleSession() {
    sessionRunning = false;
    for (const vehicle of listVehicles()) {
        const rt = runtimes.get(vehicle);
        if (rt) rt.commanded = null;
    }
}

/** "Сброс": back to the start positions, all script overrides cleared. */
export function resetVehicles() {
    sessionRunning = false;
    for (const vehicle of listVehicles()) {
        runtimes.delete(vehicle);
        for (const unit of unitsOf(vehicle)) delete unit.userData.worldPosition;
    }
    updateVehicles(0);
}

/** Settings changed (route, start, wagons...) - re-evaluate from the start. */
export function resetVehicle(vehicle: THREE.Object3D) {
    runtimes.delete(vehicle);
    for (const unit of unitsOf(vehicle)) delete unit.userData.worldPosition;
}

export function commandVehicle(vehicle: THREE.Object3D, command: { go?: boolean; speed?: number }) {
    const config = vehicle.userData.vehicle as VehicleConfig;
    const route = findRoute(config.routeId);
    const rt = runtimeOf(vehicle, route ? geometryOf(route) : null);
    if (command.go !== undefined) {
        rt.commanded = command.go ? 'go' : 'stop';
        if (command.go) rt.finished = false;
    }
    if (command.speed !== undefined && Number.isFinite(command.speed)) {
        rt.speedOverride = Math.max(0, Math.min(15, command.speed));
    }
}

/**
 * The vehicle unit (if any) whose top surface is directly under a point,
 * with that unit's world velocity - what a downward sensor over a moving
 * train or car sees.
 */
export function vehicleSurfaceBelow(point: THREE.Vector3): { top: number; velocity: THREE.Vector3 } | null {
    let best: { top: number; velocity: THREE.Vector3 } | null = null;
    for (const vehicle of listVehicles()) {
        for (const unit of unitsOf(vehicle)) {
            // Footprint test in the unit's own frame: on a curve its
            // world-aligned box would be much wider than the car itself.
            const bounds = localBoundsOf(unit);
            unit.updateWorldMatrix(true, false);
            const local = unit.worldToLocal(point.clone());
            if (local.x < bounds.min.x || local.x > bounds.max.x || local.y < bounds.min.y || local.y > bounds.max.y) continue;
            const top = unit.localToWorld(new THREE.Vector3(local.x, local.y, bounds.max.z)).z;
            if (top > point.z) continue;
            if (!best || top > best.top) {
                best = { top, velocity: (unit.userData.velocity as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3() };
            }
        }
    }
    return best;
}
