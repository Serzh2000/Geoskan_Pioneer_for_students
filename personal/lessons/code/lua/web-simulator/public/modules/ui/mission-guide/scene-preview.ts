import { onWindowResize } from '../../scene/core/scene-init.js';

let previewActive = false;
let originalParent: ParentNode | null = null;
let originalNextSibling: ChildNode | null = null;

function getSceneContainer(): HTMLDivElement | null {
    return document.querySelector('.scene-container') as HTMLDivElement | null;
}

function getPreviewHost(): HTMLDivElement | null {
    return document.getElementById('mission-guide-scene-preview-host') as HTMLDivElement | null;
}

function resizeSceneSoon(): void {
    window.requestAnimationFrame(() => {
        onWindowResize();
    });
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

    previewHost.classList.add('is-active');
    resizeSceneSoon();
}

export function restoreMissionGuideScenePreview(): void {
    const sceneContainer = getSceneContainer();

    if (sceneContainer && originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
            originalParent.insertBefore(sceneContainer, originalNextSibling);
        } else {
            originalParent.appendChild(sceneContainer);
        }
    }

    originalParent = null;
    originalNextSibling = null;
    previewActive = false;
    resizeSceneSoon();
}
