import * as THREE from 'three';

/*
 * The ESP32 camera module on the optical-flow board.
 *
 * On the real Pioneer the ESP32 module is what runs a Python mission and
 * streams the camera, so the simulator shows it plugged in exactly then:
 * when a Python script starts, the module rises from below into the two
 * white 1x8 headers of the optical-flow board; on "Стоп"/"Сброс" it slides
 * back out and disappears. Its lens is where the drone's camera
 * (fpv_camera: FPV view, Camera.get_frame / get_cv_frame) looks from.
 */

const PLUG_TRAVEL = 0.06;      // scene units (2 per metre): 3 cm below the headers
const PLUG_SECONDS = 0.7;
const CAMERA_FOV = 80;

type Esp32State = {
    node: THREE.Object3D;
    base: THREE.Vector3;
    progress: number;
    target: number;
};

function stateOf(model: THREE.Object3D): Esp32State | null {
    return (model.userData.esp32 as Esp32State | undefined) ?? null;
}

/** Called once the GLB is attached: registers the module and the lens camera. */
export function setupEsp32Module(model: THREE.Object3D, instance: THREE.Object3D) {
    const node = instance.getObjectByName('esp32_module');
    if (node && node.children.length > 0) {
        model.add(node);
        node.visible = false;
        model.userData.esp32 = { node, base: node.position.clone(), progress: 0, target: 0 } satisfies Esp32State;
        applyPose(stateOf(model)!);
    }

    // The camera exists with or without the module, so the FPV view keeps
    // working for Lua too; the Blender asset has no camera object of its own.
    if (!model.getObjectByName('fpv_camera')) {
        const lens = instance.getObjectByName('esp32_camera');
        const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.01, 1000);
        camera.name = 'fpv_camera';
        camera.position.copy(lens?.position ?? new THREE.Vector3(0, 0.16, 0.07));
        camera.position.y += 0.004; // just in front of the glass
        camera.up.set(0, 0, 1);
        // Forward (+Y) with the same slight downward tilt as before.
        camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 1, -0.1)));
        model.add(camera);
    }
}

export function setEsp32Attached(model: THREE.Object3D, attached: boolean) {
    const state = stateOf(model);
    if (state) state.target = attached ? 1 : 0;
}

function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

function applyPose(state: Esp32State) {
    // Fully out: hidden, but parked at its seated pose so it never skews the
    // drone's bounds (Box3 ignores visibility).
    if (state.progress <= 0) {
        state.node.visible = false;
        state.node.position.copy(state.base);
        return;
    }
    const eased = easeOutCubic(state.progress);
    state.node.visible = true;
    state.node.position.set(state.base.x, state.base.y, state.base.z - (1 - eased) * PLUG_TRAVEL);
}

export function updateEsp32Module(model: THREE.Object3D, dt: number) {
    const state = stateOf(model);
    if (!state || state.progress === state.target) return;
    const step = dt / PLUG_SECONDS;
    state.progress = state.target > state.progress
        ? Math.min(state.target, state.progress + step)
        : Math.max(state.target, state.progress - step);
    applyPose(state);
}
