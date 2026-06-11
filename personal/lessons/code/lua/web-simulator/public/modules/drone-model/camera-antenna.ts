import * as THREE from 'three';
import { FRAME_COMPONENTS_Z_OFFSET } from './layout.js';

export function createCameraAndAntenna() {
    const group = new THREE.Group();
    
    // Camera Module (Front - now pointing along Y)
    const camGroup = new THREE.Group();
    // Move to front along Y
    camGroup.position.set(0, 0.07, 0.02 + FRAME_COMPONENTS_Z_OFFSET);
    
    // Body should be wide along X now
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    camGroup.add(camBody);
    
    const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0, metalness: 0.8 })
    );
    // Cylinder is Y-up, rotate to point along Y-forward (Z-rotation for model group, but here we rotate mesh)
    lens.rotation.x = Math.PI / 2;
    lens.position.y = 0.01;
    camGroup.add(lens);
    
    // FPV Camera Logic Object
    const fpvCamera = new THREE.PerspectiveCamera(80, 16/9, 0.01, 1000);
    fpvCamera.name = 'fpv_camera';
    // Positioned relative to camGroup, looking along Y
    fpvCamera.position.set(0, 0.11, 0.03); 
    fpvCamera.up.set(0, 0, 1); 
    fpvCamera.lookAt(new THREE.Vector3(0, 1, -0.1)); 
    camGroup.add(fpvCamera);
    
    group.add(camGroup);

    // Antenna
    const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    ant.position.set(0, -0.05, 0.08);
    ant.position.z += FRAME_COMPONENTS_Z_OFFSET;
    ant.rotation.x = -0.2;
    group.add(ant);

    // Orientation Arrow - Points along Y axis (Forward)
    const arrowHelper = new THREE.Group();
    arrowHelper.name = 'orientation_arrow';
    
    // Cylinder is Y-up by default. It already points along Y!
    const arrowShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.2, 12), 
        new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 })
    );
    arrowShaft.rotation.z = 0; 
    arrowHelper.add(arrowShaft);
    
    const arrowHead = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.06, 12), 
        new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 })
    );
    arrowHead.position.y = 0.1; // Move to the end of shaft on Y
    arrowHead.rotation.z = 0; // Point along Y
    arrowHelper.add(arrowHead);
    
    arrowHelper.position.z = 0.15 + FRAME_COMPONENTS_Z_OFFSET;
    group.add(arrowHelper);
    
    return group;
}
