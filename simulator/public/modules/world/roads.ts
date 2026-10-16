import type { Point2 } from '../environment/training/geography.js';

/*
 * Road geometry and graph. Roads are polylines that the generator lays out loosely, so this file first turns them into
 * a proper network: bends are rounded (the renderer and the traffic use the very same curve), crossings and T-junctions
 * become exact junction points, and loose road ends are snapped onto the road they were meant to join. The graph for the
 * emergency vehicles and the lane network for the ambient traffic (traffic.ts) are both built from that analysis.
 */
export type RoadLike = { id: string; kind: string; points: Point2[]; width?: number };
export type RoadGraph = { nodes: Point2[]; edges: Array<Array<{ to: number; length: number }>>; junctionNodes: number[] };

/** A road that takes part in the network: rounded and snapped centre line with its running length. */
export type AnalyzedRoad = { id: string; index: number; width: number; points: Point2[]; lengths: number[]; length: number; /** A ring road: its last point is its first. */ closed: boolean };
/** Where a road meets a junction: `s` metres from its start; `end` is 0/1 when the road starts/ends there, -1 when it runs through. */
export type RoadArm = { road: number; s: number; end: 0 | 1 | -1 };
export type Junction = {
    x: number; y: number; arms: RoadArm[];
    /** Number of directions one can leave the junction in (a crossing of two roads has four). */
    degree: number;
    /** Radius of the asphalt patch that covers the overlapping ribbons. */
    radius: number;
};
export type RoadPlan = { roads: AnalyzedRoad[]; junctions: Junction[] };

const STEP = 8;
const FILLET_RADIUS = 7;
const CLUSTER_RADIUS = 9;
const DEFAULT_WIDTH = 3.6;

const dist = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.y - b.y);

export function cumulativeLengths(points: Point2[]): number[] {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + dist(points[i], points[i - 1]));
    return lengths;
}

/** Point at distance `s` along a polyline (clamped to its ends). */
export function pointAlong(points: Point2[], lengths: number[], s: number): Point2 {
    if (s <= 0) return { x: points[0].x, y: points[0].y };
    const total = lengths[lengths.length - 1];
    if (s >= total) return { x: points[points.length - 1].x, y: points[points.length - 1].y };
    let i = 1;
    while (i < points.length - 1 && lengths[i] < s) i++;
    const a = points[i - 1], b = points[i], span = lengths[i] - lengths[i - 1] || 1, t = (s - lengths[i - 1]) / span;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Nearest point of a polyline: its distance from the start, the distance to it and the point itself. */
export function projectOnPolyline(points: Point2[], lengths: number[], p: Point2): { s: number; d: number; x: number; y: number } {
    let best = { s: 0, d: Infinity, x: points[0].x, y: points[0].y };
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y, sq = dx * dx + dy * dy;
        const t = sq ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / sq)) : 0;
        const x = a.x + dx * t, y = a.y + dy * t, d = Math.hypot(p.x - x, p.y - y);
        if (d < best.d) best = { s: lengths[i - 1] + Math.sqrt(sq) * t, d, x, y };
    }
    return best;
}

/**
 * Rounds every bend with a quadratic Bezier of the given radius, so that a car can follow the road and the ribbon does
 * not pinch. Legs are never cut by more than half, the ends are kept.
 */
export function filletPolyline(points: Point2[], radius = FILLET_RADIUS): Point2[] {
    if (points.length < 3) return points.map(p => ({ x: p.x, y: p.y }));
    const out: Point2[] = [{ x: points[0].x, y: points[0].y }];
    for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1], b = points[i], c = points[i + 1];
        const l1 = dist(a, b), l2 = dist(b, c);
        if (l1 < 1e-6 || l2 < 1e-6) continue;
        const d1 = { x: (b.x - a.x) / l1, y: (b.y - a.y) / l1 }, d2 = { x: (c.x - b.x) / l2, y: (c.y - b.y) / l2 };
        const turn = Math.acos(Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y)));
        if (turn < .05 || turn > 2.8) { out.push({ x: b.x, y: b.y }); continue; }
        const t = Math.min(radius * Math.tan(turn / 2), Math.min(l1, l2) * .5);
        const p0 = { x: b.x - d1.x * t, y: b.y - d1.y * t }, p2 = { x: b.x + d2.x * t, y: b.y + d2.y * t };
        const steps = Math.max(3, Math.ceil(turn * 4));
        for (let k = 0; k <= steps; k++) {
            const u = k / steps, v = 1 - u;
            out.push({ x: v * v * p0.x + 2 * u * v * b.x + u * u * p2.x, y: v * v * p0.y + 2 * u * v * b.y + u * u * p2.y });
        }
    }
    out.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
    return out;
}

function intersectSegments(p: Point2, p2: Point2, q: Point2, q2: Point2): { x: number; y: number; t: number; u: number } | null {
    const rx = p2.x - p.x, ry = p2.y - p.y, sx = q2.x - q.x, sy = q2.y - q.y;
    const denom = rx * sy - ry * sx;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((q.x - p.x) * sy - (q.y - p.y) * sx) / denom, u = ((q.x - p.x) * ry - (q.y - p.y) * rx) / denom;
    if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
    return { x: p.x + rx * t, y: p.y + ry * t, t, u };
}

/** Crossing points of two polylines (used for road/rail level crossings as well). */
export function crossPolylines(a: Point2[], b: Point2[]): Point2[] {
    const out: Point2[] = [];
    for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
        const hit = intersectSegments(a[i - 1], a[i], b[j - 1], b[j]);
        if (hit && !out.some(o => Math.hypot(o.x - hit.x, o.y - hit.y) < 1)) out.push({ x: hit.x, y: hit.y });
    }
    return out;
}

type Candidate = { x: number; y: number; roads: Array<{ road: number; s: number; end: 0 | 1 | -1 }> };

const cache = new WeakMap<object, RoadPlan>();

/** Rounded centre lines, exact junction points and snapped road ends of every `road` path. Cached per paths array. */
export function analyzeRoads(paths: RoadLike[]): RoadPlan {
    const cached = cache.get(paths);
    if (cached) return cached;
    const roads: AnalyzedRoad[] = [];
    paths.forEach((path, index) => {
        if (path.kind !== 'road' || path.points.length < 2) return;
        const closed = path.points.length >= 4 && dist(path.points[0], path.points[path.points.length - 1]) < 4;
        // A loop that stops a few metres short of its start (a turnaround circle) is closed.
        const raw = closed ? [...path.points.slice(0, -1), { ...path.points[0] }] : path.points;
        let points: Point2[];
        if (closed) {
            // Round the corner at the seam too: start the ring in the middle of its first leg.
            const mid = { x: (raw[0].x + raw[1].x) / 2, y: (raw[0].y + raw[1].y) / 2 };
            points = filletPolyline([mid, ...raw.slice(1, -1), raw[0], mid]);
            points[points.length - 1] = { x: points[0].x, y: points[0].y };
        } else points = filletPolyline(raw);
        const lengths = cumulativeLengths(points);
        roads.push({ id: path.id, index, width: path.width ?? DEFAULT_WIDTH, points, lengths, length: lengths[lengths.length - 1], closed });
    });

    // A road that lies on top of another one (the generator sometimes lays a link along an existing street) is the
    // same carriageway: keep the wider, longer one.
    const covered = (r: AnalyzedRoad, other: AnalyzedRoad) => {
        let inside = 0, total = 0;
        for (let d = 0; d <= r.length; d += 3) {
            const p = pointAlong(r.points, r.lengths, d);
            total++;
            if (projectOnPolyline(other.points, other.lengths, p).d < Math.max(1.5, Math.min(r.width, other.width) / 2)) inside++;
        }
        return total > 0 && inside / total > .85;
    };
    for (let i = roads.length - 1; i >= 0; i--) {
        const dup = roads.some((o, j) => j !== i && !o.closed && !roads[i].closed && covered(roads[i], o)
            && (o.width > roads[i].width || (o.width === roads[i].width && (o.length > roads[i].length || (o.length === roads[i].length && j < i)))));
        if (dup) roads.splice(i, 1);
    }
    // A road that runs alongside a wider one for a stretch (a link laid beside a street) shares its carriageway there:
    // the stretch is left to the wider road, what remains of the link joins it at the ends.
    const original = roads.slice();
    const outranks = (o: AnalyzedRoad, r: AnalyzedRoad) => o.width > r.width || (o.width === r.width && (o.length > r.length || (o.length === r.length && original.indexOf(o) < original.indexOf(r))));
    const pieces: AnalyzedRoad[] = [];
    for (const r of original) {
        const higher = original.filter(o => o !== r && !o.closed && outranks(o, r));
        if (r.closed || !higher.length) { pieces.push(r); continue; }
        const shared: boolean[] = [];
        const samples = Math.max(1, Math.ceil(r.length));
        for (let k = 0; k <= samples; k++) {
            const p = pointAlong(r.points, r.lengths, r.length * k / samples);
            shared.push(higher.some(o => projectOnPolyline(o.points, o.lengths, p).d < Math.max(1.5, (o.width + r.width) / 4)));
        }
        // Runs of shared samples shorter than 5 m are plain crossings and stay.
        const step = r.length / samples;
        for (let k = 0; k <= samples;) {
            if (!shared[k]) { k++; continue; }
            let e = k; while (e + 1 <= samples && shared[e + 1]) e++;
            if ((e - k) * step < 5) for (let q = k; q <= e; q++) shared[q] = false;
            k = e + 1;
        }
        if (!shared.some(Boolean)) { pieces.push(r); continue; }
        for (let k = 0; k <= samples;) {
            if (shared[k]) { k++; continue; }
            let e = k; while (e + 1 <= samples && !shared[e + 1]) e++;
            const from = r.length * k / samples, to = r.length * e / samples;
            if (to - from >= 3) {
                const points = subPolyline(r, from, to);
                const lengths = cumulativeLengths(points);
                pieces.push({ ...r, points, lengths, length: lengths[lengths.length - 1] });
            }
            k = e + 1;
        }
    }
    roads.length = 0; roads.push(...pieces);
    const candidates: Candidate[] = [];
    for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) {
        const a = roads[i], b = roads[j];
        for (let m = 1; m < a.points.length; m++) for (let n = 1; n < b.points.length; n++) {
            const hit = intersectSegments(a.points[m - 1], a.points[m], b.points[n - 1], b.points[n]);
            if (!hit) continue;
            const sa = a.lengths[m - 1] + (a.lengths[m] - a.lengths[m - 1]) * hit.t, sb = b.lengths[n - 1] + (b.lengths[n] - b.lengths[n - 1]) * hit.u;
            // A junction at the very end of a road is a T: the road ends there.
            const endA = a.closed ? -1 : sa < .5 ? 0 : sa > a.length - .5 ? 1 : -1, endB = b.closed ? -1 : sb < .5 ? 0 : sb > b.length - .5 ? 1 : -1;
            candidates.push({ x: hit.x, y: hit.y, roads: [{ road: i, s: sa, end: endA }, { road: j, s: sb, end: endB }] });
        }
    }
    // Loose ends: a road that stops within reach of another road was meant to join it.
    for (let i = 0; i < roads.length; i++) for (const end of [0, 1] as const) {
        if (roads[i].closed) continue;
        const a = roads[i], p = end === 0 ? a.points[0] : a.points[a.points.length - 1], sEnd = end === 0 ? 0 : a.length;
        let best: { road: number; s: number; d: number; x: number; y: number } | null = null;
        for (let j = 0; j < roads.length; j++) {
            if (j === i) continue;
            const b = roads[j], hit = projectOnPolyline(b.points, b.lengths, p), reach = Math.max(5, b.width / 2 + 2.5);
            if (hit.d > reach || (best && hit.d >= best.d)) continue;
            // Already crossing that road close to this end: not a loose end.
            if (candidates.some(c => c.roads.some(r => r.road === i && Math.abs(r.s - sEnd) < 10) && c.roads.some(r => r.road === j))) continue;
            best = { road: j, s: hit.s, d: hit.d, x: hit.x, y: hit.y };
        }
        if (best) {
            const b = roads[best.road];
            candidates.push({ x: best.x, y: best.y, roads: [{ road: i, s: sEnd, end }, { road: best.road, s: best.s, end: b.closed ? -1 : best.s < .5 ? 0 : best.s > b.length - .5 ? 1 : -1 }] });
        }
    }

    // Candidates that lie close together are one junction.
    const clusters: Array<{ x: number; y: number; members: Candidate[] }> = [];
    for (const c of candidates) {
        const cluster = clusters.find(k => Math.hypot(k.x - c.x, k.y - c.y) <= CLUSTER_RADIUS);
        if (cluster) {
            cluster.members.push(c);
            cluster.x = cluster.members.reduce((sum, m) => sum + m.x, 0) / cluster.members.length;
            cluster.y = cluster.members.reduce((sum, m) => sum + m.y, 0) / cluster.members.length;
        } else clusters.push({ x: c.x, y: c.y, members: [c] });
    }
    // Snap the loose ends onto their junction, then measure every arm again on the snapped lines.
    for (const k of clusters) for (const m of k.members) for (const r of m.roads) {
        if (r.end < 0) continue;
        const road = roads[r.road];
        road.points[r.end === 0 ? 0 : road.points.length - 1] = { x: k.x, y: k.y };
    }
    for (const road of roads) { road.lengths = cumulativeLengths(road.points); road.length = road.lengths[road.lengths.length - 1]; }

    const junctions: Junction[] = [];
    for (const k of clusters) {
        const ends = new Map<number, 0 | 1 | -1>();
        for (const m of k.members) for (const r of m.roads) if (r.end >= 0 || !ends.has(r.road)) ends.set(r.road, r.end >= 0 ? r.end : (ends.get(r.road) ?? -1));
        const arms: RoadArm[] = [];
        for (const [index, end] of ends) {
            const road = roads[index];
            const s = end === 0 ? 0 : end === 1 ? road.length : projectOnPolyline(road.points, road.lengths, k).s;
            arms.push({ road: index, s, end });
        }
        if (arms.length < 2) continue;
        const widest = Math.max(...arms.map(arm => roads[arm.road].width));
        junctions.push({ x: k.x, y: k.y, arms, degree: arms.reduce((sum, arm) => sum + (arm.end < 0 ? 2 : 1), 0), radius: Math.max(widest / 2 * 1.25 + .3, ...k.members.map(m => Math.hypot(m.x - k.x, m.y - k.y) + widest / 2 + .5)) });
    }
    const plan = { roads, junctions };
    cache.set(paths, plan);
    return plan;
}

/** Points of a road between two distances, both included. */
export function subPolyline(road: AnalyzedRoad, from: number, to: number): Point2[] {
    const out: Point2[] = [pointAlong(road.points, road.lengths, from)];
    for (let i = 0; i < road.points.length; i++) if (road.lengths[i] > from + 1e-6 && road.lengths[i] < to - 1e-6) out.push({ x: road.points[i].x, y: road.points[i].y });
    out.push(pointAlong(road.points, road.lengths, to));
    return out;
}

/**
 * Where a road is cut into edges: its start, every junction on it and its end, in order. `junction` is the index in
 * the plan, or -1 for a free end (`free` says which one; a ring road has one seam that is both).
 */
export function roadAnchors(plan: RoadPlan, index: number): Array<{ s: number; junction: number; free: 0 | 1 }> {
    const road = plan.roads[index], anchors: Array<{ s: number; junction: number; free: 0 | 1 }> = [];
    plan.junctions.forEach((j, ji) => j.arms.forEach(arm => {
        if (arm.road === index) anchors.push({ s: road.closed && arm.s > road.length - .01 ? 0 : arm.s, junction: ji, free: 0 });
    }));
    anchors.sort((a, b) => a.s - b.s);
    if (!anchors.length || anchors[0].s >= .01) anchors.unshift({ s: 0, junction: -1, free: 0 });
    const first = anchors[0];
    if (road.closed) anchors.push({ s: road.length, junction: first.junction, free: 0 });
    else if (anchors[anchors.length - 1].s <= road.length - .01) anchors.push({ s: road.length, junction: -1, free: 1 });
    return anchors;
}

export function buildRoadGraph(paths: RoadLike[]): RoadGraph {
    const plan = analyzeRoads(paths);
    const nodes: Point2[] = [];
    const edges: RoadGraph['edges'] = [];
    const junctionNodes: number[] = [];
    const add = (p: Point2) => { nodes.push({ x: p.x, y: p.y }); edges.push([]); return nodes.length - 1; };
    const link = (a: number, b: number) => {
        const length = dist(nodes[a], nodes[b]);
        edges[a].push({ to: b, length });
        edges[b].push({ to: a, length });
    };
    plan.junctions.forEach(j => junctionNodes.push(add(j)));
    plan.roads.forEach((road, index) => {
        const free: number[] = [];
        const anchors = roadAnchors(plan, index).map(a => ({
            s: a.s, node: a.junction >= 0 ? junctionNodes[a.junction] : (free[a.free] ??= add(a.free === 0 ? road.points[0] : road.points[road.points.length - 1]))
        }));
        for (let i = 1; i < anchors.length; i++) {
            const a = anchors[i - 1], b = anchors[i];
            if (a.node === b.node && b.s - a.s < 1.5) continue;
            let previous = a.node;
            const count = Math.max(1, Math.ceil((b.s - a.s) / STEP));
            for (let k = 1; k < count; k++) {
                const node = add(pointAlong(road.points, road.lengths, a.s + (b.s - a.s) * k / count));
                link(previous, node); previous = node;
            }
            link(previous, b.node);
        }
    });
    return { nodes, edges, junctionNodes };
}

/**
 * Lift of a road above the ground where an overpass carries it over a railway: the deck is level, the ramps rise
 * smoothly on both sides. Zero everywhere else.
 */
export type OverpassLike = { x: number; y: number; pathId: string; length: number; width: number; rotation: number; kind?: string; height?: number; /** Length of each ramp (filled in by overpassSpans). */ ramp?: number };
export const OVERPASS_RAMP = 40;
export function overpassHeight(bridge: OverpassLike): number { return Math.min(bridge.height ?? 5.2, 5.2); }
/**
 * The overpasses of a map with their span widened to cover every railway line that passes under the road (a siding that
 * branches off close to the main line must not run into an abutment). Cached per bridges array.
 */
const spanCache = new WeakMap<object, OverpassLike[]>();
export function overpassSpans(paths: RoadLike[], bridges: OverpassLike[]): OverpassLike[] {
    const cached = spanCache.get(bridges);
    if (cached) return cached;
    const out = bridges.filter(b => b.kind === 'overpass').map(bridge => {
        const road = paths.find(p => p.id === bridge.pathId), ca = Math.cos(bridge.rotation), sa = Math.sin(bridge.rotation);
        let half = bridge.length / 2;
        if (road) for (const rail of paths.filter(p => p.kind === 'rail')) for (const hit of crossPolylines(road.points, rail.points)) {
            const along = Math.abs((hit.x - bridge.x) * ca + (hit.y - bridge.y) * sa);
            if (along < 40) half = Math.max(half, along + (rail.width ?? 2.3) / 2 + 3.5);
        }
        // The ramps must come down before the road ends.
        let room = OVERPASS_RAMP + half;
        if (road) for (const end of [road.points[0], road.points[road.points.length - 1]]) {
            const along = Math.abs((end.x - bridge.x) * ca + (end.y - bridge.y) * sa);
            if (along > half) room = Math.min(room, along - .5);
        }
        // ... and before the first junction on the road (a side street must not meet the ramp half way up).
        const plan = analyzeRoads(paths), index = plan.roads.findIndex(r => r.id === bridge.pathId);
        if (index >= 0) for (const j of plan.junctions) if (j.arms.some(arm => arm.road === index)) {
            const along = Math.abs((j.x - bridge.x) * ca + (j.y - bridge.y) * sa);
            if (along > half) room = Math.min(room, along - j.radius - 2.5);
        }
        return { ...bridge, length: half * 2, ramp: Math.max(20, Math.min(OVERPASS_RAMP, room - half)) };
    });
    spanCache.set(bridges, out);
    return out;
}

export function overpassLift(bridges: OverpassLike[], pathId: string | null, x: number, y: number): number {
    let lift = 0;
    for (const bridge of bridges) {
        if (bridge.kind !== 'overpass' || (pathId !== null && bridge.pathId !== pathId)) continue;
        const ca = Math.cos(bridge.rotation), sa = Math.sin(bridge.rotation), dx = x - bridge.x, dy = y - bridge.y;
        const along = Math.abs(dx * ca + dy * sa), across = Math.abs(-dx * sa + dy * ca);
        if (across > bridge.width / 2 + 3) continue;
        const ramp = bridge.ramp ?? OVERPASS_RAMP, t = Math.max(0, Math.min(1, (bridge.length / 2 + ramp - along) / ramp));
        lift = Math.max(lift, overpassHeight(bridge) * t * t * (3 - 2 * t));
    }
    return lift;
}

export function nearestNode(graph: RoadGraph, p: Point2): number {
    let best = -1, bestDistance = Infinity;
    graph.nodes.forEach((node, index) => {
        const d = Math.hypot(node.x - p.x, node.y - p.y);
        if (d < bestDistance) { bestDistance = d; best = index; }
    });
    return best;
}

/** Shortest drivable route between two points; null when the graph is empty or the nodes are not connected. */
export function findRoute(graph: RoadGraph, from: Point2, to: Point2): Point2[] | null {
    const start = nearestNode(graph, from), goal = nearestNode(graph, to);
    if (start < 0 || goal < 0) return null;
    const dist = new Array(graph.nodes.length).fill(Infinity);
    const prev = new Array(graph.nodes.length).fill(-1);
    const open = new Set<number>([start]);
    dist[start] = 0;
    while (open.size) {
        let current = -1;
        for (const index of open) if (current < 0 || dist[index] < dist[current]) current = index;
        open.delete(current);
        if (current === goal) break;
        for (const edge of graph.edges[current]) {
            const candidate = dist[current] + edge.length;
            if (candidate < dist[edge.to]) { dist[edge.to] = candidate; prev[edge.to] = current; open.add(edge.to); }
        }
    }
    if (!Number.isFinite(dist[goal])) return null;
    const route: Point2[] = [];
    for (let node = goal; node >= 0; node = prev[node]) route.unshift(graph.nodes[node]);
    return [{ ...from }, ...route, { ...to }];
}

export function routeLength(route: Point2[]): number {
    let total = 0;
    for (let i = 1; i < route.length; i++) total += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
    return total;
}

/** Route cut short by `distance` metres from its end: crews stop beside the incident, not on top of it. */
export function trimRoute(route: Point2[], distance: number): Point2[] {
    const out = route.map(point => ({ ...point }));
    let left = distance;
    while (out.length > 1 && left > 0) {
        const a = out[out.length - 2], b = out[out.length - 1];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length > left) {
            const t = (length - left) / length;
            out[out.length - 1] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            return out;
        }
        left -= length;
        out.pop();
    }
    return out;
}
