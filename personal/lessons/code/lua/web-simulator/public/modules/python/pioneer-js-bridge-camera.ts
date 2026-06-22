import * as THREE from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { envGroup } from '../environment/index.js';
import { droneMeshes, renderer as mainRenderer, scene } from '../scene/core/scene-init.js';
import { getDroneOrDefault } from './runtime-shared.js';

const VIDEO_TOWER_TYPE = 'Видеомачта';
const DEFAULT_VIDEO_TOWER_CONNECT_RADIUS = 8;
const VIDEO_TOWER_STREAM_MAX_DISTANCE = 12;

const cameraConnectionsByDrone: Record<string, { towerId: string; connectedAt: number }> = {};
let captureRenderer: WebGLRenderer | null = null;

function reportCameraBridgeDebug(hypothesisId: string, message: string, data: Record<string, unknown>) {
    // #region debug-point camera-bridge-browser
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
    // #endregion
}

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

function getRendererCanvas(): HTMLCanvasElement | null {
    const canvas = mainRenderer?.domElement;
    if (canvas instanceof HTMLCanvasElement) return canvas;
    return document.querySelector('#canvas-container canvas');
}

function syncCaptureRendererSize(renderer: WebGLRenderer) {
    const sourceCanvas = getRendererCanvas();
    const width = Math.max(1, sourceCanvas?.width || sourceCanvas?.clientWidth || 640);
    const height = Math.max(1, sourceCanvas?.height || sourceCanvas?.clientHeight || 360);
    renderer.setSize(width, height, false);
}

function ensureCaptureRenderer() {
    if (captureRenderer) {
        syncCaptureRendererSize(captureRenderer);
        return captureRenderer;
    }

    const canvas = document.createElement('canvas');
    captureRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    captureRenderer.shadowMap.enabled = true;
    captureRenderer.outputColorSpace = THREE.SRGBColorSpace;
    captureRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    captureRenderer.toneMappingExposure = 1.18;
    syncCaptureRendererSize(captureRenderer);
    return captureRenderer;
}

function getDroneFpvCamera(droneId: string): PerspectiveCamera | null {
    const mesh = droneMeshes[droneId];
    if (!mesh) return null;
    return mesh.getObjectByName('fpv_camera') as PerspectiveCamera | null;
}

function renderDroneFpvFrame(droneId: string): HTMLCanvasElement | null {
    const renderer = ensureCaptureRenderer();
    const fpvCamera = getDroneFpvCamera(droneId);
    const droneMesh = droneMeshes[droneId];
    if (!renderer || !scene || !fpvCamera || !droneMesh) {
        return null;
    }

    syncCaptureRendererSize(renderer);
    const canvas = renderer.domElement;
    fpvCamera.aspect = Math.max(1, canvas.width) / Math.max(1, canvas.height);
    fpvCamera.updateProjectionMatrix();

    droneMesh.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);

    const previousVisibility = droneMesh.visible;
    droneMesh.visible = false;
    try {
        renderer.render(scene, fpvCamera);
    } finally {
        droneMesh.visible = previousVisibility;
    }
    return canvas;
}

export function closeDroneCameraConnection(id: string) {
    delete cameraConnectionsByDrone[id];
    return null;
}

export function connectDroneCamera(id: string) {
    const drone = getDroneOrDefault(id);
    const match = findClosestVideoTower(drone);
    if (!match) {
        reportCameraBridgeDebug('H3', 'Camera connect failed because no video tower is in range', {
            droneId: id,
            dronePosition: { ...drone.pos },
            availableTowerCount: getVideoTowerObjects().length
        });
        return false;
    }
    cameraConnectionsByDrone[id] = {
        towerId: match.tower.uuid,
        connectedAt: performance.now()
    };
    reportCameraBridgeDebug('H3', 'Camera connected to video tower', {
        droneId: id,
        towerId: match.tower.uuid,
        towerName: match.tower.name || VIDEO_TOWER_TYPE,
        distance: Number(match.distance.toFixed(3))
    });
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
    if (!resolved) {
        reportCameraBridgeDebug('H3', 'Camera frame request returned null because no active tower connection exists', {
            droneId: id,
            activeConnection: Boolean(cameraConnectionsByDrone[id]),
            availableTowerCount: getVideoTowerObjects().length
        });
        return null;
    }
    const payload = {
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
    };
    reportCameraBridgeDebug('H4', 'Camera frame request returned encoded payload', {
        droneId: id,
        towerId: resolved.tower.uuid,
        payloadKeys: Object.keys(payload)
    });
    return encodeFramePayload(payload);
}

export function getDroneCameraCvFrame(id: string) {
    const resolved = resolveConnectedVideoTower(id);
    if (!resolved) {
        reportCameraBridgeDebug('H3', 'Camera CV frame request returned null because no active tower connection exists', {
            droneId: id,
            activeConnection: Boolean(cameraConnectionsByDrone[id]),
            availableTowerCount: getVideoTowerObjects().length
        });
        return null;
    }
    const anchor = getTowerStreamAnchor(resolved.tower);
    const payload = {
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
    reportCameraBridgeDebug('H5', 'Camera CV frame request returned structured payload', {
        droneId: id,
        towerId: resolved.tower.uuid,
        payloadKeys: Object.keys(payload)
    });
    return payload;
}

export function captureDroneCameraFrameDataUrl(id: string) {
    const resolved = resolveConnectedVideoTower(id);
    if (!resolved) return null;
    const canvas = renderDroneFpvFrame(id);
    if (!canvas) {
        reportCameraBridgeDebug('H5', 'FPV frame capture failed because render dependencies are unavailable', {
            droneId: id,
            hasScene: Boolean(scene),
            hasMesh: Boolean(droneMeshes[id]),
            hasFpvCamera: Boolean(getDroneFpvCamera(id))
        });
        return null;
    }
    return canvas.toDataURL('image/jpeg', 0.72);
}

