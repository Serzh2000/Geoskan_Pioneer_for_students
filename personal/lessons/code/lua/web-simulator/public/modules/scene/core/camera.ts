import * as THREE from 'three';
import type { FreeFlyControls } from './FreeFlyControls.js';
import { getFreeCameraSubMode } from './camera-mode-state.js';
import { groundOverview } from './ground-overview.js';

let lastCameraMode: string | null = null;
let lastFreeSubMode: string | null = null;

export function updateCamera(
    camera: THREE.PerspectiveCamera,
    droneMesh: THREE.Object3D | null,
    controls: any,
    mode: string,
    freeFlyControls?: FreeFlyControls,
    dt = 0,
    environment?: THREE.Object3D
) {
    if (!camera) return;

    const desiredFov = mode === 'fpv' ? 75 : 50;
    // Centimetre road/yard layers need more depth precision when viewing a whole district.
    // Close drone cameras keep their short near plane so the airframe remains visible.
    const desiredNear = mode === 'fpv' || mode === 'drone' ? .025 : Math.max(.025, camera.position.z * .01);
    if (camera.fov !== desiredFov || camera.near !== desiredNear) {
        camera.fov = desiredFov;
        camera.near = desiredNear;
        camera.updateProjectionMatrix();
    }

    const overlay = document.getElementById('fpv-overlay');
    const isTransforming = (window as any).isTransforming || false;
    const freeSubMode = getFreeCameraSubMode();
    const isOrbit = mode === 'free' && freeSubMode === 'orbit';
    const isFlying = mode === 'free' && freeSubMode === 'fly';

    if (controls) {
        controls.enabled = (isOrbit && !isTransforming);
    }
    if (freeFlyControls) {
        if (isFlying && !freeFlyControls.enabled) {
            // Just switched into fly mode - pick up from wherever the
            // camera already is instead of snapping to a default facing.
            freeFlyControls.syncFromCamera();
        }
        freeFlyControls.enabled = (isFlying && !isTransforming);
    }

    if (mode === 'fpv') {
        if (overlay) overlay.style.opacity = '1';
    } else {
        if (overlay) overlay.style.opacity = '0';
    }

    if (!droneMesh) {
        // Fallback to ground view if no drone selected
        if (mode !== 'free') {
            const overview = groundOverview(camera, environment);
            if (camera.far < overview.far) { camera.far = overview.far; camera.updateProjectionMatrix(); }
            camera.position.lerp(overview.position, 0.05);
            const m = new THREE.Matrix4();
            m.lookAt(camera.position, overview.target, new THREE.Vector3(0, 1, 0));
            camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), 0.1);
        } else if (isFlying && freeFlyControls) {
            freeFlyControls.update(dt);
        } else if (controls) {
            controls.update();
        }
        return;
    }

    if (mode === 'drone') {
        // Oblique chase view preserves depth cues and keeps the aircraft readable.
        const targetPos = droneMesh.position.clone();
        targetPos.add(new THREE.Vector3(1.8, -2.8, 2.0));
        camera.position.lerp(targetPos, 0.1);
        
        // World Z remains vertical while following the drone.
        const m = new THREE.Matrix4();
        m.lookAt(camera.position, droneMesh.position, new THREE.Vector3(0, 0, 1));
        camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), 0.1);

    } else if (mode === 'fpv') {
        const fpvCamera = droneMesh.getObjectByName('fpv_camera') as THREE.PerspectiveCamera | null;
        if (fpvCamera) {
            droneMesh.updateMatrixWorld(true);
            const camWorldPos = new THREE.Vector3();
            fpvCamera.getWorldPosition(camWorldPos);
            const camWorldRot = new THREE.Quaternion();
            fpvCamera.getWorldQuaternion(camWorldRot);

            camera.position.lerp(camWorldPos, 0.5);
            camera.quaternion.slerp(camWorldRot, 0.5);
        }
    } else if (mode === 'ground') {
        // Режим "Земля" - плавный переход к виду сверху
        const overview = groundOverview(camera, environment);
        if (camera.far < overview.far) { camera.far = overview.far; camera.updateProjectionMatrix(); }
        camera.position.lerp(overview.position, 0.05);
        
        // Направляем камеру строго вниз на центр сцены
        const m = new THREE.Matrix4();
        m.lookAt(camera.position, overview.target, new THREE.Vector3(0, 1, 0));
        camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), 0.1);
        
    } else if (mode === 'free') {
        const enteringFree = lastCameraMode !== 'free';

        if (enteringFree && !camera.userData.preserveOrbitOnEntry) {
            // Start in a three-quarter view centred on the selected aircraft,
            // regardless of which free sub-mode is about to take over.
            const targetPos = droneMesh.position.clone();
            if (controls) controls.target.copy(droneMesh.position);
            camera.position.copy(targetPos.add(new THREE.Vector3(3.4, -5.2, 3.8)));
            camera.up.set(0, 0, 1);
            if (controls) {
                controls.syncSphericalFromCamera();
                controls.update();
            }
            if (freeFlyControls) freeFlyControls.syncFromCamera();
        } else if (!enteringFree && isOrbit && freeSubMode !== lastFreeSubMode && controls && !camera.userData.preserveOrbitOnEntry) {
            // Coming back from "Полёт": re-centre the orbit target in front
            // of wherever the free-fly camera ended up, instead of jumping
            // back to whatever the target was before flying took over.
            const forward = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            controls.setTarget(camera.position.clone().addScaledVector(forward, 6), true, false);
        }
        camera.userData.preserveOrbitOnEntry = false;

        if (isOrbit && controls) {
            controls.update();
        } else if (isFlying && freeFlyControls) {
            freeFlyControls.update(dt);
        }

        lastFreeSubMode = freeSubMode;
    }

    lastCameraMode = mode;
}
