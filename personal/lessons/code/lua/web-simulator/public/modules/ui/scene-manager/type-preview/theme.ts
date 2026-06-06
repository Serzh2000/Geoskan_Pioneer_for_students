/**
 * Тема и базовая площадка для 3D-превью типов объектов сцены.
 * Нужен для переиспользования в контроллере превью без дублирования цветов.
 */
import * as THREE from 'three';

export type PreviewTheme = 'light' | 'dark';

export function getPreviewTheme(): PreviewTheme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function createPreviewGround(size: number, theme: PreviewTheme) {
    const geometry = new THREE.CircleGeometry(size, 64);
    const material = new THREE.MeshStandardMaterial({
        color: theme === 'dark' ? 0x1e293b : 0xffffff,
        roughness: theme === 'dark' ? 0.94 : 0.98,
        metalness: theme === 'dark' ? 0.06 : 0.02
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = -0.001;
    mesh.receiveShadow = true;
    return mesh;
}
