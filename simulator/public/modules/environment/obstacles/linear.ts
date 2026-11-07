import * as THREE from 'three';
import { ScenePathPoint, SceneObjectOptions } from './types.js';
import { setCommonMeta, applyShadows, clearGeneratedChildren } from './utils.js';
import { batchStaticMeshes } from './batching.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import { applyGroundLayer } from '../ground/layers.js';
import { asphaltTexture, pavingTexture, TILE_ASPHALT, TILE_PAVING } from '../ground/surface-textures.js';

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
function buildRibbon(curve: THREE.CatmullRomCurve3, width: number, offset: number, z: number, material: THREE.Material, skip?: (p: THREE.Vector3) => boolean, uvTile = 0) {
    const length = curve.getLength();
    const count = Math.max(32, Math.ceil(length * 5));
    const vertices: number[] = [], indices: number[] = [], hidden: boolean[] = [], uvs: number[] = [];
    for (let i = 0; i <= count; i++) {
        const t = curve.closed && i === count ? 0 : i / count;
        const p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        hidden.push(!!skip && skip(p));
        for (const side of [-1, 1]) {
            const v = p.clone().addScaledVector(normal, offset + side * width / 2);
            vertices.push(v.x, v.y, v.z + z);
            // Текстура в метрах: поперёк - расстояние от оси, вдоль - пройденный путь (шов замкнутой ленты не рвётся: i, а не t).
            if (uvTile) uvs.push((offset + side * width / 2) / uvTile, (i / count) * length / uvTile);
        }
        if (i > 0 && !(hidden[i - 1] || hidden[i])) {
            const n = (i - 1) * 2;
            indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (uvTile) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
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
    // Rails/sleepers follow physical distance, not the number of editing handles.
    const segmentCount = Math.max(32, Math.ceil(curve.getLength() * 2));

    if (featureKind === 'road' && group.userData.roadStyle === 'path') {
        // Пешеходная дорожка и тротуар: гладкая лента с тёмной каймой, без разметки и обочины (раньше это была копия дороги:
        // бежевый асфальт с тире и белыми линиями, которые просвечивали сквозь дорожку).
        const width = Number(group.userData.roadWidth) || 1.6;
        const kerb = applyGroundLayer(new THREE.MeshStandardMaterial({ color: 0xa79c80, roughness: 0.96 }), 'marking');
        const surface = applyGroundLayer(new THREE.MeshStandardMaterial({ color: 0xc9bd9c, roughness: 0.95, map: pavingTexture() }), 'path');
        group.add(buildRibbon(curve, width + 0.24, 0, 0.003, kerb));
        group.add(buildRibbon(curve, width, 0, 0.007, surface, undefined, surface.map ? TILE_PAVING : 0));
    } else if (featureKind === 'road') {
        const width = Number(group.userData.roadWidth) || 3.2;
        const shoulderMaterial = applyGroundLayer(new THREE.MeshStandardMaterial({ color: 0x858b89, roughness: 0.94 }), 'shoulder');
        const asphaltMaterial = applyGroundLayer(new THREE.MeshStandardMaterial({ color: 0x303b40, roughness: 0.96, map: asphaltTexture() }), 'asphalt');
        const markingMaterial = applyGroundLayer(new THREE.MeshStandardMaterial({ color: 0xe0dfce, roughness: 0.85 }), 'marking');
        // Junctions and level crossings are covered by their own asphalt: no lines run through them.
        const gaps = (group.userData.markingGaps ?? []) as MarkingGap[];
        const inGap = (p: THREE.Vector3) => gaps.some(g => (p.x - g.x) * (p.x - g.x) + (p.y - g.y) * (p.y - g.y) < g.r * g.r);
        group.add(buildRibbon(curve, width + 0.4, 0, 0.025, shoulderMaterial));
        group.add(buildRibbon(curve, width, 0, 0.035, asphaltMaterial, undefined, asphaltMaterial.map ? TILE_ASPHALT : 0));
        for (const side of [-1, 1]) {
            // Реальная разметка: краевая линия 12 см, осевая - штрих 0.9 м через 3 м, тоже 12 см (раньше 4.5 и 5.5 см: нитка на дороге).
            group.add(buildRibbon(curve, 0.12, side * (width / 2 - 0.2), 0.039, markingMaterial, gaps.length ? inGap : undefined));
        }
        const length = curve.getLength();
        for (let distance = 0.6; distance + 0.9 < length; distance += 3.0) {
            const p0 = curve.getPointAt(distance / length);
            const p1 = curve.getPointAt((distance + 0.9) / length);
            if (gaps.length && (inGap(p0) || inGap(p1))) continue;
            p0.z += 0.04; p1.z += 0.04;
            group.add(buildOrientedBox(p0.distanceTo(p1), 0.12, 0.002, markingMaterial, p0, p1));
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
    // One mesh per material instead of a mesh per dash or sleeper: a road that is rebuilt (a saved scene, the editor) must not
    // fall back to thousands of draw calls.
    batchStaticMeshes(group);
}

/** A disc of road where the markings stop (a junction or a level crossing). */
export type MarkingGap = { x: number; y: number; r: number };

export function createRoadMesh(options: SceneObjectOptions & { markingGaps?: MarkingGap[]; roadStyle?: 'road' | 'path' } = {}) {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.ROAD, {
        supportsPoints: true,
        points: toPointList(options.points),
        closed: !!options.closed,
        featureKind: 'road',
        roadWidth: options.roadWidth ?? 3.2,
        markingGaps: options.markingGaps ?? [],
        roadStyle: options.roadStyle ?? 'road',
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
