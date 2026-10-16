import * as THREE from 'three';
import { commandVehicle, listVehicles } from './engine.js';
import { VEHICLE_UNIT_NAME, type VehicleConfig } from '../environment/obstacles/vehicles.js';

/*
 * Script-facing vehicle API, shared by Lua (Vehicle.*) and Python
 * (pioneer_sdk.Vehicle). A vehicle is found by the name set in its settings
 * ("Поезд 1"); names are matched case-insensitively and ignoring extra
 * spaces, since they're typed into code by hand.
 *
 * This is a simulator-only scenario API - on a real field the drone can't
 * command the train. get_state() is the train's true position, meant for
 * setting up scenarios and checking results; a tracking mission itself
 * should rely on the camera and the optical-flow sensor.
 */

export type VehicleState = {
    name: string;
    kind: 'car' | 'train';
    x: number;
    y: number;
    z: number;
    /** Heading of the lead car, radians, same convention as the drone's yaw. */
    heading: number;
    speed: number;
    moving: boolean;
    markerId: string | null;
};

const normalize = (text: string) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

export function findVehicleByName(name: string): THREE.Object3D | null {
    const wanted = normalize(String(name ?? ''));
    return listVehicles().find((vehicle) => normalize((vehicle.userData.vehicle as VehicleConfig).name) === wanted) ?? null;
}

export function vehicleNames(): string[] {
    return listVehicles().map((vehicle) => (vehicle.userData.vehicle as VehicleConfig).name);
}

function requireVehicle(name: string): THREE.Object3D {
    const vehicle = findVehicleByName(name);
    if (!vehicle) {
        const known = vehicleNames();
        throw new Error(known.length
            ? `Транспорт «${name}» не найден. На сцене есть: ${known.map((n) => `«${n}»`).join(', ')}.`
            : `Транспорт «${name}» не найден: на сцене нет ни машин, ни поездов.`);
    }
    return vehicle;
}

export function vehicleStart(name: string) {
    commandVehicle(requireVehicle(name), { go: true });
    return true;
}

export function vehicleStop(name: string) {
    commandVehicle(requireVehicle(name), { go: false });
    return true;
}

export function vehicleSetSpeed(name: string, speed: number) {
    if (!Number.isFinite(Number(speed))) throw new Error('Скорость транспорта должна быть числом (м/с).');
    commandVehicle(requireVehicle(name), { speed: Number(speed) });
    return true;
}

export function vehicleGetState(name: string): VehicleState {
    const vehicle = requireVehicle(name);
    const config = vehicle.userData.vehicle as VehicleConfig;
    const lead = vehicle.children.find((child) => child.name === VEHICLE_UNIT_NAME);
    const position = new THREE.Vector3();
    lead?.getWorldPosition(position);
    const runtime = vehicle.userData.vehicleState || {};
    return {
        name: config.name,
        kind: config.kind,
        x: position.x,
        y: position.y,
        z: position.z,
        // Same convention as the drone's yaw (physics/frames.ts: yaw 0 faces
        // -Y), while the unit's rotation.z is the plain angle from +X.
        heading: Math.atan2(Math.sin((lead?.rotation.z ?? 0) + Math.PI / 2), Math.cos((lead?.rotation.z ?? 0) + Math.PI / 2)),
        speed: Number(runtime.speed) || 0,
        moving: !!runtime.moving,
        markerId: config.marker.enabled ? config.marker.id : null
    };
}
