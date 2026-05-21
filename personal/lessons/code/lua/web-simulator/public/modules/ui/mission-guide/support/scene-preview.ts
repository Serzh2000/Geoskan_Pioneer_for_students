import { controls, onWindowResize, renderer } from '../../../scene/core/scene-init.js';
import { log } from '../../../shared/logging/logger.js';

let previewActive = false;
let originalParent: ParentNode | null = null;
let originalNextSibling: ChildNode | null = null;
let cachedSceneContainer: HTMLDivElement | null = null;
let previewGestureCleanup: (() => void) | null = null;
let originalCameraMode: string | null = null;
let lastPreviewGestureLogAt = 0;

function debugPreviewZoom(message: string, force = false): void {
    const now = Date.now();
    if (!force && now - lastPreviewGestureLogAt < 250) return;
    lastPreviewGestureLogAt = now;
    log(`[GUIDE-PREVIEW] ${message}`, 'info');
    console.info('[GUIDE-PREVIEW]', message);
}

function getSceneContainer(): HTMLDivElement | null {
    if (cachedSceneContainer) {
        return cachedSceneContainer;
    }

    cachedSceneContainer = document.querySelector('.scene-container') as HTMLDivElement | null;
    return cachedSceneContainer;
}

function getPreviewHost(): HTMLDivElement | null {
    return document.getElementById('mission-guide-scene-preview-host') as HTMLDivElement | null;
}

function resizeSceneSoon(): void {
    window.requestAnimationFrame(() => {
        onWindowResize();
    });
}

function installPreviewGestureGuards(previewHost: HTMLDivElement, sceneContainer: HTMLDivElement): void {
    previewGestureCleanup?.();

    const canvasContainer = sceneContainer.querySelector('#canvas-container') as HTMLDivElement | null;
    const wheelTarget: EventTarget = canvasContainer ?? sceneContainer;
    const gestureTargets: EventTarget[] = [previewHost, sceneContainer];
    const pointerTargets: EventTarget[] = [previewHost, sceneContainer];
    if (canvasContainer) {
        gestureTargets.push(canvasContainer);
        pointerTargets.push(canvasContainer);
    }

    const getRendererHitState = (event: Event) => {
        const eventTarget = event.target as HTMLElement | null;
        const rendererElement = renderer?.domElement ?? null;
        const hitsRendererCanvas = Boolean(rendererElement && eventTarget && rendererElement.contains(eventTarget));
        return { eventTarget, hitsRendererCanvas };
    };

    const preventWheelDefault = (event: Event) => {
        if (!previewActive) return;
        const wheelEvent = event as WheelEvent;
        const { eventTarget, hitsRendererCanvas } = getRendererHitState(event);
        debugPreviewZoom(
            `wheel captured ctrl=${String(wheelEvent.ctrlKey)} deltaY=${wheelEvent.deltaY.toFixed(2)} target=${eventTarget?.id || eventTarget?.className || 'unknown'} hitsCanvas=${String(hitsRendererCanvas)} controlsEnabled=${String(controls?.enabled)}`
        );
        event.preventDefault();

        // В preview трекпадный pinch/wheel часто прилетает в overlay внутри canvas-container
        // (например, print bubbles), а не в сам renderer canvas. В таком случае
        // прокидываем жест в orbit controls вручную.
        if (!hitsRendererCanvas && controls?.enabled) {
            debugPreviewZoom(
                `forward wheel to controls deltaY=${wheelEvent.deltaY.toFixed(2)} ctrl=${String(wheelEvent.ctrlKey)} target=${eventTarget?.id || eventTarget?.className || 'unknown'}`,
                true
            );
            controls.onWheel(wheelEvent);
        }
    };

    const forwardPointerToControls = (event: Event) => {
        if (!previewActive) return;
        if (!(event instanceof PointerEvent)) return;
        const { eventTarget, hitsRendererCanvas } = getRendererHitState(event);
        if (hitsRendererCanvas || !controls?.enabled) return;

        const targetLabel = eventTarget?.id || eventTarget?.className || eventTarget?.tagName || 'unknown';
        if (event.type === 'pointerdown') {
            debugPreviewZoom(`forward pointerdown button=${event.button} target=${targetLabel}`, true);
            controls.onPointerDown(event);
            return;
        }
        if (event.type === 'pointermove') {
            controls.onPointerMove(event);
            return;
        }
        if (event.type === 'pointerup') {
            debugPreviewZoom(`forward pointerup button=${event.button} target=${targetLabel}`, true);
            controls.onPointerUp(event);
        }
    };

    const preventGestureDefault = (event: Event) => {
        if (!previewActive) return;
        debugPreviewZoom(`gesture event ${event.type}`);
        event.preventDefault();
    };

    wheelTarget.addEventListener('wheel', preventWheelDefault, { passive: false, capture: true });
    gestureTargets.forEach((target) => {
        target.addEventListener('gesturestart', preventGestureDefault, { passive: false });
        target.addEventListener('gesturechange', preventGestureDefault, { passive: false });
        target.addEventListener('gestureend', preventGestureDefault, { passive: false });
    });
    pointerTargets.forEach((target) => {
        target.addEventListener('pointerdown', forwardPointerToControls, { capture: true });
        target.addEventListener('pointermove', forwardPointerToControls, { capture: true });
        target.addEventListener('pointerup', forwardPointerToControls, { capture: true });
    });

    previewGestureCleanup = () => {
        wheelTarget.removeEventListener('wheel', preventWheelDefault, { capture: true });
        gestureTargets.forEach((target) => {
            target.removeEventListener('gesturestart', preventGestureDefault);
            target.removeEventListener('gesturechange', preventGestureDefault);
            target.removeEventListener('gestureend', preventGestureDefault);
        });
        pointerTargets.forEach((target) => {
            target.removeEventListener('pointerdown', forwardPointerToControls, { capture: true });
            target.removeEventListener('pointermove', forwardPointerToControls, { capture: true });
            target.removeEventListener('pointerup', forwardPointerToControls, { capture: true });
        });
        previewGestureCleanup = null;
    };
}

export function isMissionGuideScenePreviewActive(): boolean {
    return previewActive;
}

export function setMissionGuideScenePreviewActive(active: boolean): void {
    previewActive = active;
}

export function mountMissionGuideScenePreview(): void {
    if (!previewActive) return;

    const sceneContainer = getSceneContainer();
    const previewHost = getPreviewHost();
    if (!sceneContainer || !previewHost) return;

    if (!originalParent) {
        originalParent = sceneContainer.parentNode;
        originalNextSibling = sceneContainer.nextSibling;
    }

    if (sceneContainer.parentElement !== previewHost) {
        previewHost.appendChild(sceneContainer);
    }

    sceneContainer.classList.add('scene-container--guide-preview');
    if (originalCameraMode === null) {
        originalCameraMode = typeof (window as any).cameraMode === 'string' ? (window as any).cameraMode : 'free';
    }
    (window as any).setCameraMode?.('free');
    debugPreviewZoom(
        `preview mounted previousMode=${String(originalCameraMode)} currentMode=${String((window as any).cameraMode)} controlsEnabled=${String((window as any).controls?.enabled)} canvas=${String(Boolean(sceneContainer.querySelector('#canvas-container')))} sceneParent=guide-preview`,
        true
    );

    installPreviewGestureGuards(previewHost, sceneContainer);
    previewHost.classList.add('is-active');
    resizeSceneSoon();
}

export function restoreMissionGuideScenePreview(): void {
    const sceneContainer = getSceneContainer();

    previewGestureCleanup?.();
    sceneContainer?.classList.remove('scene-container--guide-preview');
    if (originalCameraMode) {
        (window as any).setCameraMode?.(originalCameraMode);
    }
    debugPreviewZoom(
        `preview restored mode=${String((window as any).cameraMode)} controlsEnabled=${String((window as any).controls?.enabled)}`,
        true
    );
    originalCameraMode = null;

    if (sceneContainer && originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
            originalParent.insertBefore(sceneContainer, originalNextSibling);
        } else {
            originalParent.appendChild(sceneContainer);
        }
    }

    originalParent = null;
    originalNextSibling = null;
    cachedSceneContainer = sceneContainer;
    previewActive = false;
    resizeSceneSoon();
}
