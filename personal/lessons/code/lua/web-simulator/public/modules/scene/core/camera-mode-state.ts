/**
 * Single source of truth for the app's current camera view mode.
 * Replaces the previously untyped global `(window as any).cameraMode`.
 */
export type CameraMode = 'ground' | 'drone' | 'fpv' | 'free';

let cameraMode: CameraMode = 'free';

export function getCameraMode(): CameraMode {
    return cameraMode;
}

export function setCameraMode(mode: CameraMode): void {
    cameraMode = mode;
}
