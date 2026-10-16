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

    test('an oblique view still stops at the height limit instead of sliding sideways', () => {
        const { canvas, controls } = setup(-8, 0.5);
        const moved = drag(canvas, controls, -40);
        expect(moved.z).toBeCloseTo(0, 5);
        expect(Math.hypot(moved.x, moved.y)).toBeLessThan(1e-6);
    });
});
