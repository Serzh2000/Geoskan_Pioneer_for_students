import { distanceToPath, type Point2 } from '../public/modules/environment/training/geography.js';
import { generateTrainingLayout } from '../public/modules/environment/training/layout.js';
import { analyzeRoads, buildRoadGraph, crossPolylines, filletPolyline, findRoute, overpassLift, routeLength, type RoadLike } from '../public/modules/world/roads.js';
import { buildTrafficNetwork, carScaleFor, createTraffic, MODEL_WIDTH, offsetPolyline, speedLimitFor, trimPolyline, type EmergencyVehicle, type Traffic } from '../public/modules/world/traffic.js';

const road = (id: string, width: number, ...pts: Array<[number, number]>): RoadLike => ({ id, kind: 'road', width, points: pts.map(([x, y]) => ({ x, y })) });
const cross = (): RoadLike[] => [road('a', 4, [-120, 0], [120, 0]), road('b', 4, [0, -120], [0, 120])];

describe('road analysis', () => {
    it('puts a junction exactly on the crossing of two roads and a graph node on it', () => {
        const paths = cross();
        const plan = analyzeRoads(paths);
        expect(plan.junctions).toHaveLength(1);
        expect(plan.junctions[0].x).toBeCloseTo(0, 5);
        expect(plan.junctions[0].y).toBeCloseTo(0, 5);
        expect(plan.junctions[0].degree).toBe(4);
        const graph = buildRoadGraph(paths);
        expect(graph.junctionNodes).toHaveLength(1);
        expect(graph.nodes[graph.junctionNodes[0]]).toMatchObject({ x: 0, y: 0 });
        const route = findRoute(graph, { x: -120, y: 0 }, { x: 0, y: 120 })!;
        expect(routeLength(route)).toBeCloseTo(240, 0);
    });
    it('snaps a road that stops short of another onto it (T-junction)', () => {
        const plan = analyzeRoads([road('main', 5, [-100, 0], [100, 0]), road('side', 4, [30, 80], [30, 3])]);
        expect(plan.junctions).toHaveLength(1);
        const side = plan.roads[1];
        expect(side.points[side.points.length - 1].y).toBeCloseTo(0, 5);
        expect(plan.junctions[0].degree).toBe(3);
    });
    it('treats a ring road as one loop and rounds its corners', () => {
        const ring = road('ring', 5, [0, 0], [100, 0], [100, 100], [0, 100], [0, 0]);
        const plan = analyzeRoads([ring, road('spoke', 4, [50, 0], [50, -60])]);
        expect(plan.roads[0].closed).toBe(true);
        const net = buildTrafficNetwork(plan);
        expect(net.nodes.filter(n => n.degree === 1)).toHaveLength(1);      // only the end of the spoke
        // The 90 degree corner at (100,0) is cut: no point of the ring sits on it.
        expect(Math.min(...plan.roads[0].points.map(p => Math.hypot(p.x - 100, p.y)))).toBeGreaterThan(1);
    });
    it('finds crossings of polylines and fillets bends', () => {
        expect(crossPolylines([{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 5, y: -5 }, { x: 5, y: 5 }])).toHaveLength(1);
        const rounded = filletPolyline([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }], 7);
        expect(rounded.length).toBeGreaterThan(3);
        expect(rounded[0]).toEqual({ x: 0, y: 0 });
    });
    it('lifts a road smoothly over an overpass and not at all elsewhere', () => {
        const bridges = [{ x: 0, y: 0, pathId: 'r', length: 22, width: 6.8, rotation: Math.PI / 2, kind: 'overpass', height: 6.4 }];
        const h = (y: number) => overpassLift(bridges, 'r', 0, y);
        expect(h(0)).toBeGreaterThan(5);
        expect(h(100)).toBe(0);
        expect(overpassLift(bridges, 'other', 0, 0)).toBe(0);
        let last = h(0);
        for (let y = 1; y < 60; y++) { const now = h(y); expect(now).toBeLessThanOrEqual(last + 1e-9); expect(last - now).toBeLessThan(.7); last = now; }
    });
});

describe('lane geometry', () => {
    it('keeps right: a lane lies right of its direction of travel, half a lane from the centre line', () => {
        const forward = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 1);
        expect(forward[0].y).toBeCloseTo(-1);
        const backward = offsetPolyline([{ x: 10, y: 0 }, { x: 0, y: 0 }], 1);
        expect(backward[0].y).toBeCloseTo(1);
        const trimmed = trimPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 4, 3);
        expect(trimmed[0].x).toBeCloseTo(4);
        expect(trimmed[trimmed.length - 1].y).toBeCloseTo(7);
    });
    it('scales the car so that it fits its lane on every road width', () => {
        for (let width = 2.6; width <= 6.01; width += .2) {
            const scale = carScaleFor(width);
            expect(MODEL_WIDTH * scale).toBeLessThanOrEqual(Math.max(width / 2 - .45, MODEL_WIDTH * .5 + 1e-9));
            expect(scale).toBeLessThanOrEqual(.85);
        }
        expect(speedLimitFor(3.4)).toBeLessThan(speedLimitFor(6));
    });
    it('builds two lanes per stretch, connectors at junctions and a U-turn at dead ends', () => {
        const net = buildTrafficNetwork(analyzeRoads(cross()));
        expect(net.lanes).toHaveLength(8);
        const turns = net.segs.filter(s => s.isConn);
        expect(turns.filter(s => s.kind === 'uturn')).toHaveLength(4);
        expect(turns.filter(s => s.kind === 'straight')).toHaveLength(4);
        expect(turns.filter(s => s.kind === 'left')).toHaveLength(4);
        expect(turns.filter(s => s.kind === 'right')).toHaveLength(4);
    });
});

function distanceToRoads(plan: ReturnType<typeof analyzeRoads>, p: Point2, only?: string): number {
    let best = Infinity;
    for (const r of plan.roads) if (!only || r.id === only) best = Math.min(best, distanceToPath(p, r.points) - r.width / 2);
    return best;
}

function simulate(traffic: Traffic, plan: ReturnType<typeof analyzeRoads>, seconds: number, emergency: ReadonlyArray<EmergencyVehicle> = [], straight = false) {
    const dt = 1 / 20, steps = Math.round(seconds / dt);
    let minDistance = Infinity, worstOffRoad = -Infinity, maxSpeed = 0, wrongSide = 0;
    const travelled = traffic.agents.map(() => 0), last = traffic.agents.map(a => ({ x: a.x, y: a.y }));
    const roads = new Set<string>();
    for (let i = 0; i < steps; i++) {
        traffic.update(dt, emergency);
        traffic.agents.forEach((a, k) => {
            travelled[k] += Math.hypot(a.x - last[k].x, a.y - last[k].y); last[k] = { x: a.x, y: a.y };
            // Whole car on the carriageway along a lane; at a junction corner or a U-turn its middle must be.
            if (a.seg.isConn ? i % 3 === 0 : true) worstOffRoad = Math.max(worstOffRoad, distanceToRoads(plan, a, a.seg.isConn ? undefined : a.roadId) + (a.seg.isConn ? 0 : MODEL_WIDTH * a.scale / 2));
            maxSpeed = Math.max(maxSpeed, a.speed);
            roads.add(a.roadId);
            if (straight && !a.seg.isConn) {
                // On a straight road along x: right of travel is below the centre line when driving +x.
                const forward = Math.cos(a.heading);
                if (Math.abs(a.y) > .5 && forward * a.y > 0 && Math.abs(forward) > .9) wrongSide++;
            }
        });
        for (let m = 0; m < traffic.agents.length; m++) for (let n = m + 1; n < traffic.agents.length; n++) {
            minDistance = Math.min(minDistance, Math.hypot(traffic.agents[m].x - traffic.agents[n].x, traffic.agents[m].y - traffic.agents[n].y));
        }
    }
    return { minDistance, worstOffRoad, maxSpeed, wrongSide, travelled, roads };
}

describe('traffic on a crossing', () => {
    it('drives in its lane, turns at the junction and never overlaps', () => {
        const paths = cross(), plan = analyzeRoads(paths);
        const traffic = createTraffic(paths, { seed: 3, count: 8 });
        expect(traffic.agents.length).toBe(8);
        const result = simulate(traffic, plan, 240);
        expect(result.worstOffRoad).toBeLessThan(.05);            // the car stays on the carriageway
        expect(result.minDistance).toBeGreaterThan(1.2);           // opposing lanes are 2 m apart: nobody is closer
        expect(result.roads.has('a') && result.roads.has('b')).toBe(true);   // they change roads at the junction
        expect(result.travelled.filter(d => d > 100).length).toBeGreaterThanOrEqual(7);
        expect(result.maxSpeed).toBeLessThanOrEqual(speedLimitFor(4) * 1.15 + 1e-6);
    });
    it('keeps right on a straight road', () => {
        const paths = [road('long', 4, [-150, 0], [150, 0])], plan = analyzeRoads(paths);
        const traffic = createTraffic(paths, { seed: 4, count: 4 });
        const result = simulate(traffic, plan, 90, [], true);
        expect(result.wrongSide).toBe(0);
        expect(result.minDistance).toBeGreaterThan(1.2);
    });
    it('is deterministic for a seed', () => {
        const run = () => { const t = createTraffic(cross(), { seed: 11, count: 6 }); for (let i = 0; i < 400; i++) t.update(.05); return t.agents.map(a => [a.x.toFixed(6), a.y.toFixed(6)]); };
        expect(run()).toEqual(run());
    });
    it('slows down for turns and U-turns', () => {
        const paths = cross(), traffic = createTraffic(paths, { seed: 5, count: 8 });
        const sum = { uturn: 0, turn: 0, straight: 0 }, count = { uturn: 0, turn: 0, straight: 0 };
        for (let i = 0; i < 4800; i++) {
            traffic.update(.05);
            for (const a of traffic.agents) {
                if (!a.seg.isConn) continue;
                const kind = a.seg.kind === 'uturn' ? 'uturn' : a.seg.kind === 'straight' ? 'straight' : 'turn';
                sum[kind] += a.speed; count[kind]++;
            }
        }
        const mean = (k: 'uturn' | 'turn' | 'straight') => sum[k] / Math.max(1, count[k]);
        expect(count.uturn).toBeGreaterThan(0);
        expect(count.turn).toBeGreaterThan(0);
        expect(mean('uturn')).toBeLessThan(3.5);
        expect(mean('turn')).toBeLessThan(mean('straight'));
        expect(mean('turn')).toBeLessThan(speedLimitFor(4) * .8);
    });
    it('stops in front of an emergency vehicle that stands in its way and moves on afterwards', () => {
        const paths = [road('long', 4, [-150, 0], [150, 0])], plan = analyzeRoads(paths);
        const traffic = createTraffic(paths, { seed: 2, count: 4 });
        const standing: EmergencyVehicle[] = [{ x: 0, y: 0, heading: 0 }];
        const result = simulate(traffic, plan, 120, standing);
        for (const a of traffic.agents) expect(Math.hypot(a.x, a.y)).toBeGreaterThan(2.5);
        expect(result.minDistance).toBeGreaterThan(1.2);
        const free = simulate(traffic, plan, 60, []);
        expect(free.travelled.some(d => d > 50)).toBe(true);
    });
});

describe('traffic on a generated city', () => {
    const layout = generateTrainingLayout({ profile: 'city', seed: 20261009, size: 600 });
    it('keeps ambient cars on the road network, apart from each other and moving', () => {
        const plan = analyzeRoads(layout.paths);
        const traffic = createTraffic(layout.paths, { seed: layout.seed });
        expect(traffic.agents.length).toBeGreaterThan(10);
        expect(traffic.agents.length).toBeLessThanOrEqual(60);
        const result = simulate(traffic, plan, 150);
        expect(result.worstOffRoad).toBeLessThan(.2);
        expect(result.minDistance).toBeGreaterThan(1.2);
        expect(result.travelled.filter(d => d > 60).length).toBeGreaterThan(traffic.agents.length * .8);
        expect(result.roads.size).toBeGreaterThan(3);
    });
    it('is cheap: a frame of the whole traffic takes well under two milliseconds', () => {
        const traffic = createTraffic(layout.paths, { seed: layout.seed });
        for (let i = 0; i < 100; i++) traffic.update(1 / 30);
        const t0 = performance.now();
        for (let i = 0; i < 600; i++) traffic.update(1 / 30);
        expect((performance.now() - t0) / 600).toBeLessThan(2);
    });
    it('never puts a car on a footpath', () => {
        const net = buildTrafficNetwork(analyzeRoads(layout.paths));
        const ids = new Set(net.lanes.map(l => l.roadId));
        for (const path of layout.paths.filter(p => p.kind !== 'road')) expect(ids.has(path.id)).toBe(false);
    });
});

describe('traffic on every generated profile', () => {
    const cases: Array<[Parameters<typeof generateTrainingLayout>[0] extends infer O ? O extends { profile?: infer P } ? P : never : never, number]> = [];
    for (const profile of ['city', 'urban', 'mixed', 'forest', 'hills', 'industrial'] as const) for (const seed of [20261009, 7]) cases.push([profile, seed]);
    test.each(cases)('%s seed %i: no overlaps, on the carriageway, moving', (profile, seed) => {
        const layout = generateTrainingLayout({ profile, seed, size: profile === 'city' ? 600 : undefined });
        const plan = analyzeRoads(layout.paths);
        const traffic = createTraffic(layout.paths, { seed });
        if (!traffic.agents.length) return;
        const result = simulate(traffic, plan, 160);
        expect(result.minDistance).toBeGreaterThan(1.2);
        expect(result.worstOffRoad).toBeLessThan(.2);
        expect(result.travelled.filter(d => d > 40).length).toBeGreaterThanOrEqual(Math.ceil(traffic.agents.length * .7));
    });
});
