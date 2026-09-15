import * as THREE from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { droneMeshes, scene } from '../scene/core/scene-init.js';
import { reportCameraBridgeDebug, resolveConnectedCameraFeed } from './pioneer-js-bridge-camera-shared.js';

// У железной камеры разрешение своё и постоянное, оно не зависит от того, какого размера
// окно у оператора. Раньше кадр подстраивался под основной canvas, и frame.shape менялся
// от раскладки панелей — код ученика с обращением к cv[240][320] ломался на узком окне.
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 360;
// 100 -> 33: этот кэш годами держал реальный потолок кадров в get_frame()/get_cv_frame()
// (внутрибраузерный Python) и во внешнем мосте (server/mavlink-bridge.ts,
// CAMERA_FRAME_INTERVAL_MS, снижен туда же и по той же причине) на 10 кадрах/с, хотя сам
// рендер+JPEG-кодирование измерены в пределах ~17мс на синтетическом кадре (реальные
// кадры дешевле) — то есть реальный потолок по стоимости рендера заметно выше 10 к/с.
const FRAME_CACHE_INTERVAL_MS = 33;

export type CameraFramePixels = {
    width: number;
    height: number;
    // Порядок каналов BGR и три байта на пиксель — ровно то, что настоящий cv2.imdecode
    // отдаёт из JPEG'а реальной камеры, поэтому индексация кадра в Python совпадает с железом.
    data: Uint8Array;
};

type FrameCacheEntry = {
    capturedAt: number;
    dataUrl: string | null;
    pixels: CameraFramePixels | null;
};

let captureRenderer: WebGLRenderer | null = null;
let pixelReadCanvas: HTMLCanvasElement | null = null;
const frameCacheByDrone = new Map<string, FrameCacheEntry>();

function syncCaptureRendererSize(renderer: WebGLRenderer) {
    renderer.setSize(CAPTURE_WIDTH, CAPTURE_HEIGHT, false);
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

// WebGL-канвас не отдаёт getImageData, поэтому кадр переносится в 2D-контекст: заодно
// строки приходят сверху вниз, а не снизу вверх, как это делает сырой gl.readPixels.
function readCanvasBgrPixels(canvas: HTMLCanvasElement): CameraFramePixels | null {
    const width = Math.max(1, canvas.width);
    const height = Math.max(1, canvas.height);

    if (!pixelReadCanvas) {
        pixelReadCanvas = document.createElement('canvas');
    }
    if (pixelReadCanvas.width !== width || pixelReadCanvas.height !== height) {
        pixelReadCanvas.width = width;
        pixelReadCanvas.height = height;
    }

    const context = pixelReadCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.clearRect(0, 0, width, height);
    context.drawImage(canvas, 0, 0);
    const rgba = context.getImageData(0, 0, width, height).data;

    const bgr = new Uint8Array(width * height * 3);
    for (let src = 0, dst = 0; dst < bgr.length; src += 4, dst += 3) {
        bgr[dst] = rgba[src + 2];
        bgr[dst + 1] = rgba[src + 1];
        bgr[dst + 2] = rgba[src];
    }
    return { width, height, data: bgr };
}

function readFreshCacheEntry(id: string): FrameCacheEntry | null {
    const cached = frameCacheByDrone.get(id);
    if (!cached) return null;
    return Date.now() - cached.capturedAt < FRAME_CACHE_INTERVAL_MS ? cached : null;
}

// Кадр берётся только у камеры, которая реально к чему-то подключена: это тот же
// признак «нет сигнала», из-за которого настоящий SDK возвращает None.
function captureFreshFpvCanvas(id: string): HTMLCanvasElement | null {
    if (!resolveConnectedCameraFeed(id)) return null;

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
    return canvas;
}

export function captureDroneCameraFrameDataUrl(id: string): string | null {
    const cached = readFreshCacheEntry(id);
    if (cached?.dataUrl) return cached.dataUrl;

    const canvas = captureFreshFpvCanvas(id);
    if (!canvas) return null;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    frameCacheByDrone.set(id, { capturedAt: Date.now(), dataUrl, pixels: null });
    return dataUrl;
}

export function captureDroneCameraFramePixels(id: string): CameraFramePixels | null {
    const cached = readFreshCacheEntry(id);
    if (cached?.pixels) return cached.pixels;

    const canvas = captureFreshFpvCanvas(id);
    if (!canvas) return null;

    const pixels = readCanvasBgrPixels(canvas);
    if (!pixels) return null;

    frameCacheByDrone.set(id, { capturedAt: Date.now(), dataUrl: null, pixels });
    return pixels;
}
