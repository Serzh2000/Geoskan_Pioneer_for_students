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
    return new THREE.CatmullRomCurve3(
        points.map((point) => new THREE.Vector3(point.x, point.y, point.z)),
        closed,
        'catmullrom',
        0.12
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

function buildHorizontalPatch(radius: number, thickness: number, material: THREE.Material, point: THREE.Vector3) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 24), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(point.x, point.y, point.z + thickness * 0.5);
    return mesh;
}

export function rebuildLinearFeature(group: THREE.Group) {
    clearGeneratedChildren(group);

    const featureKind = group.userData.featureKind === 'rail' ? 'rail' : 'road';
    const points = toPointList(group.userData.points);
    const closed = !!group.userData.closed;
    const curve = makePathCurve(points, closed);
    const segmentCount = closed ? Math.max(points.length * 18, 60) : Math.max((points.length - 1) * 18, 32);

    if (featureKind === 'road') {
        const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.95, metalness: 0.02 });
        const asphaltMaterial = new THREE.MeshStandardMaterial({ color: 0x2f343d, roughness: 0.96, metalness: 0.02 });
        const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, metalness: 0.03 });

        for (let i = 0; i < segmentCount; i++) {
            const t0 = i / segmentCount;
            const t1 = (i + 1) / segmentCount;
            const p0 = curve.getPoint(t0);
            const p1 = curve.getPoint(t1);
            const length = p0.distanceTo(p1);
            if (length < 0.01) continue;

            const shoulder = buildOrientedBox(length + 0.2, 3.8, 0.04, shoulderMaterial, p0, p1);
            shoulder.position.z = 0.02;
            group.add(shoulder);

            const asphalt = buildOrientedBox(length, 3.2, 0.05, asphaltMaterial, p0, p1);
            asphalt.position.z = 0.03;
            group.add(asphalt);

            if (i % 2 === 0) {
                const marking = buildOrientedBox(Math.min(length * 0.45, 0.9), 0.16, 0.06, markingMaterial, p0, p1);
                marking.position.z = 0.055;
                group.add(marking);
            }
        }

        for (let i = 0; i <= segmentCount; i++) {
            const patchPoint = curve.getPoint(i / segmentCount);
            const shoulderPatch = buildHorizontalPatch(1.95, 0.04, shoulderMaterial, patchPoint);
            shoulderPatch.position.z = 0.02;
            group.add(shoulderPatch);

            const asphaltPatch = buildHorizontalPatch(1.62, 0.05, asphaltMaterial, patchPoint);
            asphaltPatch.position.z = 0.03;
            group.add(asphaltPatch);
        }
    } else {
        const ballastMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95, metalness: 0.01 });
        const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.95, metalness: 0.02 });
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0xbfc7d5, roughness: 0.3, metalness: 0.9 });

        for (let i = 0; i < segmentCount; i++) {
            const t0 = i / segmentCount;
            const t1 = (i + 1) / segmentCount;
            const p0 = curve.getPoint(t0);
            const p1 = curve.getPoint(t1);
            const length = p0.distanceTo(p1);
            if (length < 0.01) continue;

            const ballast = buildOrientedBox(length + 0.18, 2.3, 0.08, ballastMaterial, p0, p1);
            ballast.position.z = 0.03;
            group.add(ballast);

            const tangent = p1.clone().sub(p0).normalize();
            const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(0.55);
            const leftStart = p0.clone().add(normal);
            const leftEnd = p1.clone().add(normal);
            const rightStart = p0.clone().sub(normal);
            const rightEnd = p1.clone().sub(normal);

            const leftRail = buildOrientedCylinder(0.05, length, railMaterial, leftStart, leftEnd);
            leftRail.position.z = 0.14;
            group.add(leftRail);

            const rightRail = buildOrientedCylinder(0.05, length, railMaterial, rightStart, rightEnd);
            rightRail.position.z = 0.14;
            group.add(rightRail);

            if (i % 2 === 0) {
                const sleeper = buildOrientedBox(0.2, 1.7, 0.08, sleeperMaterial, p0, p1);
                sleeper.position.z = 0.08;
                sleeper.scale.x = 0.45;
                group.add(sleeper);
            }
        }

        for (let i = 0; i <= segmentCount; i++) {
            const patchPoint = curve.getPoint(i / segmentCount);
            const ballastPatch = buildHorizontalPatch(1.18, 0.08, ballastMaterial, patchPoint);
            ballastPatch.position.z = 0.03;
            group.add(ballastPatch);
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
