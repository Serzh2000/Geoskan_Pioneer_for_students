import * as THREE from 'three';
import type { ScenePathPoint } from '../../environment/obstacles.js';

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const SNAP_THRESHOLD = 0.18;

type HoverPointResult = {
    point: ScenePathPoint;
    worldPoint: ScenePathPoint;
    snapAxes: string[];
};

type RefreshPreviewOptions = {
    active: boolean;
    previewGroup: THREE.Group | null;
    scene: THREE.Scene | null;
    target: THREE.Object3D | null;
    workingPoints: ScenePathPoint[];
    hoverPoint: ScenePathPoint | null;
};

export function cloneLinearPoints(points: ScenePathPoint[]) {
    return points.map((point) => ({ x: point.x, y: point.y, z: point.z ?? 0 }));
}

export function localPointToWorldVector(point: ScenePathPoint, target: THREE.Object3D | null) {
    const local = new THREE.Vector3(point.x, point.y, point.z ?? 0);
    if (!target) return local;
    return target.localToWorld(local);
}

export function worldVectorToLocalPoint(point: THREE.Vector3, target: THREE.Object3D | null): ScenePathPoint {
    if (!target) {
        return { x: point.x, y: point.y, z: point.z };
    }
    const local = target.worldToLocal(point.clone());
    return {
        x: local.x,
        y: local.y,
        z: local.z
    };
}

function roundIfClose(value: number) {
    const rounded = Math.round(value);
    return Math.abs(value - rounded) <= SNAP_THRESHOLD ? rounded : value;
}

function applySoftSnap(point: THREE.Vector3) {
    const next = point.clone();
    const snapAxes: string[] = [];

    const snappedX = roundIfClose(next.x);
    if (snappedX !== next.x) snapAxes.push('X');
    next.x = snappedX;

    const snappedY = roundIfClose(next.y);
    if (snappedY !== next.y) snapAxes.push('Y');
    next.y = snappedY;

    const snappedZ = roundIfClose(next.z);
    if (snappedZ !== next.z) snapAxes.push('Z');
    next.z = Math.max(0, snappedZ);

    return { point: next, snapAxes };
}

export function setLinearEditingCoordsHint(point: ScenePathPoint | null, snapAxes: string[] = []) {
    const coordsEl = document.getElementById('scene-click-coords');
    if (!coordsEl) return;
    if (!point) {
        coordsEl.style.display = 'none';
        coordsEl.textContent = '';
        return;
    }

    const snappedText = snapAxes.length ? ` | прилипание: ${snapAxes.join(', ')}` : '';
    coordsEl.textContent =
        `Курсор: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}${snappedText}`;
    coordsEl.style.display = 'block';
}

function disposePreviewGroup(previewGroup: THREE.Group | null) {
    if (!previewGroup) return;
    previewGroup.removeFromParent();
    previewGroup.traverse((node: any) => {
        if (node.geometry) node.geometry.dispose();
        if (!node.material) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material: THREE.Material) => material.dispose());
    });
}

function buildMarker(point: ScenePathPoint, color: number, radius: number) {
    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            depthTest: false
        })
    );
    marker.position.set(point.x, point.y, point.z ?? 0);
    marker.renderOrder = 9800;
    return marker;
}

export function refreshLinearEditingPreview(options: RefreshPreviewOptions) {
    disposePreviewGroup(options.previewGroup);
    if (!options.active || !options.scene) return null;

    const group = new THREE.Group();
    group.name = '__linear_feature_preview__';

    const previewPoints = cloneLinearPoints(options.workingPoints);
    if (options.hoverPoint) previewPoints.push({ ...options.hoverPoint });

    if (previewPoints.length >= 2) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(
            previewPoints.map((point) => localPointToWorldVector(point, options.target))
        );
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.95,
            depthTest: false
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.renderOrder = 9799;
        group.add(line);
    }

    options.workingPoints.forEach((point, index) => {
        const worldPoint = localPointToWorldVector(point, options.target);
        group.add(buildMarker(
            { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z },
            index === 0 ? 0x34d399 : 0x38bdf8,
            0.12
        ));
    });

    if (options.hoverPoint) {
        const worldPoint = localPointToWorldVector(options.hoverPoint, options.target);
        group.add(buildMarker(
            { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z },
            0xf59e0b,
            0.1
        ));
    }

    group.traverse((node: any) => {
        node.renderOrder = 9800;
    });
    options.scene.add(group);
    return group;
}

export function getLinearEditingHoverPointFromEvent(
    event: PointerEvent,
    target: THREE.Object3D | null,
    renderer: THREE.WebGLRenderer | null,
    camera: THREE.Camera | null,
    raycaster: THREE.Raycaster | null
): HoverPointResult | null {
    if (!renderer || !camera || !raycaster) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);

    const intersection = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, intersection)) return null;
    const snapped = applySoftSnap(intersection);

    return {
        point: worldVectorToLocalPoint(snapped.point, target),
        worldPoint: {
            x: snapped.point.x,
            y: snapped.point.y,
            z: snapped.point.z
        },
        snapAxes: snapped.snapAxes
    };
}

