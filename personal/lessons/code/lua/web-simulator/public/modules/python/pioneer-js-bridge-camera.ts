import { getDroneOrDefault } from './runtime-shared.js';
import { captureDroneCameraFrameDataUrl as captureDroneCameraFrameImageDataUrl } from './pioneer-js-bridge-camera-render.js';
import {
    cameraConnectionsByDrone,
    encodeFramePayload,
    findClosestVideoTower,
    getTowerStreamAnchor,
    getVideoTowerObjects,
    reportCameraBridgeDebug,
    resolveConnectedCameraFeed
} from './pioneer-js-bridge-camera-shared.js';

const VIDEO_TOWER_TYPE = 'Видеомачта';

export function closeDroneCameraConnection(id: string) {
    delete cameraConnectionsByDrone[id];
    return null;
}

export function connectDroneCamera(id: string) {
    const drone = getDroneOrDefault(id);
    const match = findClosestVideoTower(drone);

    if (match) {
        cameraConnectionsByDrone[id] = {
            towerId: match.tower.uuid,
            connectedAt: performance.now(),
            mode: 'video-tower'
        };
        reportCameraBridgeDebug('H3', 'Camera connected to video tower', {
            droneId: id,
            towerId: match.tower.uuid,
            towerName: match.tower.name || VIDEO_TOWER_TYPE,
            distance: Number(match.distance.toFixed(3))
        });
        return true;
    }

    cameraConnectionsByDrone[id] = {
        towerId: null,
        connectedAt: performance.now(),
        mode: 'fpv-direct'
    };
    reportCameraBridgeDebug('H3', 'Camera connected directly to onboard FPV feed', {
        droneId: id,
        dronePosition: { ...drone.pos },
        availableTowerCount: getVideoTowerObjects().length
    });
    return true;
}

export function disconnectDroneCamera(id: string) {
    delete cameraConnectionsByDrone[id];
    return true;
}

export function isDroneCameraConnected(id: string) {
    return Boolean(resolveConnectedCameraFeed(id));
}

export function getDroneCameraFrame(id: string) {
    const resolved = resolveConnectedCameraFeed(id);
    if (!resolved) {
        reportCameraBridgeDebug('H3', 'Camera frame request returned null because no active camera connection exists', {
            droneId: id,
            activeConnection: Boolean(cameraConnectionsByDrone[id]),
            availableTowerCount: getVideoTowerObjects().length
        });
        return null;
    }
    const payload = {
        source: resolved.tower ? 'video-tower' : 'fpv-direct',
        towerId: resolved.tower?.uuid ?? null,
        towerName: resolved.tower?.name || null,
        droneId: id,
        distance: resolved.distance === null ? null : Number(resolved.distance.toFixed(3)),
        connectedMs: Math.max(0, Math.round(performance.now() - resolved.connection.connectedAt)),
        timestamp: Date.now(),
        dronePosition: {
            x: Number(resolved.drone.pos.x.toFixed(3)),
            y: Number(resolved.drone.pos.y.toFixed(3)),
            z: Number(resolved.drone.pos.z.toFixed(3))
        }
    };
    reportCameraBridgeDebug('H4', 'Camera frame request returned encoded payload', {
        droneId: id,
        towerId: resolved.tower?.uuid ?? null,
        payloadKeys: Object.keys(payload)
    });
    return encodeFramePayload(payload);
}

export function getDroneCameraCvFrame(id: string) {
    const resolved = resolveConnectedCameraFeed(id);
    if (!resolved) {
        reportCameraBridgeDebug('H3', 'Camera CV frame request returned null because no active camera connection exists', {
            droneId: id,
            activeConnection: Boolean(cameraConnectionsByDrone[id]),
            availableTowerCount: getVideoTowerObjects().length
        });
        return null;
    }
    const anchor = resolved.tower ? getTowerStreamAnchor(resolved.tower) : null;
    const payload = {
        source: resolved.tower ? 'video-tower' : 'fpv-direct',
        towerId: resolved.tower?.uuid ?? null,
        towerName: resolved.tower?.name || null,
        connected: true,
        distance: resolved.distance === null ? null : Number(resolved.distance.toFixed(3)),
        timestamp: Date.now(),
        drone_position: [
            Number(resolved.drone.pos.x.toFixed(3)),
            Number(resolved.drone.pos.y.toFixed(3)),
            Number(resolved.drone.pos.z.toFixed(3))
        ],
        tower_position: anchor ? [
            Number(anchor.x.toFixed(3)),
            Number(anchor.y.toFixed(3)),
            Number(anchor.z.toFixed(3))
        ] : null,
        delta: anchor ? [
            Number((resolved.drone.pos.x - anchor.x).toFixed(3)),
            Number((resolved.drone.pos.y - anchor.y).toFixed(3)),
            Number((resolved.drone.pos.z - anchor.z).toFixed(3))
        ] : null
    };
    reportCameraBridgeDebug('H5', 'Camera CV frame request returned structured payload', {
        droneId: id,
        towerId: resolved.tower?.uuid ?? null,
        payloadKeys: Object.keys(payload)
    });
    return payload;
}

export function captureDroneCameraFrameDataUrl(id: string) {
    return captureDroneCameraFrameImageDataUrl(id);
}

