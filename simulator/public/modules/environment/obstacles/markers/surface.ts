import * as THREE from 'three';
import { isMarkerObject } from './object.js';
import {
    MARKER_LOCAL_NORMAL,
    MarkerSurfaceCandidate,
    SHEET_THICKNESS,
    SURFACE_EPSILON
} from './shared.js';
import { clamp } from '../../../shared/math.js';

// Unlike the shared `clamp`, this treats an inverted (min > max) range as
// degenerate rather than undefined behavior and collapses it to the
// midpoint - callers rely on always getting a point back for box-surface
// projection even when a box axis has zero size.
function clampValue(value: number, min: number, max: number) {
    if (min > max) return (min + max) / 2;
    return clamp(value, min, max);
}

function makeCandidate(position: THREE.Vector3, anchor: THREE.Vector3, normal: THREE.Vector3): MarkerSurfaceCandidate {
    return {
        anchor,
        normal,
        score: position.distanceToSquared(anchor)
    };
}

function addBoxSurfaceCandidates(
    candidates: MarkerSurfaceCandidate[],
    position: THREE.Vector3,
    box: THREE.Box3
) {
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.lengthSq() < 0.0001) return;

    const x = clampValue(position.x, box.min.x, box.max.x);
    const y = clampValue(position.y, box.min.y, box.max.y);
    const z = clampValue(position.z, box.min.z, box.max.z);

    candidates.push(makeCandidate(position, new THREE.Vector3(x, y, box.max.z), new THREE.Vector3(0, 0, 1)));
    if (size.z > SURFACE_EPSILON) {
        candidates.push(makeCandidate(position, new THREE.Vector3(box.min.x, y, z), new THREE.Vector3(-1, 0, 0)));
        candidates.push(makeCandidate(position, new THREE.Vector3(box.max.x, y, z), new THREE.Vector3(1, 0, 0)));
        candidates.push(makeCandidate(position, new THREE.Vector3(x, box.min.y, z), new THREE.Vector3(0, -1, 0)));
        candidates.push(makeCandidate(position, new THREE.Vector3(x, box.max.y, z), new THREE.Vector3(0, 1, 0)));
    }
}

export function snapMarkerToSurface(object: THREE.Object3D, surfaceObjects: THREE.Object3D[] = []) {
    if (!isMarkerObject(object)) return false;

    const marker = object as THREE.Group;
    const currentPosition = marker.position.clone();
    const candidates: MarkerSurfaceCandidate[] = [
        makeCandidate(currentPosition, new THREE.Vector3(currentPosition.x, currentPosition.y, 0), new THREE.Vector3(0, 0, 1))
    ];

    for (const surface of surfaceObjects) {
        if (!surface || surface === marker || surface.parent === marker || marker.parent === surface) continue;
        if (isMarkerObject(surface)) continue;
        const box = new THREE.Box3().setFromObject(surface);
        if (box.isEmpty()) continue;
        addBoxSurfaceCandidates(candidates, currentPosition, box);
    }

    let best = candidates[0];
    for (const candidate of candidates) {
        if (candidate.score < best.score) best = candidate;
    }

    const normal = best.normal.clone().normalize();
    marker.position.copy(best.anchor).addScaledVector(normal, SHEET_THICKNESS * 0.5 + SURFACE_EPSILON);
    marker.quaternion.setFromUnitVectors(MARKER_LOCAL_NORMAL, normal);
    marker.userData.surfaceNormal = { x: normal.x, y: normal.y, z: normal.z };
    return true;
}
