import { seededRandom, type Point2 } from '../environment/training/geography.js';
import type { TrainingLayout, TrainingProp } from '../environment/training/layout.js';
import type { Incident } from './services.js';
import { trainingHeightAt } from '../environment/training/world-plan.js';

/*
 * Which things go wrong on a given map. Pure and seeded: the scene (which span of wire is torn
 * down, which building burns) and the services (where the dispatcher must go) agree without
 * sharing any state.
 */
const BURNABLE: ReadonlyArray<TrainingProp['type']> = ['house', 'building', 'warehouse', 'barn', 'church'];

/** Pylons of the power line, ordered the same way the wires are strung. */
export function powerPylons(layout: Pick<TrainingLayout, 'objects'>): TrainingProp[] {
    return layout.objects.filter(prop => prop.type === 'power-pylon').sort((a, b) => a.y - b.y);
}

/** Physical cross-arms of the power-pylon model: [height, half-span]. */
export const WIRE_ARMS: ReadonlyArray<readonly [number, number]> = [[10.2, 5.4], [12.2, 4.2], [14, 3]];
export type WirePoint = Point2 & { z: number };

/** One point on an intact or torn conductor, shared by mesh generation and repair choreography. */
export function powerWirePoint(layout: TrainingLayout, from: TrainingProp, to: TrainingProp, height: number, span: number, side: number, t: number, broken = false): WirePoint {
    const attach = (prop: TrainingProp): WirePoint => {
        const angle = prop.rotation ?? 0, offset = side * span * prop.scale;
        return { x: prop.x - offset * Math.sin(angle), y: prop.y + offset * Math.cos(angle),
            z: trainingHeightAt(layout, prop.x, prop.y) + (height - 1.05) * prop.scale };
    };
    const a = attach(from), b = attach(to), sag = Math.hypot(b.x - a.x, b.y - a.y) * .04;
    const hangingHeight = Math.min(a.z, b.z) - 1.2;
    const droop = broken ? t <= .5 ? Math.pow(t / .46, 3) * (a.z - hangingHeight - sag)
        : Math.pow((1 - t) / .46, 3) * (b.z - hangingHeight - sag) : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t - sag * 4 * t * (1 - t) - droop };
}

export type LineBreakPlan = { span: number; from: TrainingProp; to: TrainingProp; x: number; y: number };

export function lineBreakWorkPoint(layout: TrainingLayout, plan: LineBreakPlan): WirePoint {
    return powerWirePoint(layout, plan.from, plan.to, WIRE_ARMS[0][0], WIRE_ARMS[0][1], 1, .46, true);
}

/** Index i means the wires between pylon i and pylon i + 1. */
export function planLineBreak(layout: Pick<TrainingLayout, 'objects' | 'seed'>): LineBreakPlan | null {
    const pylons = powerPylons(layout);
    if (pylons.length < 2) return null;
    const span = Math.floor(seededRandom(layout.seed ^ 0x51ed)() * (pylons.length - 1));
    const from = pylons[span], to = pylons[span + 1];
    return { span, from, to, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

export function planFire(layout: Pick<TrainingLayout, 'objects' | 'seed' | 'corridorHalfWidth'>): TrainingProp | null {
    const candidates = layout.objects.filter(prop => BURNABLE.includes(prop.type) && Math.abs(prop.x) > layout.corridorHalfWidth + 8);
    if (!candidates.length) return null;
    return candidates[Math.floor(seededRandom(layout.seed ^ 0xf17e)() * candidates.length)];
}

const DWELLINGS: ReadonlyArray<TrainingProp['type']> = ['building', 'house'];

/** A flat or a house where a burglar is at work: not the burning one, away from the lesson corridor. */
export function planBurglary(layout: Pick<TrainingLayout, 'objects' | 'seed' | 'corridorHalfWidth'>): TrainingProp | null {
    const fire = planFire(layout);
    const dwellings = layout.objects.filter(prop => DWELLINGS.includes(prop.type) && prop !== fire && Math.abs(prop.x) > layout.corridorHalfWidth + 8);
    const apartments = dwellings.filter(prop => prop.type === 'building');
    const candidates = apartments.length ? apartments : dwellings;
    if (!candidates.length) return null;
    return candidates[Math.floor(seededRandom(layout.seed ^ 0xb04a)() * candidates.length)];
}

/** A park path for the brawl when available, otherwise a pavement or the side of a road. */
export function planFight(layout: Pick<TrainingLayout, 'paths' | 'seed' | 'objects'>): Point2 | null {
    const random = seededRandom(layout.seed ^ 0xf16e);
    const parks = layout.paths.filter(p => p.kind === 'footpath' && p.points.length >= 2 && p.id.startsWith('walk-park'));
    const pavements = layout.paths.filter(p => p.kind === 'footpath' && p.points.length >= 2 && p.id.startsWith('walk-'));
    const walks = parks.length ? parks : pavements;
    const roads = layout.paths.filter(p => p.kind === 'road' && p.points.length >= 2 && p.width >= 3.6);
    const pool = walks.length ? walks : roads;
    if (!pool.length) return null;
    const route = pool[Math.floor(random() * pool.length)];
    const segment = Math.floor(random() * (route.points.length - 1));
    const a = route.points[segment], b = route.points[segment + 1], t = .25 + random() * .5;
    const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    // Beside a road, not on it: move out by the width of its carriageway and a metre or two.
    if (!walks.length) {
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const offset = route.width / 2 + 2.2;
        return { x: point.x - (b.y - a.y) / length * offset, y: point.y + (b.x - a.x) / length * offset };
    }
    return point;
}

export function planIncidents(layout: TrainingLayout): Incident[] {
    const random = seededRandom(layout.seed ^ 0x1ac1);
    const incidents: Incident[] = [];
    const fire = planFire(layout);
    if (fire) incidents.push({ id: 'fire', kind: 'fire', x: fire.x, y: fire.y, startAt: 5 + random() * 6, active: false, resolved: false });
    const burglary = planBurglary(layout);
    if (burglary) incidents.push({ id: 'burglary', kind: 'burglary', x: burglary.x, y: burglary.y, startAt: 7 + random() * 6, active: false, resolved: false });
    const fight = planFight(layout);
    if (fight) incidents.push({ id: 'fight', kind: 'fight', x: fight.x, y: fight.y, startAt: 9 + random() * 6, active: false, resolved: false });
    const line = planLineBreak(layout);
    if (line) incidents.push({ id: 'line-break', kind: 'line-break', x: line.x, y: line.y, startAt: 8 + random() * 8, active: false, resolved: false });
    return incidents;
}

export type StationSite = { x: number; y: number; rotation: number; gate: Point2 };

/** The police station the generator placed beside a road. */
export function findPoliceSite(layout: TrainingLayout): StationSite | null { return findService(layout, 'police-station'); }

/** The fire station the generator placed beside the avenue; `gate` is the road point the crews depart from. */
export function findStationSite(layout: TrainingLayout): StationSite | null { return findService(layout, 'fire-station'); }

function findService(layout: TrainingLayout, type: TrainingProp['type']): StationSite | null {
    const station = layout.objects.find(prop => prop.type === type);
    if (!station) return null;
    // The generator turns the front (-Y in the model) toward the avenue, so the nearest road point is the gate.
    let best: Point2 | null = null, bestDistance = Infinity;
    for (const road of layout.paths.filter(path => path.kind === 'road')) {
        for (let i = 1; i < road.points.length; i++) {
            const a = road.points[i - 1], b = road.points[i];
            const dx = b.x - a.x, dy = b.y - a.y, lengthSq = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, ((station.x - a.x) * dx + (station.y - a.y) * dy) / lengthSq));
            const q = { x: a.x + dx * t, y: a.y + dy * t }, d = Math.hypot(q.x - station.x, q.y - station.y);
            if (d < bestDistance) { bestDistance = d; best = q; }
        }
    }
    return best ? { x: station.x, y: station.y, rotation: station.rotation ?? 0, gate: best } : null;
}
