import { generateTrainingLayout, type TrainingProfile } from '../public/modules/environment/training/layout.js';
import { distanceToPath, nearestOnPath } from '../public/modules/environment/training/geography.js';
import { distanceToWater } from '../public/modules/environment/training/world-plan.js';
import { LESSON_BOX } from '../public/modules/environment/training/road-network.js';
import { buildRoadGraph, nearestNode } from '../public/modules/world/roads.js';
import { spacingViolations } from './helpers/layout-rules.js';

type Layout = ReturnType<typeof generateTrainingLayout>;
const PROFILES: TrainingProfile[] = ['forest', 'hills', 'urban', 'industrial', 'mixed', 'city'];
const SEEDS = [1, 2, 3, 4];
const roadsOf = (layout: Layout) => layout.paths.filter(p => p.kind === 'road');
const homesOf = (layout: Layout) => layout.objects.filter(p => p.type === 'house' || p.type === 'building');
const each = (fn: (layout: Layout, label: string) => void) => {
    for (const profile of PROFILES) for (const seed of SEEDS) fn(generateTrainingLayout({ profile, seed }), `${profile}#${seed}`);
};

describe('procedural road network', () => {
    test('every road reaches the main network (checked on the runtime road graph)', () => {
        each((layout, label) => {
            const graph = buildRoadGraph(layout.paths);
            const seen = new Set<number>([0]), queue = [0];
            while (queue.length) for (const edge of graph.edges[queue.pop()!]) if (!seen.has(edge.to)) { seen.add(edge.to); queue.push(edge.to); }
            const lost = roadsOf(layout).filter(road => !road.points.every(p => seen.has(nearestNode(graph, p)))).map(road => road.id);
            expect([label, lost]).toEqual([label, []]);
        });
    });

    test('roads have junctions as real vertices: every road end rests on another road, a footpath of the station, or the map edge', () => {
        each((layout, label) => {
            const half = layout.size / 2, roads = roadsOf(layout), loose: string[] = [];
            for (const road of roads) {
                // Short streets, lanes, farm and airfield access roads may end at a gate; long streets may not stop in the fields.
                if (road.hierarchy === 'lane' || /^(farm-lane|airfield-road|industry-road|station-road|city-rib|.*-rib)/.test(road.id)) continue;
                for (const end of [road.points[0], road.points[road.points.length - 1]]) {
                    if (Math.abs(end.x) > half - 12 || Math.abs(end.y) > half - 12) continue;
                    const touching = roads.some(other => other !== road && distanceToPath(end, other.points) < .6) || layout.paths.some(p => p.kind === 'footpath' && distanceToPath(end, p.points) < .6);
                    if (!touching) loose.push(road.id);
                }
            }
            expect([label, loose.length]).toEqual([label, 0]);
        });
    });

    test('no road or footpath ends in water, and water is crossed only on a bridge', () => {
        each((layout, label) => {
            const crossings: string[] = [];
            for (const path of layout.paths.filter(p => p.kind !== 'runway')) {
                for (const end of [path.points[0], path.points[path.points.length - 1]]) {
                    if (path.kind === 'rail') continue;
                    if (distanceToWater(layout, end) < path.width / 2) crossings.push(`${path.id} ends in water`);
                }
                for (let i = 1; i < path.points.length; i++) {
                    const a = path.points[i - 1], b = path.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
                    for (let k = 0; k <= steps; k++) {
                        const p = { x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps };
                        if (distanceToWater(layout, p) < .1 && !layout.bridges.some(br => br.pathId === path.id && Math.hypot(br.x - p.x, br.y - p.y) < br.length / 2 + 2)) { crossings.push(`${path.id} through water`); k = steps; i = path.points.length; }
                    }
                }
            }
            expect([label, crossings]).toEqual([label, []]);
        });
    });

    test('every home stands within 24 m of a road and mostly faces it', () => {
        let homes = 0, facing = 0;
        each((layout, label) => {
            const roads = roadsOf(layout);
            for (const home of homesOf(layout)) {
                const near = roads.map(road => nearestOnPath(home, road.points)).filter(hit => hit.distance <= 24);
                expect([label, home.type, near.length > 0]).toEqual([label, home.type, true]);
                homes++;
                const front = { x: Math.sin(home.rotation ?? 0), y: -Math.cos(home.rotation ?? 0) };
                if (near.some(hit => { const dx = hit.point.x - home.x, dy = hit.point.y - home.y, d = Math.hypot(dx, dy) || 1; return (front.x * dx + front.y * dy) / d > Math.cos(.5); })) facing++;
            }
        });
        expect(homes).toBeGreaterThan(2000);
        expect(facing / homes).toBeGreaterThan(.98);
    });

    test('nothing is laid across the lesson strip, and every home carries its district', () => {
        each((layout, label) => {
            for (const path of layout.paths.filter(p => p.kind !== 'rail')) for (let i = 1; i < path.points.length; i++) {
                const a = path.points[i - 1], b = path.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
                for (let k = 0; k <= steps; k++) {
                    const x = a.x + (b.x - a.x) * k / steps, y = a.y + (b.y - a.y) * k / steps;
                    const inside = x > LESSON_BOX.x0 - path.width / 2 && x < LESSON_BOX.x1 + path.width / 2 && y > LESSON_BOX.y0 - path.width / 2 && y < LESSON_BOX.y1 + path.width / 2;
                    expect([label, path.id, inside]).toEqual([label, path.id, false]);
                }
            }
            const homes = homesOf(layout);
            expect([label, homes.filter(h => !h.districtId).length / homes.length < .12]).toEqual([label, true]);
            for (const home of homes) if (home.districtId) expect(layout.districts.some(d => d.id === home.districtId)).toBe(true);
        });
    });

    test('fire and police stations face a road across an open forecourt', () => {
        each((layout, label) => {
            for (const type of ['fire-station', 'police-station'] as const) {
                const station = layout.objects.find(p => p.type === type)!;
                expect([label, type, Boolean(station)]).toEqual([label, type, true]);
                const front = { x: Math.sin(station.rotation ?? 0), y: -Math.cos(station.rotation ?? 0) };
                const hits = roadsOf(layout).map(road => nearestOnPath(station, road.points)).sort((a, b) => a.distance - b.distance);
                expect(hits[0].distance).toBeLessThan(32);
                // The front looks at a road that is close: the one it was built along (a cross street may be marginally nearer).
                const faces = hits.filter(h => h.distance < 32).some(h => { const dx = h.point.x - station.x, dy = h.point.y - station.y; return (front.x * dx + front.y * dy) / Math.hypot(dx, dy) > .85; });
                expect([label, type, faces]).toEqual([label, type, true]);
                for (const reach of [9, 14]) {
                    const point = { x: station.x + front.x * reach, y: station.y + front.y * reach };
                    const blocker = layout.objects.find(o => o !== station && o.radius > 0 && Math.hypot(o.x - point.x, o.y - point.y) < o.radius + 3);
                    expect([label, type, reach, blocker?.type]).toEqual([label, type, reach, undefined]);
                }
            }
        });
    });

    test('a power line runs continuously along an edge on the city and the industrial map', () => {
        for (const profile of ['city', 'industrial'] as const) for (const seed of SEEDS) {
            const layout = generateTrainingLayout({ profile, seed });
            const pylons = layout.objects.filter(p => p.type === 'power-pylon').sort((a, b) => a.y - b.y);
            expect([profile, seed, pylons.length >= 8]).toEqual([profile, seed, true]);
            for (let i = 1; i < pylons.length; i++) {
                const gap = Math.hypot(pylons[i].x - pylons[i - 1].x, pylons[i].y - pylons[i - 1].y);
                expect(gap).toBeGreaterThan(20); expect(gap).toBeLessThan(56);
            }
            expect(Math.max(...pylons.map(p => Math.abs(p.x)))).toBeGreaterThan(layout.size / 2 - 50);
        }
    });

    test('maps differ in pattern: grids, tilted grids, radial plans and linear towns all occur', () => {
        const seen = new Set<string>();
        for (const profile of PROFILES) for (let seed = 1; seed <= 12; seed++) {
            const layout = generateTrainingLayout({ profile, seed });
            const ids = layout.paths.map(p => p.id).join(' ');
            if (/-ring1|-spoke0/.test(ids)) seen.add('radial');
            if (/-main/.test(ids)) seen.add('linear');
            if (/-rib/.test(ids)) seen.add('ribbon');
            if (layout.districts.some(d => d.id === 'district-park-lesson')) seen.add('lesson-park');
            if (layout.paths.some(p => /-[hv][0-9]/.test(p.id) && p.points.length >= 3 && Math.abs(p.points[0].x - p.points[p.points.length - 1].x) > 8 && Math.abs(p.points[0].y - p.points[p.points.length - 1].y) > 8)) seen.add('tilted');
            if (layout.districts.some(d => d.kind === 'airfield')) seen.add('airfield');
            if (layout.objects.some(p => p.type === 'wind-turbine')) seen.add('wind');
            if (layout.districts.some(d => d.kind === 'industry')) seen.add('industry');
            if (layout.districts.some(d => d.kind === 'farmland')) seen.add('farm');
        }
        for (const feature of ['radial', 'linear', 'ribbon', 'lesson-park', 'tilted', 'airfield', 'wind', 'industry', 'farm']) expect([feature, seen.has(feature)]).toEqual([feature, true]);
    });

    test('town sizes and positions vary with the seed', () => {
        const centres = new Set<string>(), counts = new Set<number>();
        for (let seed = 1; seed <= 10; seed++) {
            const layout = generateTrainingLayout({ profile: 'mixed', seed });
            const towns = layout.districts.filter(d => /^district-(town|village|estate|hamlet)\d/.test(d.id));
            counts.add(towns.length);
            for (const town of towns) centres.add(`${Math.round(town.x / 60)},${Math.round(town.y / 60)}`);
        }
        expect(centres.size).toBeGreaterThan(14);
        expect(counts.size).toBeGreaterThan(1);
    });

    test('every profile keeps the layout contract on 10 more seeds, within the object budget', () => {
        for (const profile of PROFILES) for (let seed = 21; seed <= 30; seed++) {
            const layout = generateTrainingLayout({ profile, seed });
            expect([profile, seed, spacingViolations(layout)]).toEqual([profile, seed, []]);
            expect(layout.objects.length).toBeLessThanOrEqual(4200);
        }
    });

    test('generation is fast and repeatable', () => {
        const start = Date.now();
        const a = generateTrainingLayout({ profile: 'city', seed: 77 });
        expect(Date.now() - start).toBeLessThan(4000);
        expect(generateTrainingLayout({ profile: 'city', seed: 77 })).toEqual(a);
    });
});
