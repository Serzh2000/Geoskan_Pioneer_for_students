/**
 * Спрайтовые подписи осей для отладочного окружения сцены.
 * Вынесены отдельно, чтобы не смешивать UI-метки и построение пола.
 */
import * as THREE from 'three';

function makeAxisLabel(text: string, pos: THREE.Vector3, color: string, scene: THREE.Scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = color;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, 32, 48);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.set(0.5, 0.5, 0.5);
    scene.add(sprite);
}

export function createAxesLabels(scene: THREE.Scene) {
    makeAxisLabel('X', new THREE.Vector3(2.2, 0, 0.2), '#f87171', scene);
    makeAxisLabel('Y', new THREE.Vector3(0, 2.2, 0.2), '#4ade80', scene);
    makeAxisLabel('Z', new THREE.Vector3(0, 0, 2.2), '#38bdf8', scene);
}
