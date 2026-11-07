import { distanceToPath, seededRandom, type Point2 } from '../environment/training/geography.js';
import type { TrainingLayout, TrainingProp } from '../environment/training/layout.js';
import { analyzeRoads, projectOnPolyline } from './roads.js';

/*
 * The network people walk on, pure logic. It is built from the layout's footpaths (pavements along the big streets and
 * the paths of the parks) and nothing else, so a pedestrian can only ever be where a footpath is:
 *   - every footpath is cut into short links; links of different paths that touch are joined;
 *   - a stretch of footpath that lies on a carriageway (a pavement running across the mouth of a side street) is a
 *     crossing, and so is a link laid between the two pavements of one street at a few places along it;
 *   - links through a tree, a building or the water are dropped.
 * Crossings are the only places where people meet traffic; pedestrians.ts makes them wait there and the cars give way.
 */
export const STEP = 2.5;                     // m between nodes
export type WalkEdge = { to: number; length: number; /** index into `crossings`, or -1 on a pavement */ crossing: number };
export type WalkNode = Point2 & { adj: WalkEdge[]; component: number; /** half width of the path it lies on */ half: number };
export type Crossing = { id: number; a: Point2; b: Point2; roadId: string; width: number; nodes: number[] };
export type PointOfInterest = { kind: 'stop' | 'bench' | 'cafe' | 'home' | 'park'; node: number; x: number; y: number };
export type WalkNet = {
    nodes: WalkNode[]; crossings: Crossing[]; pois: PointOfInterest[];
    /** Total length of footpath of each connected component, metres. */
    components: number[];
    /** Distance from a point to the nearest part of the network (for tests: where people may be). */
    distanceTo(p: Point2): { distance: number; half: number; crossing: boolean };
};

const SOLID: ReadonlySet<string> = new Set(['tree', 'building', 'house', 'warehouse', 'station', 'water-tower', 'barn', 'silo', 'church', 'fire-station',
    'police-station', 'school', 'hospital', 'restaurant', 'mall', 'office', 'gas-station', 'hangar', 'greenhouse', 'power-pylon', 'containers', 'rocks', 'solar', 'gantry-crane']);
const dist = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.y - b.y);

export function buildWalkNet(layout: TrainingLayout): WalkNet {
    const plan = analyzeRoads(layout.paths);
    const solids = layout.objects.filter(o => SOLID.has(o.type)).map(o => ({ x: o.x, y: o.y, r: o.radius * .85 + .5 }));
    const solidCell = new Map<string, typeof solids>();
    const CELL = 20;
    for (const s of solids) for (let cx = Math.floor((s.x - s.r) / CELL); cx <= Math.floor((s.x + s.r) / CELL); cx++) for (let cy = Math.floor((s.y - s.r) / CELL); cy <= Math.floor((s.y + s.r) / CELL); cy++) {
        const key = `${cx},${cy}`; (solidCell.get(key) ?? solidCell.set(key, []).get(key)!).push(s);
    }
    const blocked = (p: Point2): boolean => {
        const list = solidCell.get(`${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`);
        if (list) for (const s of list) if (Math.hypot(p.x - s.x, p.y - s.y) < s.r) return true;
        for (const w of layout.water) if (w.kind === 'lake' ? false : distanceToPath(p, w.points) < w.width / 2 + .5) return true;
        return false;
    };
    const boxes = plan.roads.map(r => ({ x0: Math.min(...r.points.map(q => q.x)) - r.width, x1: Math.max(...r.points.map(q => q.x)) + r.width,
        y0: Math.min(...r.points.map(q => q.y)) - r.width, y1: Math.max(...r.points.map(q => q.y)) + r.width }));
    /** Index of the road whose carriageway (plus `margin`) the point is on, or -1. */
    const onCarriageway = (p: Point2, margin = .3): number => {
        for (let i = 0; i < plan.roads.length; i++) {
            const r = plan.roads[i], b = boxes[i];
            if (p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) continue;
            if (projectOnPolyline(r.points, r.lengths, p).d < r.width / 2 + margin) return i;
        }
        for (const j of plan.junctions) if (Math.abs(j.x - p.x) < j.radius + margin && Math.abs(j.y - p.y) < j.radius + margin && dist(j, p) < j.radius + margin - .1) return j.arms[0].road;
        return -1;
    };

    const nodes: WalkNode[] = [];
    const addNode = (p: Point2, half: number) => { nodes.push({ x: p.x, y: p.y, adj: [], component: -1, half }); return nodes.length - 1; };
    const link = (a: number, b: number, crossing = -1) => {
        if (a === b || nodes[a].adj.some(e => e.to === b)) return;
        const length = dist(nodes[a], nodes[b]);
        nodes[a].adj.push({ to: b, length, crossing }); nodes[b].adj.push({ to: a, length, crossing });
    };

    // 1. Footpaths, resampled.
    const walks = layout.paths.filter(p => p.kind === 'footpath' && p.points.length >= 2);
    const pathNodes = new Map<string, number[]>();
    for (const path of walks) {
        const ids: number[] = [];
        let previous = -1;
        for (let i = 1; i < path.points.length; i++) {
            const a = path.points[i - 1], b = path.points[i], n = Math.max(1, Math.ceil(dist(a, b) / STEP));
            for (let k = i === 1 ? 0 : 1; k <= n; k++) {
                const p = { x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n };
                if (blocked(p)) { previous = -1; continue; }
                const id = addNode(p, path.width / 2);
                ids.push(id);
                if (previous >= 0) link(previous, id);
                previous = id;
            }
        }
        pathNodes.set(path.id, ids);
    }

    // 2. Where paths touch they join (a pavement meets a park path, an alley ends on a ring).
    const grid = new Map<string, number[]>();
    const reindex = () => { grid.clear(); nodes.forEach((n, i) => { const key = `${Math.floor(n.x / 4)},${Math.floor(n.y / 4)}`; (grid.get(key) ?? grid.set(key, []).get(key)!).push(i); }); };
    reindex();
    const near = (p: Point2, radius: number): number[] => {
        const out: number[] = [];
        for (let cx = Math.floor((p.x - radius) / 4); cx <= Math.floor((p.x + radius) / 4); cx++) for (let cy = Math.floor((p.y - radius) / 4); cy <= Math.floor((p.y + radius) / 4); cy++)
            for (const i of grid.get(`${cx},${cy}`) ?? []) if (dist(nodes[i], p) <= radius) out.push(i);
        return out;
    };
    const owner = new Map<number, string>();
    for (const [id, list] of pathNodes) for (const n of list) owner.set(n, id);
    for (let i = 0; i < nodes.length; i++) for (const j of near(nodes[i], 1.3)) if (j > i && owner.get(i) !== owner.get(j)) link(i, j);
    // The loose end of a path within reach of another path joins it.
    for (const [id, list] of pathNodes) for (const end of [list[0], list[list.length - 1]]) {
        if (end === undefined) continue;
        let best = -1, bestD = 3.2;
        for (const j of near(nodes[end], 3.2)) if (owner.get(j) !== id && dist(nodes[end], nodes[j]) < bestD) { best = j; bestD = dist(nodes[end], nodes[j]); }
        if (best >= 0) link(end, best);
    }

    // 3. Links that lie on a carriageway are crossings.
    const crossings: Crossing[] = [];
    const roadOfEdge = new Map<string, number>();
    for (let i = 0; i < nodes.length; i++) for (const e of nodes[i].adj) {
        if (e.to < i) continue;
        // A person walks a little to the side of the line: a link that comes within 0.6 m of the asphalt anywhere is a crossing.
        const a = nodes[i], b = nodes[e.to];
        let r = -1;
        for (let k = 0; k <= 5 && r < 0; k++) r = onCarriageway({ x: a.x + (b.x - a.x) * k / 5, y: a.y + (b.y - a.y) * k / 5 }, .6);
        if (r >= 0) roadOfEdge.set(`${i}:${e.to}`, r);
    }
    const flag = (a: number, b: number, crossing: number) => {
        for (const e of nodes[a].adj) if (e.to === b) e.crossing = crossing;
        for (const e of nodes[b].adj) if (e.to === a) e.crossing = crossing;
    };
    // Group flagged links into zones: chains of flagged links sharing nodes.
    const flaggedAdj = new Map<number, number[]>();
    for (const key of roadOfEdge.keys()) {
        const [a, b] = key.split(':').map(Number);
        (flaggedAdj.get(a) ?? flaggedAdj.set(a, []).get(a)!).push(b);
        (flaggedAdj.get(b) ?? flaggedAdj.set(b, []).get(b)!).push(a);
    }
    const seen = new Set<number>();
    for (const start of flaggedAdj.keys()) {
        if (seen.has(start)) continue;
        const stack = [start], members: number[] = [];
        seen.add(start);
        while (stack.length) { const n = stack.pop()!; members.push(n); for (const m of flaggedAdj.get(n) ?? []) if (!seen.has(m)) { seen.add(m); stack.push(m); } }
        const id = crossings.length;
        const xs = members.map(n => nodes[n].x), ys = members.map(n => nodes[n].y);
        const roadIndex = members.map(n => roadOfEdge.get(`${Math.min(n, flaggedAdj.get(n)![0])}:${Math.max(n, flaggedAdj.get(n)![0])}`)).find(v => v !== undefined) ?? 0;
        crossings.push({ id, a: { x: Math.min(...xs), y: Math.min(...ys) }, b: { x: Math.max(...xs), y: Math.max(...ys) }, roadId: plan.roads[roadIndex]?.id ?? '', width: plan.roads[roadIndex]?.width ?? 4, nodes: members });
    }
    for (const key of roadOfEdge.keys()) {
        const [a, b] = key.split(':').map(Number);
        const id = crossings.findIndex(c => c.nodes.includes(a));
        flag(a, b, id);
    }

    // 4. The two pavements of a street are joined by a crossing every so often, away from junctions.
    const stems = new Map<string, { a?: string; b?: string }>();
    for (const path of walks) {
        const m = /^(walk-.+)-([ab])$/.exec(path.id);
        if (m) (stems.get(m[1]) ?? stems.set(m[1], {}).get(m[1])!)[m[2] as 'a' | 'b'] = path.id;
    }
    const clearOfJunction = (p: Point2) => plan.junctions.every(j => dist(j, p) > j.radius + 9);
    for (const [, pair] of stems) {
        if (!pair.a || !pair.b) continue;
        const listA = pathNodes.get(pair.a)!, listB = pathNodes.get(pair.b)!;
        let carried = 25;
        for (const na of listA) {
            carried += STEP;
            if (carried < 60 || !clearOfJunction(nodes[na]) || nodes[na].adj.some(e => e.crossing >= 0)) continue;
            let nb = -1, bd = 16;
            for (const j of listB) if (dist(nodes[na], nodes[j]) < bd) { bd = dist(nodes[na], nodes[j]); nb = j; }
            if (nb < 0 || !clearOfJunction(nodes[nb]) || nodes[nb].adj.some(e => e.crossing >= 0)) continue;
            const a = nodes[na], b = nodes[nb], len = dist(a, b);
            // The straight link must cross the street it belongs to and nothing else.
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const road = onCarriageway(mid);
            if (road < 0) continue;
            let ok = true;
            const count = Math.max(2, Math.ceil(len / STEP));
            for (let k = 0; k <= count && ok; k++) {
                const p = { x: a.x + (b.x - a.x) * k / count, y: a.y + (b.y - a.y) * k / count };
                if (blocked(p)) ok = false;
                const r = onCarriageway(p);
                if (r >= 0 && r !== road) ok = false;
            }
            if (!ok) continue;
            const id = crossings.length, chain: number[] = [na];
            let prev = na;
            for (let k = 1; k < count; k++) {
                const n = addNode({ x: a.x + (b.x - a.x) * k / count, y: a.y + (b.y - a.y) * k / count }, 1);
                link(prev, n, id); chain.push(n); prev = n;
            }
            link(prev, nb, id); chain.push(nb);
            crossings.push({ id, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, roadId: plan.roads[road].id, width: plan.roads[road].width, nodes: chain.slice(1, -1) });
            carried = 0;
        }
    }

    reindex();

    // 5. Connected components and their length.
    const components: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].component >= 0) continue;
        const id = components.length; components.push(0);
        const stack = [i]; nodes[i].component = id;
        while (stack.length) {
            const n = stack.pop()!;
            for (const e of nodes[n].adj) { components[id] += e.length / 2; if (nodes[e.to].component < 0) { nodes[e.to].component = id; stack.push(e.to); } }
        }
    }

    // 6. Places to go: stops, benches, cafes, doors of houses, the middle of parks.
    const pois: PointOfInterest[] = [];
    const nearestNode = (p: Point2, reach: number): number => {
        let best = -1, bd = reach;
        for (const i of near(p, reach)) if (dist(nodes[i], p) < bd && components[nodes[i].component] >= 40) { bd = dist(nodes[i], p); best = i; }
        return best;
    };
    const random = seededRandom(layout.seed ^ 0x9e3779);
    for (const o of layout.objects as TrainingProp[]) {
        const kind = o.type === 'bus-stop' ? 'stop' : o.type === 'bench' ? 'bench' : o.type === 'cafe-table' ? 'cafe'
            : (o.type === 'house' || o.type === 'building') && random() < .35 ? 'home' : null;
        if (!kind) continue;
        const node = nearestNode(o, kind === 'home' ? o.radius + 8 : 10);
        if (node >= 0 && nodes[node].adj.every(e => e.crossing < 0)) pois.push({ kind, node, x: nodes[node].x, y: nodes[node].y });
    }
    nodes.forEach((n, i) => { if (random() < .04 && components[n.component] >= 40 && n.adj.every(e => e.crossing < 0)) pois.push({ kind: 'park', node: i, x: n.x, y: n.y }); });

    return {
        nodes, crossings, pois, components,
        distanceTo(p) {
            let best = Infinity, half = 0, crossing = false;
            for (const i of near(p, 6)) {
                const n = nodes[i];
                for (const e of n.adj) {
                    const m = nodes[e.to];
                    const dx = m.x - n.x, dy = m.y - n.y, sq = dx * dx + dy * dy || 1;
                    const t = Math.max(0, Math.min(1, ((p.x - n.x) * dx + (p.y - n.y) * dy) / sq));
                    const d = Math.hypot(p.x - (n.x + dx * t), p.y - (n.y + dy * t));
                    if (d < best) { best = d; half = Math.max(n.half, m.half); crossing = e.crossing >= 0; }
                }
                if (dist(n, p) < best) { best = dist(n, p); half = n.half; crossing = false; }
            }
            return { distance: best, half, crossing };
        }
    };
}
