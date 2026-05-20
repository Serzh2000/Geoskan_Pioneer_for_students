/**
 * Главный модуль 3D-сцены (Three.js).
 * Экспортирует функции для инициализации и обновления сцены.
 */
import * as THREE from 'three';
import { drones, simState, currentDroneId, simSettings } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import { envGroup } from '../environment/index.js';
import { createDroneModel, updateLEDs, animateRotors } from '../drone-model/index.js';
import { updateCamera } from '../scene/core/camera.js';
import { 
    initScene, scene, camera, renderer, controls, transformControl, 
    transformHelper, selectionHelper, 
    droneMeshes, is3DActive, selectedObject, canvasContainer,
    setSelectedObject, setIsHittingGizmo,
    onWindowResize, syncViewportDependentSceneVisuals
} from '../scene/core/scene-init.js';
import { setupTransformControlListeners } from '../scene/interaction/transform.js';
import { explodeDrone, resetDroneVisuals, updateDebrisVisuals } from './crash-visuals.js';
import { registerScenePointerHandlers, handleSceneKeyDown } from './scene-events.js';
import { initTrailForDrone, disposeTrailForDrone, updateTrailForDrone } from './trails.js';

(window as any).scene = scene;
(window as any).camera = camera;
(window as any).setSelectedObject = setSelectedObject;

export { is3DActive, selectedObject, droneMeshes, envGroup, scene };
export { 
    addObject, deleteSelectedObject, duplicateObject, resetDroneToOrigin,
    listSceneObjects, selectSceneObjectById, deleteSceneObjectById,
    appendPointToSelectedLinearObject, updateSelectedSceneObject,
    setSceneObjectTransformMode, getSelectedSceneObjectId,
    startSelectedLinearObjectEditing, finishSelectedLinearObjectEditing,
    isSelectedLinearObjectEditingActive, getSelectedLinearObjectEditingTargetId
} from '../scene/objects/object-manager.js';
export type { TransformMode } from '../scene/objects/object-manager.js';

export interface SceneObjectInfo {
    id: string;
    name: string;
    sceneType: string;
    objectType: string;
    draggable: boolean;
    isDrone: boolean;
    selected: boolean;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    supportsValue?: boolean;
    supportsPoints?: boolean;
    value?: string;
    pointsText?: string;
    metaLines?: string[];
}

const PRINT_BUBBLE_LIFETIME_MS = 4200;
const PRINT_BUBBLE_MAX_LENGTH = 180;
const bubbleWorldPosition = new THREE.Vector3();
const bubbleScreenPosition = new THREE.Vector3();
let printBubbleOverlay: HTMLDivElement | null = null;
const printBubbleElements: Record<string, HTMLDivElement> = {};

function ensurePrintBubbleOverlay(): HTMLDivElement | null {
    if (printBubbleOverlay?.isConnected) return printBubbleOverlay;
    if (!canvasContainer) return null;

    printBubbleOverlay = document.createElement('div');
    printBubbleOverlay.className = 'drone-print-bubbles';
    canvasContainer.appendChild(printBubbleOverlay);
    return printBubbleOverlay;
}

function getPrintBubbleElement(id: string): HTMLDivElement | null {
    const overlay = ensurePrintBubbleOverlay();
    if (!overlay) return null;
    if (printBubbleElements[id]?.isConnected) return printBubbleElements[id];

    const bubble = document.createElement('div');
    bubble.className = 'drone-print-bubble';
    overlay.appendChild(bubble);
    printBubbleElements[id] = bubble;
    return bubble;
}

function hidePrintBubble(id: string) {
    const bubble = printBubbleElements[id];
    if (!bubble) return;
    bubble.classList.remove('visible');
}

function syncDronePrintBubbles() {
    if (!camera || !canvasContainer) return;
    const now = performance.now();
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    for (const id in printBubbleElements) {
        if (!drones[id]) {
            printBubbleElements[id].remove();
            delete printBubbleElements[id];
        }
    }

    for (const id in drones) {
        const drone = drones[id];
        const mesh = droneMeshes[id];
        const bubble = getPrintBubbleElement(id);
        if (!bubble || !mesh || !mesh.visible || !drone.printBubbleText || drone.printBubbleUntil <= now) {
            hidePrintBubble(id);
            continue;
        }

        mesh.getWorldPosition(bubbleWorldPosition);
        bubbleWorldPosition.z += 0.42;
        bubbleScreenPosition.copy(bubbleWorldPosition).project(camera);

        if (bubbleScreenPosition.z < -1 || bubbleScreenPosition.z > 1) {
            hidePrintBubble(id);
            continue;
        }

        const x = (bubbleScreenPosition.x * 0.5 + 0.5) * width;
        const y = (-bubbleScreenPosition.y * 0.5 + 0.5) * height;
        bubble.textContent = drone.printBubbleText;
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        bubble.classList.add('visible');
    }
}

export function showDronePrintBubble(id: string, text: string) {
    const drone = drones[id];
    if (!drone) return;

    const normalizedText = String(text ?? '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[^\S\r\n]+/g, ' ').trim())
        .join('\n')
        .trim();
    if (!normalizedText) return;

    drone.printBubbleText = normalizedText.slice(0, PRINT_BUBBLE_MAX_LENGTH);
    drone.printBubbleUntil = performance.now() + PRINT_BUBBLE_LIFETIME_MS;
    getPrintBubbleElement(id);
}

export function init3D(container: HTMLElement) {
    try {
        initScene(container);
        ensurePrintBubbleOverlay();
        setupTransformControlListeners();

        transformControl.addEventListener('mouseDown', () => setIsHittingGizmo(true));
        transformControl.addEventListener('mouseUp', () => setIsHittingGizmo(false));

        // Init Drones
        syncDrones();
        syncViewportDependentSceneVisuals();

        container.addEventListener('contextmenu', e => e.preventDefault());
        renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
        registerScenePointerHandlers();
        window.addEventListener('resize', onWindowResize);
        document.addEventListener('keydown', handleSceneKeyDown);

        log('3D-сцена загружена.', 'success');
        log('[3D-CLICK] Обработчики pointerdown/pointerup подключены через document capture', 'info');
        updateCamera(camera, droneMeshes[currentDroneId] || null, controls, (window as any).cameraMode || 'drone');
        
    } catch (e: any) {
        console.error('[3D] Critical error during init3D:', e);
        log(`Ошибка 3D: ${e.message}`, 'error');
    }
}

export function syncDrones() {
    for (const id in drones) {
        if (!droneMeshes[id]) {
            const mesh = createDroneModel();
            mesh.up.set(0, 0, 1);
            scene.add(mesh);
            droneMeshes[id] = mesh;
            initTrailForDrone(id);
        }
    }
    for (const id in droneMeshes) {
        if (!drones[id]) {
            scene.remove(droneMeshes[id]);
            disposeTrailForDrone(id);
            delete droneMeshes[id];
        }
    }
}

export function getObstacles() {
    return envGroup ? envGroup.children : [];
}

export function updateDrone3D(dt: number) {
    if (!is3DActive || !renderer || !camera) return;
    const cameraMode = (window as any).cameraMode || 'drone';

    if (simState.running && transformControl && transformControl.object) {
        log(`[3DDBG] updateDrone3D detach while running target=${(transformControl.object as any).name || 'unknown'}`, 'info');
        transformControl.detach();
        if (transformHelper) transformHelper.visible = false;
        if (selectionHelper) selectionHelper.visible = false;
    }
    
    if (transformControl && transformControl.object && !simState.running) {
        transformControl.visible = simSettings.showGizmo;
        if (transformHelper) transformHelper.visible = simSettings.showGizmo;
    }
    
    // Обновляем позицию selectionHelper если объект движется и выделен
    if (simState.running && selectedObject && selectionHelper && selectionHelper.visible) {
        selectionHelper.update();
    }
    
    if (selectionHelper && selectionHelper.visible) {
        const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
        selectionHelper.scale.set(pulse, pulse, pulse);
    }
    
    syncDrones();
    
    // Update all drones
    for (const id in drones) {
        const drone = drones[id];
        const mesh = droneMeshes[id];
        if (!mesh) continue;

        mesh.visible = !(cameraMode === 'fpv' && id === currentDroneId);

        if (drone.status === 'CRASHED') {
            explodeDrone(id, mesh);
            updateDebrisVisuals(mesh, dt);
            
            mesh.position.set(drone.pos.x, drone.pos.y, drone.pos.z);
        } else {
            resetDroneVisuals(id, mesh);
            updateLEDs(mesh, drone);
            animateRotors(mesh, dt, drone);
            
            mesh.position.set(drone.pos.x, drone.pos.y, drone.pos.z);
            mesh.rotation.set(drone.orientation.pitch, drone.orientation.roll, drone.orientation.yaw, 'ZYX');
        }

        updateTrailForDrone(id);

        const arrow = mesh.getObjectByName('orientation_arrow');
        if (arrow) {
            const scale = Math.max(1, camera.position.distanceTo(mesh.position) * 0.15);
            arrow.scale.set(scale, scale, scale);
            arrow.visible = (drone.status !== 'CRASHED');
        }
    }

    if (droneMeshes[currentDroneId]) {
        updateCamera(camera, droneMeshes[currentDroneId], controls, cameraMode);
    }

    syncDronePrintBubbles();

    try {
        renderer.render(scene, camera);
    } catch (e) {
        console.error('[3D] Render error:', e);
    }
}
