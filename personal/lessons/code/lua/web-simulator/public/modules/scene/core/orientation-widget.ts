import * as THREE from 'three';

type AxisConfig = {
    key: 'x' | 'y' | 'z';
    label: 'X' | 'Y' | 'Z';
    color: string;
    vector: THREE.Vector3;
};

type AxisDom = {
    root: HTMLDivElement;
    shaft: HTMLDivElement;
    tip: HTMLDivElement;
    label: HTMLDivElement;
};

const AXES: AxisConfig[] = [
    { key: 'x', label: 'X', color: '#ef4444', vector: new THREE.Vector3(1, 0, 0) },
    { key: 'y', label: 'Y', color: '#22c55e', vector: new THREE.Vector3(0, 1, 0) },
    { key: 'z', label: 'Z', color: '#3b82f6', vector: new THREE.Vector3(0, 0, 1) }
];

const inverseCameraQuaternion = new THREE.Quaternion();
const viewVector = new THREE.Vector3();
const axisElements = new Map<string, AxisDom>();
let widgetRoot: HTMLDivElement | null = null;

function createAxisDom(axis: AxisConfig) {
    const root = document.createElement('div');
    root.className = `scene-orientation-widget__axis scene-orientation-widget__axis--${axis.key}`;
    root.style.setProperty('--axis-color', axis.color);

    const shaft = document.createElement('div');
    shaft.className = 'scene-orientation-widget__shaft';

    const tip = document.createElement('div');
    tip.className = 'scene-orientation-widget__tip';

    const label = document.createElement('div');
    label.className = 'scene-orientation-widget__label';
    label.textContent = axis.label;

    root.appendChild(shaft);
    root.appendChild(tip);
    root.appendChild(label);

    return { root, shaft, tip, label };
}

export function initOrientationWidget(container: HTMLElement) {
    widgetRoot?.remove();
    axisElements.clear();

    widgetRoot = document.createElement('div');
    widgetRoot.className = 'scene-orientation-widget';
    widgetRoot.setAttribute('aria-hidden', 'true');

    const plate = document.createElement('div');
    plate.className = 'scene-orientation-widget__plate';
    widgetRoot.appendChild(plate);

    const orbit = document.createElement('div');
    orbit.className = 'scene-orientation-widget__orbit';
    widgetRoot.appendChild(orbit);

    const center = document.createElement('div');
    center.className = 'scene-orientation-widget__center';
    widgetRoot.appendChild(center);

    AXES.forEach((axis) => {
        const dom = createAxisDom(axis);
        axisElements.set(axis.key, dom);
        widgetRoot?.appendChild(dom.root);
    });

    container.appendChild(widgetRoot);
}

export function updateOrientationWidget(camera: THREE.Camera | null) {
    if (!widgetRoot || !(camera instanceof THREE.PerspectiveCamera)) return;

    inverseCameraQuaternion.copy(camera.quaternion).invert();
    const radius = 26;

    AXES.forEach((axis) => {
        const dom = axisElements.get(axis.key);
        if (!dom) return;

        viewVector.copy(axis.vector).applyQuaternion(inverseCameraQuaternion).normalize();
        const depth = viewVector.z;
        const reach = radius * (0.8 + ((depth + 1) * 0.14));
        const x = viewVector.x * reach;
        const y = -viewVector.y * reach;
        const length = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(y, x);
        const emphasis = 0.42 + ((depth + 1) * 0.29);
        const shaftThickness = 2.3 + ((depth + 1) * 0.45);
        const tipScale = 0.84 + ((depth + 1) * 0.18);
        const labelOffset = 11 + ((depth + 1) * 3);
        const labelX = x + (Math.cos(angle) * labelOffset);
        const labelY = y + (Math.sin(angle) * labelOffset);
        const labelScale = 0.9 + ((depth + 1) * 0.12);

        dom.root.style.zIndex = String(Math.round((depth + 1) * 100));
        dom.root.style.opacity = emphasis.toFixed(3);
        dom.shaft.style.width = `${Math.max(10, length).toFixed(1)}px`;
        dom.shaft.style.height = `${shaftThickness.toFixed(2)}px`;
        dom.shaft.style.transform = `translateY(-50%) rotate(${angle}rad)`;
        dom.tip.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${angle}rad) scale(${tipScale.toFixed(3)})`;
        dom.label.style.transform = `translate(${labelX.toFixed(1)}px, ${labelY.toFixed(1)}px) translate(-50%, -50%) scale(${labelScale.toFixed(3)})`;
    });
}
