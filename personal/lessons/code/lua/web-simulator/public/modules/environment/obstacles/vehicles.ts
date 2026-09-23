import * as THREE from 'three';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import { applyShadows, setCommonMeta } from './utils.js';
import { createMarkerMeshForMap } from './markers/object.js';
import { SHEET_SIZE, SHEET_THICKNESS } from './markers/shared.js';

/*
 * Vehicles that drive along a road (car) or a railway (train).
 *
 * A vehicle is one top-level scene object whose children are "units": the
 * car body, or the locomotive plus its wagons. The group itself stays at the
 * world origin; vehicles/engine.ts places every unit on the route curve each
 * frame (so a train bends through curves wagon by wagon). Everything the
 * user can configure lives in userData.vehicle (see VehicleConfig) and is
 * what a saved scene stores.
 */

export type VehicleKind = 'car' | 'train';
export type VehicleMode = 'loop' | 'pingpong' | 'once';

export type VehicleMarkerConfig = {
    enabled: boolean;
    kind: 'ArUco' | 'AprilTag';
    dictionary?: string;
    id: string;
    /** Printed marker side, metres. */
    size: number;
};

export type VehicleConfig = {
    kind: VehicleKind;
    /** Shown in the scene tree and used by the Python/Lua API to find it. */
    name: string;
    /** uuid of the road / railway it drives on; null = parked, no route. */
    routeId: string | null;
    /** Cruise speed, m/s. */
    speed: number;
    /** Speed change rate when starting/stopping/reversing, m/s². */
    accel: number;
    mode: VehicleMode;
    /** 1 = along the route's point order, -1 = against it. */
    direction: 1 | -1;
    /** Where on the route it starts, 0..1 of the route length. */
    startOffset: number;
    /** Starts moving together with the drone program. */
    autoStart: boolean;
    /** Train only. */
    wagons: number;
    marker: VehicleMarkerConfig;
};

export const VEHICLE_UNIT_NAME = 'vehicle-unit';
const ROOF_MARKER_NAME = 'vehicle-roof-marker';

export const DEFAULT_VEHICLE_CONFIG: Record<VehicleKind, VehicleConfig> = {
    car: {
        kind: 'car',
        name: 'Автомобиль',
        routeId: null,
        speed: 2,
        accel: 1.5,
        mode: 'loop',
        direction: 1,
        startOffset: 0,
        autoStart: true,
        wagons: 0,
        marker: { enabled: true, kind: 'ArUco', id: '7', size: 0.9 }
    },
    train: {
        kind: 'train',
        name: 'Поезд',
        routeId: null,
        speed: 2,
        accel: 0.8,
        mode: 'loop',
        direction: 1,
        startOffset: 0,
        autoStart: true,
        wagons: 2,
        marker: { enabled: true, kind: 'ArUco', id: '12', size: 1.6 }
    }
};

export function normalizeVehicleConfig(kind: VehicleKind, raw: Partial<VehicleConfig> = {}): VehicleConfig {
    const base = DEFAULT_VEHICLE_CONFIG[kind];
    const num = (value: unknown, fallback: number, min: number, max: number) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    };
    const marker = { ...base.marker, ...(raw.marker || {}) };
    return {
        kind,
        name: String(raw.name || base.name).slice(0, 40),
        routeId: raw.routeId ?? null,
        speed: num(raw.speed, base.speed, 0, 15),
        accel: num(raw.accel, base.accel, 0.1, 10),
        mode: raw.mode === 'pingpong' || raw.mode === 'once' ? raw.mode : 'loop',
        direction: raw.direction === -1 ? -1 : 1,
        startOffset: num(raw.startOffset, base.startOffset, 0, 1),
        autoStart: raw.autoStart ?? base.autoStart,
        wagons: Math.round(num(raw.wagons, base.wagons, kind === 'train' ? 0 : 0, kind === 'train' ? 6 : 0)),
        marker: {
            enabled: !!marker.enabled,
            kind: marker.kind === 'AprilTag' ? 'AprilTag' : 'ArUco',
            dictionary: marker.dictionary,
            id: String(marker.id ?? '0'),
            size: num(marker.size, base.marker.size, 0.3, 2)
        }
    };
}

// ---------------------------------------------------------------- models

function mat(color: number, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...options });
}

function box(w: number, d: number, h: number, material: THREE.Material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), material);
    mesh.position.set(x, y, z);
    return mesh;
}

function wheel(radius: number, width: number, material: THREE.Material, x: number, y: number) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), material);
    mesh.position.set(x, y, radius);
    // CylinderGeometry's axis is Y - already the car's left/right axis.
    return mesh;
}

type Unit = { group: THREE.Group; length: number; roofZ: number };

/** Forward is +X, left is +Y, up is +Z; origin at the ground, centered. */
function buildCar(): Unit {
    const group = new THREE.Group();
    const body = mat(0x2f6fb0, { roughness: 0.35, metalness: 0.35 });
    const glass = mat(0x1b242c, { roughness: 0.15, metalness: 0.6 });
    const tyre = mat(0x1a1a1a, { roughness: 0.9, metalness: 0 });
    const trim = mat(0x2a2a2a, { roughness: 0.7 });

    group.add(box(4.0, 1.76, 0.62, body, 0, 0, 0.66));            // lower body
    group.add(box(2.2, 1.62, 0.5, body, -0.25, 0, 1.2));          // cabin
    group.add(box(2.24, 1.5, 0.36, glass, -0.25, 0, 1.2));        // window band
    group.add(box(0.06, 1.3, 0.32, glass, 0.87, 0, 1.18));        // windscreen
    group.add(box(4.04, 1.8, 0.1, trim, 0, 0, 0.36));             // skirt
    const headlight = mat(0xfff4d6, { emissive: 0xfff1c4, emissiveIntensity: 0.6 });
    const taillight = mat(0xd32f2f, { emissive: 0x9c1c1c, emissiveIntensity: 0.5 });
    for (const side of [-1, 1]) {
        group.add(box(0.05, 0.34, 0.14, headlight, 2.01, side * 0.62, 0.78));
        group.add(box(0.05, 0.3, 0.12, taillight, -2.01, side * 0.64, 0.8));
        for (const x of [-1.3, 1.3]) group.add(wheel(0.34, 0.24, tyre, x, side * 0.8));
    }
    return { group, length: 4.0, roofZ: 1.45 };
}

function bogie(x: number, frame: THREE.Material, tyre: THREE.Material) {
    const group = new THREE.Group();
    group.add(box(1.6, 1.3, 0.22, frame, x, 0, 0.42));
    for (const dx of [-0.5, 0.5]) {
        for (const side of [-1, 1]) {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 16), tyre);
            w.position.set(x + dx, side * 0.55, 0.28);
            group.add(w);
        }
    }
    return group;
}

function buildLocomotive(): Unit {
    const group = new THREE.Group();
    const paint = mat(0xd9481c, { roughness: 0.45, metalness: 0.25 });
    const stripe = mat(0xf2f2f2, { roughness: 0.5 });
    const glass = mat(0x1b242c, { roughness: 0.15, metalness: 0.6 });
    const frame = mat(0x2b2b2b, { roughness: 0.8 });
    const tyre = mat(0x3a3a3a, { roughness: 0.5, metalness: 0.6 });

    group.add(box(6.0, 2.3, 1.95, paint, 0, 0, 1.6));             // body 0.62..2.58
    group.add(box(6.04, 2.34, 0.14, stripe, 0, 0, 1.2));          // side stripe
    group.add(box(0.06, 1.9, 0.6, glass, 3.01, 0, 2.1));          // cab windscreen
    for (const side of [-1, 1]) group.add(box(0.9, 0.06, 0.5, glass, 2.3, side * 1.16, 2.1));
    group.add(box(6.0, 2.36, 0.12, frame, 0, 0, 0.62));           // underframe
    group.add(bogie(-1.9, frame, tyre), bogie(1.9, frame, tyre));
    const lamp = mat(0xfff4d6, { emissive: 0xfff1c4, emissiveIntensity: 0.7 });
    group.add(box(0.05, 0.5, 0.18, lamp, 3.02, 0, 1.25));
    return { group, length: 6.0, roofZ: 2.58 };
}

function buildWagon(): Unit {
    const group = new THREE.Group();
    const paint = mat(0x3a6ea5, { roughness: 0.5, metalness: 0.2 });
    const glass = mat(0x1b242c, { roughness: 0.15, metalness: 0.6 });
    const frame = mat(0x2b2b2b, { roughness: 0.8 });
    const tyre = mat(0x3a3a3a, { roughness: 0.5, metalness: 0.6 });

    group.add(box(5.6, 2.3, 1.8, paint, 0, 0, 1.52));             // body 0.62..2.42
    for (let i = 0; i < 4; i++) {
        for (const side of [-1, 1]) group.add(box(0.9, 0.06, 0.55, glass, -2.0 + i * 1.33, side * 1.16, 1.75));
    }
    group.add(box(5.6, 2.36, 0.12, frame, 0, 0, 0.62));
    group.add(bogie(-1.9, frame, tyre), bogie(1.9, frame, tyre));
    return { group, length: 5.6, roofZ: 2.42 };
}

function addRoofMarker(unit: Unit, marker: VehicleMarkerConfig) {
    const sheetGroup = createMarkerMeshForMap(marker.kind, marker.id, marker.dictionary);
    const scale = marker.size / SHEET_SIZE;
    sheetGroup.scale.setScalar(scale);
    sheetGroup.position.set(0, 0, unit.roofZ + (SHEET_THICKNESS * scale) / 2 + 0.002);
    sheetGroup.name = ROOF_MARKER_NAME;
    // Part of the vehicle, not a scene object of its own.
    sheetGroup.userData = { ...sheetGroup.userData, draggable: false, isVehicleRoofMarker: true };
    unit.group.add(sheetGroup);
    return sheetGroup;
}

/** Rebuilds the units (and roof marker) from userData.vehicle. */
export function rebuildVehicle(group: THREE.Object3D) {
    const config = group.userData.vehicle as VehicleConfig;
    for (const child of [...group.children]) {
        group.remove(child);
        child.traverse((node) => (node as THREE.Mesh).geometry?.dispose?.());
    }

    const units: Unit[] = config.kind === 'car'
        ? [buildCar()]
        : [buildLocomotive(), ...Array.from({ length: config.wagons }, buildWagon)];

    units.forEach((unit, index) => {
        unit.group.name = VEHICLE_UNIT_NAME;
        unit.group.userData = { vehicleUnitIndex: index, unitLength: unit.length, roofZ: unit.roofZ };
        group.add(unit.group);
    });

    if (config.marker.enabled) {
        const roof = addRoofMarker(units[0], config.marker);
        // What the settings popover and the API report back.
        config.marker.dictionary = roof.userData.markerDictionary;
        config.marker.id = String(roof.userData.value);
    }

    group.name = config.name;
    applyShadows(group);
}

export function createVehicleMesh(kind: VehicleKind, raw: Partial<VehicleConfig> = {}) {
    const group = setCommonMeta(new THREE.Group(), kind === 'car' ? OBJECT_TYPE.CAR : OBJECT_TYPE.TRAIN, {
        isVehicle: true,
        // Placed by the engine along its route, never by the gizmo.
        transformLocked: true,
        vehicle: normalizeVehicleConfig(kind, raw),
        collidableRadius: kind === 'car' ? 2.2 : 6
    });
    rebuildVehicle(group);
    return group;
}

export function isVehicleObject(object: THREE.Object3D | null | undefined): boolean {
    return !!object?.userData?.isVehicle;
}
