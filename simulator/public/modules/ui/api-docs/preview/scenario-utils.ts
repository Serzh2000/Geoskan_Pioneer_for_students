import * as THREE from 'three';
import type { ApiPreviewRenderContext } from './types.js';

export function setFloorGlowOpacity(ctx: ApiPreviewRenderContext, opacity: number): void {
    if (!ctx.floorGlow) return;
    (ctx.floorGlow.material as THREE.MeshBasicMaterial).opacity = opacity;
}

export function setMarkerScale(marker: THREE.Object3D | null, scale: number): void {
    marker?.scale.setScalar(scale);
}

export function buildArcPoints(radius: number, start: number, end: number, z = 0.04, segments = 18): THREE.Vector3[] {
    return Array.from({ length: segments + 1 }, (_, index) => {
        const t = index / segments;
        const angle = start + (end - start) * t;
        return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
    });
}
