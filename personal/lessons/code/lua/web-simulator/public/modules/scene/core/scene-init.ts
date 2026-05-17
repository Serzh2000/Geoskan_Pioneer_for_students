import * as THREE from 'three';
import { DroneOrbitControls } from './DroneOrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { log } from '../../shared/logging/logger.js';
import { setupEnvironment, envGroup } from '../../environment/index.js';
import { applyTransformControlsUxTheme } from './transform-controls-style.js';

export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;
export let renderer: THREE.WebGLRenderer;
export let controls: DroneOrbitControls;

export let transformControl: TransformControls;
export let transformHelper: THREE.Object3D;
export let raycaster: THREE.Raycaster;
export let mouse: THREE.Vector2;
export let selectionHelper: THREE.BoxHelper;

export let canvasContainer: HTMLElement;
export let droneMeshes: Record<string, THREE.Object3D> = {};
export interface DroneTrailVisuals {
    path: THREE.Line;
    particles: THREE.Points;
    lineGeometry: THREE.BufferGeometry;
    pointsGeometry: THREE.BufferGeometry;
}
export let droneTrails: Record<string, DroneTrailVisuals> = {};

export let is3DActive = false;
export let selectedObject: THREE.Object3D | null = null;
export let multiSelectedObjects: THREE.Object3D[] = [];
export let pointerDownPos = new THREE.Vector2();
export let isHittingGizmo = false;
let canvasResizeObserver: ResizeObserver | null = null;
let resizeAnimationFrame = 0;

const orbitTargetBounds = new THREE.Box3();
const orbitTargetCenter = new THREE.Vector3();

export function setSelectedObject(obj: THREE.Object3D | null) {
    selectedObject = obj;
    (window as any).selectedObject = obj;
    (window as any).pendingOrbitRetargetObject = null;
    
    if (obj) {
        if (!multiSelectedObjects.includes(obj)) {
            multiSelectedObjects = [obj];
        }
    } else {
        multiSelectedObjects = [];
    }
    (window as any).multiSelectedObjects = multiSelectedObjects;
}

export function toggleMultiSelectObject(obj: THREE.Object3D) {
    const index = multiSelectedObjects.indexOf(obj);
    if (index === -1) {
        multiSelectedObjects.push(obj);
    } else {
        multiSelectedObjects.splice(index, 1);
    }
    
    if (multiSelectedObjects.length === 1) {
        selectedObject = multiSelectedObjects[0];
    } else if (multiSelectedObjects.length === 0) {
        selectedObject = null;
    } else {
        // Если выбрано много, основным считается последний выбранный (для инфопанели)
        selectedObject = multiSelectedObjects[multiSelectedObjects.length - 1];
    }
    
    (window as any).selectedObject = selectedObject;
    (window as any).multiSelectedObjects = multiSelectedObjects;
}

export function setPointerDownPos(x: number, y: number) {
    pointerDownPos.set(x, y);
}

export function setIsHittingGizmo(val: boolean) {
    isHittingGizmo = val;
}

export function focusOrbitControlsOnObject(obj: THREE.Object3D | null, applyViewChange = true) {
    if (!controls || !obj) return;

    obj.updateWorldMatrix(true, true);
    orbitTargetBounds.setFromObject(obj);

    if (orbitTargetBounds.isEmpty()) {
        obj.getWorldPosition(orbitTargetCenter);
    } else {
        orbitTargetBounds.getCenter(orbitTargetCenter);
    }

    controls.setTarget(orbitTargetCenter, true, applyViewChange);
}

function configureTransformHelperVisuals(helper: THREE.Object3D) {
    helper.renderOrder = 10000;
    helper.frustumCulled = false;
    helper.traverse((node: any) => {
        node.renderOrder = 10000;
        node.frustumCulled = false;
        const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        materials.forEach((material: THREE.Material & { depthTest?: boolean; depthWrite?: boolean; toneMapped?: boolean }) => {
            material.depthTest = false;
            material.depthWrite = false;
            if ('toneMapped' in material) material.toneMapped = false;
        });
    });
}

export function syncViewportDependentSceneVisuals() {
    if (!renderer) return;
}

export function initScene(container: HTMLElement) {
    canvasContainer = container;
    canvasResizeObserver?.disconnect();
    window.cancelAnimationFrame(resizeAnimationFrame);
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f6f8);
    scene.fog = new THREE.FogExp2(0xf5f6f8, 0.01);

    const width = canvasContainer.clientWidth || window.innerWidth;
    const height = canvasContainer.clientHeight || window.innerHeight;
    const aspect = width / height;
    
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, -10, 6.5);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 1);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    
    canvasContainer.innerHTML = '';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    canvasContainer.appendChild(renderer.domElement);

    controls = new DroneOrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 1);
    controls.update();
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    
    controls.enabled = false; 

    controls.addEventListener('change', () => {
        // Убрано сверхподробное логирование вращения камеры
    });

    transformControl = new TransformControls(camera, renderer.domElement);
    transformControl.visible = false;
    transformControl.enabled = true;
    transformControl.setSpace('world');
    
    transformHelper = (transformControl as any).getHelper ? (transformControl as any).getHelper() : (transformControl as unknown as THREE.Object3D);
    configureTransformHelperVisuals(transformHelper);
    applyTransformControlsUxTheme(transformControl, transformHelper);
    scene.add(transformHelper);
    transformHelper.visible = false;
    (window as any).transformControl = transformControl;

    const dummy = new THREE.Object3D();
    dummy.name = 'selection_dummy';
    scene.add(dummy);
    selectionHelper = new THREE.BoxHelper(dummy, 0xff6b00);
    if (selectionHelper.material && !Array.isArray(selectionHelper.material)) {
        selectionHelper.material.depthTest = false;
    }
    selectionHelper.visible = false;
    selectionHelper.renderOrder = 9999;
    scene.add(selectionHelper);
    (window as any).selectionHelper = selectionHelper;
    (window as any).scene = scene;
    (window as any).camera = camera;
    (window as any).controls = controls;

    setupEnvironment(scene);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    is3DActive = true;

    const scheduleResize = () => {
        window.cancelAnimationFrame(resizeAnimationFrame);
        resizeAnimationFrame = window.requestAnimationFrame(() => {
            onWindowResize();
        });
    };

    if (typeof ResizeObserver !== 'undefined') {
        canvasResizeObserver = new ResizeObserver(() => {
            scheduleResize();
        });
        canvasResizeObserver.observe(canvasContainer);
        if (canvasContainer.parentElement) {
            canvasResizeObserver.observe(canvasContainer.parentElement);
        }
    }
}

export function onWindowResize() {
    if (!canvasContainer || !camera || !renderer) return;
    const parentElement = canvasContainer.parentElement;
    const width = Math.max(1, canvasContainer.clientWidth || parentElement?.clientWidth || 0);
    const height = Math.max(1, canvasContainer.clientHeight || parentElement?.clientHeight || 0);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    syncViewportDependentSceneVisuals();
}
