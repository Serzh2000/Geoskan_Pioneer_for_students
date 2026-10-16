import { distanceToPath, distanceToPolygon, nearestOnPath, segmentCrossing, type Box, type Point2, type WaterProbe } from './geography.js';
import type { TrainingLayout } from './layout.js';
import type { WorldPath } from './world-plan.js';

/*
 * The road book: every road, rail and footpath of a generated map goes through here, so that
 *   - nothing is laid across the lesson strip, the start pad, the map edge or open water (except a deliberate bridge),
 *   - roads never cross the railway except where the plan says so,
 *   - junctions are real: after `stitch()` every T-junction and crossing is a vertex of both roads,
 *   - separate road groups can be joined into one network (`connectAll`).
 */
export type Hierarchy = NonNullable<WorldPath['hierarchy']>;
export type RoadSpec = { id: string; kind: WorldPath['kind']; hierarchy?: Hierarchy; width: number; points: Point2[]; label: string;
    /** May cross water (a bridge is added later). */ bridge?: boolean; /** May cross a railway (level crossing / overpass). */ crossRail?: boolean };

/** The lesson strip: start pad, 5 m corridor and the four ArUco markers. No road or path may touch it. */
export const LESSON_BOX: Box = { x0: -14, y0: -20, x1: 14, y1: 96 };

export const ROAD_WIDTH: Record<Hierarchy, number> = { arterial: 6, collector: 4.8, street: 3.8, lane: 2.8, link: 3.4 };

export class RoadBook {
    private readonly half: number;
    private readonly lakes: TrainingLayout['water'];
    constructor(readonly layout: TrainingLayout, readonly probe: WaterProbe) { this.half = layout.size / 2; this.lakes = layout.water.filter(w => w.kind === 'lake'); }

    private samples(points: Point2[], step: number): Point2[] {
        const out: Point2[] = [];
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
            for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
        }
        out.push(points[points.length - 1]);
        return out;
    }

    valid(spec: Pick<RoadSpec, 'points' | 'width' | 'kind' | 'bridge' | 'crossRail'>): boolean {
        const { points, width, kind } = spec;
        if (points.length < 2) return false;
        const step = 2.5, rails = this.layout.paths.filter(p => p.kind === 'rail');
        let water = 0;
        const samples = this.samples(points, step);
        // A road never ends in the water: its two ends stand on dry land.
        if (kind !== 'rail') for (const end of [samples[0], samples[samples.length - 1]]) if (this.probe.distance(end, width / 2 + 2) < width / 2 + 2) return false;
        for (const s of samples) {
            if (Math.abs(s.x) > this.half - 3 || Math.abs(s.y) > this.half - 3) return false;
            if (kind !== 'rail' && s.x > LESSON_BOX.x0 - width / 2 - 1.5 && s.x < LESSON_BOX.x1 + width / 2 + 1.5
                && s.y > LESSON_BOX.y0 - width / 2 - 1.5 && s.y < LESSON_BOX.y1 + width / 2 + 1.5) return false;
            if (this.probe.distance(s, width / 2 + 1.2) < width / 2 + 1.2) {
                // Only a river takes a bridge; a lake is never crossed.
                if (this.lakes.some(l => distanceToPolygon(s, l.points) < width / 2 + 1.2)) return false;
                water++;
            }
            if (!spec.crossRail && kind !== 'rail' && rails.some(r => distanceToPath(s, r.points) < r.width / 2 + width / 2 + 4)) return false;
        }
        if (water && (!spec.bridge || water * step > 90)) return false;
        if (!spec.crossRail && kind !== 'rail') {
            for (const r of rails) for (let i = 1; i < r.points.length; i++) for (let k = 1; k < points.length; k++)
                if (segmentCrossing(points[k - 1], points[k], r.points[i - 1], r.points[i])) return false;
        }
        return true;
    }

    add(spec: RoadSpec): WorldPath | null {
        if (!this.valid(spec)) return null;
        const path: WorldPath = { id: spec.id, kind: spec.kind, width: spec.width, points: spec.points.map(p => ({ x: p.x, y: p.y })), label: spec.label };
        if (spec.hierarchy) path.hierarchy = spec.hierarchy;
        this.layout.paths.push(path);
        return path;
    }

    get(id: string): WorldPath | undefined { return this.layout.paths.find(p => p.id === id); }
    roads(): WorldPath[] { return this.layout.paths.filter(p => p.kind === 'road'); }

    nearestRoad(p: Point2, among: WorldPath[] = this.roads()): { path: WorldPath; point: Point2; distance: number } | null {
        let best: { path: WorldPath; point: Point2; distance: number } | null = null;
        for (const path of among) {
            const hit = nearestOnPath(p, path.points);
            if (!best || hit.distance < best.distance) best = { path, point: hit.point, distance: hit.distance };
        }
        return best;
    }

    /** Make every junction a vertex of both roads, snapping loose road ends that lie on another road. */
    stitch(): void {
        const roads = this.roads();
        // 1. Road ends that rest on another road become T-junctions.
        for (const a of roads) for (const end of [0, a.points.length - 1]) {
            const e = a.points[end];
            let best: { host: WorldPath; seg: number; t: number; q: Point2; d: number } | null = null;
            for (const b of roads) {
                if (b === a) continue;
                const hit = nearestOnPath(e, b.points);
                if (hit.distance <= 1.6 && (!best || hit.distance < best.d)) best = { host: b, seg: hit.segment, t: hit.t, q: hit.point, d: hit.distance };
            }
            if (!best) continue;
            const { host, seg, q } = best, v0 = host.points[seg], v1 = host.points[seg + 1];
            if (Math.hypot(q.x - v0.x, q.y - v0.y) < .35) a.points[end] = { x: v0.x, y: v0.y };
            else if (Math.hypot(q.x - v1.x, q.y - v1.y) < .35) a.points[end] = { x: v1.x, y: v1.y };
            else { host.points.splice(seg + 1, 0, { x: q.x, y: q.y }); a.points[end] = { x: q.x, y: q.y }; }
        }
        // 2. Roads that cross get a shared vertex at the crossing.
        const inserts = new Map<WorldPath, Array<{ seg: number; t: number; p: Point2 }>>();
        const note = (path: WorldPath, seg: number, t: number, p: Point2) => { const list = inserts.get(path); if (list) list.push({ seg, t, p }); else inserts.set(path, [{ seg, t, p }]); };
        for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) {
            const A = roads[i], B = roads[j];
            for (let s = 1; s < A.points.length; s++) for (let u = 1; u < B.points.length; u++) {
                const hit = segmentCrossing(A.points[s - 1], A.points[s], B.points[u - 1], B.points[u]);
                if (!hit) continue;
                note(A, s - 1, hit.t, hit); note(B, u - 1, hit.u, hit);
            }
        }
        for (const [path, list] of inserts) {
            list.sort((p, q) => q.seg - p.seg || q.t - p.t);
            for (const item of list) path.points.splice(item.seg + 1, 0, { x: item.p.x, y: item.p.y });
        }
        // 3. Drop zero-length duplicates.
        for (const road of roads) road.points = road.points.filter((p, i) => i === 0 || Math.hypot(p.x - road.points[i - 1].x, p.y - road.points[i - 1].y) > .05);
    }

    /** Groups of roads that share vertices (one group = one connected network). */
    components(): WorldPath[][] {
        const roads = this.roads(), parent = roads.map((_, i) => i);
        const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
        const byVertex = new Map<string, number>();
        roads.forEach((road, i) => { for (const p of road.points) {
            const key = `${Math.round(p.x * 5)},${Math.round(p.y * 5)}`, seen = byVertex.get(key);
            if (seen === undefined) byVertex.set(key, i); else parent[find(i)] = find(seen);
        } });
        const groups = new Map<number, WorldPath[]>();
        roads.forEach((road, i) => { const k = find(i), list = groups.get(k); if (list) list.push(road); else groups.set(k, [road]); });
        return [...groups.values()].sort((a, b) => b.length - a.length);
    }

    /**
     * Join every separate road group to the group that holds `mainId` by the shortest valid link.
     * Returns the ids of groups that could not be joined.
     */
    connectAll(mainId: string, label = 'Соединительная улица'): WorldPath[][] {
        let linkNo = 0;
        for (let round = 0; round < 40; round++) {
            this.stitch();
            const groups = this.components();
            const main = groups.find(g => g.some(r => r.id === mainId)) ?? groups[0];
            const loose = groups.filter(g => g !== main);
            if (!loose.length) return [];
            let progressed = false;
            // Nearest group first: it may itself become a stepping stone for a farther one.
            const scored = loose.map(group => {
                let best = { d: Infinity, from: group[0].points[0], to: main[0].points[0], road: main[0] };
                for (const road of group) for (const v of road.points) {
                    const hit = this.nearestRoad(v, main);
                    if (hit && hit.distance < best.d) best = { d: hit.distance, from: v, to: hit.point, road: hit.path };
                }
                return { group, best };
            }).sort((a, b) => a.best.d - b.best.d);
            for (const { group, best } of scored) {
                const candidates: Array<{ from: Point2; to: Point2; d: number }> = [];
                for (const road of group) for (const v of road.points) {
                    const hit = this.nearestRoad(v, main);
                    if (hit) candidates.push({ from: v, to: hit.point, d: hit.distance });
                }
                candidates.sort((a, b) => a.d - b.d);
                let done = false;
                for (const c of candidates.slice(0, 30)) {
                    if (c.d < .5) { done = true; break; }
                    // Keep links short and straight; a bent link takes a mid point so it can sidestep a lake.
                    const link: RoadSpec = { id: `link-${++linkNo}`, kind: 'road', hierarchy: 'link', width: ROAD_WIDTH.link, points: [c.from, c.to], label };
                    if (this.add(link)) { done = true; progressed = true; break; }
                }
                if (done) break;
                void best;
            }
            if (!progressed) return loose;
        }
        this.stitch();
        const groups = this.components();
        return groups.slice(1);
    }

    /** Bridges where a road or railway meets water; the overpass over a railway is added by the planner. */
    bridges(): void {
        const layout = this.layout;
        for (const route of layout.paths.filter(p => p.kind === 'road' || p.kind === 'rail')) for (let i = 1; i < route.points.length; i++) {
            const a = route.points[i - 1], b = route.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
            const crossings: Point2[] = [];
            for (let step = 0; step <= steps; step++) {
                const t = step / Math.max(1, steps), p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
                if (this.probe.distance(p, .3) < .3) crossings.push(p);
            }
            if (!crossings.length) continue;
            const middle = crossings[Math.floor(crossings.length / 2)], last = crossings[crossings.length - 1];
            layout.bridges.push({ ...middle, pathId: route.id, length: Math.max(layout.size * .05, Math.hypot(crossings[0].x - last.x, crossings[0].y - last.y) + 4),
                width: route.width + .8, rotation: Math.atan2(b.y - a.y, b.x - a.x), kind: 'river' });
        }
    }
}
