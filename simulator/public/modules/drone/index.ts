/**
 * Главный модуль 3D-сцены (Three.js).
 * Экспортирует функции для инициализации и обновления сцены.
 */
import * as THREE from 'three';
import { recordLearningEvent } from '../core/learning-journal.js';
import { renderCameraViews } from './camera-views.js';
import { drones, currentDroneId, simSettings } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import { envGroup } from '../environment/index.js';
import { createDroneModel, updateLEDs, animateRotors, updateCameraTilt } from '../drone-model/index.js';
import { setEsp32Attached, updateEsp32Module } from '../drone-model/esp32-module.js';
import { updateCamera } from '../scene/core/camera.js';
import { getCameraMode } from '../scene/core/camera-mode-state.js';
import { startRenderSample, finishRenderSample } from '../scene/core/render-metrics.js';
import { updateQuality } from '../scene/core/quality.js';
import {
    initScene,
    scene,
    camera,
    renderer,
    controls,
    freeFlyControls,
    transformControl,
    transformHelper,
    selectionHelper,
    droneMeshes,
    is3DActive,
    selectedObject,
    canvasContainer,
    setIsHittingGizmo,
    onWindowResize,
    syncViewportDependentSceneVisuals
} from '../scene/core/scene-init.js';
import { setupTransformControlListeners } from '../scene/interaction/transform.js';
import { explodeDrone, resetDroneVisuals, updateDebrisVisuals } from './crash-visuals.js';
import { registerScenePointerHandlers, handleSceneKeyDown } from './scene-events.js';
import { initTrailForDrone, disposeTrailForDrone, updateTrailForDrone } from './trails.js';

export { is3DActive, selectedObject, droneMeshes, envGroup, scene };
export { 
    addObject, deleteSelectedObject, resetDroneToOrigin,
    listSceneObjects, selectSceneObjectById, toggleMultiSelectObjectById, focusSceneObjectById, deleteSceneObjectById,
    appendPointToSelectedLinearObject, updateSelectedSceneObject,
    setSceneObjectTransformMode, getSceneObjectTransformMode, getSelectedSceneObjectId,
    clearSceneSelection, rotateSelectedSceneObjectByDegrees, resetSelectedSceneObjectTransform, setSelectedObjectTransform,
    startSelectedLinearObjectEditing, finishSelectedLinearObjectEditing,
    isSelectedLinearObjectEditingActive
} from '../scene/objects/object-manager.js';

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
    recordLearningEvent(id, { kind: 'print', text, time: drones[id]?.current_time || 0 });
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
        updateCamera(camera, droneMeshes[currentDroneId] || null, controls, getCameraMode(), freeFlyControls, 0, envGroup);
        
    } catch (e: any) {
        console.error('[3D] Critical error during init3D:', e);
        log(`Ошибка 3D: ${e.message}`, 'error');
    }
}

export function syncDrones() {
    for (const id in drones) {
        // Модель дрона сменилась (Базовый <-> Мини 2) - пересобрать его 3D-модель.
        if (droneMeshes[id] && droneMeshes[id].userData.droneModel !== drones[id].model) {
            scene.remove(droneMeshes[id]);
            disposeTrailForDrone(id);
            delete droneMeshes[id];
        }
        if (!droneMeshes[id]) {
            const mesh = createDroneModel(drones[id].model);
            mesh.up.set(0, 0, 1);
            // Cache the orientation arrow reference once at build time so the
            // per-frame update loop doesn't need to walk the mesh's subtree
            // via getObjectByName() every frame (see updateDrone3D below).
            mesh.userData.orientationArrow = mesh.getObjectByName('orientation_arrow') || null;
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

/** Python runs on the ESP32 module: plug it into the optical-flow board (or pull it out). */
export function setDroneEsp32Attached(id: string | null, attached: boolean) {
    for (const droneId in droneMeshes) {
        if (id === null || droneId === id) setEsp32Attached(droneMeshes[droneId], attached);
    }
}

export function getObstacles() {
    return envGroup ? envGroup.children : [];
}

/**
 * Moves the 3D scene to the current simulation state and draws it. With
 * render = false only the first part: a background tab (see app/animation-loop)
 * still needs the drone model where the physics put it - the camera rides on
 * it - but has nobody to draw the scene for.
 */
export function updateDrone3D(dt: number, render = true) {
    if (!is3DActive || !renderer || !camera) return;
    const cameraMode = getCameraMode();

    if (drones[currentDroneId].running && transformControl && transformControl.object) {
        log(`[3DDBG] updateDrone3D detach while running target=${(transformControl.object as any).name || 'unknown'}`, 'info');
        transformControl.detach();
        if (transformHelper) transformHelper.visible = false;
        if (selectionHelper) selectionHelper.visible = false;
    }
    
    if (transformControl && transformControl.object && !drones[currentDroneId].running) {
        transformControl.visible = simSettings.showGizmo;
        if (transformHelper) transformHelper.visible = simSettings.showGizmo;
    }
    
    // Обновляем позицию selectionHelper если объект движется и выделен
    if (drones[currentDroneId].running && selectedObject && selectionHelper && selectionHelper.visible) {
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
            updateCameraTilt(mesh, dt);
            
            mesh.position.set(drone.pos.x, drone.pos.y, drone.pos.z);
            mesh.rotation.set(drone.orientation.pitch, drone.orientation.roll, drone.orientation.yaw, 'ZYX');
        }

        updateTrailForDrone(id);
        updateEsp32Module(mesh, dt);

        const arrow = mesh.userData.orientationArrow as THREE.Object3D | null | undefined;
        if (arrow) {
            const scale = Math.max(1, camera.position.distanceTo(mesh.position) * 0.15);
            arrow.scale.set(scale, scale, scale);
            arrow.visible = (drone.status !== 'CRASHED');
        }
    }

    if (droneMeshes[currentDroneId]) {
        updateCamera(camera, droneMeshes[currentDroneId], controls, cameraMode, freeFlyControls, dt, envGroup);
    }

    if (!render) {
        scene.updateMatrixWorld();
        return;
    }

    syncDronePrintBubbles();
    syncViewportDependentSceneVisuals();

    try {
        updateQuality({ renderer, scene, camera, anchors: () => Object.values(droneMeshes), envRoot: () => envGroup });
        const renderStartedAt = startRenderSample();
        renderer.render(scene, camera);
        finishRenderSample(renderer, renderStartedAt);
        renderCameraViews(renderer, scene, droneMeshes[currentDroneId]);
    } catch (e) {
        console.error('[3D] Render error:', e);
    }
}
