import { ObjectIndex, PathIndex, WaterProbe, seededRandom, type Box } from './geography.js';
import type { TrainingLayout, TrainingProp } from './layout.js';
import { RoadBook } from './road-network.js';
import { canPlaceModel, districtAt, reserveFootprint } from './settlement-policy.js';
import type { District } from './world-plan.js';

/** Shared state and the placement contract of one generated map. Pure: no rendering, no randomness except the seed. */
export type Reserved = { x: number; y: number; r: number; owner?: TrainingProp };
export type Ctx = {
    layout: TrainingLayout; size: number; half: number; density: number; m: 1 | -1; hasRail: boolean;
    random: () => number; range: (lo: number, hi: number) => number; pick: <T>(items: readonly T[]) => T;
    probe: WaterProbe; book: RoadBook; index: ObjectIndex<TrainingProp>; paths: PathIndex; reserved: Reserved[]; taken: Box[];
    /** Land of a farm, the airfield or the freight yard: only that zone's own buildings (placed with its district id) may stand in it. */
    zones: Array<{ box: Box; id: string }>;
    railY: number;
    rebuildPaths(): void; addPath(id: string): void;
    fits(p: TrainingProp, gap?: number, zoneId?: string): boolean;
    add(p: TrainingProp, gap?: number, districtId?: string): boolean;
    district(d: Omit<District, 'width' | 'depth'> & { width: number; depth: number }): District;
    count(type: TrainingProp['type']): number;
};

export function hashString(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
}

export function createContext(layout: TrainingLayout, density: number, m: 1 | -1, probe: WaterProbe, random: () => number): Ctx {
    const { size } = layout, half = size / 2;
    const index = new ObjectIndex<TrainingProp>(layout.objects);
    const reserved: Reserved[] = [];
    const ctx: Ctx = {
        layout, size, half, density, m, hasRail: size >= 300, random, probe, index, reserved, taken: [], zones: [], railY: size * .39,
        paths: new PathIndex(), book: new RoadBook(layout, probe),
        range: (lo, hi) => lo + random() * (hi - lo),
        pick: items => items[Math.floor(random() * items.length)],
        rebuildPaths() { ctx.paths = new PathIndex(); for (const p of layout.paths) ctx.paths.add(p.id, p.points, p.width); },
        addPath(id) { const p = layout.paths.find(q => q.id === id); if (p) ctx.paths.add(p.id, p.points, p.width); },
        fits(p, gap = 1.2, zoneId) {
            gap = Math.max(gap, .6);
            reserveFootprint(p);
            if (!canPlaceModel(layout, p, true)) { dbg('fits:' + p.type + ':policy'); return false; }
            const r = p.radius;
            if (Math.abs(p.x) < layout.corridorHalfWidth + r || Math.hypot(p.x, p.y) < 10 + r) return false;
            if (Math.max(Math.abs(p.x), Math.abs(p.y)) + r > half - 4) { dbg('fits:' + p.type + ':edge'); return false; }
            if (ctx.probe.distance(p, r + 2) < r + 2) { dbg('fits:' + p.type + ':water'); return false; }
            if (ctx.paths.clearance(p, id => p.type === 'station' && id === 'station-walk') < r + .6) { dbg('fits:' + p.type + ':path'); return false; }
            for (const z of ctx.zones) if (z.id !== zoneId && p.x > z.box.x0 && p.x < z.box.x1 && p.y > z.box.y0 && p.y < z.box.y1) return false;
            for (const z of reserved) if (z.owner !== p && Math.hypot(p.x - z.x, p.y - z.y) < z.r + r) return false;
            const blocked = index.some(p.x, p.y, r + 32 + gap, o => Math.hypot(p.x - o.x, p.y - o.y) < r + o.radius + gap);
            if (blocked) dbg('fits:' + p.type + ':near');
            return !blocked;
        },
        add(p, gap = 1.2, districtId) {
            if (!ctx.fits(p, gap, districtId)) return false;
            const id = districtId ?? p.districtId ?? districtAt(layout, p)?.id;
            if (id) p.districtId = id;
            layout.objects.push(p);
            return true;
        },
        district(d) { const full = d as District; layout.districts.push(full); return full; },
        count: type => layout.objects.reduce((n, p) => n + (p.type === type ? 1 : 0), 0)
    };
    return ctx;
}

export { seededRandom };

/** Counts why candidates were rejected when a debug tool sets `globalThis.__dbg = {}`; free otherwise. */
export function dbg(key: string): void {
    const g = globalThis as { __dbg?: Record<string, number> };
    if (g.__dbg) g.__dbg[key] = (g.__dbg[key] ?? 0) + 1;
}
