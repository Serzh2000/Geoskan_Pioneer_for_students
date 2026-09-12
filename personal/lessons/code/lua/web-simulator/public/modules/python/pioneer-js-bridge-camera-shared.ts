import { envGroup } from '../environment/index.js';
import { getDroneOrDefault } from './runtime-shared.js';

const VIDEO_TOWER_TYPE = 'Видеомачта';
const DEFAULT_VIDEO_TOWER_CONNECT_RADIUS = 8;
const VIDEO_TOWER_STREAM_MAX_DISTANCE = 12;

export type CameraConnectionMode = 'fpv-direct' | 'video-tower';

export type CameraConnection = {
    towerId: string | null;
    connectedAt: number;
    mode: CameraConnectionMode;
};

export type ResolvedCameraFeed = {
    drone: any;
    tower: any | null;
    distance: number | null;
    connection: CameraConnection;
};

export const cameraConnectionsByDrone: Record<string, CameraConnection> = {};

export function reportCameraBridgeDebug(hypothesisId: string, message: string, data: Record<string, unknown>) {
    const debugUrl = (window as typeof window & { DEBUG_SERVER_URL?: string }).DEBUG_SERVER_URL;
    if (!debugUrl) return;
    fetch(debugUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: 'camera-video-stream',
            runId: 'pre-fix',
            hypothesisId,
            location: 'public/modules/python/pioneer-js-bridge-camera.ts',
            msg: message,
            data
        })
    }).catch(() => undefined);
}

export function getVideoTowerObjects() {
    if (!envGroup) return [];
    return envGroup.children.filter((obj) => obj.userData?.type === VIDEO_TOWER_TYPE);
}

export function getTowerConnectionRadius(tower: any) {
    const rawRadius = Number(tower?.userData?.connectionRadius);
    return Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : DEFAULT_VIDEO_TOWER_CONNECT_RADIUS;
}

export function getTowerStreamAnchor(tower: any) {
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

export function findClosestVideoTower(drone: any, maxDistance = DEFAULT_VIDEO_TOWER_CONNECT_RADIUS) {
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

export function resolveConnectedCameraFeed(droneId: string): ResolvedCameraFeed | null {
    const connection = cameraConnectionsByDrone[droneId];
    if (!connection) return null;

    const drone = getDroneOrDefault(droneId);
    if (!drone) {
        delete cameraConnectionsByDrone[droneId];
        return null;
    }

    if (!connection.towerId) {
        return {
            drone,
            tower: null,
            distance: null,
            connection
        };
    }

    const tower = getVideoTowerObjects().find((obj) => obj.uuid === connection.towerId);
    if (!tower) {
        delete cameraConnectionsByDrone[droneId];
        return null;
    }

    const distance = measureTowerDistance(drone, tower);
    if (distance > Math.max(getTowerConnectionRadius(tower), VIDEO_TOWER_STREAM_MAX_DISTANCE)) {
        if (connection.mode === 'video-tower') {
            connection.towerId = null;
            connection.mode = 'fpv-direct';
            return {
                drone,
                tower: null,
                distance: null,
                connection
            };
        }
        delete cameraConnectionsByDrone[droneId];
        return null;
    }

    return { tower, drone, distance, connection };
}

export function encodeFramePayload(payload: Record<string, unknown>) {
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    return Array.from(encoded);
}
