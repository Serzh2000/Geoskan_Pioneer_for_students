/* eslint-disable @typescript-eslint/no-explicit-any */
import { envGroup } from '../environment/index.js';
import { getDroneOrDefault } from './runtime-shared.js';

const VIDEO_TOWER_TYPE = 'Видеомачта';
const DEFAULT_VIDEO_TOWER_CONNECT_RADIUS = 8;
const VIDEO_TOWER_STREAM_MAX_DISTANCE = 12;

const cameraConnectionsByDrone: Record<string, { towerId: string; connectedAt: number }> = {};

function getVideoTowerObjects() {
    if (!envGroup) return [];
    return envGroup.children.filter((obj) => obj.userData?.type === VIDEO_TOWER_TYPE);
}

function getTowerConnectionRadius(tower: any) {
    const rawRadius = Number(tower?.userData?.connectionRadius);
    return Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : DEFAULT_VIDEO_TOWER_CONNECT_RADIUS;
}

function getTowerStreamAnchor(tower: any) {
    const streamHeight = Number(tower?.userData?.streamHeight);
    const z = tower.position.z + (Number.isFinite(streamHeight) ? streamHeight : 3.1);
    return { x: tower.position.x, y: tower.position.y, z };
}

function measureTowerDistance(drone: any, tower: any) {
    const anchor = getTowerStreamAnchor(tower);
    return Math.hypot(
        drone.pos.x - anchor.x,
        drone.pos.y - anchor.y,
        drone.pos.z - anchor.z
    );
}

function findClosestVideoTower(drone: any, maxDistance = DEFAULT_VIDEO_TOWER_CONNECT_RADIUS) {
    let bestTower: any = null;
    let bestDistance = Infinity;
    for (const tower of getVideoTowerObjects()) {
        const distance = measureTowerDistance(drone, tower);
        const limit = Math.min(maxDistance, getTowerConnectionRadius(tower));
        if (distance <= limit && distance < bestDistance) {
            bestTower = tower;
            bestDistance = distance;
        }
    }
    return bestTower ? { tower: bestTower, distance: bestDistance } : null;
}

function resolveConnectedVideoTower(droneId: string) {
    const connection = cameraConnectionsByDrone[droneId];
    if (!connection) return null;

    const drone = getDroneOrDefault(droneId);
    const tower = getVideoTowerObjects().find((obj) => obj.uuid === connection.towerId);
    if (!tower) {
        delete cameraConnectionsByDrone[droneId];
        return null;
    }

    const distance = measureTowerDistance(drone, tower);
    if (distance > Math.max(getTowerConnectionRadius(tower), VIDEO_TOWER_STREAM_MAX_DISTANCE)) {
        delete cameraConnectionsByDrone[droneId];
        return null;
    }

    return { tower, drone, distance, connection };
}

function encodeFramePayload(payload: Record<string, unknown>) {
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    return Array.from(encoded);
}

export function closeDroneCameraConnection(id: string) {
    delete cameraConnectionsByDrone[id];
    return null;
}

export function connectDroneCamera(id: string) {
    const drone = getDroneOrDefault(id);
    const match = findClosestVideoTower(drone);
    if (!match) return false;
    cameraConnectionsByDrone[id] = {
        towerId: match.tower.uuid,
        connectedAt: performance.now()
    };
    return true;
}

export function disconnectDroneCamera(id: string) {
    delete cameraConnectionsByDrone[id];
    return true;
}

export function isDroneCameraConnected(id: string) {
    return Boolean(resolveConnectedVideoTower(id));
}

export function getDroneCameraFrame(id: string) {
    const resolved = resolveConnectedVideoTower(id);
    if (!resolved) return null;
    return encodeFramePayload({
        source: 'video-tower',
        towerId: resolved.tower.uuid,
        towerName: resolved.tower.name || VIDEO_TOWER_TYPE,
        droneId: id,
        distance: Number(resolved.distance.toFixed(3)),
        connectedMs: Math.max(0, Math.round(performance.now() - resolved.connection.connectedAt)),
        timestamp: Date.now(),
        dronePosition: {
            x: Number(resolved.drone.pos.x.toFixed(3)),
            y: Number(resolved.drone.pos.y.toFixed(3)),
            z: Number(resolved.drone.pos.z.toFixed(3))
        }
    });
}

export function getDroneCameraCvFrame(id: string) {
    const resolved = resolveConnectedVideoTower(id);
    if (!resolved) return null;
    const anchor = getTowerStreamAnchor(resolved.tower);
    return {
        source: 'video-tower',
        towerId: resolved.tower.uuid,
        towerName: resolved.tower.name || VIDEO_TOWER_TYPE,
        connected: true,
        distance: Number(resolved.distance.toFixed(3)),
        timestamp: Date.now(),
        drone_position: [
            Number(resolved.drone.pos.x.toFixed(3)),
            Number(resolved.drone.pos.y.toFixed(3)),
            Number(resolved.drone.pos.z.toFixed(3))
        ],
        tower_position: [
            Number(anchor.x.toFixed(3)),
            Number(anchor.y.toFixed(3)),
            Number(anchor.z.toFixed(3))
        ],
        delta: [
            Number((resolved.drone.pos.x - anchor.x).toFixed(3)),
            Number((resolved.drone.pos.y - anchor.y).toFixed(3)),
            Number((resolved.drone.pos.z - anchor.z).toFixed(3))
        ]
    };
}
