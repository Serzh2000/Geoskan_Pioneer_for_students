import * as THREE from 'three';
import { PointerDragSession } from './pointer-drag.js';

/*
 * Unrestricted fly-through camera for the "free" view's "Полёт" sub-mode -
 * the counterpart to DroneOrbitControls' "Орбита" sub-mode, which always
 * orbits a fixed target. This one has no target at all: LMB-drag looks
 * around (yaw/pitch), WASD moves along the view direction, Space/C move
 * straight up/down, Shift boosts speed. Z stays vertical throughout,
 * matching the rest of the scene's up-axis convention (see
 * DroneOrbitControls' own spherical setup).
 */

const LOOK_SENSITIVITY = 0.0032;
const BASE_SPEED = 6; // world units / second
const BOOST_MULTIPLIER = 3;
const MIN_PITCH = -Math.PI / 2 + 0.02;
const MAX_PITCH = Math.PI / 2 - 0.02;
// Keeps the camera from flying through the ground plane; matches the small
// clearance DroneOrbitControls' own elevation clamp effectively enforces.
const MIN_CAMERA_Z = 0.15;

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', ' ', 'c', 'shift']);

export class FreeFlyControls {
    camera: THREE.PerspectiveCamera;
    domElement: HTMLElement;
    private active = false;
    get enabled(): boolean { return this.active; }
    set enabled(value: boolean) {
        if (!value) this.cancelInteraction();
        this.active = value;
    }

    private yaw = 0;
    private pitch = 0;
    private drag: PointerDragSession;
    private pressedKeys = new Set<string>();

    private readonly onPointerDown: (event: PointerEvent) => void;
    private readonly onPointerMove: (event: PointerEvent) => void;
    private readonly onPointerUp: (event: PointerEvent) => void;
    private readonly onKeyDown: (event: KeyboardEvent) => void;
    private readonly onKeyUp: (event: KeyboardEvent) => void;
    private readonly onBlur: () => void;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.drag = new PointerDragSession(domElement);

        this.onPointerDown = (event) => {
            if (!this.enabled || event.button !== 0) return;
            this.drag.start(event);
        };
        this.onPointerMove = (event) => {
            if (!this.enabled) return;
            const delta = this.drag.move(event);
            if (!delta) return;
            const deltaX = delta.x;
            const deltaY = delta.y;
            this.yaw -= deltaX * LOOK_SENSITIVITY;
            this.pitch = THREE.MathUtils.clamp(this.pitch - deltaY * LOOK_SENSITIVITY, MIN_PITCH, MAX_PITCH);
        };
        this.onPointerUp = (event) => {
            if (this.domElement.hasPointerCapture?.(event.pointerId)) {
                this.cancelInteraction();
            }
        };
        this.onKeyDown = (event) => {
            if (!this.enabled) return;
            const key = event.key.toLowerCase();
            if (!MOVE_KEYS.has(key)) return;
            this.pressedKeys.add(key);
            event.preventDefault();
        };
        this.onKeyUp = (event) => {
            this.pressedKeys.delete(event.key.toLowerCase());
        };
        this.onBlur = () => this.cancelInteraction();

        this.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.domElement.addEventListener('pointermove', this.onPointerMove);
        this.domElement.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
    }

    /** Derives yaw/pitch from the camera's current facing so entering fly mode doesn't snap the view. */
    syncFromCamera(): void {
        // A camera's own local viewing direction is -Z (the same convention
        // every Matrix4.lookAt() call in this codebase relies on), not +Y.
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.yaw = Math.atan2(forward.y, forward.x);
        this.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(forward.z, -1, 1)), MIN_PITCH, MAX_PITCH);
    }

    private getBasis() {
        const forward = new THREE.Vector3(
            Math.cos(this.pitch) * Math.cos(this.yaw),
            Math.cos(this.pitch) * Math.sin(this.yaw),
            Math.sin(this.pitch)
        );
        const right = new THREE.Vector3(Math.sin(this.yaw), -Math.cos(this.yaw), 0);
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        return { forward, right, up };
    }

    update(dt: number): void {
        if (!this.enabled) return;

        const { forward, right } = this.getBasis();
        const move = new THREE.Vector3();
        if (this.pressedKeys.has('w')) move.add(forward);
        if (this.pressedKeys.has('s')) move.sub(forward);
        if (this.pressedKeys.has('d')) move.add(right);
        if (this.pressedKeys.has('a')) move.sub(right);
        if (this.pressedKeys.has(' ')) move.z += 1;
        if (this.pressedKeys.has('c')) move.z -= 1;

        if (move.lengthSq() > 0) {
            move.normalize();
            const speed = BASE_SPEED * (this.pressedKeys.has('shift') ? BOOST_MULTIPLIER : 1);
            this.camera.position.addScaledVector(move, speed * dt);
        }

        this.camera.position.z = Math.max(MIN_CAMERA_Z, this.camera.position.z);

        const { forward: lookForward } = this.getBasis();
        const target = this.camera.position.clone().add(lookForward);
        const m = new THREE.Matrix4().lookAt(this.camera.position, target, new THREE.Vector3(0, 0, 1));
        this.camera.quaternion.setFromRotationMatrix(m);
    }

    dispose(): void {
        this.drag.dispose();
        this.cancelInteraction();
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.domElement.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
    }

    cancelInteraction(): void {
        this.drag?.cancel();
        this.pressedKeys.clear();
    }
}
