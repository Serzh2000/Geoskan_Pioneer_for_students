import * as THREE from 'three';
import { setCommonMeta, applyShadows } from './utils.js';

export function createStyledLandingPad(text: string, bgColor = '#2563eb', textColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 15;
        ctx.strokeRect(15, 15, 226, 226);
        
        if (text !== 'H') {
            ctx.setLineDash([20, 10]);
            ctx.strokeRect(35, 35, 186, 186);
            ctx.setLineDash([]);
        }

        ctx.fillStyle = textColor;
        ctx.font = 'bold 120px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.95 })
    );
    setCommonMeta(mesh, `Площадка ${text}`, { collidableRadius: 1 });
    mesh.position.z = 0.01;
    return mesh;
}

export function createTransportMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Транспорт', { collidableRadius: 0.5 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.62, metalness: 0.18 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.75, metalness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x9ecae1,
        roughness: 0.2,
        metalness: 0.08,
        transparent: true,
        opacity: 0.72
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.56, 0.18), bodyMat);
    chassis.position.z = 0.19;
    group.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.22), bodyMat);
    cabin.position.set(-0.08, 0, 0.39);
    group.add(cabin);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.52, 0.12), bodyMat);
    hood.position.set(0.37, 0, 0.29);
    group.add(hood);

    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.14), bodyMat);
    rear.position.set(-0.43, 0, 0.28);
    group.add(rear);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.18), glassMat);
    windshield.position.set(0.06, 0, 0.42);
    windshield.rotation.y = -0.55;
    group.add(windshield);

    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.16), glassMat);
    rearWindow.position.set(-0.28, 0, 0.41);
    rearWindow.rotation.y = 0.8;
    group.add(rearWindow);

    const sideWindowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.12), glassMat);
    sideWindowLeft.position.set(-0.06, 0.25, 0.42);
    group.add(sideWindowLeft);

    const sideWindowRight = sideWindowLeft.clone();
    sideWindowRight.position.y = -0.25;
    group.add(sideWindowRight);

    const bumperFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.08), trimMat);
    bumperFront.position.set(0.56, 0, 0.16);
    group.add(bumperFront);

    const bumperRear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), trimMat);
    bumperRear.position.set(-0.56, 0, 0.16);
    group.add(bumperRear);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.55 });
    [
        [0.32, 0.31],
        [0.32, -0.31],
        [-0.32, 0.31],
        [-0.32, -0.31]
    ].forEach(([x, y]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 18), wheelMat);
        wheel.position.set(x, y, 0.12);
        group.add(wheel);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 14), rimMat);
        rim.position.set(x, y, 0.12);
        group.add(rim);
    });

    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xfff3b0, emissiveIntensity: 0.25 });
    const taillightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.22 });
    [
        [0.54, 0.18, headlightMat],
        [0.54, -0.18, headlightMat],
        [-0.54, 0.17, taillightMat],
        [-0.54, -0.17, taillightMat]
    ].forEach(([x, y, material]) => {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.05), material as THREE.Material);
        light.position.set(x as number, y as number, 0.22);
        group.add(light);
    });

    applyShadows(group);
    return group;
}
