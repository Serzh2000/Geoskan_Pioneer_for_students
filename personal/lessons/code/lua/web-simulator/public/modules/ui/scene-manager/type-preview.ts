import * as THREE from 'three';
import { createSceneObjectByType } from '../../environment/index.js';
import type { SceneObjectOptions } from '../../environment/obstacles.js';
import { disposeObjectHierarchyResources } from '../../scene/objects/object-manager-support.js';
import { parsePointsText } from '../../scene/objects/object-catalog.js';
import { getSceneTypePreviewConfig, readAddSceneObjectDraft } from './support.js';
import type { SceneManagerDomRefs } from './types.js';

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

function createPreviewGround(size: number) {
    const geometry = new THREE.CircleGeometry(size, 64);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.98,
        metalness: 0.02
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = -0.001;
    mesh.receiveShadow = true;
    return mesh;
}

export type SceneTypePreviewController = {
    sync: () => void;
    show: () => void;
    hide: () => void;
    showSelected: () => void;
    showForType: (type: string, label?: string) => void;
    destroy: () => void;
};

export function initSceneTypePreview(elements: SceneManagerDomRefs): SceneTypePreviewController {
    const host = elements.addTypeModalPreviewViewportEl;
    const popup = elements.addTypeModalPreviewEl;

    if (!host || !popup || !elements.addTypeEl) {
        return {
            sync() {},
            show() {},
            hide() {},
            showSelected() {},
            showForType() {},
            destroy() {}
        };
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    camera.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.replaceChildren(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xdfe7ef, 1.55);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(10, -11, 16);
    const fillLight = new THREE.DirectionalLight(0xfff3e8, 0.72);
    fillLight.position.set(-8, 8, 8);
    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 0.36);
    rimLight.position.set(0, 12, 6);
    scene.add(ambient, keyLight, fillLight, rimLight);

    let ground = createPreviewGround(6);
    scene.add(ground);

    const root = new THREE.Group();
    scene.add(root);

    let previewObject: THREE.Object3D | null = null;
    let previewTypeOverride: { type: string; label?: string } | null = null;
    let isVisible = false;
    let lastPreviewSignature: string | null = null;

    const render = () => {
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

    const fitCameraToObject = (object: THREE.Object3D) => {
        const box = new THREE.Box3().setFromObject(object);
        if (box.isEmpty()) {
            camera.position.set(7, -7, 6);
            camera.lookAt(0, 0, 0.8);
            return;
        }

        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);

        const normalizedBox = new THREE.Box3().setFromObject(object);
        object.position.z -= normalizedBox.min.z;

        const finalBox = new THREE.Box3().setFromObject(object);
        const size = finalBox.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z, 1);
        const distance = maxSize * 2.35 + 4.2;
        const lookAtTarget = new THREE.Vector3(0, 0, Math.max(size.z * 0.4, 0.85));
        const direction = new THREE.Vector3(1.65, -1.4, 1.28).normalize();

        camera.position.copy(direction.multiplyScalar(distance));
        camera.lookAt(lookAtTarget);

        scene.remove(ground);
        ground.geometry.dispose();
        (ground.material as THREE.Material).dispose();
        ground = createPreviewGround(Math.min(Math.max(Math.max(size.x, size.y) * 1.1, 5), 20));
        scene.add(ground);
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
        fitCameraToObject(previewObject);
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
            clearPreviewObject();
            lastPreviewSignature = null;
            ground.geometry.dispose();
            (ground.material as THREE.Material).dispose();
            renderer.dispose();
        }
    };
}
