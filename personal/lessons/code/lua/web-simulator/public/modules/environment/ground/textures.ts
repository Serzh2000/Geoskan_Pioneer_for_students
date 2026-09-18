/**
 * Генерация и безопасная замена канвас-текстур для поверхности арены.
 * Содержит только работу с canvas/texture, без сборки сцены.
 */
import * as THREE from 'three';
import { getGroundTheme, type GroundTheme } from './theme.js';

export function createFloorTexture(textureSize = 1024, theme: GroundTheme = getGroundTheme()) {
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return new THREE.CanvasTexture(canvas);

    const dark = theme === 'dark';
    ctx.fillStyle = dark ? '#35434b' : '#cdd4d6';
    ctx.fillRect(0, 0, textureSize, textureSize);
    // Eight metres per repeat: restrained one-metre calibration grid.
    const step = textureSize / 8;
    ctx.strokeStyle = dark ? 'rgba(184,208,217,0.17)' : 'rgba(62,87,97,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const p = i * step + 0.5;
        ctx.moveTo(p, 0); ctx.lineTo(p, textureSize);
        ctx.moveTo(0, p); ctx.lineTo(textureSize, p);
    }
    ctx.stroke();
    ctx.strokeStyle = dark ? 'rgba(202,222,229,0.35)' : 'rgba(62,87,97,0.35)';
    ctx.beginPath();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const px = x * step, py = y * step;
        ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py);
        ctx.moveTo(px, py - 4); ctx.lineTo(px, py + 4);
    }
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createLandingPadTexture(theme: GroundTheme): THREE.CanvasTexture {
    const padCanvas = document.createElement('canvas');
    padCanvas.width = 1024;
    padCanvas.height = 1024;
    const ctx = padCanvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = theme === 'dark' ? '#202d35' : '#455861';
        ctx.beginPath(); ctx.arc(512, 512, 500, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f3aa59';
        ctx.lineWidth = 16;
        ctx.beginPath(); ctx.arc(512, 512, 474, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#adc0c7';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 18]);
        ctx.beginPath(); ctx.arc(512, 512, 425, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#edf3f2';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 300px Arial'; ctx.fillText('H', 512, 500);
        ctx.font = '500 32px Arial'; ctx.fillText('P I O N E E R', 512, 735);
        ctx.font = '24px Arial'; ctx.fillText('01 / LANDING ZONE', 512, 310);
        for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.translate(512, 512); ctx.rotate(i * Math.PI / 2);
            ctx.fillStyle = '#f3aa59'; ctx.fillRect(-5, -474, 10, 55);
            ctx.restore();
        }
    }

    const texture = new THREE.CanvasTexture(padCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function replaceMaterialTexture(
    material: THREE.MeshStandardMaterial | null,
    nextTexture: THREE.CanvasTexture,
    previousTexture: THREE.CanvasTexture | null,
    preserveRepeatFrom?: THREE.Texture | null
): THREE.CanvasTexture {
    if (preserveRepeatFrom) {
        nextTexture.repeat.copy(preserveRepeatFrom.repeat);
    }

    if (material) {
        material.map = nextTexture;
        material.needsUpdate = true;
    }

    if (previousTexture && previousTexture !== nextTexture) {
        previousTexture.dispose();
    }

    return nextTexture;
}
