import { distanceToBox, distanceToPath, polylineLength, type Box, type Point2 } from './geography.js';
import { gridPattern, radialPattern, ribbonPattern, type Pattern } from './patterns.js';
import { ROAD_WIDTH, type RoadSpec } from './road-network.js';
import { dbg } from './world-context.js';
import type { Env, Settlement, Skeleton } from './world-env.js';
import type { WorldPath } from './world-plan.js';

/*
 * Where the places go. The city is laid out first (its grid pins the avenue to one of its rows); towns, estates and villages
 * are then placed by trial: a random site whose street pattern fits the dry land, clear of what is already taken. A town
 * that finds no room shrinks a little at a time rather than disappearing. Villages in a row hang on the highway or a trunk road.
 */
const box = (cx: number, cy: number, a: number, b: number): Box => ({ x0: cx - a, x1: cx + a, y0: cy - b, y1: cy + b });
const highwaySpec = (sk: Skeleton, points: Point2[]): RoadSpec => ({ id: 'avenue', kind: 'road', hierarchy: 'arterial', width: ROAD_WIDTH.arterial, points, label: 'Проспект', bridge: true });

export function createPlacers(env: Env, sk: Skeleton) {
    const { ctx, layout, size, half, f, isCity, settlements } = env, { book, range, random } = ctx, profile = layout.profile, m = ctx.m, railY = ctx.railY;
    const trunks: string[] = [];
    let citySettlement: Settlement | null = null;
    const farFromEdge = (b: Box) => b.x0 > -half + 16 && b.x1 < half - 16 && b.y0 > -half + 16 && b.y1 < half - 16;
    const regional = () => [book.get('avenue'), ...trunks.map(id => book.get(id))].filter(Boolean) as WorldPath[];

    function buildCity(): Settlement | null {
        const avenue = sk.avenueY, roll = random(), organic = random() < .4;
        // A city is one of: a grid across the lesson park (it sits in a big green block), a grid beside it (tilted or not), or a radial plan.
        const variant: 'span' | 'side' | 'radial' = roll < .38 ? 'span' : roll < .72 ? 'side' : 'radial';
        let result: Pattern | null = null, hole: Box | undefined;
        const hierarchy = (cy: number) => (axis: 'h' | 'v', index: number, count: number, lines: number[]) => {
            if (axis === 'h' && Math.abs(lines[index] - (avenue - cy)) < .5) return 'arterial' as const;
            if ((axis === 'v' || axis === 'h') && index === Math.round((count - 1) / 2)) return 'collector' as const;
            return 'street' as const;
        };
        const allValid = (p: Pattern) => p.roads.every(r => book.valid(r));
        if (variant === 'radial') {
            for (let attempt = 0; attempt < 60 && !result; attempt++) {
                const Rr = size * range(.13, .18), ex = range(1, 1.18), cx = m * (14 + 38 + Rr * ex + range(0, 40)), cy = range(-.12, .03) * size, b = box(cx, cy, Rr * ex, Rr);
                if (b.y1 > avenue - 16 || b.x0 < -half + 44 || b.x1 > half - 44 || ctx.taken.some(t => b.x0 < t.x1 && b.x1 > t.x0 && b.y0 < t.y1 && b.y1 > t.y0) || !env.dry(b, 14)) continue;
                const radial = radialPattern({ id: 'city', cx, cy, R: Rr, ex, ey: 1, spokes: 6 + Math.floor(random() * 3), plaza: range(16, 22), rings: random() < .5 ? [Rr * .38, Rr * .7] : [Rr * .5], random });
                if (allValid(radial)) result = radial;
            }
        }
        if (!result && variant === 'side') {
            const tilt = random() < .5 ? (random() < .5 ? -1 : 1) * range(.1, .34) : 0;
            const x0 = m > 0 ? 44 : -(half - 46), x1 = m > 0 ? half - 46 : -44;
            const top = tilt ? avenue - 18 : avenue + size * range(.06, .085), bottom = -size * range(.26, .34);
            for (let shrink = 0; shrink < 16 && !result; shrink++) {
                const a = (x1 - x0) / 2 - shrink * 5, cx = (x0 + x1) / 2, b = (top - bottom) / 2 - shrink * 6, cy = (top + bottom) / 2;
                if (a < 70 || b < 90 || !env.dry(box(cx, cy, a, b), 8)) continue;
                const grid = gridPattern({ id: 'city', cx, cy, a, b, block: range(46, 62), random, jitter: organic ? .07 : 0, drop: organic ? .05 : 0, chamfer: organic ? .6 : .3, rot: tilt, forcedRows: tilt ? [] : [avenue], hierarchy: hierarchy(cy) });
                if (allValid(grid) && grid.box.y1 < avenue + size * .1 && (tilt ? grid.box.y1 < avenue - 10 : true)) result = grid;
            }
        }
        if (!result) {
            // Grid and organic cities keep the lesson strip inside one big park block, bounded by the avenue.
            hole = { x0: -30, x1: 30, y0: -34, y1: avenue };
            const xl = -m * (sk.riverBase - sk.riverWidth / 2 - sk.meander - Math.abs(sk.lean) - 26), xr = m * (half - 46);
            const x0 = Math.min(xl, xr), x1 = Math.max(xl, xr), top = avenue + size * range(.06, .085), bottom = -size * (.25 + random() * .09);
            for (let shrink = 0; shrink < 16 && !result; shrink++) {
                const a = (x1 - x0) / 2 - shrink * 6, cx = (x0 + x1) / 2, b = (top - bottom) / 2 - shrink * 4, cy = (top + bottom) / 2;
                if (!env.dry(box(cx, cy, a, b), 8)) continue;
                const grid = gridPattern({ id: 'city', cx, cy, a, b, block: range(52, 66), random, jitter: organic ? .06 : 0, drop: organic ? .05 : 0, chamfer: organic ? .6 : .35, hole, hierarchy: hierarchy(cy) });
                if (allValid(grid)) result = grid;
            }
        }
        if (!result) return null;
        const bbox = result.box;
        const s: Settlement = { id: 'city', kind: 'city', style: 'urban', c: result.center, a: (bbox.x1 - bbox.x0) / 2, b: (bbox.y1 - bbox.y0) / 2, box: bbox,
            roads: [], cells: result.cells, main: 'avenue', parks: [], plazas: [], sidewalks: new Set(), hub: true, hole };
        if (hole) {
            const b = (bbox.y1 - bbox.y0) / 2 * .85;
            s.cores = [{ x0: bbox.x0, x1: hole.x0 }, { x0: hole.x1, x1: bbox.x1 }].map(part => ({ c: { x: (part.x0 + part.x1) / 2, y: result!.center.y + (random() - .5) * 30 }, a: (part.x1 - part.x0) / 2 * 1.05, b }));
        } else if (variant === 'side') {
            // Two centres along a long city instead of one.
            s.cores = [-.3, .3].map(k => ({ c: { x: result!.center.x, y: result!.center.y + k * (bbox.y1 - bbox.y0) }, a: s.a * 1.1, b: s.b * .6 }));
        }
        ctx.taken.push(bbox);
        const row = result.roads.filter(r => r.hierarchy === 'arterial');
        env.adopt(s, result.roads);
        if (row.length) {
            // The avenue continues from the grid's arterial row to both map edges.
            const ends = row.flatMap(r => [r.points[0], r.points[r.points.length - 1]]);
            const left = ends.reduce((best, p) => p.x < best.x ? p : best, ends[0]), right = ends.reduce((best, p) => p.x > best.x ? p : best, ends[0]);
            const west = left.x > -half + 12 ? [left, { x: -size * .485, y: left.y }] : null, east = right.x < half - 12 ? [right, { x: size * .485, y: right.y }] : null;
            let first = true;
            for (const piece of [west, east]) if (piece) {
                const id = first ? 'avenue' : 'avenue-2';
                if (book.add({ ...highwaySpec(sk, piece), id })) { first = false; s.roads.push(id); }
            }
            if (first) { const road = book.get(row[0].id); if (road) road.id = 'avenue'; }
        } else book.add(highwaySpec(sk, sk.highwayPoints.map(p => ({ ...p }))));
        if (hole) {
            s.lessonCell = s.cells.find(c => c.lesson);
            if (s.lessonCell) s.cells = s.cells.filter(c => c !== s.lessonCell);
        }
        settlements.push(s);
        citySettlement = s;
        return s;
    }

    /** The highway as one polyline (the city's avenue is made of its own row and two continuations instead). */
    function placeHighway(): void {
        if (citySettlement && book.get('avenue')) return;
        if (book.add(highwaySpec(sk, sk.highwayPoints.map(p => ({ ...p }))))) return;
        for (let k = 0; k < 14; k++) {
            const p = sk.highwayPoints.map((q, i) => ({ x: q.x, y: i === 3 ? q.y : q.y + (random() - .5) * size * .03 }));
            if (book.add(highwaySpec(sk, p))) break;
        }
    }

    /** Trunk road(s) leave the highway to the south; laid after the towns so that they pass between them. */
    function makeTrunks(): void {
        const wanted = isCity ? 1 : profile === 'forest' || profile === 'hills' ? 1 : 1 + (random() < .4 ? 1 : 0);
        for (let k = 0; k < wanted; k++) for (let attempt = 0; attempt < 40; attempt++) {
            const side = k === 0 ? (random() < .5 ? -1 : 1) : (trunks.length && book.get(trunks[0])!.points[0].x > 0 ? -1 : 1);
            const x0 = side * size * range(.13, .4), city = citySettlement;
            const top = { x: x0, y: isCity && city ? city.box.y0 : sk.heightAt(x0) }, bend = size * .04;
            const x1 = x0 + (random() - .5) * 2 * bend, x2 = x0 + (random() - .5) * 2 * bend, x3 = x0 + (random() - .5) * 2 * bend;
            const points = [top, { x: x1, y: top.y - (top.y + half) * .3 }, { x: x2, y: top.y - (top.y + half) * .62 }, { x: x3, y: -half + 6 }];
            if (isCity && city && (x0 < city.box.x0 + 20 || x0 > city.box.x1 - 20)) continue;
            const clearOfTowns = points.every((q, i) => i === 0 || Array.from({ length: 12 }, (_, j) => ({ x: points[i - 1].x + (q.x - points[i - 1].x) * j / 12, y: points[i - 1].y + (q.y - points[i - 1].y) * j / 12 }))
                .every(w => !settlements.some(t => t.id !== 'city' && w.x > t.box.x0 - 12 && w.x < t.box.x1 + 12 && w.y > t.box.y0 - 12 && w.y < t.box.y1 + 12)));
            const id = k === 0 ? 'trunk' : `trunk-${k + 1}`;
            if (clearOfTowns && book.add({ id, kind: 'road', hierarchy: 'collector', width: ROAD_WIDTH.collector, points, label: 'Шоссе', bridge: true })) { trunks.push(id); break; }
        }
    }

    const clearOfRoads = (specs: RoadSpec[], gap = 13): boolean => {
        const others = layout.paths.filter(p => p.kind === 'road' || p.kind === 'rail');
        for (const spec of specs) for (let i = 1; i < spec.points.length; i++) {
            const a = spec.points[i - 1], b = spec.points[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
            for (let k = 0; k <= n; k++) {
                const p = { x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n };
                if (others.some(o => distanceToPath(p, o.points) < gap + o.width / 2)) return false;
            }
        }
        return true;
    };
    const mostlyValid = (specs: RoadSpec[]) => specs.filter(spec => !book.valid(spec)).length <= specs.length * .08;
    function distanceToBoxPath(b: Box, points: Point2[]): number {
        let best = Infinity;
        for (let i = 0; i < points.length - 1; i++) for (let k = 0; k <= 10; k++) {
            best = Math.min(best, distanceToBox({ x: points[i].x + (points[i + 1].x - points[i].x) * k / 10, y: points[i].y + (points[i + 1].y - points[i].y) * k / 10 }, b));
        }
        return best;
    }

    const newSettlement = (id: string, kind: Settlement['kind'], style: Settlement['style'], pattern: Pattern, extra: Partial<Settlement> = {}): Settlement => ({
        id, kind, style, c: pattern.center, a: (pattern.box.x1 - pattern.box.x0) / 2, b: (pattern.box.y1 - pattern.box.y0) / 2, box: pattern.box,
        roads: [], cells: pattern.cells, main: '', parks: [], plazas: [], sidewalks: new Set(), hub: false, ...extra });

    function makeTown(id: string, kind: 'town' | 'village' | 'estate', big: boolean): Settlement | null {
        const urbanStyle = kind === 'town' && (profile === 'urban' || profile === 'mixed' || profile === 'industrial' || isCity);
        const [aLo, aHi, bLo, bHi] = kind === 'estate' ? (big ? [78, 100, 54, 70] : [56, 72, 40, 52]) : kind === 'town' ? (big ? [96, 124, 72, 94] : [70, 92, 52, 68]) : [44, 60, 30, 44];
        const a1 = range(aLo, aHi) * f, b1 = range(bLo, bHi) * f;
        let best: { pattern: Pattern; main?: string } | null = null;
        for (let attempt = 0; attempt < 700 && !best; attempt++) {
            // Where the map has no room for the planned size, the town shrinks a little at a time rather than disappearing.
            const shrink = Math.max(.6, 1 - Math.floor(attempt / 80) * .07), a0 = a1 * shrink, b0 = b1 * shrink;
            const cx = range(-half + a0 + 24, half - a0 - 24), cy = range(-half + b0 + 24, (ctx.hasRail ? railY - 30 : half - 24) - b0);
            if (env.touches(box(cx, cy, a0 * 1.04, b0 * 1.04), 12) || !env.dry(box(cx, cy, a0 * 1.04, b0 * 1.04), 10)) { dbg(id + ':rough'); continue; }
            const pick = random();
            let pattern: Pattern, main: string | undefined;
            if (kind === 'estate') {
                pattern = gridPattern({ id, cx, cy, a: a0, b: b0, block: range(60, 80), random, jitter: .02, chamfer: .15, hierarchy: (axis, index, count) => axis === 'h' && index === Math.round((count - 1) / 2) ? 'collector' : 'street' });
            } else if (kind === 'town' && pick < .22 && a0 > 76 * f) {
                const Rr = Math.min(a0, b0 * 1.15);
                pattern = radialPattern({ id, cx, cy, R: Rr, ex: a0 / Rr * .92, ey: 1, spokes: 5 + Math.floor(random() * 4), plaza: range(14, 18), rings: Rr > 90 ? [Rr * .38, Rr * .68] : [Rr * .5], random });
            } else if (pick < (kind === 'village' ? .55 : .47)) {
                // A main street with ribs and back lanes: a long, narrow town.
                const length = a0 * 2 * range(.9, 1.15) * (kind === 'village' ? .9 : 1), tilt = (random() < .5 ? 0 : Math.PI / 2) + range(-.45, .45), amp = range(0, 14);
                const dir = { x: Math.cos(tilt), y: Math.sin(tilt) }, nrm = { x: -dir.y, y: dir.x };
                const points = Array.from({ length: 9 }, (_, i) => { const t = (i / 8 - .5) * length, w = Math.sin(i / 8 * Math.PI * 1.4 + 1) * amp; return { x: cx + dir.x * t + nrm.x * w, y: cy + dir.y * t + nrm.y * w }; });
                main = `${id}-main`;
                const rib = ribbonPattern({ id, main: points, s0: 16, s1: length - 16, spacing: kind === 'village' ? [38, 54] : [46, 62], length: kind === 'village' ? [26, 46] : [44, 78], ladder: .6, random, hierarchy: 'street' });
                const all = [...points, ...rib.roads.flatMap(r => r.points)], xs2 = all.map(p => p.x), ys2 = all.map(p => p.y);
                pattern = { roads: [{ id: main, kind: 'road', hierarchy: 'collector', width: ROAD_WIDTH.collector, points, label: 'Главная улица' }, ...rib.roads], cells: rib.cells, center: { x: cx, y: cy },
                    box: { x0: Math.min(...xs2), x1: Math.max(...xs2), y0: Math.min(...ys2), y1: Math.max(...ys2) } };
            } else if (kind === 'village') {
                pattern = gridPattern({ id, cx, cy, a: a0 * .8, b: b0 * .8, block: range(44, 56), random, jitter: .16, drop: .05, chamfer: .5 });
            } else {
                const organic = pick < .7;
                pattern = gridPattern({ id, cx, cy, a: a0, b: b0, block: range(48, 64), random, jitter: organic ? .12 : .02, drop: organic ? .05 : 0, chamfer: organic ? .5 : .25,
                    rot: pick > .88 ? (random() < .5 ? 1 : -1) * range(.18, .38) : 0, hierarchy: (axis, index, count) => index === Math.round((count - 1) / 2) ? 'collector' : 'street' });
            }
            if (!farFromEdge(pattern.box)) { dbg(id + ':edge'); continue; }
            if (env.touches(pattern.box, 12)) { dbg(id + ':taken'); continue; }
            if (!env.dry(pattern.box, 12)) { dbg(id + ':wet'); continue; }
            if (!clearOfRoads(pattern.roads)) { dbg(id + ':roads'); continue; }
            if (!mostlyValid(pattern.roads)) { dbg(id + ':invalid'); continue; }
            // Towns like to stand near the highway or a trunk road.
            const reg = regional(), dist = reg.length ? Math.min(...reg.map(p => distanceToBoxPath(pattern.box, p.points))) : 0;
            if (dist > 150 * f && attempt < 400) { dbg(id + ':far'); continue; }
            best = { pattern, main };
        }
        if (!best) return null;
        const s = newSettlement(id, kind, kind === 'estate' ? 'industrial' : urbanStyle ? 'urban' : 'rural', best.pattern);
        if (!env.adopt(s, best.pattern.roads.filter(r => book.valid(r)))) return null;
        ctx.taken.push(best.pattern.box);
        s.main = best.main && s.roads.includes(best.main) ? best.main : s.roads.find(r => book.get(r)?.hierarchy === 'collector') ?? s.roads[0];
        settlements.push(s);
        return s;
    }

    /** A village in a row along the highway or a trunk road: ribs and back lanes on both sides of it. */
    function makeRibbon(id: string, hamlet = false): Settlement | null {
        for (let attempt = 0; attempt < 60; attempt++) {
            const hosts = regional().filter(p => polylineLength(p.points) > 140);
            if (!hosts.length) return null;
            const host = hosts[Math.floor(random() * hosts.length)], total = polylineLength(host.points), length = (hamlet ? range(70, 110) : range(120, 190)) * Math.max(.6, f);
            const s0 = range(30, Math.max(31, total - length - 30));
            const pattern = ribbonPattern({ id, main: host.points, s0, s1: s0 + length, spacing: hamlet ? [38, 52] : [40, 62], length: hamlet ? [22, 34] : [32 * f + 10, 70 * f + 10], ladder: hamlet ? .15 : .55, random, hierarchy: 'street' });
            const zone = pattern.box;
            if (!farFromEdge(zone) || env.touches(zone, 14) || !env.dry(zone, 10)) continue;
            const specs = pattern.roads.filter(r => book.valid(r));
            if (specs.length < 4) continue;
            // The ribbon may not squeeze past another town's streets.
            const rest = layout.paths.filter(p => p.kind === 'road' && p.id !== host.id);
            if (specs.some(r => r.points.some(p => rest.some(o => distanceToPath(p, o.points) < 12 && !o.id.startsWith(id))))) continue;
            const s = newSettlement(id, 'village', 'rural', pattern, { main: host.id, range: [s0, s0 + length] });
            env.adopt(s, specs);
            s.roads.unshift(host.id);
            ctx.taken.push(zone);
            settlements.push(s);
            return s;
        }
        return null;
    }

    /** How many places of which kind each profile gets, placed in order: towns, trunk roads, then the villages in a row. */
    function placeTowns(): void {
        const towns: Array<{ kind: 'town' | 'village' | 'estate'; big: boolean; ribbon?: boolean; hamlet?: boolean }> = [];
        const addTown = (kind: 'town' | 'village' | 'estate', big = false, ribbon = false, hamlet = false) => towns.push({ kind, big, ribbon, hamlet });
        const villages = (n: number) => { for (let i = 0; i < n; i++) addTown('village', false, random() < .5); };
        const hamlets = (n: number) => { for (let i = 0; i < n; i++) addTown('village', false, true, true); };
        if (isCity) { villages(1 + (random() < .5 ? 1 : 0)); hamlets(1); if (size >= 500 && random() < .5) addTown('town', false); }
        else if (profile === 'urban') { addTown('town', true); if (random() < .6) addTown('town', false); if (random() < .35) addTown('estate', false); villages(1 + (random() < .5 ? 1 : 0)); hamlets(1); }
        else if (profile === 'industrial') { addTown('estate', true); addTown('town', false); villages(1 + (random() < .4 ? 1 : 0)); hamlets(1); }
        else if (profile === 'mixed') { addTown('town', random() < .5); if (random() < .4) addTown('town', false); if (random() < .55) addTown('estate', false); villages(2 + (random() < .5 ? 1 : 0)); hamlets(1 + (random() < .5 ? 1 : 0)); }
        else if (profile === 'forest') { if (random() < .5) addTown('town', false); villages(2 + Math.floor(random() * 3)); hamlets(2 + (random() < .5 ? 1 : 0)); }
        else { if (random() < .4) addTown('town', false); villages(2 + Math.floor(random() * 2)); hamlets(2); }
        // Big maps hold everything; small ones keep only the first places.
        const chosen = towns.slice(0, size < 300 ? 1 : size < 450 ? 2 : 9);
        let no = 0;
        for (const t of chosen.filter(q => !q.ribbon)) makeTown(`${t.kind === 'town' ? 'town' : t.kind === 'estate' ? 'estate' : 'village'}${++no}`, t.kind, t.big);
        makeTrunks();
        for (const t of chosen.filter(q => q.ribbon)) { const id = `${t.hamlet ? 'hamlet' : 'village'}${++no}`; if (!makeRibbon(id, t.hamlet) && !t.hamlet) makeTown(id, 'village', false); }
        if (!settlements.length) makeTown('village1', 'village', false);
    }

    return { buildCity, placeHighway, placeTowns, trunks, city: () => citySettlement };
}
