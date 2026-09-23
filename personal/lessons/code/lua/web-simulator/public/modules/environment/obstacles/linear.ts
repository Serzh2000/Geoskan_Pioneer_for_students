import * as THREE from 'three';
import { ScenePathPoint, SceneObjectOptions } from './types.js';
import { setCommonMeta, applyShadows, clearGeneratedChildren } from './utils.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';

function toPointList(points?: ScenePathPoint[]) {
    if (points && points.length >= 2) {
        return points.map((point) => ({ x: point.x, y: point.y, z: point.z ?? 0 }));
    }
    return [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 },
        { x: 9, y: 3, z: 0 }
    ];
}

function makePathCurve(points: ScenePathPoint[], closed = false) {
    const vertices = points.map(point => new THREE.Vector3(point.x, point.y, point.z));
    // CatmullRom's endpoint extrapolation shares scratch storage for a two-point curve.
    if (vertices.length === 2) vertices.splice(1, 0, vertices[0].clone().lerp(vertices[1], 0.5));
    return new THREE.CatmullRomCurve3(
        vertices,
        closed,
        'catmullrom',
        0.5
    );
}

function buildOrientedBox(length: number, width: number, height: number, material: THREE.Material, start: THREE.Vector3, end: THREE.Vector3) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, width, height), material);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dir = end.clone().sub(start);
    mesh.position.copy(mid);
    mesh.position.z += height * 0.5;
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    return mesh;
}

function buildOrientedCylinder(radius: number, length: number, material: THREE.Material, start: THREE.Vector3, end: THREE.Vector3) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dir = end.clone().sub(start).normalize();
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return mesh;
}

/** Continuous ribbon, sampled by distance: no overlapping discs or coplanar seams. */
function buildRibbon(curve: THREE.CatmullRomCurve3, width: number, offset: number, z: number, material: THREE.Material) {
    const count = Math.max(32, Math.ceil(curve.getLength() * 5));
    const vertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= count; i++) {
        const t = curve.closed && i === count ? 0 : i / count;
        const p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        for (const side of [-1, 1]) {
            const v = p.clone().addScaledVector(normal, offset + side * width / 2);
            vertices.push(v.x, v.y, v.z + z);
        }
        if (i < count) {
            const n = i * 2;
            indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'continuous-surface';
    return mesh;
}

/**
 * The exact centerline a road/rail is drawn along, in the group's local
 * space - vehicles (vehicles/engine.ts) drive along this same curve.
 */
export function getLinearFeatureCurve(group: THREE.Object3D) {
    return makePathCurve(toPointList(group.userData.points), !!group.userData.closed);
}

/** Height of the surface a vehicle rolls on, above the route's origin. */
export function getLinearFeatureSurfaceHeight(group: THREE.Object3D) {
    return group.userData.featureKind === 'rail' ? 0.19 : 0.04;
}

export function rebuildLinearFeature(group: THREE.Group) {
    clearGeneratedChildren(group);

    const featureKind = group.userData.featureKind === 'rail' ? 'rail' : 'road';
    const points = toPointList(group.userData.points);
    const closed = !!group.userData.closed;
    const curve = makePathCurve(points, closed);
    const segmentCount = closed ? Math.max(points.length * 18, 60) : Math.max((points.length - 1) * 18, 32);

    if (featureKind === 'road') {
        const width = Number(group.userData.roadWidth) || 3.2;
        const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x858b89, roughness: 0.94 });
        const asphaltMaterial = new THREE.MeshStandardMaterial({ color: 0x303b40, roughness: 0.96 });
        const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xe0dfce, roughness: 0.85 });
        group.add(buildRibbon(curve, width + 0.4, 0, 0.025, shoulderMaterial));
        group.add(buildRibbon(curve, width, 0, 0.035, asphaltMaterial));
        for (const side of [-1, 1]) {
            group.add(buildRibbon(curve, 0.045, side * (width / 2 - 0.12), 0.039, markingMaterial));
        }
        const length = curve.getLength();
        for (let distance = 0.4; distance + 0.6 < length; distance += 1.8) {
            const p0 = curve.getPointAt(distance / length);
            const p1 = curve.getPointAt((distance + 0.6) / length);
            p0.z += 0.04; p1.z += 0.04;
            group.add(buildOrientedBox(p0.distanceTo(p1), 0.055, 0.002, markingMaterial, p0, p1));
        }
    } else {
        const ballastMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95, metalness: 0.01 });
        const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.95, metalness: 0.02 });
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0xbfc7d5, roughness: 0.3, metalness: 0.9 });

        group.add(buildRibbon(curve, 2.3, 0, 0.07, ballastMaterial));
        for (let i = 0; i < segmentCount; i++) {
            const t0 = i / segmentCount;
            const t1 = (i + 1) / segmentCount;
            const p0 = curve.getPoint(t0);
            const p1 = curve.getPoint(t1);
            const length = p0.distanceTo(p1);
            if (length < 0.01) continue;

            const tangent = p1.clone().sub(p0).normalize();
            const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(0.55);
            const leftStart = p0.clone().add(normal);
            const leftEnd = p1.clone().add(normal);
            const rightStart = p0.clone().sub(normal);
            const rightEnd = p1.clone().sub(normal);

            const leftRail = buildOrientedCylinder(0.05, length, railMaterial, leftStart, leftEnd);
            leftRail.position.z += 0.14;
            group.add(leftRail);

            const rightRail = buildOrientedCylinder(0.05, length, railMaterial, rightStart, rightEnd);
            rightRail.position.z += 0.14;
            group.add(rightRail);

            if (i % 2 === 0) {
                const sleeper = buildOrientedBox(0.2, 1.7, 0.08, sleeperMaterial, p0, p1);
                sleeper.position.z += 0.04;
                sleeper.scale.x = 0.45;
                group.add(sleeper);
            }
        }


    }

    applyShadows(group);
}

export function createRoadMesh(options: SceneObjectOptions = {}) {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.ROAD, {
        supportsPoints: true,
        points: toPointList(options.points),
        closed: !!options.closed,
        featureKind: 'road',
        roadWidth: options.roadWidth ?? 3.2,
        collidableRadius: 1.75
    });
    rebuildLinearFeature(group);
    return group;
}

export function createRailwayMesh(options: SceneObjectOptions = {}) {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.RAILWAY, {
        supportsPoints: true,
        points: toPointList(options.points),
        closed: !!options.closed,
        featureKind: 'rail',
        collidableRadius: 1.35
    });
    rebuildLinearFeature(group);
    return group;
}

export function updateLinearFeaturePoints(object: THREE.Object3D, points: ScenePathPoint[]) {
    const group = object as THREE.Group;
    if (!group.userData.supportsPoints) return false;
    group.userData.points = toPointList(points);
    rebuildLinearFeature(group);
    return true;
}
