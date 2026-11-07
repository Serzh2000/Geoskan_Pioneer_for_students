import * as THREE from 'three';
import { batchStaticMeshes } from '../obstacles/batching.js';
import { createRoadMesh, createRailwayMesh, type MarkingGap } from '../obstacles/linear.js';
import { analyzeRoads, crossPolylines, overpassLift, overpassSpans, roadAnchors, type RoadPlan } from '../../world/roads.js';
import { GROUND_LAYER_Z, layerMaterial, type GroundLayer } from '../ground/layers.js';
import { buildSurroundings, buildTerrain } from './terrain-mesh.js';
import type { TrainingLayout } from './layout.js';
import type { Point2 } from './geography.js';

export { batchStaticMeshes };

/**
 * Плоский слой земли по многоугольнику. `layer` задаёт и высоту, и порядок отрисовки (ground/layers.ts); материал общий
 * для всех заплаток одного цвета и слоя. Без `layer` берётся высота `z` и слой по ближайшей высоте.
 */
export function flatPolygon(points: Point2[], color: number, z: number, layer?: GroundLayer, roughness = .9): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(p => shape.lineTo(p.x, p.y)); shape.closePath();
    const rank = layer ?? (Object.entries(GROUND_LAYER_Z).filter(([name]) => name !== 'terrain').sort((a, b) => Math.abs(a[1] - z) - Math.abs(b[1] - z))[0][0] as GroundLayer);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), layerMaterial(color, rank, roughness, { side: THREE.DoubleSide }));
    mesh.position.z = z; mesh.receiveShadow = true; mesh.userData.collidable = false;
    return mesh;
}

function riverOutline(points: Point2[], width: number): Point2[] {
    const banks = [-1, 1].map(side => points.map((p, i) => {
        const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
        const angle = Math.atan2(b.y - a.y, b.x - a.x), w = width / 2 * (1 + Math.sin(i * .7) * .06);
        return { x: p.x - Math.sin(angle) * w * side, y: p.y + Math.cos(angle) * w * side };
    }));
    return [...banks[0], ...banks[1].reverse()];
}

export function addWorldSurfaces(group: THREE.Group, layout: TrainingLayout): void {
    group.add(buildTerrain(layout));
    group.add(buildSurroundings(layout, riverOutline, (points, color, z, layer) => flatPolygon(points, color, z, layer, layer === 'water' ? .26 : .9)));

    for (const water of layout.water) {
        const points = water.kind === 'river' ? riverOutline(water.points, water.width) : water.points;
        const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        const banks = water.kind === 'river' ? riverOutline(water.points, water.width + 2)
            : points.map(p => ({ x: cx + (p.x - cx) * 1.08, y: cy + (p.y - cy) * 1.08 }));
        const shore = flatPolygon(banks, 0xaf9e79, GROUND_LAYER_Z.shore, 'shore'); shore.name = 'Берег'; group.add(shore);
        const surface = flatPolygon(points, water.kind === 'river' ? 0x527c80 : 0x487582, GROUND_LAYER_Z.water, 'water', .26);
        surface.name = water.kind === 'river' ? 'Река' : 'Озеро';
        group.add(surface);
    }
    const plan = analyzeRoads(layout.paths), spans = overpassSpans(layout.paths, layout.bridges);
    const rails = layout.paths.filter(p => p.kind === 'rail');
    // Where the markings of a road stop: junctions (covered by an asphalt patch) and level crossings.
    const gapsOf = (roadIndex: number): MarkingGap[] => {
        const gaps: MarkingGap[] = [];
        for (const j of plan.junctions) if (j.arms.some(arm => arm.road === roadIndex)) gaps.push({ x: j.x, y: j.y, r: j.radius + .15 });
        for (const rail of rails) for (const hit of crossPolylines(plan.roads[roadIndex].points, rail.points)) {
            if (overpassLift(spans, plan.roads[roadIndex].id, hit.x, hit.y) < .5) gaps.push({ x: hit.x, y: hit.y, r: 2.6 });
        }
        return gaps;
    };
    // A road is drawn in the pieces the road analysis kept of it (a stretch that lies on a wider road is left out), along
    // the rounded, snapped centre line the traffic drives on.
    const drawables: Array<{ route: typeof layout.paths[number]; source: Point2[]; roadIndex: number }> = [];
    for (const route of layout.paths) {
        if (route.kind !== 'road') { drawables.push({ route, source: route.points, roadIndex: -1 }); continue; }
        if (route.points.length < 2) continue;
        plan.roads.forEach((road, roadIndex) => { if (road.id === route.id) drawables.push({ route, source: road.points, roadIndex }); });
    }
    for (const { route, source, roadIndex } of drawables) {
        // Sample straight planning segments so rounding cannot cut into a house plot.
        const points: THREE.Vector3[] = [];
        for (let i = 1; i < source.length; i++) {
            const a = source[i - 1], b = source[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
            for (let step = i === 1 ? 0 : 1; step <= steps; step++) {
                const t = step / steps, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
                let z = overpassLift(spans, route.id, x, y);
                for (const bridge of layout.bridges.filter(bridge => bridge.pathId === route.id && bridge.kind !== 'overpass')) {
                    const along = Math.abs((x - bridge.x) * Math.cos(bridge.rotation) + (y - bridge.y) * Math.sin(bridge.rotation));
                    z = Math.max(z, .6 * THREE.MathUtils.clamp((bridge.length / 2 + 5 - along) / 5, 0, 1));
                }
                points.push(new THREE.Vector3(x, y, z));
            }
        }
        const feature = route.kind === 'rail' ? createRailwayMesh({ points })
            : createRoadMesh({ points, roadWidth: route.width, markingGaps: roadIndex >= 0 ? gapsOf(roadIndex) : [], roadStyle: route.kind === 'footpath' ? 'path' : 'road' });
        feature.userData.label = route.label; feature.userData.worldPathId = route.id;
        // Дорожка лежит на 4 см выше дороги (поперечный переход читается как переход, а не как слой под асфальтом); порядок
        // отрисовки задаёт слой 'path' (ground/layers.ts), поэтому зазор по Z больше не держит кадр сам.
        if (route.kind === 'footpath') feature.position.z = .04;
        batchStaticMeshes(feature); group.add(feature);
    }
    addJunctionSurfaces(group, layout, plan, spans);
}

const patchAsphalt = layerMaterial(0x303b40, 'patchAsphalt', .96);
const patchShoulder = layerMaterial(0x858b89, 'patchShoulder', .94);
const crossingMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3135, roughness: .97 });

/**
 * A rounded cap on every loose road end and a plank deck where a road crosses the railway on the level.
 */
function addJunctionSurfaces(group: THREE.Group, layout: TrainingLayout, plan: RoadPlan, spans: ReturnType<typeof overpassSpans>): void {
    const surfaces = new THREE.Group();
    surfaces.name = 'Перекрёстки'; surfaces.userData.collidable = false;
    const disc = (x: number, y: number, r: number, material: THREE.Material, z: number) => {
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, r > 3 ? 40 : 28), material);
        mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.userData.collidable = false;
        surfaces.add(mesh);
    };
    plan.roads.forEach((road, index) => {
        for (const anchor of roadAnchors(plan, index)) {
            if (anchor.junction >= 0) continue;
            const p = anchor.free === 0 ? road.points[0] : road.points[road.points.length - 1];
            // A loose street end is a turning area (layout.turnarounds, kept clear of houses), not a bare rounded cap.
            const turn = (layout.turnarounds ?? []).find(t => Math.hypot(t.x - p.x, t.y - p.y) < 1.5);
            const r = Math.max(road.width / 2, turn?.r ?? 0);
            disc(p.x, p.y, r + .2, patchShoulder, GROUND_LAYER_Z.patchShoulder);
            disc(p.x, p.y, r, patchAsphalt, GROUND_LAYER_Z.patchAsphalt);
        }
    });
    batchStaticMeshes(surfaces);
    // Level crossings: the road is carried over the ballast on a plank deck, the rails stand proud of it.
    for (const road of plan.roads) for (const rail of layout.paths.filter(p => p.kind === 'rail')) {
        for (const hit of crossPolylines(road.points, rail.points)) {
            if (overpassLift(spans, road.id, hit.x, hit.y) > .5) continue;
            const hereAt = projectHeading(road.points, hit.x, hit.y);
            const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, road.width + .4, .1), crossingMaterial);
            deck.position.set(hit.x, hit.y, .085); deck.rotation.z = hereAt; deck.receiveShadow = true; deck.userData.collidable = false;
            surfaces.add(deck);
        }
    }
    group.add(surfaces);
}

function projectHeading(points: Point2[], x: number, y: number): number {
    let best = 0, bestD = Infinity;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y, sq = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / sq)), d = Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
        if (d < bestD) { bestD = d; best = Math.atan2(dy, dx); }
    }
    return best;
}
