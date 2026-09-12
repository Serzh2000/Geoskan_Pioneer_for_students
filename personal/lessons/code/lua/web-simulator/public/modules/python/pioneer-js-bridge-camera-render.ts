import * as THREE from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { droneMeshes, renderer as mainRenderer, scene } from '../scene/core/scene-init.js';
import { reportCameraBridgeDebug, resolveConnectedCameraFeed } from './pioneer-js-bridge-camera-shared.js';

const DEFAULT_CAPTURE_WIDTH = 640;
const DEFAULT_CAPTURE_HEIGHT = 360;
const MAX_CAPTURE_WIDTH = 640;
const MAX_CAPTURE_HEIGHT = 360;
const FRAME_CACHE_INTERVAL_MS = 100;

let captureRenderer: WebGLRenderer | null = null;
const frameCacheByDrone = new Map<string, { dataUrl: string; capturedAt: number }>();

function getRendererCanvas(): HTMLCanvasElement | null {
    const canvas = mainRenderer?.domElement;
    if (canvas instanceof HTMLCanvasElement) return canvas;
    return document.querySelector('#canvas-container canvas');
}

function syncCaptureRendererSize(renderer: WebGLRenderer) {
    const sourceCanvas = getRendererCanvas();
    let width = Math.max(1, sourceCanvas?.width || sourceCanvas?.clientWidth || DEFAULT_CAPTURE_WIDTH);
    let height = Math.max(1, sourceCanvas?.height || sourceCanvas?.clientHeight || DEFAULT_CAPTURE_HEIGHT);
    const aspect = width / height;
    if (!Number.isFinite(aspect) || aspect <= 0) {
        width = DEFAULT_CAPTURE_WIDTH;
        height = DEFAULT_CAPTURE_HEIGHT;
    } else if (width > MAX_CAPTURE_WIDTH || height > MAX_CAPTURE_HEIGHT) {
        const scale = Math.min(MAX_CAPTURE_WIDTH / width, MAX_CAPTURE_HEIGHT / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
    }
    renderer.setSize(width, height, false);
}

function ensureCaptureRenderer() {
    if (captureRenderer) {
        syncCaptureRendererSize(captureRenderer);
        return captureRenderer;
    }

    const canvas = document.createElement('canvas');
    captureRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
    captureRenderer.shadowMap.enabled = false;
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

export function captureDroneCameraFrameDataUrl(id: string) {
    const resolved = resolveConnectedCameraFeed(id);
    if (!resolved) return null;

    const now = Date.now();
    const cachedFrame = frameCacheByDrone.get(id);
    if (cachedFrame && now - cachedFrame.capturedAt < FRAME_CACHE_INTERVAL_MS) {
        return cachedFrame.dataUrl;
    }

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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    frameCacheByDrone.set(id, { dataUrl, capturedAt: now });
    return dataUrl;
}
