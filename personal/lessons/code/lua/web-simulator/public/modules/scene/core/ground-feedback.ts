import * as THREE from 'three';
import { log } from '../../shared/logging/logger.js';
import { scene } from './scene-init.js';

function createGroundPointLabel(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(12, 12, canvas.width - 24, canvas.height - 24, 18);
        ctx.fill();
        ctx.stroke();
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.8, 0.7, 1);
    sprite.renderOrder = 9501;
    return { sprite, texture, material };
}

export function showGroundPoint(point: THREE.Vector3) {
    const labelText = `X: ${point.x.toFixed(2)}  Y: ${point.y.toFixed(2)}  Z: ${point.z.toFixed(2)}`;
    log(`Координаты точки на земле: ${labelText}`, 'info');

    const markerGeom = new THREE.SphereGeometry(0.08, 20, 20);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 });
    const marker = new THREE.Mesh(markerGeom, markerMat);
    marker.position.copy(point);
    marker.renderOrder = 9500;
    scene.add(marker);

    const { sprite, texture, material } = createGroundPointLabel(labelText);
    sprite.position.copy(point).add(new THREE.Vector3(0, 0, 0.45));
    scene.add(sprite);

    const startedAt = performance.now();
    const visibleMs = 5000;
    const fadeMs = 700;

    const fade = window.setInterval(() => {
        const elapsed = performance.now() - startedAt;
        const fadeProgress = Math.max(0, Math.min(1, (elapsed - visibleMs) / fadeMs));
        const opacity = 0.95 * (1 - fadeProgress);

        if (elapsed >= visibleMs + fadeMs) {
            window.clearInterval(fade);
            marker.removeFromParent();
            sprite.removeFromParent();
            marker.geometry.dispose();
            markerMat.dispose();
            material.dispose();
            texture.dispose();
            return;
        }

        marker.scale.multiplyScalar(elapsed < visibleMs ? 1.01 : 1.03);
        markerMat.opacity = opacity;
        sprite.position.z += elapsed < visibleMs ? 0.0015 : 0.01;
        material.opacity = opacity;
    }, 40);
}
