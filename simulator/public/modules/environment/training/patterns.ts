import type { Box, Point2 } from './geography.js';
import { pointAtLength, polylineLength } from './geography.js';
import { ROAD_WIDTH, type Hierarchy, type RoadSpec } from './road-network.js';

/*
 * Street patterns. Each generator returns road polylines (not yet validated: the road book rejects what hits water or the
 * lesson strip) and the "cells" between the streets, which the planner turns into housing blocks, parks and plazas.
 */
export type Cell = { pts: Point2[]; cx: number; cy: number; w: number; d: number; area: number; ring?: number; sector?: number; lesson?: boolean };
export type Pattern = { roads: RoadSpec[]; cells: Cell[]; center: Point2; box: Box };

const rotate = (p: Point2, c: Point2, a: number): Point2 => ({ x: c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), y: c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a) });

export function polygonArea(pts: Point2[]): number {
    let s = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.y - b.x * a.y; }
    return Math.abs(s) / 2;
}

export function makeCell(pts: Point2[], extra: Partial<Cell> = {}): Cell {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { pts, cx, cy, w: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys), area: polygonArea(pts), ...extra };
}

/** Lines of one axis: irregular spacing around `base`, forced through the edges of an optional hole (the lesson park). */
function axisLines(random: () => number, ext: number, base: number, hole?: [number, number]): number[] {
    const lines = [-ext];
    let u = -ext;
    while (u < ext - base * .55) { u += base * (.82 + random() * .4); lines.push(u); }
    lines[lines.length - 1] = ext;
    if (!hole || hole[0] <= -ext + 8 || hole[1] >= ext - 8) return lines;
    const kept = lines.filter(v => v < hole[0] - base * .38 || v > hole[1] + base * .38);
    kept.push(hole[0], hole[1]);
    return kept.sort((p, q) => p - q);
}

export type GridOptions = {
    id: string; cx: number; cy: number; a: number; b: number; block: number; random: () => number;
    /** Node jitter as a fraction of the block size (0 = ruled grid, >.1 = organic streets). */
    jitter?: number; rot?: number; hole?: Box; chamfer?: number; drop?: number;
    /** World y of rows that must exist as straight lines (the avenue). */
    forcedRows?: number[];
    hierarchy?: (axis: 'h' | 'v', index: number, count: number, lines: number[]) => Hierarchy;
};

export function gridPattern(o: GridOptions): Pattern {
    const { random } = o, C = { x: o.cx, y: o.cy }, rot = o.rot ?? 0, jitter = o.jitter ?? 0;
    const hx: [number, number] | undefined = o.hole ? [o.hole.x0 - o.cx, o.hole.x1 - o.cx] : undefined;
    const hy: [number, number] | undefined = o.hole ? [o.hole.y0 - o.cy, o.hole.y1 - o.cy] : undefined;
    const us = axisLines(random, o.a, o.block, rot === 0 ? hx : undefined);
    let vs = axisLines(random, o.b, o.block, rot === 0 ? hy : undefined);
    const forced = rot === 0 ? (o.forcedRows ?? []).map(y => y - o.cy).filter(v => v > -o.b + o.block * .4 && v < o.b - o.block * .4) : [];
    for (const fr of forced) { vs = vs.filter(v => Math.abs(v - fr) > o.block * .32 || hy?.includes(v)); vs.push(fr); }
    // Inside the park band the lines between the hole's edges exist only beside the hole, so the neighbours get ordinary blocks.
    const partial = new Set<number>();
    if (hx && hy && rot === 0) {
        const n = Math.max(0, Math.round((hy[1] - hy[0]) / o.block) - 1);
        for (let k = 1; k <= n; k++) { const v = hy[0] + (hy[1] - hy[0]) * k / (n + 1); if (!forced.some(fr => Math.abs(fr - v) < o.block * .3)) { vs.push(v); partial.add(v); } }
    }
    vs.sort((p, q) => p - q);
    const nu = us.length, nv = vs.length;
    const pinned = (i: number, j: number) => rot === 0 && (forced.includes(vs[j]) || (!!o.hole && ((hx && (us[i] === hx[0] || us[i] === hx[1])) || (hy && (vs[j] === hy[0] || vs[j] === hy[1])))));
    const pos: Point2[][] = us.map((u, i) => vs.map((v, j) => {
        const edge = i === 0 || j === 0 || i === nu - 1 || j === nv - 1, amp = pinned(i, j) ? 0 : jitter * o.block * (edge ? .5 : 1);
        return rotate({ x: C.x + u + (random() - .5) * 2 * amp, y: C.y + v + (random() - .5) * 2 * amp }, C, rot);
    }));
    const alive = us.map(() => vs.map(() => true));
    // Rounded corners: the corner junction disappears and a diagonal street closes the outline.
    const diagonals: Array<[[number, number], [number, number]]> = [];
    if (o.chamfer && nu > 3 && nv > 3) for (const [ci, cj, di, dj] of [[0, 0, 1, 1], [nu - 1, 0, -1, 1], [0, nv - 1, 1, -1], [nu - 1, nv - 1, -1, -1]] as const) {
        if (random() < o.chamfer) { alive[ci][cj] = false; diagonals.push([[ci + di, cj], [ci, cj + dj]]); }
    }
    // edges[axis][i][j]: horizontal edge from (i,j) to (i+1,j); vertical from (i,j) to (i,j+1)
    const inHoleColumn = (i: number) => !!hx && us[i] >= hx[0] - 1e-6 && us[i + 1] <= hx[1] + 1e-6;
    const eh = us.map((_, i) => vs.map((_, j) => i + 1 < nu && alive[i][j] && alive[i + 1][j] && !(partial.has(vs[j]) && inHoleColumn(i))));
    const ev = us.map((_, i) => vs.map((_, j) => j + 1 < nv && alive[i][j] && alive[i][j + 1]));
    if (o.drop) {
        // Organic streets lose a few interior links, never creating a dead end or splitting the network.
        const degree = (i: number, j: number) => (i > 0 && eh[i - 1][j] ? 1 : 0) + (eh[i][j] ? 1 : 0) + (j > 0 && ev[i][j - 1] ? 1 : 0) + (ev[i][j] ? 1 : 0);
        for (let i = 1; i < nu - 2; i++) for (let j = 1; j < nv - 1; j++) if (random() < o.drop && eh[i][j] && degree(i, j) > 2 && degree(i + 1, j) > 2) eh[i][j] = false;
        for (let i = 1; i < nu - 1; i++) for (let j = 1; j < nv - 2; j++) if (random() < o.drop && ev[i][j] && degree(i, j) > 2 && degree(i, j + 1) > 2) ev[i][j] = false;
    }
    const roads: RoadSpec[] = [];
    const road = (key: string, axis: 'h' | 'v', index: number, count: number, pts: Point2[], lines: number[]) => {
        const hierarchy = o.hierarchy?.(axis, index, count, lines) ?? 'street';
        roads.push({ id: `${o.id}-${key}-${roads.length}`, kind: 'road', hierarchy, width: ROAD_WIDTH[hierarchy], points: pts, label: 'Улица' });
    };
    for (let j = 0; j < nv; j++) {
        let run: Point2[] = [];
        for (let i = 0; i + 1 < nu; i++) {
            if (eh[i][j]) { if (!run.length) run.push(pos[i][j]); run.push(pos[i + 1][j]); }
            else { if (run.length > 1) road(`h${j}`, 'h', j, nv, run, vs); run = []; }
        }
        if (run.length > 1) road(`h${j}`, 'h', j, nv, run, vs);
    }
    for (let i = 0; i < nu; i++) {
        let run: Point2[] = [];
        for (let j = 0; j + 1 < nv; j++) {
            if (ev[i][j]) { if (!run.length) run.push(pos[i][j]); run.push(pos[i][j + 1]); }
            else { if (run.length > 1) road(`v${i}`, 'v', i, nu, run, us); run = []; }
        }
        if (run.length > 1) road(`v${i}`, 'v', i, nu, run, us);
    }
    for (const [[i0, j0], [i1, j1]] of diagonals) roads.push({ id: `${o.id}-d${roads.length}`, kind: 'road', hierarchy: 'street', width: ROAD_WIDTH.street, points: [pos[i0][j0], pos[i1][j1]], label: 'Улица' });
    const cells: Cell[] = [];
    for (let i = 0; i + 1 < nu; i++) for (let j = 0; j + 1 < nv; j++) {
        if (eh[i][j] && eh[i][j + 1] && ev[i][j] && ev[i + 1][j]) cells.push(makeCell([pos[i][j], pos[i + 1][j], pos[i + 1][j + 1], pos[i][j + 1]]));
    }
    if (hx && hy && rot === 0) cells.push(makeCell([{ x: C.x + hx[0], y: C.y + hy[0] }, { x: C.x + hx[1], y: C.y + hy[0] }, { x: C.x + hx[1], y: C.y + hy[1] }, { x: C.x + hx[0], y: C.y + hy[1] }], { lesson: true }));
    const xs = pos.flat().map(p => p.x), ys = pos.flat().map(p => p.y);
    return { roads, cells, center: C, box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } };
}

export type RadialOptions = { id: string; cx: number; cy: number; R: number; ex?: number; ey?: number; spokes: number; plaza: number; rings: number[]; random: () => number };

export function radialPattern(o: RadialOptions): Pattern {
    const { random } = o, ex = o.ex ?? 1, ey = o.ey ?? 1, C = { x: o.cx, y: o.cy };
    const at = (r: number, t: number): Point2 => ({ x: o.cx + Math.cos(t) * r * ex, y: o.cy + Math.sin(t) * r * ey });
    const start = random() * Math.PI * 2, step = Math.PI * 2 / o.spokes;
    const angles = Array.from({ length: o.spokes }, (_, k) => start + k * step + (random() - .5) * step * .45).sort((p, q) => p - q);
    const radii = [o.plaza, ...o.rings, o.R].sort((p, q) => p - q);
    const roads: RoadSpec[] = [];
    radii.forEach((r, level) => {
        const pts: Point2[] = [];
        angles.forEach((t, k) => {
            const next = k + 1 < angles.length ? angles[k + 1] : angles[0] + Math.PI * 2, pieces = Math.max(1, Math.ceil((next - t) / (Math.PI / 9)));
            for (let q = 0; q < pieces; q++) pts.push(at(r, t + (next - t) * q / pieces));
        });
        pts.push({ ...pts[0] });
        const hierarchy: Hierarchy = level === 0 || level === radii.length - 1 ? 'collector' : 'street';
        roads.push({ id: `${o.id}-ring${level}`, kind: 'road', hierarchy, width: ROAD_WIDTH[hierarchy], points: pts, label: level === 0 ? 'Центральная площадь' : 'Кольцевая улица' });
    });
    angles.forEach((t, k) => {
        const hierarchy: Hierarchy = k % 2 === 0 ? 'collector' : 'street';
        roads.push({ id: `${o.id}-spoke${k}`, kind: 'road', hierarchy, width: ROAD_WIDTH[hierarchy], points: radii.map(r => at(r, t)), label: 'Радиальная улица' });
    });
    const cells: Cell[] = [makeCell(Array.from({ length: 16 }, (_, k) => at(radii[0] * .86, k / 16 * Math.PI * 2)), { ring: -1, sector: -1 })];
    for (let level = 0; level + 1 < radii.length; level++) angles.forEach((t, k) => {
        const next = k + 1 < angles.length ? angles[k + 1] : angles[0] + Math.PI * 2, pieces = Math.max(1, Math.ceil((next - t) / (Math.PI / 9)));
        const inner = Array.from({ length: pieces + 1 }, (_, q) => at(radii[level], t + (next - t) * q / pieces));
        const outer = Array.from({ length: pieces + 1 }, (_, q) => at(radii[level + 1], next - (next - t) * q / pieces));
        cells.push(makeCell([...inner, ...outer], { ring: level, sector: k }));
    });
    return { roads, cells, center: C, box: { x0: o.cx - o.R * ex, y0: o.cy - o.R * ey, x1: o.cx + o.R * ex, y1: o.cy + o.R * ey } };
}

export type RibbonOptions = { id: string; main: Point2[]; s0: number; s1: number; spacing: [number, number]; length: [number, number]; ladder: number; random: () => number; hierarchy?: Hierarchy };

/** Ribs and back lanes on both sides of an existing road, like a village street with its side lanes. */
export function ribbonPattern(o: RibbonOptions): Pattern {
    const { random } = o, roads: RoadSpec[] = [], cells: Cell[] = [];
    const hierarchy = o.hierarchy ?? 'street';
    const total = polylineLength(o.main), s1 = Math.min(o.s1, total - 12);
    for (const side of [1, -1] as const) {
        const ribs: Array<{ foot: Point2; end: Point2 }> = [];
        const common = o.length[0] + random() * (o.length[1] - o.length[0]);
        const ladder = random() < o.ladder;
        let s = o.s0 + random() * 10 + (side > 0 ? 0 : 14);
        while (s < s1) {
            const { p, tangent } = pointAtLength(o.main, s);
            const swing = (random() - .5) * .3, c = Math.cos(swing), sn = Math.sin(swing);
            const normal = { x: -tangent.y * side, y: tangent.x * side }, dir = { x: normal.x * c - normal.y * sn, y: normal.x * sn + normal.y * c };
            const length = ladder ? common : o.length[0] + random() * (o.length[1] - o.length[0]);
            ribs.push({ foot: p, end: { x: p.x + dir.x * length, y: p.y + dir.y * length } });
            s += o.spacing[0] + random() * (o.spacing[1] - o.spacing[0]);
        }
        ribs.forEach((rib, i) => roads.push({ id: `${o.id}-rib${side > 0 ? 'a' : 'b'}${i}`, kind: 'road', hierarchy, width: ROAD_WIDTH[hierarchy], points: [rib.foot, rib.end], label: 'Улица' }));
        if (ladder && ribs.length >= 3) roads.push({ id: `${o.id}-back${side > 0 ? 'a' : 'b'}`, kind: 'road', hierarchy: 'lane', width: ROAD_WIDTH.lane, points: ribs.map(r => r.end), label: 'Задняя улица' });
        for (let i = 0; i + 1 < ribs.length; i++) if (ladder) cells.push(makeCell([ribs[i].foot, ribs[i + 1].foot, ribs[i + 1].end, ribs[i].end]));
    }
    const span = Array.from({ length: 9 }, (_, i) => pointAtLength(o.main, o.s0 + (s1 - o.s0) * i / 8).p);
    const xs = roads.flatMap(r => r.points.map(p => p.x)).concat(span.map(p => p.x)), ys = roads.flatMap(r => r.points.map(p => p.y)).concat(span.map(p => p.y));
    const mid = pointAtLength(o.main, (o.s0 + s1) / 2).p;
    return { roads, cells, center: mid, box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } };
}
