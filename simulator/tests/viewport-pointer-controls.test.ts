import * as THREE from 'three';
import { PointerDragSession } from '../public/modules/scene/core/pointer-drag.js';
import { DroneOrbitControls } from '../public/modules/scene/core/DroneOrbitControls.js';
import { FreeFlyControls } from '../public/modules/scene/core/FreeFlyControls.js';

class CanvasStub extends EventTarget {
    isConnected = true;
    captures = new Set<number>();
    setPointerCapture(id: number) { this.captures.add(id); }
    hasPointerCapture(id: number) { return this.captures.has(id); }
    releasePointerCapture(id: number) {
        this.captures.delete(id);
        this.dispatchEvent(pointer('lostpointercapture', { pointerId: id }));
    }
}

function pointer(type: string, values: Partial<PointerEvent> = {}): PointerEvent {
    return Object.assign(new Event(type), {
        pointerId: 1, button: 0, buttons: 1, clientX: 20, clientY: 20, ...values
    }) as PointerEvent;
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
beforeEach(() => Object.defineProperty(globalThis, 'window', {
    value: new EventTarget(), configurable: true
}));
afterEach(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
});

test.each(['pointerup', 'pointercancel', 'lostpointercapture', 'blur'])('%s ends a captured drag', (type) => {
    const canvas = new CanvasStub();
    const drag = new PointerDragSession(canvas as unknown as HTMLElement);
    expect(drag.start(pointer('pointerdown'))).toBe(true);
    expect(drag.move(pointer('pointermove', { clientX: 30 }))?.x).toBe(10);
    if (type === 'lostpointercapture') canvas.releasePointerCapture(1);
    else window.dispatchEvent(type === 'blur' ? new Event(type) : pointer(type));
    expect(drag.move(pointer('pointermove', { clientX: 100 }))).toBeNull();
    expect(canvas.captures.size).toBe(0);
    expect(drag.start(pointer('pointerdown'))).toBe(true);
    drag.dispose();
});

test('moving without the original mouse button recovers from a missing release event', () => {
    const canvas = new CanvasStub();
    const drag = new PointerDragSession(canvas as unknown as HTMLElement);
    drag.start(pointer('pointerdown', { button: 2, buttons: 2 }));
    expect(drag.move(pointer('pointermove', { buttons: 1 }))).toBeNull();
    expect(canvas.captures.size).toBe(0);
    expect(drag.move(pointer('pointermove', { buttons: 2 }))).toBeNull();
    drag.dispose();
});

test('another pointer cannot take over or release the current gesture', () => {
    const canvas = new CanvasStub();
    const drag = new PointerDragSession(canvas as unknown as HTMLElement);
    drag.start(pointer('pointerdown'));
    expect(drag.start(pointer('pointerdown', { pointerId: 2 }))).toBe(false);
    window.dispatchEvent(pointer('pointerup', { pointerId: 2 }));
    expect(drag.move(pointer('pointermove', { pointerId: 2 }))).toBeNull();
    expect(drag.move(pointer('pointermove', { clientX: 35 }))?.x).toBe(15);
    drag.dispose();
});

test('detaching or relocating a canvas cancels its gesture', () => {
    const canvas = new CanvasStub();
    const drag = new PointerDragSession(canvas as unknown as HTMLElement);
    drag.start(pointer('pointerdown'));
    canvas.isConnected = false;
    expect(drag.move(pointer('pointermove'))).toBeNull();
    expect(drag.start(pointer('pointerdown'))).toBe(false);
    canvas.isConnected = true;
    expect(drag.start(pointer('pointerdown'))).toBe(true);
    drag.cancel();
    expect(drag.move(pointer('pointermove'))).toBeNull();
    drag.dispose();
});

test('orbit stops after capture loss and after switching camera modes', () => {
    const canvas = new CanvasStub();
    const controls = new DroneOrbitControls(new THREE.PerspectiveCamera(), canvas as unknown as HTMLElement);
    canvas.dispatchEvent(pointer('pointerdown'));
    canvas.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    const rotated = controls.azimuth;
    expect(rotated).not.toBe(0);
    canvas.releasePointerCapture(1);
    canvas.dispatchEvent(pointer('pointermove', { clientX: 100 }));
    expect(controls.azimuth).toBe(rotated);
    canvas.dispatchEvent(pointer('pointerdown'));
    controls.enabled = false;
    controls.enabled = true;
    canvas.dispatchEvent(pointer('pointermove', { clientX: 120 }));
    expect(controls.azimuth).toBe(rotated);
    expect(canvas.captures.size).toBe(0);
});

test('free flight stops mouse look on blur and after switching modes', () => {
    const canvas = new CanvasStub();
    const camera = new THREE.PerspectiveCamera();
    const controls = new FreeFlyControls(camera, canvas as unknown as HTMLElement);
    controls.syncFromCamera();
    controls.enabled = true;
    canvas.dispatchEvent(pointer('pointerdown'));
    canvas.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    controls.update(0);
    const rotated = camera.quaternion.clone();
    window.dispatchEvent(new Event('blur'));
    canvas.dispatchEvent(pointer('pointermove', { clientX: 100 }));
    controls.update(0);
    expect(camera.quaternion.angleTo(rotated)).toBeLessThan(1e-7);
    canvas.dispatchEvent(pointer('pointerdown'));
    controls.enabled = false;
    controls.enabled = true;
    canvas.dispatchEvent(pointer('pointermove', { clientX: 120 }));
    controls.update(0);
    expect(camera.quaternion.angleTo(rotated)).toBeLessThan(1e-7);
    controls.dispose();
});

describe('right-button pan in the top-down view', () => {
    function setup(targetZ: number, elevation: number) {
        const canvas = new CanvasStub() as unknown as HTMLElement & CanvasStub;
        const camera = new THREE.PerspectiveCamera();
        const controls = new DroneOrbitControls(camera, canvas as unknown as HTMLElement);
        controls.target.set(0, 0, targetZ);
        controls.radius = 20;
        controls.azimuth = -Math.PI / 2;
        controls.elevation = elevation;
        controls.update();
        return { canvas, controls };
    }
    const drag = (canvas: CanvasStub, controls: DroneOrbitControls, dy: number) => {
        const before = controls.target.clone();
        canvas.dispatchEvent(pointer('pointerdown', { button: 2, buttons: 2, clientX: 100, clientY: 100 }));
        canvas.dispatchEvent(pointer('pointermove', { button: 2, buttons: 2, clientX: 100, clientY: 100 + dy }));
        canvas.dispatchEvent(pointer('pointerup', { button: 2, buttons: 0 }));
        return controls.target.clone().sub(before);
    };

    test.each([-8, 0, 12])('both directions move the view from straight above with the focus at z=%d', targetZ => {
        const { canvas, controls } = setup(targetZ, Math.PI / 2 - 0.011);
        const up = drag(canvas, controls, -40), down = drag(canvas, controls, 40);
        expect(Math.hypot(up.x, up.y)).toBeGreaterThan(1);
        expect(Math.hypot(down.x, down.y)).toBeGreaterThan(1);
        expect(Math.sign(up.y)).toBe(-Math.sign(down.y));
    });

    test('an oblique view pans along the ground and keeps the focus height', () => {
        const { canvas, controls } = setup(-8, 0.5);
        const moved = drag(canvas, controls, -40);
        expect(moved.z).toBeCloseTo(0, 5);
        expect(Math.hypot(moved.x, moved.y)).toBeGreaterThan(1);
    });
});

// The stub canvas has no layout: the controls assume an 800 x 600 viewport.
const VIEW = { width: 800, height: 600 };

function groundPointUnder(camera: THREE.PerspectiveCamera, x: number, y: number) {
    const raycaster = new THREE.Raycaster();
    camera.updateMatrixWorld();
    raycaster.setFromCamera(new THREE.Vector2((x / VIEW.width) * 2 - 1, -(y / VIEW.height) * 2 + 1), camera);
    return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), new THREE.Vector3());
}

function orbitAt(radius: number, elevation = 0.8) {
    const canvas = new CanvasStub() as unknown as HTMLElement & CanvasStub;
    const camera = new THREE.PerspectiveCamera(50, VIEW.width / VIEW.height, 0.025, 300);
    const controls = new DroneOrbitControls(camera, canvas as unknown as HTMLElement);
    controls.target.set(0, 0, 0);
    controls.radius = radius;
    controls.azimuth = -Math.PI / 2;
    controls.elevation = elevation;
    controls.update();
    return { canvas, camera, controls };
}

function wheel(deltaY: number, clientX = 400, clientY = 300, ctrlKey = false) {
    return Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode: 0, clientX, clientY, ctrlKey }) as WheelEvent;
}

describe('orbit camera navigation', () => {
    test('the ground point grabbed with the right button stays under the cursor', () => {
        const { canvas, camera } = orbitAt(30);
        const grabbed = groundPointUnder(camera, 300, 350)!;
        canvas.dispatchEvent(pointer('pointerdown', { button: 2, buttons: 2, clientX: 300, clientY: 350 }));
        canvas.dispatchEvent(pointer('pointermove', { button: 2, buttons: 2, clientX: 520, clientY: 260 }));
        canvas.dispatchEvent(pointer('pointerup', { button: 2, buttons: 0 }));
        const now = groundPointUnder(camera, 520, 260)!;
        expect(now.distanceTo(grabbed)).toBeLessThan(0.02);
    });

    test('middle button and Shift+left button pan too', () => {
        for (const values of [{ button: 1, buttons: 4 }, { button: 0, buttons: 1, shiftKey: true }]) {
            const { canvas, controls } = orbitAt(30);
            const before = controls.target.clone();
            canvas.dispatchEvent(pointer('pointerdown', { ...values, clientX: 300, clientY: 300 }));
            canvas.dispatchEvent(pointer('pointermove', { ...values, clientX: 360, clientY: 300 }));
            expect(controls.target.distanceTo(before)).toBeGreaterThan(1);
            expect(controls.azimuth).toBe(-Math.PI / 2);
        }
    });

    test('zoom follows the amount scrolled: many small trackpad steps equal one mouse notch', () => {
        const mouse = orbitAt(40), pad = orbitAt(40);
        mouse.canvas.dispatchEvent(wheel(100));
        for (let i = 0; i < 25; i++) pad.canvas.dispatchEvent(wheel(4));
        mouse.controls.tick(5);
        pad.controls.tick(5);
        expect(mouse.controls.radius).toBeGreaterThan(40 * 1.1);
        expect(mouse.controls.radius).toBeLessThan(40 * 1.35);
        expect(pad.controls.radius).toBeCloseTo(mouse.controls.radius, 1);
    });

    test('zooming keeps the ground point under the cursor in place', () => {
        const { canvas, camera, controls } = orbitAt(60);
        const under = groundPointUnder(camera, 620, 420)!;
        for (let i = 0; i < 4; i++) canvas.dispatchEvent(wheel(-120, 620, 420));
        for (let i = 0; i < 60; i++) controls.tick(1 / 60);
        expect(controls.radius).toBeLessThan(40);
        expect(groundPointUnder(camera, 620, 420)!.distanceTo(under)).toBeLessThan(0.05);
    });

    test('the whole 600 m map is reachable: corners as focus, full view as distance', () => {
        const { controls, camera } = orbitAt(30);
        controls.setTarget(new THREE.Vector3(290, -290, 0));
        expect(controls.target.x).toBeCloseTo(290, 5);
        expect(controls.target.y).toBeCloseTo(-290, 5);
        controls.radius = 10000;
        controls.update();
        expect(controls.radius).toBeGreaterThanOrEqual(700);
        expect(camera.far).toBeGreaterThan(controls.radius);
    });
});
