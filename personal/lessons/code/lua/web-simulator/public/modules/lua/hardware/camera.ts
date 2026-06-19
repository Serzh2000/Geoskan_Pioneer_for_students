import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { getDroneFromLua } from '../../core/state.js';
import { log } from '../../shared/logging/logger.js';
import { droneMeshes, renderer as mainRenderer, scene } from '../../scene/core/scene-init.js';

declare const THREE: any;

type CameraCaptureState = {
    shotPending: boolean;
    isRecording: boolean;
    mediaRecorder: MediaRecorder | null;
    mediaStream: MediaStream | null;
    videoChunks: BlobPart[];
    captureRenderer: WebGLRenderer | null;
    captureFrameId: number | null;
    recordingDroneId: string | null;
};

const cameraCaptureState: CameraCaptureState = {
    shotPending: false,
    isRecording: false,
    mediaRecorder: null,
    mediaStream: null,
    videoChunks: [],
    captureRenderer: null,
    captureFrameId: null,
    recordingDroneId: null
};

function buildTimestampSlug() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

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

function getRendererCanvas(): HTMLCanvasElement | null {
    const canvas = mainRenderer?.domElement;
    if (canvas instanceof HTMLCanvasElement) return canvas;
    return document.querySelector('#canvas-container canvas');
}

function syncCaptureRendererSize(captureRenderer: WebGLRenderer) {
    const sourceCanvas = getRendererCanvas();
    const width = Math.max(1, sourceCanvas?.width || sourceCanvas?.clientWidth || 1280);
    const height = Math.max(1, sourceCanvas?.height || sourceCanvas?.clientHeight || 720);
    captureRenderer.setSize(width, height, false);
}

function ensureCaptureRenderer() {
    if (cameraCaptureState.captureRenderer) {
        syncCaptureRendererSize(cameraCaptureState.captureRenderer);
        return cameraCaptureState.captureRenderer;
    }

    const canvas = document.createElement('canvas');
    const captureRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    captureRenderer.shadowMap.enabled = true;
    captureRenderer.outputColorSpace = THREE.SRGBColorSpace;
    captureRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    captureRenderer.toneMappingExposure = 1.18;
    syncCaptureRendererSize(captureRenderer);
    cameraCaptureState.captureRenderer = captureRenderer;
    return captureRenderer;
}

function getDroneFpvCamera(droneId: string): PerspectiveCamera | null {
    const mesh = droneMeshes[droneId];
    if (!mesh) return null;
    return mesh.getObjectByName('fpv_camera') as PerspectiveCamera | null;
}

function renderFpvFrame(droneId: string) {
    const captureRenderer = ensureCaptureRenderer();
    const fpvCamera = getDroneFpvCamera(droneId);
    const droneMesh = droneMeshes[droneId];

    if (!scene || !fpvCamera || !droneMesh) {
        throw new Error('FPV-камера дрона недоступна.');
    }

    syncCaptureRendererSize(captureRenderer);

    const canvas = captureRenderer.domElement;
    fpvCamera.aspect = Math.max(1, canvas.width) / Math.max(1, canvas.height);
    fpvCamera.updateProjectionMatrix();

    droneMesh.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);

    const previousVisibility = droneMesh.visible;
    droneMesh.visible = false;
    try {
        captureRenderer.render(scene, fpvCamera);
    } finally {
        droneMesh.visible = previousVisibility;
    }

    return canvas;
}

function stopCaptureRenderLoop() {
    if (cameraCaptureState.captureFrameId !== null) {
        window.cancelAnimationFrame(cameraCaptureState.captureFrameId);
        cameraCaptureState.captureFrameId = null;
    }
}

function startCaptureRenderLoop(droneId: string) {
    stopCaptureRenderLoop();

    const renderTick = () => {
        cameraCaptureState.captureFrameId = window.requestAnimationFrame(renderTick);
        try {
            renderFpvFrame(droneId);
        } catch (error) {
            stopCaptureRenderLoop();
            const message = error instanceof Error ? error.message : String(error);
            log(`Camera: Остановлена FPV-запись, ошибка рендера: ${message}`, 'error');
        }
    };

    renderTick();
}

function getVideoMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';

    const preferredMimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm'
    ];

    return preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

async function downloadCanvasShot(droneId: string, fileName: string) {
    const canvas = renderFpvFrame(droneId);

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value: Blob | null) => {
            if (value) resolve(value);
            else reject(new Error('Не удалось создать PNG из canvas.'));
        }, 'image/png');
    });

    triggerBrowserDownload(fileName, blob);
}

export const camera_requestMakeShot = function(L: any) {
    const drone = getDroneFromLua(L);
    if (cameraCaptureState.shotPending) {
        log(`Camera: Снимок уже создается для ${drone.id}`, 'warn');
        return 0;
    }

    cameraCaptureState.shotPending = true;
    log(`Camera: Запрос снимка для ${drone.id}`, 'info');
    if (window.scene && window.droneMesh) {
        const flash = new THREE.PointLight(0xffffff, 2, 10);
        flash.position.copy(window.droneMesh.position).add(new THREE.Vector3(0, 0, 0.2));
        window.scene.add(flash);
        setTimeout(() => window.scene.remove(flash), 100);
    }

    const fileName = `pioneer-shot-${drone.id}-${buildTimestampSlug()}.png`;
    window.requestAnimationFrame(() => {
        void downloadCanvasShot(drone.id, fileName)
            .then(() => {
                log(`Camera: Снимок сохранен как ${fileName}`, 'success');
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                log(`Camera: Не удалось сохранить снимок: ${message}`, 'error');
            })
            .finally(() => {
                cameraCaptureState.shotPending = false;
            });
    });

    return 0;
};

export const camera_checkRequestShot = function(L: any) {
    window.fengari.lua.lua_pushinteger(L, cameraCaptureState.shotPending ? 0 : 1);
    return 1;
};

export const camera_requestRecordStart = function(L: any) {
    const drone = getDroneFromLua(L);
    if (cameraCaptureState.isRecording) {
        log(`Camera: Запись уже идет для ${drone.id}`, 'warn');
        return 0;
    }

    if (typeof MediaRecorder === 'undefined') {
        log('Camera: MediaRecorder не поддерживается в этом браузере.', 'error');
        return 0;
    }

    const captureRenderer = ensureCaptureRenderer();
    const captureStream = captureRenderer.domElement.captureStream?.bind(captureRenderer.domElement);
    if (!captureStream) {
        log('Camera: captureStream не поддерживается для canvas.', 'error');
        return 0;
    }

    const mimeType = getVideoMimeType();
    renderFpvFrame(drone.id);
    const mediaStream = captureStream.call(captureRenderer.domElement, 30);
    const mediaRecorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType })
        : new MediaRecorder(mediaStream);

    cameraCaptureState.mediaRecorder = mediaRecorder;
    cameraCaptureState.mediaStream = mediaStream;
    cameraCaptureState.videoChunks = [];
    cameraCaptureState.isRecording = true;
    cameraCaptureState.recordingDroneId = drone.id;

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
            cameraCaptureState.videoChunks.push(event.data);
        }
    };

    mediaRecorder.onerror = (event: Event) => {
        const recorderError = (event as ErrorEvent).error;
        log(`Camera: Ошибка записи видео: ${recorderError?.message || 'неизвестная ошибка'}`, 'error');
    };

    mediaRecorder.onstop = () => {
        const extension = (mediaRecorder.mimeType || mimeType || 'video/webm').includes('mp4') ? 'mp4' : 'webm';
        const blobType = mediaRecorder.mimeType || mimeType || 'video/webm';
        const fileName = `pioneer-video-${drone.id}-${buildTimestampSlug()}.${extension}`;

        try {
            const blob = new Blob(cameraCaptureState.videoChunks, { type: blobType });
            if (blob.size > 0) {
                triggerBrowserDownload(fileName, blob);
                log(`Camera: Видео сохранено как ${fileName}`, 'success');
            } else {
                log('Camera: Видео не сохранено, запись получилась пустой.', 'warn');
            }
        } finally {
            stopCaptureRenderLoop();
            cameraCaptureState.mediaStream?.getTracks().forEach((track) => track.stop());
            cameraCaptureState.mediaRecorder = null;
            cameraCaptureState.mediaStream = null;
            cameraCaptureState.videoChunks = [];
            cameraCaptureState.isRecording = false;
            cameraCaptureState.recordingDroneId = null;
        }
    };

    mediaRecorder.start();
    startCaptureRenderLoop(drone.id);
    log(`Camera: Старт записи видео для ${drone.id}`, 'info');
    return 0;
};

export const camera_requestRecordStop = function(L: any) {
    const drone = getDroneFromLua(L);
    const mediaRecorder = cameraCaptureState.mediaRecorder;
    if (!cameraCaptureState.isRecording || !mediaRecorder) {
        log(`Camera: Нет активной записи для остановки у ${drone.id}`, 'warn');
        return 0;
    }

    log(`Camera: Стоп записи видео для ${drone.id}`, 'info');
    mediaRecorder.stop();
    return 0;
};

export const camera_checkRequestRecord = function(L: any) {
    window.fengari.lua.lua_pushinteger(L, cameraCaptureState.isRecording ? 1 : 0);
    return 1;
};
