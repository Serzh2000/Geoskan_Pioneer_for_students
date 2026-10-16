import type { PerspectiveCamera } from 'three';
import type { DroneOrbitControls } from '../../../scene/core/DroneOrbitControls.js';

type OrbitView = Pick<DroneOrbitControls, 'target' | 'radius' | 'maxRadius' | 'azimuth' | 'elevation'>;

export function captureCameraView(camera: PerspectiveCamera, controls?: OrbitView) {
    return {
        position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(),
        zoom: camera.zoom, fov: camera.fov, near: camera.near, far: camera.far,
        orbit: controls ? {
            target: controls.target.clone(), radius: controls.radius, maxRadius: controls.maxRadius,
            azimuth: controls.azimuth, elevation: controls.elevation
        } : null
    };
}

export function restoreCameraView(camera: PerspectiveCamera, view: ReturnType<typeof captureCameraView>, controls?: OrbitView): void {
    camera.position.copy(view.position);
    camera.quaternion.copy(view.quaternion);
    camera.up.copy(view.up);
    camera.zoom = view.zoom; camera.fov = view.fov; camera.near = view.near; camera.far = view.far;
    if (controls && view.orbit) {
        controls.target.copy(view.orbit.target);
        controls.radius = view.orbit.radius; controls.maxRadius = view.orbit.maxRadius;
        controls.azimuth = view.orbit.azimuth; controls.elevation = view.orbit.elevation;
    }
    // The free camera's next frame must preserve the restored explicit view.
    camera.userData.preserveOrbitOnEntry = true;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
}
