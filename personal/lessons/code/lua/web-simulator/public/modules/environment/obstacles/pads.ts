import * as THREE from 'three';
import { setCommonMeta } from './utils.js';
import { attachInfraNodeB } from './infra-props.js';

export function createStyledLandingPad(text: string, bgColor = '#2563eb', textColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#29383f'; ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = bgColor === '#ef4444' ? '#d39861' : bgColor === '#2563eb' ? '#7cabb4' : '#91bca8';
        ctx.lineWidth = 8; ctx.strokeRect(14, 14, 484, 484);
        ctx.lineWidth = 2; ctx.strokeRect(30, 30, 452, 452);
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (text === '⚡') {
            // Vector symbol avoids platform-specific colour emoji rendering.
            ctx.beginPath(); ctx.moveTo(278, 128); ctx.lineTo(196, 268);
            ctx.lineTo(250, 268); ctx.lineTo(234, 360); ctx.lineTo(322, 216);
            ctx.lineTo(268, 216); ctx.closePath(); ctx.fill();
        } else {
            ctx.font = '600 180px Arial'; ctx.fillText(text, 256, 247);
        }
        ctx.font = '20px Arial';
        ctx.fillText(text === 'H' ? 'LANDING' : text === '⚡' ? 'CHARGING' : 'START / ' + text, 256, 425);
        for (const x of [56, 456]) for (const y of [56, 456]) {
            ctx.fillStyle = '#91a0a4'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })
    );
    setCommonMeta(mesh, `Площадка ${text}`, { collidableRadius: 1 });
    mesh.position.z = 0.025;
    mesh.receiveShadow = true;
    return mesh;
}

export function createTransportMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Транспорт', { collidableRadius: 0.5 });
    attachInfraNodeB(group, 'Transport');
    return group;
}
