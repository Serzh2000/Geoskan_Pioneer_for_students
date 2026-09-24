import * as THREE from 'three';
import { tablerIcon, type TablerIconName } from '../ui/icons/tabler.js';

/*
 * Small picture-in-picture windows in the viewport showing what the current
 * drone's cameras see: the front camera (fpv_camera at the ESP32 lens - the
 * very frame Camera.get_frame()/cv2 get in Python) and a camera looking
 * straight down from under the drone, where the optical-flow sensor looks.
 *
 * They are drawn into the main canvas with the scissor test right after the
 * main view (no second WebGL context), reusing the shadow maps the main pass
 * just rendered. The windows' bodies are transparent holes in the DOM that
 * mark where to draw.
 */

type ViewId = 'front' | 'bottom';

const VIEWS: Record<ViewId, { title: string; hint: string; icon: TablerIconName }> = {
    front: {
        title: 'Передняя камера',
        hint: 'Камера модуля ESP32: этот кадр получают Camera.get_frame() и cv2 в Python',
        icon: 'video'
    },
    bottom: {
        title: 'Нижняя камера',
        hint: 'Смотрит прямо вниз, туда же, куда датчик оптического потока',
        icon: 'camera-down'
    }
};
const ORDER: ViewId[] = ['front', 'bottom'];
const STORAGE_KEY = 'geoskan_camera_views_v1';
const BOTTOM_CAMERA_NAME = 'bottom_camera';
const SKY_COLOR = 0xaebdc8;

const open: Record<ViewId, boolean> = { front: false, bottom: false };
let root: HTMLDivElement | null = null;
const slots = new Map<ViewId, HTMLElement>();
const clearColor = new THREE.Color();

function icon(name: TablerIconName, size = 15) {
    return tablerIcon(name).replace('width="24" height="24"', `width="${size}" height="${size}"`);
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        for (const id of ORDER) open[id] = saved[id] === true;
    } catch {
        // Private mode or blocked storage: start with the windows closed.
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
    } catch {
        // Not critical - the windows just will not be remembered.
    }
}

function render() {
    if (!root) return;
    for (const id of ORDER) {
        const view = root.querySelector<HTMLElement>(`[data-view="${id}"]`)!;
        view.hidden = !open[id];
        const toggle = root.querySelector<HTMLButtonElement>(`[data-toggle="${id}"]`)!;
        toggle.setAttribute('aria-pressed', String(open[id]));
    }
}

function setOpen(id: ViewId, value: boolean) {
    open[id] = value;
    saveState();
    render();
}

function ensureUi(host: HTMLElement) {
    if (root?.isConnected) return;
    loadState();
    root = document.createElement('div');
    root.className = 'scene-camera-views';
    root.innerHTML = `
        <div class="scene-camera-views__toggles" role="group" aria-label="Окна камер дрона">
            ${ORDER.map((id) => `<button type="button" class="scene-camera-views__toggle" data-toggle="${id}"
                aria-pressed="false" aria-label="${VIEWS[id].title}" title="${VIEWS[id].title}">${icon(VIEWS[id].icon, 16)}</button>`).join('')}
        </div>
        ${ORDER.map((id) => `
            <section class="scene-camera-view" data-view="${id}" aria-label="${VIEWS[id].title}" hidden>
                <header class="scene-camera-view__head" title="${VIEWS[id].hint}">
                    <span class="scene-camera-view__icon" aria-hidden="true">${icon(VIEWS[id].icon, 14)}</span>
                    <span class="scene-camera-view__title">${VIEWS[id].title}</span>
                    ${id === 'front' ? `<button type="button" class="scene-camera-view__btn" data-fullscreen aria-label="Смотреть с этой камеры на весь экран" title="На весь экран (режим FPV)">${icon('maximize', 14)}</button>` : ''}
                    <button type="button" class="scene-camera-view__btn" data-close="${id}" aria-label="Закрыть окно «${VIEWS[id].title}»">${icon('x', 14)}</button>
                </header>
                <div class="scene-camera-view__body" data-slot="${id}"><span class="scene-camera-view__empty">Нет изображения</span></div>
            </section>`).join('')}`;
    root.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const toggle = target.closest<HTMLElement>('[data-toggle]');
        if (toggle) setOpen(toggle.dataset.toggle as ViewId, !open[toggle.dataset.toggle as ViewId]);
        const close = target.closest<HTMLElement>('[data-close]');
        if (close) setOpen(close.dataset.close as ViewId, false);
        if (target.closest('[data-fullscreen]')) (window as any).setCameraMode?.('fpv');
    });
    // Clicks on the windows are not clicks in the scene.
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    slots.clear();
    for (const id of ORDER) slots.set(id, root.querySelector<HTMLElement>(`[data-slot="${id}"]`)!);
    host.appendChild(root);
    render();
}

/** A camera under the drone looking straight down, image top = drone's nose. */
function bottomCameraOf(mesh: THREE.Object3D) {
    let camera = mesh.getObjectByName(BOTTOM_CAMERA_NAME) as THREE.PerspectiveCamera | undefined;
    if (!camera) {
        camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.01, 200);
        camera.name = BOTTOM_CAMERA_NAME;
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, -1);
        camera.position.set(0, 0, 0.02);
        mesh.add(camera);
    }
    return camera;
}

function cameraFor(id: ViewId, mesh: THREE.Object3D) {
    return id === 'front'
        ? mesh.getObjectByName('fpv_camera') as THREE.PerspectiveCamera | undefined
        : bottomCameraOf(mesh);
}

/**
 * Draws the open camera windows for `droneMesh` on top of the frame that
 * was just rendered. Call right after the main renderer.render().
 */
export function renderCameraViews(renderer: THREE.WebGLRenderer, scene: THREE.Scene, droneMesh: THREE.Object3D | null | undefined) {
    const host = renderer.domElement.parentElement;
    if (!host) return;
    ensureUi(host);
    if (!droneMesh || (!open.front && !open.bottom) || document.hidden) return;

    const canvasRect = renderer.domElement.getBoundingClientRect();
    const size = renderer.getSize(new THREE.Vector2());
    const previousAutoUpdate = renderer.shadowMap.autoUpdate;
    const previousVisible = droneMesh.visible;
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(clearColor);
    const previousClear = clearColor.clone();

    try {
        renderer.shadowMap.autoUpdate = false;
        // The drone's own body would fill the view from inside it.
        droneMesh.visible = false;
        droneMesh.updateMatrixWorld(true);
        renderer.setScissorTest(true);

        for (const id of ORDER) {
            const slot = slots.get(id);
            if (!open[id] || !slot) continue;
            const camera = cameraFor(id, droneMesh);
            slot.classList.toggle('is-empty', !camera);
            if (!camera) continue;

            const rect = slot.getBoundingClientRect();
            const x = rect.left - canvasRect.left;
            const y = canvasRect.bottom - rect.bottom;
            if (rect.width < 2 || rect.height < 2 || x < 0 || y < 0 || x + rect.width > size.x || y + rect.height > size.y) continue;

            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
            renderer.setScissor(x, y, rect.width, rect.height);
            renderer.setViewport(x, y, rect.width, rect.height);
            // The main canvas has no sky (it clears to transparent over the page's
            // background); a camera image gets a plain overcast sky instead,
            // the same in both UI themes.
            renderer.setClearColor(scene.background instanceof THREE.Color ? scene.background : SKY_COLOR, 1);
            renderer.render(scene, camera);
        }
    } finally {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, size.x, size.y);
        renderer.setClearColor(previousClear, previousAlpha);
        renderer.shadowMap.autoUpdate = previousAutoUpdate;
        droneMesh.visible = previousVisible;
    }
}
