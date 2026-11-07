import * as THREE from 'three';
import { seededRandom, type Point2 } from '../environment/training/geography.js';
import type { TrainingLayout } from '../environment/training/layout.js';
import { createPerson, placePerson, type Person, type PoseMode } from './actors.js';
import { Gait, turnToward } from './walkers.js';
import type { Signal, Signals, SignalState } from './signals.js';
import { buildWalkNet, type PointOfInterest, type WalkEdge, type WalkNet } from './walknet.js';

/*
 * The people of the town going about their business, pure logic plus a thin view. Each one has a goal (a bus stop, a bench,
 * a cafe table, the door of a house, a corner of a park), walks there along the footpaths (walknet.ts), stays a while and
 * chooses the next. Where a footpath crosses a carriageway the walker waits at the kerb until no car is coming and steps
 * out only then; the cars (traffic.ts) in turn stop for anyone on the crossing. People keep to the right of the path, slow
 * down for the one in front and never stop on the road. Everything is seeded: the same seed gives the same town.
 */
export const WALK_MIN = 1.1, WALK_MAX = 1.5, JOG = 3;
const ACCEL = 1.6, DECEL = 3;
const LANE = .3, SIDE = .75;                 // m off the middle of a path: walking on the right, standing at the edge
const TURN = 4;                              // rad/s
const MAX_PEDS = 70, METRES_PER_PERSON = 30;
const WAIT_GIVE_UP = 30;                     // s at a kerb before choosing another way
export const LOD_FAR = 130;                  // m from the focus (camera, drone): further away people are only roughly simulated
const NEAR = 20, MIDDLE = 60, FAR_POSE = 100;   // m: figures nearer than NEAR are posed every frame, then 30, 15 and 8 times a second
const LOD_STEP = .25;                        // s between updates of the far ones

export type PedState = 'walk' | 'wait' | 'dwell' | 'inside';
export interface Pedestrian {
    id: number; x: number; y: number; heading: number; speed: number;
    state: PedState; pose: PoseMode; visible: boolean; jogger: boolean;
    /** True while on a carriageway (a crossing). */
    onCrossing: boolean;
    /** The place being walked to, null when strolling. */
    goal: PointOfInterest | null;
    /** Seconds the person has spent not moving without choosing to (for tests and the audit). */
    stalled: number;
    /** Far from the viewer: updated rarely and not drawn. */
    asleep: boolean;
    // internals
    path: number[]; edges: WalkEdge[]; i: number; u: number; ox: number; oy: number; shift: number; /** Speed over the ground (what the legs follow). */ pace: number; wanted: number; timer: number; permit: number; avoid: number; waited: number; lag: number; recheck: number;
}
/** What the walkers must look out for: moving things on the roads. */
export type Vehicle = { x: number; y: number; heading: number; speed: number; length?: number; /** Real width of the body (a bus is 2.5 m wide). */ width?: number; /** Emergency vehicles do not give way. */ siren?: boolean };
export interface Crowd {
    net: WalkNet; peds: Pedestrian[];
    update(dt: number, vehicles?: ReadonlyArray<Vehicle>, focus?: Point2 | null): void;
    /** Places of everybody who is on a crossing right now: the cars give way to these. */
    onRoad(): Point2[];
    /** State of the cars' light for the road a crossing goes over, or null when no signal controls it. People cross on red. */
    signalState(crossing: number): SignalState | null;
}

const dist = (a: Point2, b: Point2) => { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); };
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Binary heap on [cost, node]. */
class Heap {
    private items: Array<[number, number]> = [];
    get size() { return this.items.length; }
    push(cost: number, node: number) {
        const a = this.items; a.push([cost, node]);
        for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
    }
    pop(): [number, number] {
        const a = this.items, top = a[0], last = a.pop()!;
        if (a.length) {
            a[0] = last;
            for (let i = 0; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; }
        }
        return top;
    }
}

function route(net: WalkNet, from: number, to: number, avoidZone = -1): number[] | null {
    const n = net.nodes.length, cost = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
    const heap = new Heap(); cost[from] = 0; heap.push(0, from);
    while (heap.size) {
        const [c, node] = heap.pop();
        if (c > cost[node]) continue;
        if (node === to) break;
        for (const e of net.nodes[node].adj) {
            // A crossing costs time at the kerb; the one that kept someone waiting for too long costs a lot.
            const next = c + e.length + (e.crossing >= 0 ? (e.crossing === avoidZone ? 400 : 1.5) : 0);
            if (next < cost[e.to]) { cost[e.to] = next; prev[e.to] = node; heap.push(next, e.to); }
        }
    }
    if (!Number.isFinite(cost[to])) return null;
    const out: number[] = [];
    for (let v = to; v >= 0; v = prev[v]) out.push(v);
    return out.reverse();
}

function distanceToSegment(p: Point2, a: Point2, b: Point2): { d: number; t: number } {
    const dx = b.x - a.x, dy = b.y - a.y, sq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / sq));
    return { d: Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t), t };
}

/**
 * Is it safe to step out onto the stretch a -> b of carriageway? Not when a vehicle is on or right next to it, nor when
 * one is coming that could not stop before it (cars give way to people on a crossing, but never rely on it: emergency
 * vehicles do not).
 */
export function crossingThreatened(a: Point2, b: Point2, vehicles: ReadonlyArray<Vehicle>): boolean {
    for (const v of vehicles) {
        const reach = 3.4 + (v.length ?? 4.2) / 2;
        const { d, t } = distanceToSegment(v, a, b);
        if (d < reach) return true;
        if (v.speed < .4) continue;
        const hx = Math.cos(v.heading), hy = Math.sin(v.heading);
        const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        const along = (q.x - v.x) * hx + (q.y - v.y) * hy, across = Math.abs((q.x - v.x) * hy - (q.y - v.y) * hx);
        const stop = v.siren ? 10 + v.speed * 3.2 : 6 + v.speed * 1.3 + v.speed * v.speed / 6.4;
        if (along > 0 && across < 3.4 && along < stop + reach) return true;
        // A vehicle turning towards the crossing is not heading at it yet: anything fast and close counts.
        if (d < 9 + v.speed * 1.2 && v.speed > 1.5) return true;
    }
    return false;
}

export function createCrowd(layout: TrainingLayout, options: { seed?: number; count?: number; net?: WalkNet; signals?: Signals } = {}): Crowd {
    const net = options.net ?? buildWalkNet(layout);
    const random = seededRandom((options.seed ?? layout.seed) ^ 0x5eed11);
    const peds: Pedestrian[] = [];
    const bigComponents = net.components.map((len, i) => ({ len, i })).filter(c => c.len >= 40);
    const totalLength = bigComponents.reduce((s, c) => s + c.len, 0);
    const wanted = options.count !== undefined ? Math.min(options.count, Math.floor(totalLength / 12)) : Math.min(MAX_PEDS, Math.floor(totalLength / METRES_PER_PERSON));
    const nodesOf = new Map<number, number[]>(), poisOf = new Map<number, PointOfInterest[]>();
    net.nodes.forEach((n, i) => { (nodesOf.get(n.component) ?? nodesOf.set(n.component, []).get(n.component)!).push(i); });
    for (const p of net.pois) { const c = net.nodes[p.node].component; (poisOf.get(c) ?? poisOf.set(c, []).get(c)!).push(p); }
    const free = (node: number) => net.nodes[node].adj.every(e => e.crossing < 0);

    // A crossing near a traffic light obeys it: people step out only while the cars of the road they cross are held on red.
    const gates: Array<{ signal: Signal; group: number } | null> = net.crossings.map(c => {
        if (!options.signals) return null;
        const cx = c.nodes.length ? c.nodes.reduce((a, n) => a + net.nodes[n].x, 0) / c.nodes.length : (c.a.x + c.b.x) / 2;
        const cy = c.nodes.length ? c.nodes.reduce((a, n) => a + net.nodes[n].y, 0) / c.nodes.length : (c.a.y + c.b.y) / 2;
        let best: { signal: Signal; group: number } | null = null, bestD = 30;
        for (const signal of options.signals.signals) {
            const d = Math.hypot(signal.x - cx, signal.y - cy), head = signal.heads.find(h => h.roadId === c.roadId);
            if (head && d < bestD) { bestD = d; best = { signal, group: head.group }; }
        }
        return best;
    });
    // Red now and still red for the time it takes to cross (and the all-red gap that follows covers the stragglers).
    const lightRed = (crossing: number) => {
        const g = gates[crossing];
        return !g || (options.signals!.stateOfGroup(g.signal, g.group) === 'red' && options.signals!.stateAfter(g.signal, g.group, 9) === 'red');
    };

    function setPath(ped: Pedestrian, path: number[]) {
        ped.path = path;
        ped.edges = [];
        for (let k = 0; k + 1 < path.length; k++) ped.edges.push(net.nodes[path[k]].adj.find(e => e.to === path[k + 1])!);
    }

    function plan(ped: Pedestrian, from: number) {
        const component = net.nodes[from].component, pool = poisOf.get(component) ?? [], nodes = nodesOf.get(component) ?? [];
        for (let tries = 0; tries < 6; tries++) {
            let goal: PointOfInterest | null = null, node: number;
            if (pool.length && random() < .8) {
                // Of a few places the nearest: people go to what is close more often than to what is far.
                let best = Infinity;
                for (let k = 0; k < 4; k++) {
                    const c = pool[Math.floor(random() * pool.length)], d = (c.x - ped.x) * (c.x - ped.x) + (c.y - ped.y) * (c.y - ped.y);
                    if (c.node !== from && d < best) { best = d; goal = c; }
                }
                if (!goal) continue;
                node = goal.node;
            }
            else { node = nodes[Math.floor(random() * nodes.length)]; if (!free(node)) continue; }
            if (node === from) continue;
            const path = route(net, from, node, ped.avoid);
            if (!path || path.length < 2) continue;
            setPath(ped, path); ped.i = 0; ped.u = 0; ped.goal = goal; ped.state = 'walk'; ped.permit = -1;
            return;
        }
        // Nowhere to go from here: stand a while.
        setPath(ped, [from]); ped.i = 0; ped.u = 0; ped.goal = null; ped.state = 'dwell'; ped.timer = 3 + random() * 4;
    }

    // Spawn: along the footpaths in proportion to their length, never on a crossing and never on top of each other.
    for (let tries = 0; peds.length < wanted && tries < wanted * 40; tries++) {
        let pick = random() * totalLength, comp = bigComponents[0].i;
        for (const c of bigComponents) { pick -= c.len; if (pick <= 0) { comp = c.i; break; } }
        const nodes = nodesOf.get(comp)!, start = nodes[Math.floor(random() * nodes.length)];
        if (!free(start)) continue;
        const at = net.nodes[start];
        if (peds.some(o => dist(o, at) < 3)) continue;
        const jogger = random() < .08;
        const ped: Pedestrian = { id: peds.length, x: at.x, y: at.y, heading: random() * Math.PI * 2, speed: 0, state: 'walk', pose: 'idle', visible: true, jogger, onCrossing: false,
            goal: null, stalled: 0, asleep: false, path: [start], edges: [], i: 0, u: 0, ox: 0, oy: 0, shift: 0, pace: 0, wanted: jogger ? JOG : WALK_MIN + random() * (WALK_MAX - WALK_MIN),
            timer: 0, permit: -1, avoid: -1, waited: 0, lag: 0, recheck: 0 };
        plan(ped, start);
        if (ped.path.length > 1) { const b = net.nodes[ped.path[1]]; ped.heading = Math.atan2(b.y - at.y, b.x - at.x); }
        peds.push(ped);
    }

    const cell = 2;
    // Buckets by cell; two cells may share a bucket (the distance tests sort that out), so no map and no allocation per frame.
    const BUCKETS = 4096;
    const buckets: Pedestrian[][] = Array.from({ length: BUCKETS }, () => []);
    const key = (cx: number, cy: number) => ((cx * 73856) ^ (cy * 19349)) & (BUCKETS - 1);
    const reindex = () => {
        for (const b of buckets) b.length = 0;
        for (const p of peds) if (p.visible && !p.asleep) buckets[key(Math.floor(p.x / cell), Math.floor(p.y / cell))].push(p);
    };
    const edgeOf = (ped: Pedestrian, i: number) => ped.edges[i];

    function step(ped: Pedestrian, dt: number, vehicles: ReadonlyArray<Vehicle>) {
        ped.onCrossing = false;
        if (ped.state === 'inside') {
            ped.timer -= dt; ped.speed = 0;
            if (ped.timer <= 0) {
                // Comes out of the door once nobody stands in it.
                const door = net.nodes[ped.path[ped.path.length - 1]];
                if (peds.some(o => o !== ped && o.visible && !o.asleep && (o.x - door.x) * (o.x - door.x) + (o.y - door.y) * (o.y - door.y) < 1.2)) { ped.timer = .5; return; }
                ped.visible = true; plan(ped, ped.path[ped.path.length - 1]);
            }
            return;
        }
        if (ped.state === 'dwell') {
            ped.timer -= dt; ped.speed = Math.max(0, ped.speed - DECEL * dt);
            ped.pace = Math.max(0, ped.pace - DECEL * dt);
            ped.pose = 'idle';
            if (ped.timer <= 0) plan(ped, ped.path[ped.path.length - 1]);
            return;
        }
        if (ped.i >= ped.path.length - 1) { arrive(ped); return; }

        const edge = edgeOf(ped, ped.i)!;
        const a = net.nodes[ped.path[ped.i]], b = net.nodes[ped.path[ped.i + 1]];
        const length = edge.length || 1;
        const dx = (b.x - a.x) / length, dy = (b.y - a.y) / length;
        let top = ped.wanted;
        let blocked = false;

        // The kerb: before the next stretch of carriageway wait for a gap (or, at the very start, here and now).
        const here = edge.crossing, next = ped.i + 2 < ped.path.length ? edgeOf(ped, ped.i + 1) : undefined;
        const gate = here >= 0 && ped.permit !== here && ped.u < .05 ? here : next && next.crossing >= 0 && next.crossing !== here && ped.permit !== next.crossing ? next.crossing : -1;
        if (gate >= 0) {
            const toKerb = gate === here ? 0 : length - ped.u;
            if (toKerb < 5) {
                ped.recheck -= dt;
                if (ped.recheck <= 0) {
                    ped.recheck = .2;
                    // The stretch about to be crossed: up to 14 m of the route from the kerb.
                    let ahead = false, run = 0;
                    const from = gate === here ? ped.i : ped.i + 1;
                    for (let k = from; k < ped.path.length - 1 && run < 14; k++) {
                        const e = edgeOf(ped, k)!;
                        if (e.crossing < 0) break;
                        if (crossingThreatened(net.nodes[ped.path[k]], net.nodes[ped.path[k + 1]], vehicles)) { ahead = true; break; }
                        run += e.length;
                    }
                    if (!ahead && lightRed(gate)) ped.permit = gate;
                }
                if (ped.permit !== gate) { blocked = true; top = Math.min(top, Math.sqrt(2 * DECEL * .8 * Math.max(0, toKerb - .15))); }
            }
        }
        if (blocked) { ped.state = 'wait'; ped.waited += dt; ped.pose = 'idle'; } else { ped.state = 'walk'; ped.waited = 0; }
        if (ped.waited > WAIT_GIVE_UP) {
            // Too long at this kerb: turn round and go somewhere else (walking back along the link, never jumping).
            const u = ped.u, back = ped.path[ped.i], ahead = ped.path[ped.i + 1];
            ped.avoid = gate; ped.waited = 0;
            plan(ped, back);
            if (ped.path.length > 1) { setPath(ped, [ahead, ...ped.path]); ped.i = 0; ped.u = Math.max(0, length - u); ped.permit = -1; }
            return;
        }
        // On a crossing, keep going.
        if (here >= 0 && ped.permit === here) { top = Math.max(top, 1.45); ped.onCrossing = true; }

        // Look out for the others. "Ahead" is along the path (the smoothed heading lags in a corner). The one in front and
        // slower, or standing, is followed; at a crossing of paths or an oncoming one the person with the higher number waits
        // for the one with the lower number (so exactly one of two gives way), and nobody walks into someone close by.
        const cx = Math.floor(ped.x / cell), cy = Math.floor(ped.y / cell);
        let wantShift = 0;
        for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) for (const o of buckets[key(gx, gy)]) {
            if (o === ped) continue;
            const rx = o.x - ped.x, ry = o.y - ped.y, fwd = rx * dx + ry * dy, side = Math.abs(rx * dy - ry * dx);
            if (o.id < ped.id && fwd > -.3 && rx * rx + ry * ry < .3) { top = Math.min(top, .05); continue; }
            // Someone standing in the way: step round, as far as the path allows.
            if (o.speed < .15 && fwd > -.5 && fwd < 2 && side < .7) wantShift = (rx * dy - ry * dx) > 0 ? -.5 : .5;
            if (fwd <= 0 || fwd > 1.6 || side > .4) continue;
            const sameWay = Math.cos(o.heading - ped.heading) > .5, standing = o.speed < .15 && o.state !== 'walk';
            if (sameWay) { if (standing || o.speed < ped.speed || o.id < ped.id) top = Math.min(top, o.speed + Math.max(0, fwd - .65) * 1.5); }
            else if (standing || o.id < ped.id) top = Math.min(top, Math.max(0, fwd - .7) * 1.5);
        }
        ped.shift = wantShift;
        // Corners are taken slowly.
        if (next) {
            const c = net.nodes[ped.path[ped.i + 2]], turn = Math.abs(angleDiff(Math.atan2(b.y - a.y, b.x - a.x), Math.atan2(c.y - b.y, c.x - b.x)));
            if (turn > .6 && length - ped.u < 2) top = Math.min(top, 1);
        }
        // The end of the route: stop on it.
        if (ped.i === ped.path.length - 2) top = Math.min(top, Math.sqrt(2 * DECEL * .8 * Math.max(0, length - ped.u)) + .05);
        top = Math.max(0, top);
        ped.speed += Math.max(-DECEL * dt, Math.min(ACCEL * dt, top - ped.speed));
        if (ped.speed < .02 && top < .02) ped.speed = 0;
        ped.u += ped.speed * dt;
        while (ped.u >= length && ped.i < ped.path.length - 1) {
            ped.u -= length; ped.i++;
            if (ped.i >= ped.path.length - 1) { ped.u = 0; break; }
            if (edgeOf(ped, ped.i)!.crossing < 0) ped.permit = -1;
            return place(ped, dt);
        }
        place(ped, dt);
    }

    /**
     * Position on the current link plus an offset to its right that eases (at most 0.8 m/s) towards the lane, or towards the
     * edge of the path when the goal is near. The offset is a vector of its own, so neither a corner nor a turn on the spot
     * can make the figure jump; `pace` is the speed over the ground that the legs follow.
     */
    function place(ped: Pedestrian, dt: number) {
        if (ped.i >= ped.path.length - 1) { ped.pace = 0; arrive(ped); return; }
        const a = net.nodes[ped.path[ped.i]], b = net.nodes[ped.path[ped.i + 1]], length = dist(a, b) || 1;
        const dx = (b.x - a.x) / length, dy = (b.y - a.y) / length;
        ped.heading = turnToward(ped.heading, Math.atan2(dy, dx), dt, ped.speed > .05 ? TURN : TURN * .5);
        const atGoal = ped.i === ped.path.length - 2 && ped.goal !== null && length - ped.u < 2.5;
        const room = Math.max(0, Math.min(a.half, b.half) - .25);
        const lat = Math.max(-room, Math.min(room, (atGoal ? SIDE : LANE) + ped.shift));
        let mx = dy * lat - ped.ox, my = -dx * lat - ped.oy;
        const k = Math.sqrt(mx * mx + my * my), cap = .8 * dt;
        if (k > cap) { mx *= cap / k; my *= cap / k; }
        ped.ox += mx; ped.oy += my;
        const nx = a.x + dx * ped.u + ped.ox, ny = a.y + dy * ped.u + ped.oy;
        const moved = Math.sqrt((nx - ped.x) * (nx - ped.x) + (ny - ped.y) * (ny - ped.y)) / dt;
        ped.pace += (moved - ped.pace) * Math.min(1, dt * 12);
        ped.x = nx; ped.y = ny;
    }

    function arrive(ped: Pedestrian) {
        const last = ped.path[ped.path.length - 1];
        const goal = ped.goal;
        if (goal?.kind === 'home') {
            // Goes in at the door for a while.
            ped.state = 'inside'; ped.speed = 0; ped.pace = 0; ped.visible = false; ped.timer = 6 + random() * 14; setPath(ped, [last]); ped.i = 0;
            return;
        }
        ped.state = 'dwell'; ped.pose = 'idle'; setPath(ped, [last]); ped.i = 0; ped.u = 0;
        ped.timer = goal ? (goal.kind === 'stop' ? 8 : goal.kind === 'bench' ? 10 : 6) + random() * 12 : 2 + random() * 6;
    }

    return {
        net, peds,
        update(dt, vehicles = [], focus = null) {
            dt = Math.min(dt, .1);
            if (dt <= 0) return;
            for (const p of peds) {
                const wasAsleep = p.asleep;
                p.asleep = !!focus && dist(p, focus) > LOD_FAR;
                if (wasAsleep && !p.asleep) p.lag = 0;
            }
            reindex();
            for (const p of peds) {
                if (p.asleep) {
                    // Far away: a coarse step now and then (nobody sees it; the crossings are still obeyed).
                    p.lag += dt;
                    if (p.lag < LOD_STEP) continue;
                    const d = p.lag; p.lag = 0;
                    step(p, d, vehicles);
                    continue;
                }
                const before = p.state === 'walk' ? p.speed : 1;
                step(p, dt, vehicles);
                // "Stalled": walking but not moving although nothing explains it.
                if (p.visible && p.state === 'walk' && before < .02 && p.speed < .02) p.stalled += dt; else p.stalled = 0;
            }
            // Backstop: two people never share a spot. Whatever the rules above missed, a pair that is too close is eased apart
            // (a few centimetres a frame, on the lateral offsets, so nobody jumps).
            for (const p of peds) {
                if (!p.visible || p.asleep) continue;
                const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
                for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) for (const o of buckets[key(gx, gy)]) {
                    if (o.id <= p.id || !o.visible) continue;
                    const dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy;
                    if (d2 >= .0484) continue;
                    const d = Math.sqrt(d2), push = Math.min(.03, (.22 - d) / 2);
                    const ux = d > 1e-4 ? dx / d : 1, uy = d > 1e-4 ? dy / d : 0;
                    p.x -= ux * push; p.y -= uy * push; p.ox -= ux * push; p.oy -= uy * push;
                    o.x += ux * push; o.y += uy * push; o.ox += ux * push; o.oy += uy * push;
                }
            }
        },
        signalState(crossing) { const g = gates[crossing]; return g ? options.signals!.stateOfGroup(g.signal, g.group) : null; },
        onRoad() {
            const out: Point2[] = [];
            for (const p of peds) if (p.onCrossing && p.visible) out.push({ x: p.x, y: p.y });
            return out;
        }
    };
}

// ------------------------------------------------------------------------------------------------- view

export type CrowdView = { group: THREE.Group; update(dt: number, focus?: Point2 | null): void; dispose(): void };

/** Figures for the crowd, the zebra stripes of its crossings, and the walking of each figure in step with the ground. */
export function createCrowdView(crowd: Crowd, ground: (x: number, y: number) => number): CrowdView {
    const group = new THREE.Group();
    group.name = 'Пешеходы'; group.userData = { collidable: false, label: 'Пешеходы' };
    const owed: number[] = crowd.peds.map(() => 0);
    const people: Array<{ person: Person; gait: Gait }> = crowd.peds.map(ped => {
        const person = createPerson('civilian', ped.id + 11);
        person.root.visible = false;
        group.add(person.root);
        return { person, gait: new Gait(person) };
    });

    // Zebra stripes: along every link that lies on a carriageway, one every 0.9 m, running with the traffic.
    const stripes: THREE.Matrix4[] = [];
    const net = crowd.net;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1);
    net.nodes.forEach((n, i) => {
        for (const e of n.adj) {
            if (e.crossing < 0 || e.to < i) continue;
            const o = net.nodes[e.to], len = e.length, ux = (o.x - n.x) / len, uy = (o.y - n.y) / len;
            for (let s = .45; s < len; s += .9) {
                q.setFromAxisAngle(up, Math.atan2(uy, ux) + Math.PI / 2);
                m.compose(new THREE.Vector3(n.x + ux * s, n.y + uy * s, ground(n.x + ux * s, n.y + uy * s) + .075), q, new THREE.Vector3(1, 1, 1));
                stripes.push(m.clone());
            }
        }
    });
    let zebra: THREE.InstancedMesh | null = null;
    if (stripes.length) {
        zebra = new THREE.InstancedMesh(new THREE.BoxGeometry(3, .5, .02), new THREE.MeshStandardMaterial({ name: 'Zebra', color: 0xe9e9e4, roughness: .9 }), stripes.length);
        stripes.forEach((s, i) => zebra!.setMatrixAt(i, s));
        zebra.userData.collidable = false; zebra.receiveShadow = true;
        group.add(zebra);
    }

    return {
        group,
        update(dt, focus = null) {
            crowd.peds.forEach((ped, i) => {
                const { person, gait } = people[i];
                const show = ped.visible && !ped.asleep;
                person.root.visible = show;
                if (!show) return;
                placePerson(person, ped.x, ped.y, ground(ped.x, ped.y) + .05, ped.heading);
                // Posing is the costly part: figures near the viewer every frame, farther ones less often (see NEAR).
                const d = focus ? Math.hypot(ped.x - focus.x, ped.y - focus.y) : 0;
                const interval = d < NEAR ? 0 : d < MIDDLE ? 1 / 30 : d < FAR_POSE ? 1 / 15 : 1 / 8;
                owed[i] += dt;
                if (owed[i] < interval) return;
                gait.update(owed[i], ped.pace, ped.pose);
                owed[i] = 0;
            });
        },
        dispose() { group.removeFromParent(); zebra?.geometry.dispose(); }
    };
}
