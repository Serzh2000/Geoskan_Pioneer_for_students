import { seededRandom, type Point2 } from '../environment/training/geography.js';
import { analyzeRoads, projectOnPolyline, roadAnchors, subPolyline, type RoadLike, type RoadPlan } from './roads.js';
import { createSignals, type Signals } from './signals.js';

/*
 * Ambient road traffic, pure logic (no THREE). The road plan from roads.ts becomes a lane network: every stretch of
 * road between two junctions has one lane per direction, offset to the right of the centre line (right-hand traffic) and
 * a half-width wide; at each junction every incoming lane is joined to every outgoing lane by a smooth connector, and a
 * dead end turns the traffic round in a U-turn. Agents pick a far destination, follow the shortest lane route to it and
 * pick the next one when they arrive, so they turn at junctions instead of pacing up and down one road. They slow down for
 * bends and turns, keep a distance to the car ahead, and a junction hands out permits so that two cars never drive
 * through each other: moves that cross or merge wait for each other first come first served; moves that do not (two
 * opposing cars going straight, a right turn beside them) go together. Emergency vehicles are obstacles: cars stop in
 * front of them and move right and slow down when one comes up from behind. Controlled junctions also have traffic lights
 * (signals.ts): on red a car stops at the stop line, on yellow it stops when it can still brake comfortably.
 */
export const MODEL_LENGTH = 4.2, MODEL_WIDTH = 1.75;

const A_LAT = 2.6;          // m/s^2 lateral acceleration allowed in a bend
const BRAKE = 3.2;          // comfortable braking, m/s^2
const ACCEL = 2.2;
const HEADWAY = .6;         // s
const MIN_GAP = 1.6;        // m between bumpers when stopped
const HORIZON = 32;         // m looked ahead for bends and cars
const CONFLICT_DISTANCE = 1.5;
const OVERRIDE_AFTER = 25;  // s a car waits for a permit before it goes anyway (breaks a deadlock)
const MAX_CARS = 48;

/** Car scale that lets a car of the model's size fit a lane of the road (half its width) with a margin on both sides. */
export function carScaleFor(roadWidth: number): number {
    return Math.max(.5, Math.min(.85, (roadWidth / 2 - .5) / MODEL_WIDTH));
}
/** Free-flow speed of a road: narrow streets are slow. */
export function speedLimitFor(roadWidth: number): number {
    return 6 + Math.max(0, roadWidth - 3.4) * 2;
}

type Seg = {
    id: number; isConn: boolean; roadId: string; width: number;
    xs: Float64Array; ys: Float64Array; cum: Float64Array; cap: Float64Array; n: number; length: number; vmax: number; scale: number;
    occ: TrafficAgent[];
    /** Distance before the end of a lane where a waiting car stops, so that it stays clear of the paths through the junction. */
    stopBack: number;
    // lane
    from: number; to: number; edge: number; laneIndex: number; outConns: Seg[];
    // connector
    node: number; fromLane: Seg | null; toLane: Seg | null; kind: 'straight' | 'left' | 'right' | 'uturn';
};
type NetNode = { x: number; y: number; degree: number; controlled: boolean; cut: number; inLanes: Seg[]; outLanes: Seg[]; queue: TrafficAgent[]; inside: TrafficAgent[] };
export type TrafficNetwork = { segs: Seg[]; lanes: Seg[]; nodes: NetNode[]; totalLaneLength: number; connectors: Map<number, Seg> };

export interface TrafficAgent {
    id: number;
    /** Pose of the car: position, heading (rad, +X forward) and the scale the model should have. */
    x: number; y: number; heading: number; scale: number; speed: number;
    roadId: string; length: number;
    // internals
    seg: Seg; s: number; idx: number; route: Seg[]; ri: number; permits: Seg[]; requested: Seg | null; wait: number;
    factor: number; lateral: number; targetHeading: number;
}
export type EmergencyVehicle = { x: number; y: number; heading: number };
export interface Traffic {
    agents: TrafficAgent[]; network: TrafficNetwork;
    /** The traffic lights of the controlled junctions (none when the traffic was created without them). */
    signals: Signals;
    update(dt: number, emergency?: ReadonlyArray<EmergencyVehicle>): void;
}

const dist = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.y - b.y);

// ------------------------------------------------------------------ polyline helpers

function dedupe(points: Point2[]): Point2[] {
    const out: Point2[] = [];
    for (const p of points) if (!out.length || dist(out[out.length - 1], p) > .05) out.push(p);
    return out;
}

/** Parallel line `offset` metres to the right of the direction of travel (negative: left), mitred at the vertices. */
export function offsetPolyline(points: Point2[], offset: number): Point2[] {
    const out: Point2[] = [];
    const n = points.length;
    const normal = (i: number) => {
        const a = points[i], b = points[i + 1], l = dist(a, b) || 1;
        return { x: (b.y - a.y) / l, y: -(b.x - a.x) / l };
    };
    for (let i = 0; i < n; i++) {
        const n0 = i > 0 ? normal(i - 1) : normal(0), n1 = i < n - 1 ? normal(i) : normal(n - 2);
        let mx = n0.x + n1.x, my = n0.y + n1.y;
        const ml = Math.hypot(mx, my) || 1;
        mx /= ml; my /= ml;
        const miter = Math.min(2, 1 / Math.max(.5, mx * n0.x + my * n0.y));
        out.push({ x: points[i].x + mx * offset * miter, y: points[i].y + my * offset * miter });
    }
    return out;
}

/** Cuts `start` metres from the start and `end` metres from the end of a polyline. */
export function trimPolyline(points: Point2[], start: number, end: number): Point2[] {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + dist(points[i], points[i - 1]));
    const total = lengths[lengths.length - 1], a = Math.max(0, start), b = Math.max(a + .01, total - Math.max(0, end));
    const at = (s: number) => {
        let i = 1;
        while (i < points.length - 1 && lengths[i] < s) i++;
        const p = points[i - 1], q = points[i], span = lengths[i] - lengths[i - 1] || 1, t = Math.max(0, Math.min(1, (s - lengths[i - 1]) / span));
        return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    };
    const out: Point2[] = [at(a)];
    for (let i = 1; i < points.length - 1; i++) if (lengths[i] > a + .05 && lengths[i] < b - .05) out.push(points[i]);
    out.push(at(Math.min(b, total)));
    return out;
}

function bezier(p0: Point2, p1: Point2, p2: Point2, p3: Point2, steps: number): Point2[] {
    const out: Point2[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        out.push({ x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y });
    }
    return out;
}

function makeSeg(id: number, points: Point2[], isConn: boolean, roadId: string, width: number, vmax: number): Seg {
    const pts = dedupe(points);
    if (pts.length < 2) pts.push({ x: pts[0].x + .01, y: pts[0].y });
    const n = pts.length, xs = new Float64Array(n), ys = new Float64Array(n), cum = new Float64Array(n), cap = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        xs[i] = pts[i].x; ys[i] = pts[i].y;
        if (i) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    }
    // Speed the bend at each vertex allows: v = sqrt(a_lat / curvature).
    for (let i = 0; i < n; i++) {
        cap[i] = vmax;
        if (i === 0 || i === n - 1) continue;
        const l1 = cum[i] - cum[i - 1], l2 = cum[i + 1] - cum[i];
        if (l1 < 1e-6 || l2 < 1e-6) continue;
        const a1 = Math.atan2(ys[i] - ys[i - 1], xs[i] - xs[i - 1]), a2 = Math.atan2(ys[i + 1] - ys[i], xs[i + 1] - xs[i]);
        const turn = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
        if (turn < .02) continue;
        const curvature = turn / ((l1 + l2) / 2);
        cap[i] = Math.min(vmax, Math.max(2.4, Math.sqrt(A_LAT / curvature)));
    }
    return { id, isConn, roadId, width, xs, ys, cum, cap, n, length: cum[n - 1], vmax, scale: carScaleFor(width), occ: [], stopBack: 0,
        from: -1, to: -1, edge: -1, laneIndex: -1, outConns: [], node: -1, fromLane: null, toLane: null, kind: 'straight' };
}

const endTangent = (seg: Seg, atEnd: boolean): Point2 => {
    const i = atEnd ? seg.n - 1 : 0, j = atEnd ? i - 1 : i + 1;
    const dx = atEnd ? seg.xs[i] - seg.xs[j] : seg.xs[j] - seg.xs[i], dy = atEnd ? seg.ys[i] - seg.ys[j] : seg.ys[j] - seg.ys[i], l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
};

// ------------------------------------------------------------------ network

export function buildTrafficNetwork(plan: RoadPlan): TrafficNetwork {
    const nodes: NetNode[] = [];
    const addNode = (x: number, y: number, cut: number) => { nodes.push({ x, y, degree: 0, controlled: false, cut, inLanes: [], outLanes: [], queue: [], inside: [] }); return nodes.length - 1; };
    plan.junctions.forEach(j => addNode(j.x, j.y, j.radius + 1.8));
    type Edge = { road: number; a: number; b: number; points: Point2[]; width: number; id: string };
    const edges: Edge[] = [];
    plan.roads.forEach((road, index) => {
        const free: number[] = [];
        const anchors = roadAnchors(plan, index).map(a => ({
            s: a.s, node: a.junction >= 0 ? a.junction : (free[a.free] ??= addNode((a.free === 0 ? road.points[0] : road.points[road.points.length - 1]).x, (a.free === 0 ? road.points[0] : road.points[road.points.length - 1]).y, 5))
        }));
        for (let i = 1; i < anchors.length; i++) {
            const a = anchors[i - 1], b = anchors[i];
            if (b.s - a.s < 1.5) continue;
            edges.push({ road: index, a: a.node, b: b.node, points: subPolyline(road, a.s, b.s), width: road.width, id: road.id });
        }
    });
    for (const e of edges) { nodes[e.a].degree++; nodes[e.b].degree++; }
    for (const node of nodes) {
        node.controlled = node.degree >= 3;
        if (node.degree === 2) node.cut = 2.2;
    }

    // Roads that leave a node at a sharp angle run close together: the lanes must be cut further back so that cars
    // waiting on one do not sit in the path of the other.
    const arms: Array<Array<{ x: number; y: number }>> = nodes.map(() => []);
    const lookAlong = (points: Point2[], d: number): Point2 => {
        let left = d;
        for (let i = 1; i < points.length; i++) {
            const l = dist(points[i], points[i - 1]);
            if (l >= left) { const t = left / (l || 1); return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t }; }
            left -= l;
        }
        return points[points.length - 1];
    };
    for (const e of edges) {
        for (const [node, pts] of [[e.a, e.points], [e.b, e.points.slice().reverse()]] as const) {
            const far = lookAlong(pts, 8), l = dist(far, pts[0]) || 1;
            arms[node].push({ x: (far.x - pts[0].x) / l, y: (far.y - pts[0].y) / l });
        }
    }
    arms.forEach((list, node) => {
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
            const angle = Math.acos(Math.max(-1, Math.min(1, list[i].x * list[j].x + list[i].y * list[j].y)));
            if (angle < 1.2) nodes[node].cut = Math.max(nodes[node].cut, Math.min(14, 1.2 / Math.sin(Math.max(.08, angle) / 2) + 1.5));
        }
    });

    const segs: Seg[] = [], lanes: Seg[] = [];
    let totalLaneLength = 0;
    edges.forEach((e, edgeIndex) => {
        const length = e.points.reduce((sum, p, i) => i ? sum + dist(p, e.points[i - 1]) : 0, 0);
        const cutA = Math.min(nodes[e.a].cut, length * .42), cutB = Math.min(nodes[e.b].cut, length * .42);
        const offset = e.width / 4, vmax = speedLimitFor(e.width);
        const forward = trimPolyline(offsetPolyline(e.points, offset), cutA, cutB);
        const backward = trimPolyline(offsetPolyline(e.points.slice().reverse(), offset), cutB, cutA);
        for (const [pts, from, to] of [[forward, e.a, e.b], [backward, e.b, e.a]] as const) {
            const lane = makeSeg(segs.length, pts, false, e.id, e.width, vmax);
            lane.from = from; lane.to = to; lane.edge = edgeIndex; lane.laneIndex = lanes.length;
            segs.push(lane); lanes.push(lane);
            nodes[from].outLanes.push(lane); nodes[to].inLanes.push(lane);
            totalLaneLength += lane.length;
        }
    });

    const connectors = new Map<number, Seg>();
    // A turn must not cut a corner off the carriageway: samples that leave the roads of the junction are pulled
    // towards its middle and the path is smoothed again.
    const onRoad = (p: Point2, nodeIndex: number) => {
        const junction = plan.junctions[nodeIndex];
        return !junction || junction.arms.some(arm => { const r = plan.roads[arm.road]; return projectOnPolyline(r.points, r.lengths, p).d <= r.width / 2 - .3; });
    };
    const keepOnRoad = (pts: Point2[], nodeIndex: number) => {
        const centre = nodes[nodeIndex];
        let moved = false;
        for (let i = 1; i < pts.length - 1; i++) {
            if (onRoad(pts[i], nodeIndex)) continue;
            const from = pts[i];
            for (let t = .2; t <= 1.001; t += .2) {
                const q = { x: from.x + (centre.x - from.x) * t, y: from.y + (centre.y - from.y) * t };
                if (onRoad(q, nodeIndex) || t > .99) { pts[i] = q; break; }
            }
            moved = true;
        }
        if (moved) for (let pass = 0; pass < 2; pass++) for (let i = 1; i < pts.length - 1; i++) pts[i] = { x: (pts[i - 1].x + 2 * pts[i].x + pts[i + 1].x) / 4, y: (pts[i - 1].y + 2 * pts[i].y + pts[i + 1].y) / 4 };
    };
    nodes.forEach((node, nodeIndex) => {
        for (const a of node.inLanes) for (const b of node.outLanes) {
            const uturn = (a.laneIndex ^ 1) === b.laneIndex;     // the other lane of the same stretch
            if (uturn && node.degree > 1) continue;
            const p0 = { x: a.xs[a.n - 1], y: a.ys[a.n - 1] }, p3 = { x: b.xs[0], y: b.ys[0] };
            const da = endTangent(a, true), db = endTangent(b, false);
            const chord = dist(p0, p3), turning = da.x * db.x + da.y * db.y < .9, k = uturn ? 3.2 : Math.max(.5, chord * (turning ? .55 : .38));
            const pts = bezier(p0, { x: p0.x + da.x * k, y: p0.y + da.y * k }, { x: p3.x - db.x * k, y: p3.y - db.y * k }, p3, Math.max(4, Math.ceil((uturn ? 8 : chord) / .8)));
            const width = Math.min(a.width, b.width), crossZ = da.x * db.y - da.y * db.x, dot = da.x * db.x + da.y * db.y, angle = Math.atan2(crossZ, dot);
            if (!uturn) keepOnRoad(pts, nodeIndex);
            const conn = makeSeg(segs.length, pts, true, a.roadId, width, Math.min(a.vmax, b.vmax));
            conn.node = nodeIndex; conn.fromLane = a; conn.toLane = b;
            conn.kind = uturn ? 'uturn' : Math.abs(angle) < .5 ? 'straight' : angle > 0 ? 'left' : 'right';
            if (uturn) for (let i = 1; i < conn.n - 1; i++) conn.cap[i] = Math.min(conn.cap[i], 2);     // a turn round on the spot is crawled
            segs.push(conn); a.outConns.push(conn);
            connectors.set(a.id * 100003 + b.id, conn);
        }
    });

    // Where may a car wait at the end of each lane? Its body must be clear of every path through the junction that
    // does not start on this lane.
    const sampleAt = (s: Seg, d: number): Point2 => {
        let i = 0;
        while (i < s.n - 2 && s.cum[i + 1] < d) i++;
        const t = Math.max(0, Math.min(1, (d - s.cum[i]) / ((s.cum[i + 1] - s.cum[i]) || 1)));
        return { x: s.xs[i] + (s.xs[i + 1] - s.xs[i]) * t, y: s.ys[i] + (s.ys[i + 1] - s.ys[i]) * t };
    };
    for (const lane of lanes) {
        const others: Point2[] = [];
        for (const c of segs) if (c.isConn && c.node === lane.to && c.fromLane !== lane) for (let d = 0; d <= c.length; d += .5) others.push(sampleAt(c, d));
        if (!others.length) continue;
        const clear = (d: number) => [0, 1.7, 3.4].every(back => {
            const at = lane.length - d - back;
            if (at < 0) return true;
            const p = sampleAt(lane, at);
            return others.every(q => Math.hypot(p.x - q.x, p.y - q.y) > 1.7);
        });
        let d = 0;
        // (never so far back that a car would not fit between the start of the lane and its stopping place)
        while (d < Math.min(14, lane.length - 4.2) && !clear(d)) d += .5;
        lane.stopBack = d;
    }
    return { segs, lanes, nodes, totalLaneLength, connectors };
}

// ------------------------------------------------------------------ routing

function planRoute(net: TrafficNetwork, start: Seg, random: () => number): Seg[] {
    const n = net.lanes.length;
    const cost = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    cost[start.laneIndex] = 0;
    for (;;) {
        let current = -1;
        for (let i = 0; i < n; i++) if (!done[i] && cost[i] < Infinity && (current < 0 || cost[i] < cost[current])) current = i;
        if (current < 0) break;
        done[current] = 1;
        for (const conn of net.lanes[current].outConns) {
            const next = conn.toLane!, penalty = conn.kind === 'uturn' ? 40 : conn.kind === 'left' ? 4 : 0;
            const c = cost[current] + conn.length + next.length + penalty;
            if (c < cost[next.laneIndex]) { cost[next.laneIndex] = c; prev[next.laneIndex] = current; }
        }
    }
    let far = 0;
    for (let i = 0; i < n; i++) if (cost[i] < Infinity) far = Math.max(far, cost[i]);
    const wanted = Math.min(110, far * .6), pool: number[] = [];
    for (let i = 0; i < n; i++) if (i !== start.laneIndex && cost[i] < Infinity && cost[i] >= wanted) pool.push(i);
    if (!pool.length) {
        // A lone stretch: drive to its end, turn round and come back.
        const conn = start.outConns[0];
        return conn ? [start, conn.toLane!] : [start];
    }
    const goal = pool[Math.floor(random() * pool.length)];
    const route: Seg[] = [];
    for (let i = goal; i >= 0; i = prev[i]) route.unshift(net.lanes[i]);
    return route;
}

// ------------------------------------------------------------------ junction permits

const conflictCache = new Map<number, boolean>();
function conflicts(a: Seg, b: Seg): boolean {
    if (a === b || a.fromLane === b.fromLane) return false;
    if (a.toLane === b.toLane) return true;
    const key = a.id < b.id ? a.id * 100003 + b.id : b.id * 100003 + a.id;
    let known = conflictCache.get(key);
    if (known === undefined) {
        known = false;
        const box = (s: Seg) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (let i = 0; i < s.n; i++) { x0 = Math.min(x0, s.xs[i]); x1 = Math.max(x1, s.xs[i]); y0 = Math.min(y0, s.ys[i]); y1 = Math.max(y1, s.ys[i]); } return [x0, x1, y0, y1]; };
        const ba = box(a), bb = box(b), pad = CONFLICT_DISTANCE;
        if (ba[0] > bb[1] + pad || bb[0] > ba[1] + pad || ba[2] > bb[3] + pad || bb[2] > ba[3] + pad) { conflictCache.set(key, false); return false; }
        const sample = (s: Seg, d: number) => {
            const i = Math.min(s.n - 2, Math.max(0, (() => { let k = 0; while (k < s.n - 2 && s.cum[k + 1] < d) k++; return k; })()));
            const t = (d - s.cum[i]) / ((s.cum[i + 1] - s.cum[i]) || 1);
            return { x: s.xs[i] + (s.xs[i + 1] - s.xs[i]) * t, y: s.ys[i] + (s.ys[i + 1] - s.ys[i]) * t };
        };
        search: for (let da = 0; da <= a.length; da += .5) {
            const p = sample(a, da);
            for (let db = 0; db <= b.length; db += .5) {
                const q = sample(b, db);
                if (Math.hypot(p.x - q.x, p.y - q.y) < CONFLICT_DISTANCE) { known = true; break search; }
            }
        }
        conflictCache.set(key, known);
    }
    return known;
}

// ------------------------------------------------------------------ simulation

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createTraffic(paths: RoadLike[], options: { seed?: number; count?: number; signals?: boolean } = {}): Traffic {
    const plan = analyzeRoads(paths);
    const net = buildTrafficNetwork(plan);
    const signals = createSignals(options.signals === false ? [] : net.nodes);
    conflictCache.clear();
    const random = seededRandom((options.seed ?? 1) ^ 0x7a3f1c);
    const agents: TrafficAgent[] = [];
    const wanted = Math.min(options.count ?? MAX_CARS, 60, Math.floor(net.totalLaneLength / 110));

    const place = (a: TrafficAgent) => {
        const seg = a.seg;
        while (a.idx < seg.n - 2 && seg.cum[a.idx + 1] < a.s) a.idx++;
        const i = a.idx, span = seg.cum[i + 1] - seg.cum[i] || 1, t = Math.max(0, Math.min(1, (a.s - seg.cum[i]) / span));
        const dx = seg.xs[i + 1] - seg.xs[i], dy = seg.ys[i + 1] - seg.ys[i], l = Math.hypot(dx, dy) || 1;
        a.x = seg.xs[i] + dx * t + dy / l * a.lateral;
        a.y = seg.ys[i] + dy * t - dx / l * a.lateral;
        a.targetHeading = Math.atan2(dy, dx);
    };
    const enter = (a: TrafficAgent, seg: Seg, s: number) => {
        a.seg.occ.splice(a.seg.occ.indexOf(a), 1);
        a.seg = seg; a.s = s; a.idx = 0; seg.occ.push(a); a.roadId = seg.roadId;
    };
    const nextSeg = (a: TrafficAgent, seg: Seg): Seg | null => {
        if (seg.isConn) return seg.toLane;
        const next = a.route[a.ri + 1];
        return next ? net.connectors.get(seg.id * 100003 + next.id) ?? null : null;
    };

    // Spawn: random lanes, spaced out.
    const laneWeight = net.lanes.reduce((sum, l) => sum + l.length, 0);
    for (let tries = 0; agents.length < wanted && tries < wanted * 40 && laneWeight > 0; tries++) {
        let pick = random() * laneWeight, lane = net.lanes[0];
        for (const l of net.lanes) { pick -= l.length; if (pick <= 0) { lane = l; break; } }
        if (lane.length < 9) continue;
        const s = lane.length * (.15 + .7 * random());
        if (lane.occ.some(o => Math.abs(o.s - s) < 14)) continue;
        const route = planRoute(net, lane, random);
        const scale = lane.scale;
        const agent: TrafficAgent = { id: agents.length, x: 0, y: 0, heading: 0, scale, speed: lane.vmax * .5, roadId: lane.roadId, length: MODEL_LENGTH * scale,
            seg: lane, s, idx: 0, route, ri: 0, permits: [], requested: null, wait: 0, factor: .85 + random() * .25, lateral: 0, targetHeading: 0 };
        lane.occ.push(agent); place(agent); agent.heading = agent.targetHeading;
        agents.push(agent);
    }

    const leaderGap = (a: TrafficAgent): { gap: number; speed: number; same: boolean } | null => {
        let seg = a.seg, best: TrafficAgent | null = null, bestS = Infinity;
        for (const o of seg.occ) if (o !== a && (o.s > a.s || (o.s === a.s && o.id > a.id)) && o.s < bestS) { best = o; bestS = o.s; }
        if (best) return { gap: best.s - best.length / 2 - a.s - a.length / 2, speed: best.speed, same: true };
        let ahead = seg.length - a.s;
        for (let hops = 0; hops < 3 && ahead < HORIZON; hops++) {
            const next = nextSeg(a, seg);
            if (!next) return null;
            let nearest: TrafficAgent | null = null, ns = Infinity;
            for (const o of next.occ) if (o !== a && o.s < ns) { nearest = o; ns = o.s; }
            if (nearest) return { gap: ahead + nearest.s - nearest.length / 2 - a.length / 2, speed: nearest.speed, same: false };
            ahead += next.length; seg = next;
        }
        return null;
    };

    const bendLimit = (a: TrafficAgent): number => {
        let limit = Infinity, seg = a.seg, base = -a.s;
        for (let hops = 0; hops < 2; hops++) {
            for (let k = Math.max(0, hops ? 0 : a.idx); k < seg.n; k++) {
                const d = base + seg.cum[k];
                if (d < 0) continue;
                if (d > HORIZON) break;
                limit = Math.min(limit, Math.sqrt(seg.cap[k] * seg.cap[k] + 2 * BRAKE * d));
            }
            if (base + seg.length > HORIZON) break;
            const next = nextSeg(a, seg);
            if (!next) break;
            base += seg.length; seg = next;
        }
        return limit;
    };

    const removeFrom = (list: TrafficAgent[], a: TrafficAgent) => { const i = list.indexOf(a); if (i >= 0) list.splice(i, 1); };

    const tryGrant = (a: TrafficAgent, conn: Seg, force: boolean): boolean => {
        const node = net.nodes[conn.node], exit = conn.toLane!;
        if (exit.occ.some(o => o.s < a.length + 5)) return false;
        if (force) return true;
        // Against everybody who is in, or has been given, a move anywhere: junctions that lie close together share their paths.
        for (const o of agents) {
            if (o === a) continue;
            if (o.seg.isConn && conflicts(o.seg, conn)) return false;
            if (o.permits.some(pc => pc !== o.seg && conflicts(pc, conn))) return false;
        }
        for (const q of node.queue) { if (q === a) break; if (q.requested && conflicts(q.requested, conn)) return false; }
        return true;
    };

    /** Permits for a move and, when the lane after it is too short to wait in, for the next junction's move too. */
    const grant = (a: TrafficAgent, conn: Seg, force: boolean): boolean => {
        const chain = [conn];
        for (let c = conn, at = a.ri + 1; c.toLane!.length - c.toLane!.stopBack < a.length + 1 && chain.length < 3; at++) {
            const after = a.route[at + 1];
            const next = after && net.connectors.get(c.toLane!.id * 100003 + after.id);
            if (!next || !net.nodes[next.node].controlled) break;
            // The lane between the two junctions is too short to wait in: the second light must be green too.
            const light = signals.stateOfLane(c.toLane!.laneIndex);
            if (light && light !== 'green') return false;
            chain.push(next); c = next;
        }
        if (!chain.every(c => tryGrant(a, c, force))) return false;
        for (const c of chain) { const node = net.nodes[c.node]; removeFrom(node.queue, a); node.inside.push(a); a.permits.push(c); }
        return true;
    };


    const step = (a: TrafficAgent, dt: number, emergency: ReadonlyArray<EmergencyVehicle>) => {
        const seg = a.seg;
        let target = seg.vmax * a.factor, maxMove = Infinity;
        target = Math.min(target, bendLimit(a));

        const leader = leaderGap(a);
        if (leader) {
            const gap = Math.max(0, leader.gap - MIN_GAP), bt = BRAKE * HEADWAY;
            target = Math.min(target, -bt + Math.sqrt(bt * bt + leader.speed * leader.speed + 2 * BRAKE * gap));
            maxMove = Math.min(maxMove, Math.max(0, leader.gap - .3));
        }

        // Whatever is right in front of the bumper, on any path: stop (the car with the lower number goes first).
        const gx = Math.cos(a.heading), gy = Math.sin(a.heading);
        for (const b of agents) {
            if (b === a) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            if (dx > 9 || dx < -9 || dy > 9 || dy < -9) continue;
            const along = dx * gx + dy * gy;
            if (along <= 0 || along > 9) continue;
            const side = dx * gy - dy * gx;
            if (Math.abs(side) > (a.scale + b.scale) * MODEL_WIDTH / 2 * .75) continue;
            const same = Math.cos(b.heading - a.heading) > .5;
            if (!same && b.id > a.id && b.speed >= .5) continue;     // a moving car with the higher number gives way to me
            const room = Math.max(0, along - a.length / 2 - (same ? b.length / 2 : .9) - .4);
            maxMove = Math.min(maxMove, room);
            target = Math.min(target, same ? Math.min(target, -BRAKE * HEADWAY + Math.sqrt((BRAKE * HEADWAY) ** 2 + b.speed * b.speed + 2 * BRAKE * room)) : Math.sqrt(2 * BRAKE * room));
        }

        // Junction ahead: ask for the permit of the planned move; without it stop at the line.
        if (!seg.isConn) {
            const node = net.nodes[seg.to], next = a.route[a.ri + 1];
            const conn0 = next && net.connectors.get(seg.id * 100003 + next.id);
            // A move into a lane too short to wait in is controlled even where the junction is not: the junction after it is part of it.
            const chained = !!conn0 && conn0.toLane!.length - conn0.toLane!.stopBack < a.length + 1 && net.nodes[conn0.toLane!.to].controlled;
            if ((node.controlled || chained) && next && !(leader && leader.same)) {
                const conn = conn0;
                const toLine = seg.length - seg.stopBack - a.s - a.length / 2;
                if (conn && a.permits[0] !== conn) {
                    // The traffic light: red stops the car at the line; yellow stops it when it can still brake comfortably.
                    const light = signals.stateOfLane(seg.laneIndex);
                    // Yellow: stop when that takes no more than 1.4 x the comfortable braking; a car already braking keeps to it (no wavering).
                    const stopForLight = light === 'red' || (light === 'yellow' && a.speed * a.speed / (2 * Math.max(.3, toLine - .5)) <= BRAKE * 1.4);
                    if (stopForLight) {
                        // A request left in the queue would hold up the cars of the green phase that cross it.
                        if (a.requested) { removeFrom(node.queue, a); a.requested = null; }
                    } else if (toLine < 8 + a.speed * a.speed / (2 * BRAKE)) {
                        if (!a.requested) { a.requested = conn; node.queue.push(a); a.wait = 0; }
                        else a.wait += dt;
                        if (grant(a, conn, a.wait > OVERRIDE_AFTER)) a.requested = null;
                    }
                    if (a.permits[0] !== conn) {
                        target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, toLine - .5)));
                        maxMove = Math.min(maxMove, Math.max(0, toLine - .25));
                    }
                }
            }
        }

        // Emergency vehicles: stop for one ahead, make room for one coming up from behind.
        let shift = 0;
        const hx = Math.cos(a.heading), hy = Math.sin(a.heading);
        for (const e of emergency) {
            const dx = e.x - a.x, dy = e.y - a.y, along = dx * hx + dy * hy, side = dx * hy - dy * hx;
            if (Math.abs(side) > 3.4) continue;
            if (along > 0 && along < 11) { target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, along - 5))); maxMove = Math.min(maxMove, Math.max(0, along - 4.5)); shift = Math.max(shift, .35); }
            else if (along <= 0 && along > -26 && Math.cos(angleDiff(a.heading, e.heading)) > .3) { target = Math.min(target, 3.2); shift = Math.max(shift, .45); }
        }
        a.lateral += (Math.min(shift, Math.max(0, seg.width / 4 - a.scale * MODEL_WIDTH / 2 - .1)) - a.lateral) * Math.min(1, dt * 3);

        const accel = Math.max(-7, Math.min(ACCEL, (target - a.speed) * 1.8));
        a.speed = Math.max(0, a.speed + accel * dt);
        const move = Math.min(a.speed * dt, maxMove);
        if (move < a.speed * dt) a.speed = move / dt;
        a.s += move;

        while (a.s >= a.seg.length) {
            const cur = a.seg;
            if (cur.isConn) {
                const lane = cur.toLane!;
                net.nodes[cur.node].inside.includes(a) && removeFrom(net.nodes[cur.node].inside, a);
                if (a.permits[0] === cur) a.permits.shift();
                a.ri++;
                if (a.ri >= a.route.length - 1) { a.route = planRoute(net, lane, random); a.ri = 0; }
                enter(a, lane, a.s - cur.length);
            } else {
                const next = a.route[a.ri + 1];
                const conn = next && net.connectors.get(cur.id * 100003 + next.id);
                if (!conn) { a.s = cur.length; a.speed = 0; break; }
                enter(a, conn, a.s - cur.length);
            }
        }
        // Scale follows the narrowest road ahead.
        a.scale += (a.seg.scale - a.scale) * Math.min(1, dt * 2);
        a.length = MODEL_LENGTH * a.scale;
        place(a);
        a.heading += angleDiff(a.heading, a.targetHeading) * Math.min(1, dt * 14);
    };

    return {
        agents, network: net, signals,
        update(dt, emergency = []) {
            dt = Math.min(dt, .1);
            if (dt <= 0) return;
            signals.update(dt);
            for (const a of agents) step(a, dt, emergency);
        }
    };
}
