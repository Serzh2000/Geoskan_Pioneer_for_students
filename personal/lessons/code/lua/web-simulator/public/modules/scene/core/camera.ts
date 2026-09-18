import * as THREE from 'three';

let lastCameraMode: string | null = null;

export function updateCamera(camera: THREE.PerspectiveCamera, droneMesh: THREE.Object3D | null, controls: any, mode: string) {
    if (!camera) return;

    const desiredFov = mode === 'fpv' ? 75 : 50;
    if (camera.fov !== desiredFov) {
        camera.fov = desiredFov;
        camera.updateProjectionMatrix();
    }

    const overlay = document.getElementById('fpv-overlay');
    
    if (controls) {
        const isTransforming = (window as any).isTransforming || false;
        controls.enabled = (mode === 'free' && !isTransforming);
    }
    
    if (mode === 'fpv') {
        if (overlay) overlay.style.opacity = '1';
    } else {
        if (overlay) overlay.style.opacity = '0';
    }

    if (!droneMesh) {
        // Fallback to ground view if no drone selected
        if (mode !== 'free') {
            const groundPos = new THREE.Vector3(0, 0, Math.max(24, 24 / camera.aspect));
            camera.position.lerp(groundPos, 0.05);
            const m = new THREE.Matrix4();
            m.lookAt(camera.position, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
            camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), 0.1);
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
        const groundPos = new THREE.Vector3(0, 0, Math.max(24, 24 / camera.aspect));
        camera.position.lerp(groundPos, 0.05);
        
        // Направляем камеру строго вниз на центр сцены
        const m = new THREE.Matrix4();
        m.lookAt(camera.position, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
        camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), 0.1);
        
    } else if (mode === 'free') {
        if (controls) {
            // Start in a three-quarter view centred on the selected aircraft.
            if (lastCameraMode !== 'free') {
                const targetPos = droneMesh.position.clone();
                controls.target.copy(droneMesh.position);
                camera.position.copy(targetPos.add(new THREE.Vector3(3.4, -5.2, 3.8)));
                camera.up.set(0, 0, 1);
                controls.syncSphericalFromCamera();
                controls.update();
            }
            controls.update();
        }
    }
    
    lastCameraMode = mode;
}
