import * as THREE from 'three';
import { createSceneObjectByType } from '../../environment/index.js';
import type { SceneObjectOptions } from '../../environment/obstacles.js';
import { log } from '../../shared/logging/logger.js';
import { disposeObjectHierarchyResources } from '../../scene/objects/object-manager-support.js';
import { parsePointsText } from '../../scene/objects/object-catalog.js';
import { getSceneTypePreviewConfig, readAddSceneObjectDraft } from './support.js';
import type { SceneManagerDomRefs } from './types.js';
import { fitPreviewCameraToObject } from './type-preview/camera.js';
import { PREVIEW_FALLBACK_MESSAGE, renderPreviewFallback } from './type-preview/fallback.js';
import { createPreviewGround, getPreviewTheme, type PreviewTheme } from './type-preview/theme.js';

function getPreviewObjectOptions(elements: SceneManagerDomRefs, previewType: string): SceneObjectOptions {
    const draft = readAddSceneObjectDraft(elements);
    const points = draft.options.pointsText ? parsePointsText(draft.options.pointsText) : undefined;

    return {
        ...draft.options,
        value: draft.options.value || (previewType === 'start-position' ? '1' : previewType.includes('tag') || previewType.includes('aruco') ? '17' : undefined),
        floors: draft.options.floors ?? (previewType === 'building' ? 9 : undefined),
        points,
        markerMap: draft.options.markerMap || (
            previewType === 'aruco-map' || previewType === 'apriltag-map'
                ? {
                    rows: 3,
                    columns: 3,
                    startId: 0,
                    idStep: 1,
                    markerSize: 0.8,
                    rotationDeg: 0,
                    gapX: 0.15,
                    gapY: 0.15,
                    traversal: 'row-major',
                    startCorner: 'top-left',
                    anchor: 'center',
                    snake: false
                }
                : undefined
        )
    };
}

export type SceneTypePreviewController = {
    sync: () => void;
    show: () => void;
    hide: () => void;
    showSelected: () => void;
    showForType: (type: string, label?: string) => void;
    destroy: () => void;
};

function createNoopPreviewController(): SceneTypePreviewController {
    return {
        sync() {},
        show() {},
        hide() {},
        showSelected() {},
        showForType() {},
        destroy() {}
    };
}

export function initSceneTypePreview(elements: SceneManagerDomRefs): SceneTypePreviewController {
    const host = elements.addTypeModalPreviewViewportEl;
    const popup = elements.addTypeModalPreviewEl;

    if (!host || !popup || !elements.addTypeEl) {
        return createNoopPreviewController();
    }

    const scene = new THREE.Scene();
    let activeTheme: PreviewTheme = getPreviewTheme();
    scene.background = new THREE.Color(activeTheme === 'dark' ? 0x0f172a : 0xf8f9fa);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    camera.up.set(0, 0, 1);

    let renderer: THREE.WebGLRenderer | null = null;
    let isRendererAvailable = false;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = false;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.replaceChildren(renderer.domElement);
        isRendererAvailable = true;
    } catch (error) {
        console.warn('[SceneManager] Failed to initialize 3D type preview:', error);
        log('[SCENE-PREVIEW] 3D preview unavailable, UI fallback enabled.', 'warn');
        renderPreviewFallback(host, PREVIEW_FALLBACK_MESSAGE);
    }

    const ambient = new THREE.HemisphereLight(0xffffff, 0xdfe7ef, 1.55);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(10, -11, 16);
    const fillLight = new THREE.DirectionalLight(0xfff3e8, 0.72);
    fillLight.position.set(-8, 8, 8);
    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 0.36);
    rimLight.position.set(0, 12, 6);
    scene.add(ambient, keyLight, fillLight, rimLight);

    let groundRadius = 6;
    let ground = createPreviewGround(groundRadius, activeTheme);
    scene.add(ground);

    const root = new THREE.Group();
    scene.add(root);

    let previewObject: THREE.Object3D | null = null;
    let previewTypeOverride: { type: string; label?: string } | null = null;
    let isVisible = false;
    let lastPreviewSignature: string | null = null;

    const rebuildGround = (size: number) => {
        groundRadius = size;
        scene.remove(ground);
        ground.geometry.dispose();
        (ground.material as THREE.Material).dispose();
        ground = createPreviewGround(groundRadius, activeTheme);
        scene.add(ground);
    };

    const applyPreviewTheme = (theme: PreviewTheme) => {
        activeTheme = theme;
        scene.background = new THREE.Color(theme === 'dark' ? 0x0f172a : 0xf8f9fa);
        ambient.color.set(theme === 'dark' ? 0xe2e8f0 : 0xffffff);
        ambient.groundColor.set(theme === 'dark' ? 0x020617 : 0xdfe7ef);
        ambient.intensity = theme === 'dark' ? 1.3 : 1.55;
        keyLight.intensity = theme === 'dark' ? 1.85 : 1.5;
        fillLight.color.set(theme === 'dark' ? 0xffb067 : 0xfff3e8);
        fillLight.intensity = theme === 'dark' ? 0.42 : 0.72;
        rimLight.color.set(theme === 'dark' ? 0x93c5fd : 0xe2e8f0);
        rimLight.intensity = theme === 'dark' ? 0.52 : 0.36;
        rebuildGround(groundRadius);
        render();
    };

    const render = () => {
        if (!renderer || !isRendererAvailable) return;
        const width = Math.max(host.clientWidth, 320);
        const height = Math.max(host.clientHeight, 320);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
    };

    const clearPreviewObject = () => {
        if (!previewObject) return;
        disposeObjectHierarchyResources(previewObject);
        root.remove(previewObject);
        previewObject = null;
    };

    const updatePreviewMeta = (type: string, label?: string) => {
        const previewMeta = getSceneTypePreviewConfig(type, label);
        popup.dataset.accent = previewMeta.accent;
        if (elements.addTypeModalPreviewTitleEl) elements.addTypeModalPreviewTitleEl.textContent = previewMeta.title;
        if (elements.addTypeModalPreviewTextEl) elements.addTypeModalPreviewTextEl.textContent = previewMeta.description;
    };

    const sync = () => {
        if (!elements.addTypeEl) return;
        if (!isVisible && !previewTypeOverride) return;
        const selectedOptionLabel = elements.addTypeEl.selectedOptions[0]?.textContent?.trim();
        const activeType = previewTypeOverride?.type || elements.addTypeEl.value;
        const activeLabel = previewTypeOverride?.label || (
            activeType === elements.addTypeEl.value
                ? selectedOptionLabel
                : elements.addTypeEl.querySelector(`option[value="${activeType}"]`)?.textContent?.trim()
        );

        updatePreviewMeta(activeType, activeLabel);
        if (!renderer || !isRendererAvailable) {
            return;
        }

        const previewOptions = getPreviewObjectOptions(elements, activeType);
        const previewSignature = JSON.stringify({
            type: activeType,
            options: previewOptions
        });
        if (previewObject && lastPreviewSignature === previewSignature) {
            render();
            return;
        }

        clearPreviewObject();
        const previewCandidate = createSceneObjectByType(activeType, previewOptions);
        if (!previewCandidate) {
            lastPreviewSignature = previewSignature;
            render();
            return;
        }

        previewObject = previewCandidate;
        lastPreviewSignature = previewSignature;
        root.rotation.z = 0;
        root.add(previewObject);
        fitPreviewCameraToObject(camera, previewObject, rebuildGround);
        render();
    };

    const show = () => {
        isVisible = true;
        popup.classList.add('is-visible');
        popup.setAttribute('aria-hidden', 'false');
        sync();
    };

    const hide = () => {
        isVisible = false;
        previewTypeOverride = null;
        popup.classList.remove('is-visible');
        popup.setAttribute('aria-hidden', 'true');
    };

    const resizeObserver = new ResizeObserver(() => {
        if (isVisible) render();
    });
    resizeObserver.observe(host);
    const handleThemeChange = () => {
        applyPreviewTheme(getPreviewTheme());
    };
    window.addEventListener('app-theme-change', handleThemeChange);

    applyPreviewTheme(activeTheme);
    sync();

    return {
        sync,
        show,
        hide,
        showSelected() {
            previewTypeOverride = null;
            show();
        },
        showForType(type: string, label?: string) {
            previewTypeOverride = { type, label };
            show();
        },
        destroy() {
            isVisible = false;
            resizeObserver.disconnect();
            window.removeEventListener('app-theme-change', handleThemeChange);
            clearPreviewObject();
            lastPreviewSignature = null;
            ground.geometry.dispose();
            (ground.material as THREE.Material).dispose();
            renderer?.dispose();
        }
    };
}
