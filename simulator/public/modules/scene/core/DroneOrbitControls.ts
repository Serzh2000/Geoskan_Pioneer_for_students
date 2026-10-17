import * as THREE from 'three';
import { PointerDragSession } from './pointer-drag.js';

/*
 * Орбитальная камера «Свободно → Орбита» (и следящая камера «Дрон»):
 * вращение вокруг точки фокуса, сдвиг и приближение.
 *
 *  - ЛКМ - вращение; ПКМ, средняя кнопка или Shift+ЛКМ - сдвиг;
 *  - колесо и щипок тачпада - приближение к точке под курсором;
 *  - два пальца на сенсорном экране - сдвиг и щипок;
 *  - стрелки - сдвиг, PageUp/PageDown - фокус выше/ниже, +/- - приближение.
 *
 * Сдвиг «хватает землю»: точка горизонтальной плоскости фокуса под курсором
 * идёт за курсором, как на карте. Раньше сдвиг шёл в плоскости экрана
 * со скоростью 0.005 * радиус на пиксель - втрое быстрее курсора - и при
 * взгляде сверху упирался в предел высоты фокуса.
 *
 * Приближение пропорционально величине прокрутки (тачпад шлёт десятки мелких
 * событий, мышь - редкие крупные) и плавное: радиус догоняет цель за ~0.1 с.
 * Вся конфигурация камеры масштабируется относительно точки под курсором,
 * поэтому всё, что лежит на луче курсора, остаётся под ним.
 *
 * Пределы рассчитаны на карты 600 x 600 м: фокус достаёт до углов карты,
 * а отдаление показывает её целиком.
 */
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 800;
// Фокус может уйти немного под землю: сдвиг у самой земли не должен упираться в ноль.
const MIN_TARGET_Z = -8;
// Высотные дома города - до ~100 м.
const MAX_TARGET_Z = 150;
// Сама камера под землю не уходит никогда - отдельный предел в update().
const MIN_CAMERA_Z = 0.15;
// Половина карты 300 м плюс запас: угол карты лежит в 424 м от центра.
const MAX_TARGET_DISTANCE = 460;
// Колесо: множитель радиуса exp(deltaY * WHEEL_ZOOM_RATE) - щелчок мыши (100) даёт ~x1.2.
const WHEEL_ZOOM_RATE = 0.0018;
// Щипок тачпада приходит как wheel с ctrlKey и мелкими deltaY.
const PINCH_ZOOM_RATE = 0.012;
const MAX_ZOOM_STEP = 2.5;
// Плавность приближения: доля оставшегося пути за секунду (экспонента).
const ZOOM_SMOOTHING = 18;
// Ниже этого угла над горизонтом плоскость фокуса видна почти ребром - сдвиг в плоскости экрана.
const GROUND_PAN_MIN_ELEVATION = 0.12;
const KEY_PAN_SHARE = 0.6;        // доля радиуса в секунду при зажатой стрелке
const KEY_ZOOM_PER_SECOND = 2.2;  // во сколько раз за секунду меняется радиус от +/-
const ROTATE_RATE = 0.005;        // радиан на пиксель при rotateSpeed = 1

type ControlsEvent = 'start' | 'change' | 'end';

const PAN_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'pageup', 'pagedown', '+', '=', '-', '_']);

function isEditableTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element || typeof element.closest !== 'function') return false;
    return Boolean(element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], .monaco-editor'));
}

/**
 * Клавиши достаются камере, только когда фокус на сцене или ни на чём (body):
 * стрелки в списке дронов, меню и полях принадлежат им.
 */
export function isSceneKeyTarget(target: EventTarget | null, sceneElement: HTMLElement): boolean {
    if (isEditableTarget(target)) return false;
    if (typeof document === 'undefined') return true;
    const element = target as Node | null;
    if (!element || element === document.body || element === document.documentElement || (element as unknown) === document) return true;
    const scene = sceneElement.parentElement ?? sceneElement;
    return typeof scene.contains === 'function' && scene.contains(element);
}

export class DroneOrbitControls {
    camera: THREE.PerspectiveCamera;
    domElement: HTMLElement;
    target: THREE.Vector3 = new THREE.Vector3();

    private active = true;
    get enabled(): boolean { return this.active; }
    set enabled(value: boolean) {
        if (!value) this.cancelInteraction();
        this.active = value;
    }
    /** Следящая камера: фокус привязан к дрону, сдвиг выключен. */
    panEnabled = true;

    radius: number = 10;
    minRadius: number = MIN_RADIUS;
    maxRadius: number = MAX_RADIUS;
    azimuth: number = 0;
    elevation: number = Math.PI / 4;

    rotateSpeed: number = 1.0;
    zoomSpeed: number = 1.2;
    panSpeed: number = 1.0;

    private drag: PointerDragSession;
    private dragMode: 'rotate' | 'pan' | null = null;
    private panAnchor: THREE.Vector3 | null = null;
    private panPlaneZ = 0;

    // Плавное приближение: цель радиуса и точка, относительно которой масштабируется вид.
    private zoomGoal: number | null = null;
    private zoomAnchor: THREE.Vector3 | null = null;

    // Сенсорный экран: два пальца - сдвиг и щипок.
    private touches = new Map<number, { x: number; y: number }>();
    private pinchDistance = 0;
    private pinchCenter = { x: 0, y: 0 };

    private pressedKeys = new Set<string>();

    private listeners: Record<string, Array<() => void>> = {};
    private readonly raycaster = new THREE.Raycaster();
    private readonly plane = new THREE.Plane();
    private readonly ndc = new THREE.Vector2();
    private readonly hit = new THREE.Vector3();

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.drag = new PointerDragSession(domElement);

        this.syncSphericalFromCamera();

        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.domElement.addEventListener('pointercancel', this.onPointerUp.bind(this));
        this.domElement.addEventListener('wheel', this.onWheel.bind(this) as EventListener, { passive: false });
        this.domElement.addEventListener('contextmenu', e => e.preventDefault());
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('keydown', this.onKeyDown.bind(this));
            window.addEventListener('keyup', (event) => this.pressedKeys.delete(event.key.toLowerCase()));
            window.addEventListener('blur', () => this.pressedKeys.clear());
        }

        this.update();
    }

    // ------------------------------------------------------------ пределы

    private clampTargetToSceneBounds() {
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
        if (typeof window === 'undefined') return false;
        const transformControl = (window as any).transformControl;
        return Boolean(
            (window as any).isTransforming ||
            (window as any).isHittingGizmo ||
            transformControl?.dragging ||
            (transformControl?.axis != null)
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
        this.zoomGoal = null;
        this.zoomAnchor = null;
    }

    setTarget(target: THREE.Vector3, preserveCameraPosition = false, applyViewChange = true) {
        this.target.copy(target);
        this.clampTargetToSceneBounds();
        if (preserveCameraPosition) {
            this.syncSphericalFromCamera();
        }
        this.zoomGoal = null;
        this.zoomAnchor = null;
        if (applyViewChange) {
            this.update();
        }
    }

    // ------------------------------------------------------------ события

    addEventListener(type: string, listener: () => void) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: () => void) {
        this.listeners[type] = this.listeners[type]?.filter(cb => cb !== listener) ?? [];
    }

    dispatchEvent(type: ControlsEvent | string) {
        if (this.listeners[type]) {
            for (const cb of this.listeners[type]) cb();
        }
    }

    cancelInteraction(): void {
        this.drag?.cancel();
        this.dragMode = null;
        this.panAnchor = null;
        this.touches?.clear();
        this.pressedKeys?.clear();
    }

    // ------------------------------------------------------------ геометрия

    private viewportRect() {
        const rect = typeof this.domElement.getBoundingClientRect === 'function'
            ? this.domElement.getBoundingClientRect()
            : null;
        if (rect && rect.width > 0 && rect.height > 0) return rect;
        return { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
    }

    /** Луч из камеры через точку экрана (clientX, clientY). */
    private rayAt(clientX: number, clientY: number) {
        const rect = this.viewportRect();
        this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        this.camera.updateMatrixWorld();
        this.raycaster.setFromCamera(this.ndc, this.camera);
        return this.raycaster.ray;
    }

    /** Точка горизонтальной плоскости z = planeZ под курсором; null, если луч идёт мимо или слишком полого. */
    private planePointAt(clientX: number, clientY: number, planeZ: number): THREE.Vector3 | null {
        const ray = this.rayAt(clientX, clientY);
        this.plane.set(new THREE.Vector3(0, 0, 1), -planeZ);
        const point = ray.intersectPlane(this.plane, this.hit);
        if (!point) return null;
        // Почти у горизонта точка улетает на километры: такой «захват» бесполезен.
        if (point.distanceTo(ray.origin) > Math.max(60, this.radius * 25)) return null;
        return point.clone();
    }

    /** Мировых единиц на пиксель экрана на расстоянии фокуса. */
    private unitsPerPixel() {
        const rect = this.viewportRect();
        const fov = THREE.MathUtils.degToRad(this.camera.fov || 50);
        return (2 * this.radius * Math.tan(fov / 2)) / rect.height;
    }

    // ------------------------------------------------------------ мышь

    onPointerDown(e: PointerEvent) {
        if (!this.enabled || this.isTransformInteractionActive()) return;

        if (e.pointerType === 'touch') {
            this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (this.touches.size === 2) {
                // Второй палец: одиночное вращение заканчивается, начинается жест двумя пальцами.
                this.drag.cancel();
                this.dragMode = null;
                this.startPinch();
                return;
            }
            if (this.touches.size > 2) return;
        }

        const pan = e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
        if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
        if (pan && !this.panEnabled) return;
        if (!this.drag.start(e)) return;
        if (e.button === 1 && typeof e.preventDefault === 'function') e.preventDefault(); // без автопрокрутки браузера
        this.dragMode = pan ? 'pan' : 'rotate';
        this.zoomGoal = null;
        this.zoomAnchor = null;
        if (pan) this.beginPan(e.clientX, e.clientY);
        this.dispatchEvent('start');
    }

    onPointerMove(e: PointerEvent) {
        if (!this.enabled || this.isTransformInteractionActive()) {
            this.cancelInteraction();
            return;
        }
        if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
            this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (this.touches.size === 2) {
                this.movePinch();
                return;
            }
        }
        const delta = this.drag.move(e);
        if (!delta) return;

        if (this.dragMode === 'rotate') {
            this.azimuth -= delta.x * ROTATE_RATE * this.rotateSpeed;
            this.elevation += delta.y * ROTATE_RATE * this.rotateSpeed;
            this.clampElevation();
            this.update();
        } else if (this.dragMode === 'pan') {
            this.panTo(e.clientX, e.clientY, delta.x, delta.y);
        }
    }

    onPointerUp(e: PointerEvent) {
        if (e.pointerType === 'touch') {
            this.touches.delete(e.pointerId);
            if (this.touches.size < 2) this.pinchDistance = 0;
        }
        if (typeof this.domElement.hasPointerCapture === 'function' && this.domElement.hasPointerCapture(e.pointerId)) {
            this.drag.cancel();
        }
        if (this.dragMode) {
            this.dragMode = null;
            this.panAnchor = null;
            this.dispatchEvent('end');
        }
    }

    // ------------------------------------------------------------ сдвиг

    private beginPan(clientX: number, clientY: number) {
        this.panPlaneZ = this.target.z;
        this.panAnchor = this.elevation >= GROUND_PAN_MIN_ELEVATION
            ? this.planePointAt(clientX, clientY, this.panPlaneZ)
            : null;
    }

    /**
     * Точка, схваченная при нажатии, остаётся под курсором: фокус и камера
     * сдвигаются на разницу между ней и точкой плоскости под курсором сейчас.
     */
    private panTo(clientX: number, clientY: number, dx: number, dy: number) {
        if (this.panAnchor) {
            const current = this.planePointAt(clientX, clientY, this.panPlaneZ);
            if (current) {
                this.target.x += (this.panAnchor.x - current.x) * this.panSpeed;
                this.target.y += (this.panAnchor.y - current.y) * this.panSpeed;
                this.clampTargetToSceneBounds();
                this.update();
                return;
            }
        }
        this.panScreen(dx, dy);
    }

    /** Сдвиг в плоскости экрана: камера смотрит почти горизонтально, плоскость земли не схватить. */
    private panScreen(dx: number, dy: number) {
        const forward = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 0, 1)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const scale = this.unitsPerPixel() * this.panSpeed;
        this.target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
        this.clampTargetToSceneBounds();
        this.update();
    }

    /** Сдвиг фокуса по земле относительно взгляда: forward - от камеры к фокусу. */
    panBy(forwardMeters: number, rightMeters: number, upMeters = 0) {
        const forward = new THREE.Vector2(-Math.cos(this.azimuth), -Math.sin(this.azimuth));
        const right = new THREE.Vector2(-forward.y, forward.x).multiplyScalar(-1);
        this.target.x += forward.x * forwardMeters + right.x * rightMeters;
        this.target.y += forward.y * forwardMeters + right.y * rightMeters;
        this.target.z += upMeters;
        this.clampTargetToSceneBounds();
        this.update();
    }

    // ------------------------------------------------------------ приближение

    private normalizedWheelDelta(e: WheelEvent) {
        // deltaMode 1 - строки (Firefox), 2 - страницы.
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.viewportRect().height : 1;
        return e.deltaY * unit;
    }

    onWheel(e: WheelEvent) {
        if (!this.enabled || this.isTransformInteractionActive()) return;
        e.preventDefault();
        e.stopPropagation();

        const delta = this.normalizedWheelDelta(e);
        if (!delta) return;
        const rate = (e.ctrlKey ? PINCH_ZOOM_RATE : WHEEL_ZOOM_RATE) * this.zoomSpeed;
        const step = THREE.MathUtils.clamp(Math.exp(delta * rate), 1 / MAX_ZOOM_STEP, MAX_ZOOM_STEP);
        this.zoomAt(step, e.clientX, e.clientY);
    }

    /** Приблизить (step < 1) или отдалить (step > 1) вид к точке экрана; без координат - к фокусу. */
    zoomAt(step: number, clientX?: number, clientY?: number, smooth = true) {
        const current = this.zoomGoal ?? this.radius;
        const goal = THREE.MathUtils.clamp(current * step, this.minRadius, this.maxRadius);
        if (Math.abs(goal - current) < 1e-6) return;
        this.zoomGoal = goal;

        if (clientX === undefined || clientY === undefined) {
            this.zoomAnchor = null;
        } else {
            // Якорь - точка земли под курсором; если луч уходит в небо - точка на расстоянии фокуса.
            const point = this.planePointAt(clientX, clientY, 0)
                ?? this.rayAt(clientX, clientY).at(this.radius, new THREE.Vector3());
            this.zoomAnchor = point.clone();
        }
        if (!smooth) this.tick(1);
        else this.dispatchEvent('start');
    }

    /** Один шаг плавного приближения; масштаб всей конфигурации - относительно якоря. */
    private applyZoomStep(dt: number) {
        if (this.zoomGoal === null) return false;
        const k = 1 - Math.exp(-ZOOM_SMOOTHING * Math.max(0, dt));
        let next = this.radius + (this.zoomGoal - this.radius) * k;
        if (Math.abs(this.zoomGoal - next) < this.zoomGoal * 1e-3) next = this.zoomGoal;
        const ratio = next / this.radius;
        if (this.zoomAnchor && Number.isFinite(ratio)) {
            this.target.sub(this.zoomAnchor).multiplyScalar(ratio).add(this.zoomAnchor);
            this.clampTargetToSceneBounds();
        }
        this.radius = next;
        if (next === this.zoomGoal) {
            this.zoomGoal = null;
            this.zoomAnchor = null;
        }
        return true;
    }

    // ------------------------------------------------------------ сенсорный экран

    private touchPair() {
        const [a, b] = [...this.touches.values()];
        return { a, b, distance: Math.hypot(a.x - b.x, a.y - b.y), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    }

    private startPinch() {
        const { distance, center } = this.touchPair();
        this.pinchDistance = distance;
        this.pinchCenter = center;
        this.zoomGoal = null;
        if (this.panEnabled) this.beginPan(center.x, center.y);
    }

    private movePinch() {
        const { distance, center } = this.touchPair();
        if (this.pinchDistance > 0 && distance > 0) {
            this.zoomAt(this.pinchDistance / distance, center.x, center.y, false);
        }
        if (this.panEnabled) {
            this.panTo(center.x, center.y, center.x - this.pinchCenter.x, center.y - this.pinchCenter.y);
        } else {
            this.update();
        }
        this.pinchDistance = distance;
        this.pinchCenter = center;
    }

    // ------------------------------------------------------------ клавиатура

    private onKeyDown(event: KeyboardEvent) {
        if (!this.enabled || event.altKey || event.ctrlKey || event.metaKey) return;
        if (!isSceneKeyTarget(event.target, this.domElement)) return;
        const key = event.key.toLowerCase();
        if (!PAN_KEYS.has(key)) return;
        // Стрелки и PageUp/PageDown не должны прокручивать страницу под сценой.
        event.preventDefault();
        this.pressedKeys.add(key);
    }

    private applyKeys(dt: number) {
        if (this.pressedKeys.size === 0 || dt <= 0) return false;
        const has = (key: string) => this.pressedKeys.has(key);
        const step = this.radius * KEY_PAN_SHARE * dt;
        const forward = (has('arrowup') ? 1 : 0) - (has('arrowdown') ? 1 : 0);
        const right = (has('arrowright') ? 1 : 0) - (has('arrowleft') ? 1 : 0);
        const up = (has('pageup') ? 1 : 0) - (has('pagedown') ? 1 : 0);
        const zoom = (has('-') || has('_') ? 1 : 0) - (has('+') || has('=') ? 1 : 0);
        if (this.panEnabled && (forward || right || up)) this.panBy(forward * step, right * step, up * step);
        if (zoom) {
            this.zoomGoal = null;
            this.zoomAnchor = null;
            this.radius = THREE.MathUtils.clamp(this.radius * Math.pow(KEY_ZOOM_PER_SECOND, zoom * dt), this.minRadius, this.maxRadius);
        }
        return true;
    }

    // ------------------------------------------------------------ кадр

    /** Вызывается каждый кадр: плавное приближение и клавиши. */
    tick(dt: number) {
        const zoomed = this.applyZoomStep(dt);
        const keyed = this.applyKeys(dt);
        if (zoomed || keyed) this.update();
    }

    update() {
        this.clampRadius();
        this.clampTargetToSceneBounds();
        this.clampElevation();

        // Сферические координаты относительно оси Z.
        const x = this.radius * Math.cos(this.elevation) * Math.cos(this.azimuth);
        const y = this.radius * Math.cos(this.elevation) * Math.sin(this.azimuth);
        const z = this.radius * Math.sin(this.elevation);

        this.camera.position.set(this.target.x + x, this.target.y + y, Math.max(MIN_CAMERA_Z, this.target.z + z));

        const upX = -Math.sin(this.elevation) * Math.cos(this.azimuth);
        const upY = -Math.sin(this.elevation) * Math.sin(this.azimuth);
        const upZ = Math.cos(this.elevation);
        this.camera.up.set(upX, upY, upZ).normalize();
        this.camera.lookAt(this.target);

        // Отдалённый вид на всю карту не должен обрезаться дальней плоскостью.
        const far = Math.max(300, this.radius + 650);
        if (this.camera.far < far) {
            this.camera.far = far;
            this.camera.updateProjectionMatrix();
        }

        this.dispatchEvent('change');
    }
}
