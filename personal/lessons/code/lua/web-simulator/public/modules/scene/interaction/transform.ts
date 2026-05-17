import * as THREE from 'three';
import { drones } from '../../core/state.js';
import { droneMeshes, selectedObject, transformControl, controls } from '../core/scene-init.js';
import { envGroup } from '../../environment/index.js';
import { snapMarkerToSurface } from '../../environment/obstacles.js';

let rotationGuide: THREE.Group | null = null;
let rotationGuideHost: THREE.Object3D | null = null;

function createAxisLabel(text: string, color: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(48, 48, 24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.font = 'bold 34px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text, 48, 51);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(0.34);
    sprite.renderOrder = 10020;
    return sprite;
}

function setHelperRenderOrder(object: THREE.Object3D) {
    object.renderOrder = 10020;
    object.traverse((node: any) => {
        node.renderOrder = 10020;
        const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        materials.forEach((material: THREE.Material & { depthTest?: boolean; depthWrite?: boolean }) => {
            material.depthTest = false;
            material.depthWrite = false;
        });
    });
}

function getGuideLength(target: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(target);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z);
    return THREE.MathUtils.clamp(maxDimension * 0.75 || 1.8, 1.4, 4.5);
}

function hideRotationGuide() {
    if (rotationGuide) {
        rotationGuide.removeFromParent();
        rotationGuide.traverse((node: any) => {
            if (node.material) {
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach((material: THREE.Material) => material.dispose());
            }
            if (node.geometry) node.geometry.dispose();
        });
    }
    rotationGuide = null;
    rotationGuideHost = null;
}

function syncRotationGuide() {
    if (!rotationGuide || !rotationGuideHost) return;
    rotationGuide.position.copy(rotationGuideHost.position);
    rotationGuide.quaternion.copy(rotationGuideHost.quaternion);
    rotationGuide.updateMatrixWorld(true);
}

function showRotationGuide(target: THREE.Object3D) {
    hideRotationGuide();

    const parent = target.parent;
    if (!parent) return;

    const guide = new THREE.Group();
    guide.name = '__rotation_guide__';
    const length = getGuideLength(target);

    const axes = [
        { axis: new THREE.Vector3(1, 0, 0), color: 0xff6b6b, label: 'X' },
        { axis: new THREE.Vector3(0, 1, 0), color: 0x34d399, label: 'Y' },
        { axis: new THREE.Vector3(0, 0, 1), color: 0x60a5fa, label: 'Z' }
    ];

    axes.forEach(({ axis, color, label }) => {
        const arrow = new THREE.ArrowHelper(axis, new THREE.Vector3(0, 0, 0), length, color, 0.28, 0.16);
        setHelperRenderOrder(arrow);
        guide.add(arrow);

        const text = createAxisLabel(label, `#${color.toString(16).padStart(6, '0')}`);
        text.position.copy(axis.clone().multiplyScalar(length + 0.18));
        guide.add(text);
    });

    parent.add(guide);
    rotationGuide = guide;
    rotationGuideHost = target;
    syncRotationGuide();
}

export function updateTransformModeDecorations(mode: 'translate' | 'rotate' | 'scale' | null, target?: THREE.Object3D | null) {
    if (mode === 'rotate' && target) {
        showRotationGuide(target);
        return;
    }
    hideRotationGuide();
}

export function setupTransformControlListeners() {
    transformControl.addEventListener('change', () => {
        if ((window as any).selectionHelper) (window as any).selectionHelper.update();
        syncRotationGuide();
        
        if (selectedObject) {
            let selectedDroneId: string | null = null;
            for (const id in droneMeshes) {
                if (selectedObject === droneMeshes[id]) {
                    selectedDroneId = id;
                    break;
                }
            }
            if (selectedDroneId) {
                const drone = drones[selectedDroneId];
                if (drone) {
                    drone.pos.x = selectedObject.position.x;
                    drone.pos.y = selectedObject.position.y;
                    drone.pos.z = Math.max(0, selectedObject.position.z);
                    selectedObject.position.z = drone.pos.z;
                    drone.orientation.pitch = selectedObject.rotation.x;
                    drone.orientation.roll = selectedObject.rotation.y;
                    drone.orientation.yaw = selectedObject.rotation.z;
                    drone.target_alt = drone.pos.z;
                    drone.target_pos = { ...drone.pos };
                    drone.target_yaw = drone.orientation.yaw;
                }
            } else if (selectedObject.userData && selectedObject.userData.draggable) {
                if (selectedObject.userData?.markerKind && transformControl.getMode() !== 'rotate') {
                    snapMarkerToSurface(selectedObject, envGroup?.children || []);
                } else {
                    selectedObject.position.z = Math.max(0, selectedObject.position.z);
                }
            }
        }

    });

    transformControl.addEventListener('dragging-changed', (event: any) => {
        const isDragging = event.value;
        (window as any).isTransforming = isDragging;
        if (controls) controls.enabled = !isDragging && (window as any).cameraMode === 'free';
    });
}
