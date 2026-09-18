import * as THREE from 'three';

export function setupLights(scene: THREE.Scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(ambientLight);
    
    // Main top-down light for clean shadows
    const mainLight = new THREE.DirectionalLight(0xfff3e4, 2.4);
    mainLight.position.set(-6, -4, 12);
    mainLight.castShadow = true;
    // One shadow-casting light, tightly fitted to the 18 m training arena.
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -14;
    mainLight.shadow.camera.right = 14;
    mainLight.shadow.camera.top = 14;
    mainLight.shadow.camera.bottom = -14;
    mainLight.shadow.bias = -0.0001;
    mainLight.shadow.normalBias = 0.015;
    scene.add(mainLight);

    // Soft fills for a bright engineering lab look
    const fill1 = new THREE.DirectionalLight(0xffffff, 0.42);
    fill1.position.set(-15, 10, 5);
    scene.add(fill1);

    const fill2 = new THREE.DirectionalLight(0xfff3eb, 0.28);
    fill2.position.set(15, -10, 5);
    scene.add(fill2);
    
    const hemiLight = new THREE.HemisphereLight(0xd8ebff, 0x59616b, 1.0);
    hemiLight.position.set(0, 0, 20);
    scene.add(hemiLight);
}
