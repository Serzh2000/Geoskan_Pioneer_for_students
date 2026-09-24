import * as THREE from 'three';
import type { DroneOrbitControls } from './DroneOrbitControls.js';
import { getCameraMode, getFreeCameraSubMode } from './camera-mode-state.js';

/*
 * Axis compass in the viewport's top-right corner (the navigation gizmo of
 * Blender/Unity): each axis is a bubble on a spoke - filled with its letter
 * for the positive direction, a hollow ring for the negative one. Bubbles
 * turned away from the viewer are dimmed and drawn behind, so the compass
 * reads as a small 3D object rather than three flat arrows.
 *
 * It is also a control: clicking a bubble swings the orbit camera to look
 * from that axis (Z - straight down, a map view), the centre returns to the
 * default three-quarter view. The camera never goes below the ground, so -Z
 * is shown but not clickable.
 */

type ViewId = 'x' | '-x' | 'y' | '-y' | 'z' | '-z';

type Bubble = {
    id: ViewId;
    label: string;
    color: string;
    vector: THREE.Vector3;
    positive: boolean;
    title: string;
    /** Orbit angles to look from this side; null - not reachable. */
    view: { azimuth: number; elevation: number } | null;
};

const SIDE_ELEVATION = 0.08;
const TOP_ELEVATION = Math.PI / 2 - 0.011;
const HOME_VIEW = { azimuth: -Math.PI / 3, elevation: 0.62 };
const SNAP_MS = 320;

const BUBBLES: Bubble[] = [
    { id: 'x', label: 'X', color: '#e5484d', vector: new THREE.Vector3(1, 0, 0), positive: true, title: 'Вид с +X', view: { azimuth: 0, elevation: SIDE_ELEVATION } },
    { id: '-x', label: 'X', color: '#e5484d', vector: new THREE.Vector3(-1, 0, 0), positive: false, title: 'Вид с −X', view: { azimuth: Math.PI, elevation: SIDE_ELEVATION } },
    { id: 'y', label: 'Y', color: '#30a46c', vector: new THREE.Vector3(0, 1, 0), positive: true, title: 'Вид с +Y', view: { azimuth: Math.PI / 2, elevation: SIDE_ELEVATION } },
    { id: '-y', label: 'Y', color: '#30a46c', vector: new THREE.Vector3(0, -1, 0), positive: false, title: 'Вид с −Y', view: { azimuth: -Math.PI / 2, elevation: SIDE_ELEVATION } },
    // Top view keeps +Y up and +X right on screen, like a map.
    { id: 'z', label: 'Z', color: '#3e8ef7', vector: new THREE.Vector3(0, 0, 1), positive: true, title: 'Вид сверху', view: { azimuth: -Math.PI / 2, elevation: TOP_ELEVATION } },
    { id: '-z', label: 'Z', color: '#3e8ef7', vector: new THREE.Vector3(0, 0, -1), positive: false, title: 'Снизу смотреть нельзя: камера не уходит под землю', view: null }
];

const RADIUS = 31;
const inverseCameraQuaternion = new THREE.Quaternion();
const viewVector = new THREE.Vector3();

let widgetRoot: HTMLDivElement | null = null;
let caption: HTMLDivElement | null = null;
const bubbleElements = new Map<ViewId, { bubble: HTMLButtonElement; spoke: HTMLDivElement | null }>();
let orbitControls: DroneOrbitControls | null = null;
let snapFrame = 0;

function shortestAngle(from: number, to: number) {
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
}

/** Smoothly swings the orbit camera to the given angles around its current target. */
function snapOrbitTo(view: { azimuth: number; elevation: number }) {
    const controls = orbitControls;
    if (!controls) return;
    // Follow/FPV cameras ignore the orbit controls: switch to the free orbit first.
    if (getCameraMode() !== 'free' || getFreeCameraSubMode() !== 'orbit') {
        (window as any).setCameraMode?.('free');
        (window as any).setCameraFreeSubMode?.('orbit');
        controls.syncSphericalFromCamera();
    }
    cancelAnimationFrame(snapFrame);
    const fromAzimuth = controls.azimuth;
    const fromElevation = controls.elevation;
    const deltaAzimuth = shortestAngle(fromAzimuth, view.azimuth);
    const deltaElevation = view.elevation - fromElevation;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const started = performance.now();
    const step = (now: number) => {
        const t = reduceMotion ? 1 : Math.min(1, (now - started) / SNAP_MS);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        controls.azimuth = fromAzimuth + deltaAzimuth * eased;
        controls.elevation = fromElevation + deltaElevation * eased;
        controls.update();
        if (t < 1) snapFrame = requestAnimationFrame(step);
    };
    snapFrame = requestAnimationFrame(step);
}

function setCaption(text: string | null) {
    if (!caption) return;
    caption.textContent = text ?? '';
    caption.classList.toggle('is-visible', !!text);
}

function createBubble(config: Bubble) {
    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = `scene-orientation-widget__bubble ${config.positive ? 'is-positive' : 'is-negative'}`;
    bubble.style.setProperty('--axis-color', config.color);
    bubble.dataset.view = config.id;
    bubble.textContent = config.positive ? config.label : '';
    bubble.setAttribute('aria-label', config.title);
    if (!config.view) bubble.setAttribute('aria-disabled', 'true');

    const show = () => setCaption(config.positive || config.view ? config.title : 'Вид снизу недоступен');
    bubble.addEventListener('pointerenter', show);
    bubble.addEventListener('focus', show);
    bubble.addEventListener('pointerleave', () => setCaption(null));
    bubble.addEventListener('blur', () => setCaption(null));
    bubble.addEventListener('click', () => {
        if (config.view) snapOrbitTo(config.view);
    });

    let spoke: HTMLDivElement | null = null;
    if (config.positive) {
        spoke = document.createElement('div');
        spoke.className = 'scene-orientation-widget__spoke';
        spoke.style.setProperty('--axis-color', config.color);
    }
    return { bubble, spoke };
}

export function initOrientationWidget(container: HTMLElement, controls?: DroneOrbitControls | null) {
    widgetRoot?.remove();
    bubbleElements.clear();
    orbitControls = controls ?? null;

    widgetRoot = document.createElement('div');
    widgetRoot.className = 'scene-orientation-widget';
    widgetRoot.setAttribute('role', 'group');
    widgetRoot.setAttribute('aria-label', 'Оси сцены и быстрые виды камеры');

    const disc = document.createElement('div');
    disc.className = 'scene-orientation-widget__disc';
    widgetRoot.appendChild(disc);

    const stage = document.createElement('div');
    stage.className = 'scene-orientation-widget__stage';
    widgetRoot.appendChild(stage);

    for (const config of BUBBLES) {
        const dom = createBubble(config);
        bubbleElements.set(config.id, dom);
        if (dom.spoke) stage.appendChild(dom.spoke);
        stage.appendChild(dom.bubble);
    }

    const home = document.createElement('button');
    home.type = 'button';
    home.className = 'scene-orientation-widget__home';
    home.setAttribute('aria-label', 'Вернуть обычный вид');
    home.addEventListener('pointerenter', () => setCaption('Обычный вид'));
    home.addEventListener('focus', () => setCaption('Обычный вид'));
    home.addEventListener('pointerleave', () => setCaption(null));
    home.addEventListener('blur', () => setCaption(null));
    home.addEventListener('click', () => snapOrbitTo(HOME_VIEW));
    stage.appendChild(home);

    caption = document.createElement('div');
    caption.className = 'scene-orientation-widget__caption';
    caption.setAttribute('aria-hidden', 'true');
    widgetRoot.appendChild(caption);

    container.appendChild(widgetRoot);
}

export function updateOrientationWidget(camera: THREE.Camera | null) {
    if (!widgetRoot || !(camera instanceof THREE.PerspectiveCamera)) return;

    inverseCameraQuaternion.copy(camera.quaternion).invert();

    for (const config of BUBBLES) {
        const dom = bubbleElements.get(config.id);
        if (!dom) continue;

        viewVector.copy(config.vector).applyQuaternion(inverseCameraQuaternion);
        const depth = viewVector.z; // +1 - towards the viewer
        const x = viewVector.x * RADIUS;
        const y = -viewVector.y * RADIUS;
        const front = depth >= -0.05;
        const layer = Math.round((depth + 1) * 50) + (config.positive ? 1 : 0);

        dom.bubble.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
        dom.bubble.style.zIndex = String(layer + 10);
        dom.bubble.classList.toggle('is-behind', !front);

        if (dom.spoke) {
            const length = Math.hypot(x, y);
            dom.spoke.style.width = `${length.toFixed(1)}px`;
            dom.spoke.style.transform = `rotate(${Math.atan2(y, x)}rad)`;
            dom.spoke.style.zIndex = String(layer);
            dom.spoke.classList.toggle('is-behind', !front);
        }
    }
}
