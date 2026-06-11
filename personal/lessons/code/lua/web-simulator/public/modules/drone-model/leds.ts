import * as THREE from 'three';
import { FRAME_COMPONENTS_Z_OFFSET } from './layout.js';

export function createLEDs() {
    const ledGroup = new THREE.Group();
    
    // 4 Base LEDs (under the motors or on the arms, let's put them on the arms)
    const baseLedOffsets = [
        [0.04, 0.04],   // FR
        [0.04, -0.04],  // BR
        [-0.04, -0.04], // BL
        [-0.04, 0.04]   // FL
    ];
    baseLedOffsets.forEach((offset, i) => {
        const ledGeom = new THREE.SphereGeometry(0.008, 12, 12);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const ledMesh = new THREE.Mesh(ledGeom, ledMat);
        ledMesh.name = `base_led_${i}`;
        ledMesh.position.set(offset[0], offset[1], 0.038 + FRAME_COMPONENTS_Z_OFFSET);
        ledGroup.add(ledMesh);
        
        // Add a small light to each base LED
        const light = new THREE.PointLight(0x000000, 0, 0.4);
        light.name = `base_led_light_${i}`;
        ledMesh.add(light);
    });

    // LED Matrix 5x5 Module (Top)
    const ledMatrixGroup = new THREE.Group();
    ledMatrixGroup.position.z = 0.045 + FRAME_COMPONENTS_Z_OFFSET; // Above the top plate
    const matrixBoardGeom = new THREE.BoxGeometry(0.07, 0.07, 0.002);
    const matrixBoardMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const matrixBoard = new THREE.Mesh(matrixBoardGeom, matrixBoardMat);
    matrixBoard.castShadow = true;
    ledMatrixGroup.add(matrixBoard);

    // 5x5 Physical LED meshes
    const ledSpacing = 0.012;
    const ledGeom = new THREE.BoxGeometry(0.008, 0.008, 0.002);
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const index = row * 5 + col;
            const xOffset = (col - 2) * ledSpacing;
            const yOffset = (2 - row) * ledSpacing;
            
            const ledMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const ledMesh = new THREE.Mesh(ledGeom, ledMat);
            ledMesh.name = `matrix_led_${index}`;
            ledMesh.position.set(xOffset, yOffset, 0.002); // slightly above board
            ledMatrixGroup.add(ledMesh);
        }
    }
    
    ledGroup.add(ledMatrixGroup);
    return ledGroup;
}
