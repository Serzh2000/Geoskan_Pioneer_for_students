import { getDroneOrDefault } from './runtime-shared.js';
import {
    captureDroneCameraFrameDataUrl as captureDroneCameraFrameImageDataUrl,
    captureDroneCameraFramePixels,
    type CameraFramePixels
} from './pioneer-js-bridge-camera-render.js';
import {
    cameraConnectionsByDrone,
    findClosestVideoTower,
    getVideoTowerObjects,
    reportCameraBridgeDebug,
    resolveConnectedCameraFeed
} from './pioneer-js-bridge-camera-shared.js';
import { OBJECT_TYPE } from '../shared/object-types.js';

const VIDEO_TOWER_TYPE = OBJECT_TYPE.VIDEO_TOWER;

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

function reportMissingFeed(id: string, hypothesisId: string, message: string) {
    reportCameraBridgeDebug(hypothesisId, message, {
        droneId: id,
        activeConnection: Boolean(cameraConnectionsByDrone[id]),
        availableTowerCount: getVideoTowerObjects().length
    });
}

// dataURL несёт картинку в base64; настоящему SDK по UDP приходят те же самые байты JPEG,
// поэтому раскодировать их обратно в бинарь — единственный способ отдать в Python
// честный кадр с маркерами FFD8/FFD9, а не описание кадра.
function decodeDataUrlToBytes(dataUrl: string): Uint8Array | null {
    const separator = dataUrl.indexOf(',');
    if (separator < 0) return null;

    const binary = atob(dataUrl.slice(separator + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function getDroneCameraFrame(id: string): Uint8Array | null {
    const dataUrl = captureDroneCameraFrameImageDataUrl(id);
    if (!dataUrl) {
        reportMissingFeed(id, 'H3', 'Camera frame request returned null because no frame could be captured');
        return null;
    }

    const bytes = decodeDataUrlToBytes(dataUrl);
    if (!bytes || bytes.length === 0) {
        reportMissingFeed(id, 'H4', 'Camera frame request returned null because the captured data URL was malformed');
        return null;
    }

    reportCameraBridgeDebug('H4', 'Camera frame request returned raw JPEG bytes', {
        droneId: id,
        byteLength: bytes.length
    });
    return bytes;
}

export function getDroneCameraCvFrame(id: string): CameraFramePixels | null {
    const pixels = captureDroneCameraFramePixels(id);
    if (!pixels) {
        reportMissingFeed(id, 'H3', 'Camera CV frame request returned null because no frame could be captured');
        return null;
    }

    reportCameraBridgeDebug('H5', 'Camera CV frame request returned decoded BGR pixels', {
        droneId: id,
        width: pixels.width,
        height: pixels.height,
        byteLength: pixels.data.length
    });
    return pixels;
}

export function captureDroneCameraFrameDataUrl(id: string) {
    return captureDroneCameraFrameImageDataUrl(id);
}

