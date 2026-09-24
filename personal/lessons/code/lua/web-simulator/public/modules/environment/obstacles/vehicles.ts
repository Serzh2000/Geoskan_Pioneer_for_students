import * as THREE from 'three';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import { applyShadows, setCommonMeta } from './utils.js';
import { createMarkerMeshForMap } from './markers/object.js';
import { SHEET_SIZE, SHEET_THICKNESS } from './markers/shared.js';
import { createMissionAsset } from './mission-assets.js';

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

type Unit = { group: THREE.Group; length: number; roofZ: number };

/** Blender assets retain the engine's +X forward, +Z up convention. */
function buildCar(): Unit {
    return { group: createMissionAsset('Car'), length: 4.0, roofZ: 1.48 };
}

function buildLocomotive(): Unit {
    return { group: createMissionAsset('Locomotive'), length: 6.0, roofZ: 2.68 };
}

function buildWagon(): Unit {
    return { group: createMissionAsset('Wagon'), length: 5.6, roofZ: 2.52 };
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
        child.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            node.geometry.dispose();
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(material => material.dispose());
        });
    }

    const units: Unit[] = config.kind === 'car'
        ? [buildCar()]
        : [buildLocomotive(), ...Array.from({ length: config.wagons }, buildWagon)];

    let parkedOffset = 0;
    units.forEach((unit, index) => {
        if (index > 0) parkedOffset += units[index - 1].length / 2 + unit.length / 2 + 0.45;
        // Catalog previews have no route engine: place each wagon behind the
        // locomotive instead of stacking all units at the same origin.
        unit.group.position.x = -parkedOffset;
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
