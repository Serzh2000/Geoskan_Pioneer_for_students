import { getDroneOrDefault } from './runtime-shared.js';
import { log } from '../shared/logging/logger.js';
import {
    captureDroneCameraFrameBlob,
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
// Возвращаемый тип сужен до Uint8Array<ArrayBuffer> (а не ArrayBufferLike):
// такие байты кладутся в Blob при сохранении снимка (downloadDroneCameraPhoto),
// а BlobPart не принимает буфер, который мог бы оказаться SharedArrayBuffer.
function decodeDataUrlToBytes(dataUrl: string): Uint8Array<ArrayBuffer> | null {
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

export { captureDroneCameraFrameBlob };

function buildTimestampSlug() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

// Копия triggerBrowserDownload() из modules/lua/hardware/camera.ts, а не общий
// хелпер: Lua-модуль тянет за собой fengari и три предмета сцены, и импорт его
// ради шести строк втащил бы весь Lua-рантайм в Python-мост. Сам приём
// (createObjectURL + <a download> + revokeObjectURL) — единственный способ
// отдать файл из браузера, поэтому совпадение здесь неизбежно, а не случайно.
function triggerBrowserDownload(fileName: string, blob: Blob) {
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// «Сохранить снимок» со стороны Python. До этого способа сохранить кадр из
// Pyodide не было вовсе: файловая система Pyodide живёт в памяти вкладки и
// ученику недоступна, а cv2.imwrite из официального примера здесь заглушка
// (pioneer-sdk-cv-prelude.ts, `cv2.imwrite = lambda *a, **k: True`). Значит,
// единственный честный аналог «файл сохранён» — та же загрузка браузером,
// которую делает Lua-таргет.
//
// Кадр берётся тем же captureDroneCameraFrameDataUrl(), что и get_frame(), и
// попадает в тот же 100-мс кеш (pioneer-js-bridge-camera-render.ts): вызов
// сразу после get_frame() скачивает БУКВАЛЬНО тот кадр, который получила
// программа ученика, а не следующий.
export function downloadDroneCameraPhoto(id: string): boolean {
    const dataUrl = captureDroneCameraFrameImageDataUrl(id);
    if (!dataUrl) {
        reportMissingFeed(id, 'H3', 'Camera photo download skipped because no frame could be captured');
        log('Camera: Не удалось сохранить снимок: нет кадра с камеры.', 'error');
        return false;
    }

    const bytes = decodeDataUrlToBytes(dataUrl);
    if (!bytes || bytes.length === 0) {
        reportMissingFeed(id, 'H4', 'Camera photo download skipped because the captured data URL was malformed');
        log('Camera: Не удалось сохранить снимок: кадр повреждён.', 'error');
        return false;
    }

    const fileName = `pioneer-shot-${id}-${buildTimestampSlug()}.jpg`;
    triggerBrowserDownload(fileName, new Blob([bytes], { type: 'image/jpeg' }));
    log(`Camera: Снимок сохранен как ${fileName}`, 'success');
    return true;
}

