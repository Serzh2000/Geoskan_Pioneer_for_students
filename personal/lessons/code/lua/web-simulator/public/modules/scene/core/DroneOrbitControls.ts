import * as THREE from 'three';
import { log } from '../../shared/logging/logger.js';

export class DroneOrbitControls {
    camera: THREE.PerspectiveCamera;
    domElement: HTMLElement;
    target: THREE.Vector3 = new THREE.Vector3();
    
    enabled: boolean = true;
    
    radius: number = 10;
    minRadius: number = 0.05;
    azimuth: number = 0; 
    elevation: number = Math.PI / 4; 
    
    rotateSpeed: number = 1.0;
    zoomSpeed: number = 1.2;
    panSpeed: number = 1.0;
    
    private isDragging: boolean = false;
    private previousMouse: {x: number, y: number} = {x: 0, y: 0};
    private mouseButton: number = -1;
    
    private listeners: Record<string, Array<() => void>> = {};
    private pendingObjectBounds: THREE.Box3 = new THREE.Box3();
    private pendingObjectCenter: THREE.Vector3 = new THREE.Vector3();
    private projectedCenter: THREE.Vector3 = new THREE.Vector3();
    private lastZoomDebugAt = 0;
    private skippedZoomDebugCount = 0;

    private debugZoom(message: string, force = false) {
        const now = Date.now();
        if (!force && now - this.lastZoomDebugAt < 250) return;
        this.lastZoomDebugAt = now;
        log(`[GUIDE-ZOOM] ${message}`, 'info');
        console.info('[GUIDE-ZOOM]', message);
    }

    private clampTargetToSceneBounds() {
        // Ограничиваем высоту таргета, чтобы он не улетал в небо при панорамировании.
        // Для симулятора дрона 2 метра - достаточный предел для точки фокуса.
        this.target.z = Math.max(0, Math.min(2.0, this.target.z));
    }

    private clampElevation() {
        const maxElevation = (Math.PI / 2) - 0.01;
        const minElevation = 0.01;
        this.elevation = Math.max(minElevation, Math.min(maxElevation, this.elevation));
    }

    private isTransformInteractionActive() {
        const transformControl = (window as any).transformControl;
        return Boolean(
            (window as any).isTransforming ||
            (window as any).isHittingGizmo ||
            transformControl?.dragging ||
            transformControl?.axis !== null
        );
    }

    private syncSphericalFromCamera() {
        const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
        const radius = offset.length();
        this.radius = Math.max(this.minRadius, radius);
        const planarRadius = Math.hypot(offset.x, offset.y);
        this.elevation = Math.atan2(offset.z, planarRadius);
        this.clampElevation();
        this.azimuth = Math.atan2(offset.y, offset.x);
    }

    private syncTargetToPendingObjectIfInView() {
        const pendingObject = (window as any).pendingOrbitRetargetObject as THREE.Object3D | null | undefined;
        if (!pendingObject) return;

        pendingObject.updateWorldMatrix(true, true);
        this.pendingObjectBounds.setFromObject(pendingObject);
        if (this.pendingObjectBounds.isEmpty()) {
            pendingObject.getWorldPosition(this.pendingObjectCenter);
        } else {
            this.pendingObjectBounds.getCenter(this.pendingObjectCenter);
        }

        this.projectedCenter.copy(this.pendingObjectCenter).project(this.camera);
        const isInView =
            this.projectedCenter.z >= -1 &&
            this.projectedCenter.z <= 1 &&
            Math.abs(this.projectedCenter.x) <= 0.75 &&
            Math.abs(this.projectedCenter.y) <= 0.75;

        if (isInView) {
            this.setTarget(this.pendingObjectCenter, true, false);
        }

        (window as any).pendingOrbitRetargetObject = null;
    }

    setTarget(target: THREE.Vector3, preserveCameraPosition = false, applyViewChange = true) {
        this.target.copy(target);
        this.clampTargetToSceneBounds();
        if (preserveCameraPosition) {
            this.syncSphericalFromCamera();
        }
        if (applyViewChange) {
            this.update();
        }
    }

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Инициализация из текущей позиции камеры
        const offset = new THREE.Vector3().subVectors(camera.position, this.target);
        this.radius = Math.max(this.minRadius, offset.length() || 10);
        const planarRadius = Math.hypot(offset.x, offset.y);
        this.elevation = Math.atan2(offset.z, planarRadius);
        this.clampElevation();
        this.azimuth = Math.atan2(offset.y, offset.x);
        
        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        this.domElement.addEventListener('contextmenu', e => e.preventDefault());
        
        this.update();
    }
    
    addEventListener(type: string, listener: () => void) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(listener);
    }
    
    dispatchEvent(type: string) {
        if (this.listeners[type]) {
            for (const cb of this.listeners[type]) cb();
        }
    }
    
    onPointerDown(e: PointerEvent) {
        if (!this.enabled || this.isTransformInteractionActive()) return;
        this.isDragging = true;
        this.mouseButton = e.button;
        this.previousMouse = { x: e.clientX, y: e.clientY };
        this.domElement.setPointerCapture(e.pointerId);
    }
    
    onPointerMove(e: PointerEvent) {
        if (!this.enabled || !this.isDragging || this.isTransformInteractionActive()) return;
        
        const deltaX = e.clientX - this.previousMouse.x;
        const deltaY = e.clientY - this.previousMouse.y;
        this.previousMouse = { x: e.clientX, y: e.clientY };
        
        if (this.mouseButton === 0) { // ЛКМ: Вращение
            this.azimuth -= deltaX * 0.005 * this.rotateSpeed;
            this.elevation += deltaY * 0.005 * this.rotateSpeed;

            // Камера остается в верхней полусфере и не может уйти под сцену.
            this.clampElevation();

            this.update();
        } else if (this.mouseButton === 2) { // ПКМ: Панорамирование
            // Возвращаем классическое панорамирование (вдоль экрана), 
            // но с жестким ограничением высоты таргета в clampTargetToSceneBounds.
            const forward = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
            const up = this.camera.up.clone();
            const right = new THREE.Vector3().crossVectors(forward, up).normalize();
            const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize();
            
            const factor = this.radius * 0.005 * this.panSpeed;
            const panX = right.multiplyScalar(-deltaX * factor);
            const panY = actualUp.multiplyScalar(deltaY * factor);
            
            this.target.add(panX).add(panY);
            this.clampTargetToSceneBounds();
            this.update();
        }
    }
    
    onPointerUp(e: PointerEvent) {
        this.isDragging = false;
        this.mouseButton = -1;
        this.domElement.releasePointerCapture(e.pointerId);
    }
    
    onWheel(e: WheelEvent) {
        const transformInteractionActive = this.isTransformInteractionActive();
        if (!this.enabled || transformInteractionActive) {
            this.skippedZoomDebugCount += 1;
            this.debugZoom(
                `wheel ignored enabled=${String(this.enabled)} transform=${String(transformInteractionActive)} mode=${String((window as any).cameraMode)} ctrl=${String(e.ctrlKey)} deltaY=${e.deltaY.toFixed(2)} skipped=${this.skippedZoomDebugCount}`
            );
            return;
        }
        e.preventDefault();
        e.stopPropagation();

        // Убрана автоматическая перепривязка зума к объекту (syncTargetToPendingObjectIfInView),
        // так как это приводило к скачкам радиуса при панорамировании.

        // Увеличен базовый шаг экспоненциального зума (0.85 вместо 0.95), 
        // чтобы приближение было быстрее.
        const zoomFactor = Math.pow(0.85, this.zoomSpeed);
        
        const previousRadius = this.radius;
        if (e.deltaY > 0) {
            this.radius /= zoomFactor;
        } else {
            this.radius *= zoomFactor;
        }
        
        this.radius = Math.max(this.minRadius, this.radius);
        this.debugZoom(
            `wheel applied mode=${String((window as any).cameraMode)} ctrl=${String(e.ctrlKey)} deltaY=${e.deltaY.toFixed(2)} radius=${previousRadius.toFixed(3)}->${this.radius.toFixed(3)}`,
            true
        );
        this.update();
    }
    
    update() {
        // Радиус - это расстояние, он не должен становиться отрицательным.
        this.radius = Math.max(this.minRadius, this.radius);
        this.clampTargetToSceneBounds();
        this.clampElevation();

        // Вычисляем новую позицию камеры (сферические координаты относительно оси Z)
        const x = this.radius * Math.cos(this.elevation) * Math.cos(this.azimuth);
        const y = this.radius * Math.cos(this.elevation) * Math.sin(this.azimuth);
        const z = this.radius * Math.sin(this.elevation);
        
        const newPos = new THREE.Vector3(this.target.x + x, this.target.y + y, this.target.z + z);
        this.camera.position.copy(newPos);
        
        // Вычисляем правильный up вектор
        const upX = -Math.sin(this.elevation) * Math.cos(this.azimuth);
        const upY = -Math.sin(this.elevation) * Math.sin(this.azimuth);
        const upZ = Math.cos(this.elevation);
        
        this.camera.up.set(upX, upY, upZ).normalize();
        this.camera.lookAt(this.target);
        
        this.dispatchEvent('change');
    }
}
