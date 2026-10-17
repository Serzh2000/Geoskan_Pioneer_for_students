import * as THREE from 'three';
import type { FreeFlyControls } from './FreeFlyControls.js';
import type { DroneOrbitControls } from './DroneOrbitControls.js';
import { getFreeCameraSubMode } from './camera-mode-state.js';
import { groundOverview } from './ground-overview.js';

let lastCameraMode: string | null = null;
let lastFreeSubMode: string | null = null;
// Следящая камера «Дрон»: где был дрон в прошлом кадре - фокус едет вместе с ним.
const lastFollowedPosition = new THREE.Vector3();
let followedDrone: THREE.Object3D | null = null;

/** Доля пути к цели за кадр, не зависящая от частоты кадров: rate - «скорость» в 1/с. */
function smoothing(rate: number, dt: number) {
    return 1 - Math.exp(-rate * Math.max(0, Math.min(dt, 0.1)));
}

export function updateCamera(
    camera: THREE.PerspectiveCamera,
    droneMesh: THREE.Object3D | null,
    controls: DroneOrbitControls | any,
    mode: string,
    freeFlyControls?: FreeFlyControls,
    dt = 0,
    environment?: THREE.Object3D
) {
    if (!camera) return;
    // Первый вызов (dt = 0) - сразу на место, дальше - плавно, одинаково при 30 и 144 кадрах/с.
    const frameDt = dt > 0 ? dt : 1;

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
    const isFollowing = mode === 'drone' && Boolean(droneMesh);

    if (controls) {
        // «Дрон» - та же орбита, только фокус привязан к дрону: вращать и приближать можно, сдвигать - нет.
        controls.enabled = ((isOrbit || isFollowing) && !isTransforming);
        controls.panEnabled = !isFollowing;
    }
    if (freeFlyControls) {
        if (isFlying && !freeFlyControls.enabled) {
            // Just switched into fly mode - pick up from wherever the
            // camera already is instead of snapping to a default facing.
            freeFlyControls.syncFromCamera();
        }
        freeFlyControls.enabled = (isFlying && !isTransforming);
    }

    if (overlay) overlay.style.opacity = mode === 'fpv' ? '1' : '0';

    if (!droneMesh) {
        // Fallback to ground view if no drone selected
        if (mode !== 'free') {
            moveToGroundOverview(camera, environment, frameDt);
        } else if (isFlying && freeFlyControls) {
            freeFlyControls.update(dt);
        } else if (controls) {
            controls.tick?.(dt);
            controls.update();
        }
        lastCameraMode = mode;
        return;
    }

    if (mode === 'drone') {
        const entering = lastCameraMode !== 'drone' || followedDrone !== droneMesh;
        if (entering) {
            // Наклонный вид сзади-сбоку, как раньше; дальше его можно вращать и приближать.
            followedDrone = droneMesh;
            lastFollowedPosition.copy(droneMesh.position);
            if (controls) {
                controls.target.copy(droneMesh.position);
                controls.radius = 3.8;
                controls.azimuth = Math.atan2(-2.8, 1.8);
                controls.elevation = Math.asin(2.0 / 3.8);
                controls.update();
            }
        } else if (controls) {
            // Фокус едет за дроном; ракурс и расстояние остаются такими, как их выставил ученик.
            controls.target.add(droneMesh.position.clone().sub(lastFollowedPosition));
            lastFollowedPosition.copy(droneMesh.position);
            controls.tick?.(dt);
            controls.update();
        }
    } else if (mode === 'fpv') {
        const fpvCamera = droneMesh.getObjectByName('fpv_camera') as THREE.PerspectiveCamera | null;
        if (fpvCamera) {
            droneMesh.updateMatrixWorld(true);
            const camWorldPos = new THREE.Vector3();
            fpvCamera.getWorldPosition(camWorldPos);
            const camWorldRot = new THREE.Quaternion();
            fpvCamera.getWorldQuaternion(camWorldRot);

            const k = smoothing(40, frameDt);
            camera.position.lerp(camWorldPos, k);
            camera.quaternion.slerp(camWorldRot, k);
        }
    } else if (mode === 'ground') {
        // Режим "Земля" - плавный переход к виду сверху
        moveToGroundOverview(camera, environment, frameDt);
    } else if (mode === 'free') {
        const enteringFree = lastCameraMode !== 'free';

        if (enteringFree && lastCameraMode === 'drone' && controls && !camera.userData.preserveOrbitOnEntry) {
            // Из «Дрон» в «Свободно» - тот же ракурс, без прыжка: орбита уже настроена.
            controls.syncSphericalFromCamera();
        } else if (enteringFree && !camera.userData.preserveOrbitOnEntry) {
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
            // Камера смотрит вдоль своей -Z (раньше здесь брали +Y - фокус уезжал вбок).
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            controls.setTarget(camera.position.clone().addScaledVector(forward, 6), true, false);
        }
        camera.userData.preserveOrbitOnEntry = false;

        if (isOrbit && controls) {
            controls.tick?.(dt);
            controls.update();
        } else if (isFlying && freeFlyControls) {
            freeFlyControls.update(dt);
        }

        lastFreeSubMode = freeSubMode;
    }

    lastCameraMode = mode;
}

function moveToGroundOverview(camera: THREE.PerspectiveCamera, environment: THREE.Object3D | undefined, dt: number) {
    const overview = groundOverview(camera, environment);
    if (camera.far < overview.far) { camera.far = overview.far; camera.updateProjectionMatrix(); }
    camera.position.lerp(overview.position, smoothing(3, dt));
    // Направляем камеру строго вниз на центр сцены
    const m = new THREE.Matrix4();
    m.lookAt(camera.position, overview.target, new THREE.Vector3(0, 1, 0));
    camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), smoothing(6, dt));
}
