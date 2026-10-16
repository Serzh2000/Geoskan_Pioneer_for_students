/*
 * Traffic lights for the ambient traffic, pure logic (no THREE). Every controlled junction (three or more roads) gets one
 * signal. Its incoming lanes are split into two groups by the axis they approach along (the two ends of a main road go
 * together, a side road or the cross street goes on the other phase) and the groups take turns:
 *   green  GREEN_S  ->  yellow YELLOW_S  ->  all red ALL_RED_S  ->  the other group's green ...
 * The all-red gap lets cars that entered on yellow leave the junction before the crossing stream starts. Each junction
 * runs at its own offset, so neighbouring lights do not change in step. The cars (traffic.ts) stop at the stop line on
 * red, and on yellow when they can still brake comfortably; the lights are drawn by signal-lights.ts from `heads`.
 */

export type SignalState = 'green' | 'yellow' | 'red';

export const GREEN_S = 14;
export const YELLOW_S = 3;
export const ALL_RED_S = 2;
const SLOT_S = GREEN_S + YELLOW_S + ALL_RED_S;

/** What the signals need to know about an incoming lane (traffic.ts lanes satisfy this structurally). */
export interface SignalLane {
    laneIndex: number;
    xs: Float64Array; ys: Float64Array; n: number; length: number;
    /** Distance before the end of the lane where a waiting car stops: the stop line. */
    stopBack: number;
    width: number; roadId: string;
}
export interface SignalNode { x: number; y: number; degree: number; controlled: boolean; inLanes: SignalLane[] }

/** One lamp head: stands beside its lane at the stop line and looks back at the cars that come towards it. */
export interface SignalHead {
    x: number; y: number;
    /** Direction of travel of the lane (rad, +X is 0): the lamps face the opposite way. */
    heading: number;
    lane: number; group: number; node: number; roadId: string;
}
export interface Signal { node: number; x: number; y: number; groups: number; offset: number; cycle: number; heads: SignalHead[] }

export interface Signals {
    signals: Signal[];
    heads: SignalHead[];
    update(dt: number): void;
    /** State for the cars on this lane, or null when the junction at its end has no signal. */
    stateOfLane(lane: number): SignalState | null;
    stateOfGroup(signal: Signal, group: number): SignalState;
}

/** State of group `group` at time `t` (seconds into the cycle of `groups` slots). */
export function stateAt(t: number, group: number, groups: number): SignalState {
    const cycle = groups * SLOT_S;
    const local = (((t % cycle) + cycle) % cycle) - group * SLOT_S;
    const into = ((local % cycle) + cycle) % cycle;
    if (into < GREEN_S) return 'green';
    if (into < GREEN_S + YELLOW_S) return 'yellow';
    return 'red';
}

const headingOf = (lane: SignalLane): number => {
    const a = Math.max(0, lane.n - 2), b = lane.n - 1;
    return Math.atan2(lane.ys[b] - lane.ys[a], lane.xs[b] - lane.xs[a]);
};

function pointAlong(lane: SignalLane, distance: number): { x: number; y: number; heading: number } {
    let cum = 0;
    for (let i = 1; i < lane.n; i++) {
        const dx = lane.xs[i] - lane.xs[i - 1], dy = lane.ys[i] - lane.ys[i - 1], span = Math.hypot(dx, dy);
        if (cum + span >= distance || i === lane.n - 1) {
            const t = span > 1e-9 ? Math.max(0, Math.min(1, (distance - cum) / span)) : 0;
            return { x: lane.xs[i - 1] + dx * t, y: lane.ys[i - 1] + dy * t, heading: Math.atan2(dy, dx) };
        }
        cum += span;
    }
    return { x: lane.xs[lane.n - 1], y: lane.ys[lane.n - 1], heading: headingOf(lane) };
}

/** Lights for every controlled junction whose approaches fall on two different axes. */
export function createSignals(nodes: ReadonlyArray<SignalNode>): Signals {
    const signals: Signal[] = [];
    const heads: SignalHead[] = [];
    const laneSignal = new Map<number, { signal: Signal; group: number }>();

    nodes.forEach((node, index) => {
        if (!node.controlled || node.degree < 3 || !node.inLanes.length) return;
        const axis = headingOf(node.inLanes[0]);
        // |sin| of the angle to the first approach: ~0 for the same or the opposite direction, ~1 for a cross street.
        const groupOf = (lane: SignalLane) => (Math.abs(Math.sin(headingOf(lane) - axis)) < .7 ? 0 : 1);
        if (!node.inLanes.some(l => groupOf(l) === 1)) return;       // one axis only: nothing to alternate
        const signal: Signal = { node: index, x: node.x, y: node.y, groups: 2, offset: ((index * 7.3) % (2 * SLOT_S)), cycle: 2 * SLOT_S, heads: [] };
        for (const lane of node.inLanes) {
            const group = groupOf(lane);
            const stop = pointAlong(lane, Math.max(0, lane.length - lane.stopBack));
            // On the kerb to the right of the lane: half a lane from the lane's own line to the road edge, and a little beyond.
            const side = lane.width / 4 + 1.1;
            const head: SignalHead = {
                x: stop.x + Math.sin(stop.heading) * side, y: stop.y - Math.cos(stop.heading) * side,
                heading: stop.heading, lane: lane.laneIndex, group, node: index, roadId: lane.roadId
            };
            signal.heads.push(head); heads.push(head);
            laneSignal.set(lane.laneIndex, { signal, group });
        }
        signals.push(signal);
    });

    let clock = 0;
    const states = new Map<Signal, SignalState[]>();
    const refresh = () => {
        for (const signal of signals) {
            const t = clock + signal.offset;
            states.set(signal, [stateAt(t, 0, signal.groups), stateAt(t, 1, signal.groups)]);
        }
    };
    refresh();

    return {
        signals, heads,
        update(dt) { clock += dt; refresh(); },
        stateOfLane(lane) {
            const entry = laneSignal.get(lane);
            return entry ? states.get(entry.signal)![entry.group] : null;
        },
        stateOfGroup(signal, group) { return states.get(signal)![group]; }
    };
}
