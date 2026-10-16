/**
 * Single source of truth for the app's current camera view mode.
 * Replaces the previously untyped global `(window as any).cameraMode`.
 */
export type CameraMode = 'ground' | 'drone' | 'fpv' | 'free';

// Only meaningful while cameraMode === 'free': 'orbit' is the existing
// DroneOrbitControls behaviour (rotate/pan/zoom around a target point),
// 'fly' is unrestricted WASD+mouse-look flight with no target at all.
export type FreeCameraSubMode = 'orbit' | 'fly';

let cameraMode: CameraMode = 'free';
let freeCameraSubMode: FreeCameraSubMode = 'orbit';

export function getCameraMode(): CameraMode {
    return cameraMode;
}

export function setCameraMode(mode: CameraMode): void {
    cameraMode = mode;
}

export function getFreeCameraSubMode(): FreeCameraSubMode {
    return freeCameraSubMode;
}

export function setFreeCameraSubMode(mode: FreeCameraSubMode): void {
    freeCameraSubMode = mode;
}
