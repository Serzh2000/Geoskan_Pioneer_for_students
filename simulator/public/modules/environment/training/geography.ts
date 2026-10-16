export type Point2 = { x: number; y: number };
export function distanceToSegment(p: Point2, a: Point2, b: Point2): number {
    const dx = b.x - a.x, dy = b.y - a.y, lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)) : 0;
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
export function distanceToPath(p: Point2, points: Point2[]): number {
    let nearest = Infinity;
    for (let i = 1; i < points.length; i++) nearest = Math.min(nearest, distanceToSegment(p, points[i - 1], points[i]));
    return nearest;
}
export function insidePolygon(p: Point2, points: Point2[]): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}
export function distanceToPolygon(p: Point2, points: Point2[]): number {
    return insidePolygon(p, points) ? 0 : distanceToPath(p, [...points, points[0]]);
}
export function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let t = Math.imul(state ^ state >>> 15, state | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Uniform grid over the props of a layout, so "does anything stand too close?" looks at a few cells instead of every
 * object. It follows the list by itself: props pushed straight into it are indexed on the next query.
 */
export class ObjectIndex<T extends Point2 & { radius: number }> {
    private readonly cells = new Map<number, T[]>();
    private indexed = 0;
    constructor(private readonly list: T[], private readonly cell = 24) {}
    private key(cx: number, cy: number) { return cx * 100003 + cy; }
    private sync() {
        for (; this.indexed < this.list.length; this.indexed++) {
            const object = this.list[this.indexed];
            const key = this.key(Math.floor(object.x / this.cell), Math.floor(object.y / this.cell));
            const bucket = this.cells.get(key);
            if (bucket) bucket.push(object); else this.cells.set(key, [object]);
        }
    }
    /** True when `test` holds for some object whose centre is within `reach` of (x, y). */
    some(x: number, y: number, reach: number, test: (object: T) => boolean): boolean {
        this.sync();
        const span = Math.ceil(reach / this.cell), cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
        for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) {
            const bucket = this.cells.get(this.key(cx + i, cy + j));
            if (bucket && bucket.some(test)) return true;
        }
        return false;
    }
}

export type Box = { x0: number; y0: number; x1: number; y1: number };
export function distanceToBox(p: Point2, b: Box): number {
    return Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y0 - p.y, 0, p.y - b.y1));
}

type WaterLike = { kind: 'river' | 'lake'; points: Point2[]; width: number };
/** Distance from a point to the nearest water body (0 inside a lake or on the river itself). */
export function distanceToWaterBodies(layout: { water: WaterLike[] }, p: Point2): number {
    let best = Infinity;
    for (const w of layout.water) best = Math.min(best, w.kind === 'lake' ? distanceToPolygon(p, w.points) : Math.max(0, distanceToPath(p, w.points) - w.width / 2));
    return best;
}

/**
 * Water distance on a coarse grid. Distance is 1-Lipschitz, so a grid node proves a lower bound for every point nearby:
 * most placement checks (far from any water) never run the exact polygon maths.
 */
export class WaterProbe {
    private readonly grid: Float32Array;
    private readonly n: number;
    private readonly edge: number;
    constructor(private readonly water: WaterLike[], size: number, private readonly cell = 6) {
        this.edge = size / 2 + 12;
        this.n = Math.ceil(this.edge * 2 / cell) + 1;
        this.grid = new Float32Array(this.n * this.n);
        for (let j = 0; j < this.n; j++) for (let i = 0; i < this.n; i++) this.grid[j * this.n + i] = distanceToWaterBodies({ water }, { x: -this.edge + i * cell, y: -this.edge + j * cell });
    }
    /** Exact distance, or a lower bound that is at least `cap` when the point is surely farther than `cap`. */
    distance(p: Point2, cap = Infinity): number {
        if (!this.water.length) return Infinity;
        const i = Math.round((p.x + this.edge) / this.cell), j = Math.round((p.y + this.edge) / this.cell);
        if (i >= 0 && j >= 0 && i < this.n && j < this.n) {
            const lower = this.grid[j * this.n + i] - this.cell * .7072;
            if (lower >= cap) return lower;
        }
        return distanceToWaterBodies({ water: this.water }, p);
    }
}

type Seg = { a: Point2; b: Point2; half: number; id: string };
/** Nearest road/footpath clearance by spatial hash: segments are registered in every cell within REACH of them. */
export class PathIndex {
    private readonly cells = new Map<number, Seg[]>();
    private static readonly REACH = 40;
    constructor(private readonly cell = 24) {}
    private key(cx: number, cy: number) { return cx * 100003 + cy; }
    add(id: string, points: Point2[], width: number): void {
        const R = PathIndex.REACH + width / 2;
        for (let i = 1; i < points.length; i++) {
            const seg: Seg = { a: points[i - 1], b: points[i], half: width / 2, id };
            const x0 = Math.floor((Math.min(seg.a.x, seg.b.x) - R) / this.cell), x1 = Math.floor((Math.max(seg.a.x, seg.b.x) + R) / this.cell);
            const y0 = Math.floor((Math.min(seg.a.y, seg.b.y) - R) / this.cell), y1 = Math.floor((Math.max(seg.a.y, seg.b.y) + R) / this.cell);
            for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
                const k = this.key(cx, cy), bucket = this.cells.get(k);
                if (bucket) bucket.push(seg); else this.cells.set(k, [seg]);
            }
        }
    }
    /** Smallest (distance to a centre line minus half its width) of the segments near `p`; Infinity when none is within reach. */
    clearance(p: Point2, skip?: (id: string) => boolean): number {
        const bucket = this.cells.get(this.key(Math.floor(p.x / this.cell), Math.floor(p.y / this.cell)));
        let best = Infinity;
        if (bucket) for (const s of bucket) if (!skip || !skip(s.id)) best = Math.min(best, distanceToSegment(p, s.a, s.b) - s.half);
        return best;
    }
}

/** Proper crossing of segments ab and cd (interior to both). */
export function segmentCrossing(a: Point2, b: Point2, c: Point2, d: Point2): { x: number; y: number; t: number; u: number } | null {
    const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    if (t <= 1e-4 || t >= 1 - 1e-4 || u <= 1e-4 || u >= 1 - 1e-4) return null;
    return { x: a.x + rx * t, y: a.y + ry * t, t, u };
}

export function polylineLength(points: Point2[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    return total;
}

/** Point and unit tangent at arc length `s` along a polyline (clamped to its ends). */
export function pointAtLength(points: Point2[], s: number): { p: Point2; tangent: Point2 } {
    let left = Math.max(0, s);
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length < 1e-9) continue;
        if (left <= length || i === points.length - 1) {
            const t = Math.min(1, left / length);
            return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, tangent: { x: (b.x - a.x) / length, y: (b.y - a.y) / length } };
        }
        left -= length;
    }
    return { p: { ...points[0] }, tangent: { x: 1, y: 0 } };
}

/** Nearest point on a polyline: its position, segment index and distance. */
export function nearestOnPath(p: Point2, points: Point2[]): { point: Point2; segment: number; distance: number; t: number } {
    let best = { point: points[0], segment: 0, distance: Infinity, t: 0 };
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y, lengthSq = dx * dx + dy * dy;
        const t = lengthSq ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)) : 0;
        const q = { x: a.x + dx * t, y: a.y + dy * t }, distance = Math.hypot(p.x - q.x, p.y - q.y);
        if (distance < best.distance) best = { point: q, segment: i - 1, distance, t };
    }
    return best;
}
