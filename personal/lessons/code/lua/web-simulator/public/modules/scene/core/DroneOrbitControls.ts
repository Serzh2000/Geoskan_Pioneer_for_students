import * as THREE from 'three';

/*
 * Пределы подобраны под дальнюю плоскость камеры (300) и размер арены:
 * даже на максимальном отдалении из самой дальней точки фокуса сцена
 * остаётся внутри фрустума и не исчезает с экрана.
 */
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 120;
// A hard floor at 0 stopped a downward right-click pan dead the instant the
// focus point touched ground level, even though the camera itself was still
// well above it. Some negative headroom lets that gesture keep moving.
const MIN_TARGET_Z = -8;
const MAX_TARGET_Z = 12;
const MAX_TARGET_DISTANCE = 150;

export class DroneOrbitControls {
    camera: THREE.PerspectiveCamera;
    domElement: HTMLElement;
    target: THREE.Vector3 = new THREE.Vector3();

    enabled: boolean = true;

    radius: number = 10;
    minRadius: number = MIN_RADIUS;
    maxRadius: number = MAX_RADIUS;
    azimuth: number = 0;
    elevation: number = Math.PI / 4;

    rotateSpeed: number = 1.0;
    zoomSpeed: number = 1.2;
    panSpeed: number = 1.0;

    private isDragging: boolean = false;
    private previousMouse: {x: number, y: number} = {x: 0, y: 0};
    private mouseButton: number = -1;

    private listeners: Record<string, Array<() => void>> = {};
    private pointerWorld: THREE.Vector3 = new THREE.Vector3();
    private pointerDirection: THREE.Vector3 = new THREE.Vector3();
    private pointerFocus: THREE.Vector3 = new THREE.Vector3();

    private clampTargetToSceneBounds() {
        // Точка фокуса держится над землёй и в пределах рабочей зоны, иначе
        // её легко увести туда, где сцены уже нет.
        this.target.z = Math.max(MIN_TARGET_Z, Math.min(MAX_TARGET_Z, this.target.z));

        const planarDistance = Math.hypot(this.target.x, this.target.y);
        if (planarDistance > MAX_TARGET_DISTANCE) {
            const scale = MAX_TARGET_DISTANCE / planarDistance;
            this.target.x *= scale;
            this.target.y *= scale;
        }
    }

    private clampRadius() {
        this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));
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

    /**
     * Пересчитывает сферические координаты из текущей позиции камеры.
     * Единственное место с этой формулой — внешние модули зовут её вместо
     * того, чтобы писать radius/azimuth/elevation напрямую.
     */
    syncSphericalFromCamera() {
        const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
        this.radius = offset.length();
        this.clampRadius();
        const planarRadius = Math.hypot(offset.x, offset.y);
        this.elevation = Math.atan2(offset.z, planarRadius);
        this.clampElevation();
        this.azimuth = Math.atan2(offset.y, offset.x);
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

        this.syncSphericalFromCamera();

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

    /**
     * Доля вертикального шага, которую разрешает предел высоты фокуса.
     * Нужна, чтобы упёршийся в предел экранный сдвиг не применялся частично:
     * иначе его горизонтальная составляющая уводит вид вбок вместо того,
     * чтобы движение просто остановилось.
     */
    private allowedVerticalScale(deltaZ: number): number {
        if (Math.abs(deltaZ) < 1e-6) return 1;

        const clamped = Math.max(MIN_TARGET_Z, Math.min(MAX_TARGET_Z, this.target.z + deltaZ));
        return (clamped - this.target.z) / deltaZ;
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
            const forward = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
            const up = this.camera.up.clone();
            // `right` лежит в горизонтальной плоскости, поэтому высоты фокуса
            // касается только вертикальная составляющая.
            const right = new THREE.Vector3().crossVectors(forward, up).normalize();
            const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize();

            const factor = this.radius * 0.005 * this.panSpeed;
            const panX = right.multiplyScalar(-deltaX * factor);
            const panY = actualUp.multiplyScalar(deltaY * factor);
            panY.multiplyScalar(this.allowedVerticalScale(panY.z));

            this.target.add(panX).add(panY);
            this.clampTargetToSceneBounds();
            this.update();
        }
    }

    onPointerUp(e: PointerEvent) {
        this.isDragging = false;
        this.mouseButton = -1;
        if (this.domElement.hasPointerCapture(e.pointerId)) {
            this.domElement.releasePointerCapture(e.pointerId);
        }
    }

    /**
     * Смещает точку фокуса так, чтобы точка сцены под курсором осталась на
     * месте: направление взгляда задаётся азимутом и наклоном и при зуме не
     * меняется, поэтому достаточно сдвинуть target вдоль луча курсора.
     */
    private zoomTowardsPointer(event: WheelEvent, previousRadius: number) {
        const ratio = this.radius / previousRadius;
        // Упёрлись в предел — фокус не трогаем, иначе он «плывёт» на месте.
        if (!Number.isFinite(ratio) || Math.abs(1 - ratio) < 1e-4) return;

        const rect = this.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        this.camera.updateMatrixWorld();
        this.pointerWorld
            .set(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1,
                0.5
            )
            .unproject(this.camera);

        this.pointerDirection.subVectors(this.pointerWorld, this.camera.position).normalize();
        this.pointerFocus.copy(this.camera.position).addScaledVector(this.pointerDirection, previousRadius);
        this.target.lerp(this.pointerFocus, 1 - ratio);
        this.clampTargetToSceneBounds();
    }

    onWheel(e: WheelEvent) {
        if (!this.enabled || this.isTransformInteractionActive()) return;
        e.preventDefault();
        e.stopPropagation();

        const zoomFactor = Math.pow(0.85, this.zoomSpeed);
        const previousRadius = this.radius;

        if (e.deltaY > 0) {
            this.radius /= zoomFactor;
        } else {
            this.radius *= zoomFactor;
        }
        this.clampRadius();

        this.zoomTowardsPointer(e, previousRadius);
        this.update();
    }

    update() {
        this.clampRadius();
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
