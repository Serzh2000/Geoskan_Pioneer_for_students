import { distanceToBox, type Point2 } from './geography.js';
import type { Cell } from './patterns.js';
import { ROAD_WIDTH } from './road-network.js';
import { residentialNeighbors } from './settlement-policy.js';
import { around, centrality, hierarchyBonus, majorRoads, placeBest, type SiteRequest } from './town-sites.js';
import type { Env, Settlement } from './world-env.js';

/*
 * What a place consists of besides its houses: parks and squares, lanes through the blocks, the public buildings (fire and
 * police stations first, with an open forecourt on the road), and the check that a school or church really serves homes.
 */
const mid = (a: Point2, b: Point2): Point2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distToHole = (s: Settlement, c: Cell) => s.hole ? distanceToBox({ x: c.cx, y: c.cy }, s.hole) : 1e9;
/** Move every corner toward the centroid by `margin` metres (clamped): the quick way to get an inner loop. */
function insetCell(c: Cell, margin: number): Point2[] {
    return c.pts.map(p => { const d = Math.hypot(p.x - c.cx, p.y - c.cy) || 1, k = Math.max(0, (d - margin * 1.15) / d); return { x: c.cx + (p.x - c.cx) * k, y: c.cy + (p.y - c.cy) * k }; });
}

export function planParks(env: Env, s: Settlement): void {
    if (s.kind === 'village' || s.kind === 'estate') return;
    const { ctx } = env, { book, random } = ctx, lesson = s.lessonCell;
    if (lesson) {
        ctx.district({ id: 'district-park-lesson', kind: 'park', x: lesson.cx, y: lesson.cy, width: Math.max(10, lesson.w - 8), depth: Math.max(10, lesson.d - 8), roadId: s.main });
        s.parks.push(lesson);
    }
    const cellCount = s.cells.length;
    const candidates = s.cells.filter(c => c !== lesson && c.area > 2200 && centrality(s, { x: c.cx, y: c.cy }) > .05 && distToHole(s, c) > 20);
    const want = s.kind === 'city' ? Math.min(3 + Math.floor(random() * 2), Math.floor(cellCount * .2)) : cellCount >= 10 ? 2 : cellCount >= 5 ? 1 : 0;
    for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
    const civicWant = s.kind === 'city' ? Math.min(4, Math.max(2, Math.floor(cellCount * .2))) : Math.max(1, Math.min(2, Math.floor(cellCount / 4)));
    s.civic = [...s.cells].filter(c => c !== lesson && c.pts.length === 4 && c.area > 2300 && centrality(s, { x: c.cx, y: c.cy }) > .12 && distToHole(s, c) > 12)
        .sort((p, q) => q.area - p.area + (random() - .5) * 500).slice(0, civicWant);
    const chosen: Cell[] = [];
    for (const c of candidates) {
        if (chosen.length >= want) break;
        if (chosen.some(o => Math.hypot(o.cx - c.cx, o.cy - c.cy) < 90) || s.civic.includes(c)) continue;
        chosen.push(c);
    }
    // The cell nearest the middle becomes the central square.
    const core = s.cells.filter(c => c !== lesson && !chosen.includes(c) && c.area > 1500).sort((p, q) => centrality(s, { x: q.cx, y: q.cy }) - centrality(s, { x: p.cx, y: p.cy }))[0];
    if (core && ((s.kind === 'city' && cellCount >= 10) || (cellCount >= 8 && random() < .6))) s.plazas.push(core);
    chosen.forEach((c, i) => {
        s.parks.push(c);
        const inner = insetCell(c, 7);
        ctx.district({ id: `district-park-${s.id}-${i}`, kind: 'park', x: c.cx, y: c.cy, width: Math.max(12, c.w - 8), depth: Math.max(12, c.d - 8), roadId: s.main });
        book.add({ id: `walk-park-${s.id}-${i}`, kind: 'footpath', width: 1.6, points: [...inner, inner[0]], label: 'Парковая дорожка' });
        if (inner.length >= 4) book.add({ id: `walk-park-${s.id}-${i}-cross`, kind: 'footpath', width: 1.6, points: [mid(inner[0], inner[1]), mid(inner[2], inner[3])], label: 'Парковая аллея' });
    });
    s.plazas.forEach((c, i) => {
        ctx.district({ id: `district-plaza-${s.id}-${i}`, kind: 'park', x: c.cx, y: c.cy, width: Math.max(12, c.w - 14), depth: Math.max(12, c.d - 14), roadId: s.main });
        const inner = insetCell(c, 8);
        book.add({ id: `walk-park-${s.id}-plaza${i}`, kind: 'footpath', width: 1.8, points: [...inner, inner[0]], label: 'Площадь' });
    });
}

/** A lane through the middle of a big block doubles its frontage; small dense blocks keep a paved courtyard instead. */
export function planLanes(env: Env, s: Settlement): void {
    if (s.kind === 'estate') return;
    const { ctx } = env;
    let n = 0;
    for (const c of s.cells) {
        if (s.parks.includes(c) || s.plazas.includes(c) || c.pts.length !== 4 || s.civic?.includes(c)) continue;
        const cent = centrality(s, { x: c.cx, y: c.cy });
        const [p0, p1, p2, p3] = c.pts, L0 = Math.hypot(p1.x - p0.x, p1.y - p0.y), L1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (Math.max(L0, L1) < (s.kind === 'city' ? 54 : 62) || c.area < 2300) {
            const half = Math.min(L0, L1) / 2 - 14;
            if (cent > .45 && half >= 7) ctx.district({ id: `district-court-${s.id}-${n++}`, kind: 'neighborhood', x: c.cx, y: c.cy, width: Math.min(2 * half, 40), depth: Math.min(2 * half, 40), roadId: s.main });
            continue;
        }
        const pts = L0 >= L1 ? [mid(p0, p1), mid(p3, p2)] : [mid(p1, p2), mid(p0, p3)];
        const lane = ctx.book.add({ id: `${s.id}-lane-${n++}`, kind: 'road', hierarchy: 'lane', width: ROAD_WIDTH.lane, points: pts, label: 'Переулок' });
        if (lane) { s.roads.push(lane.id); env.roadOwner.set(lane.id, s); }
    }
}

/** Fire and police stations of the hub: on a main street, front toward the carriageway, forecourt kept open. */
export function placeServices(env: Env): void {
    const hubs = env.settlements.filter(s => s.hub);
    const stationScore = (type: 'fire-station' | 'police-station') => (st: Settlement, site: Parameters<ReturnType<typeof around>>[1]) => around(type === 'fire-station' ? .55 : .4)(st, site) + hierarchyBonus(site.road);
    for (const s of hubs) for (const type of ['fire-station', 'police-station'] as const) {
        const req: SiteRequest = { type, extra: 1.6, forecourt: true, roadsOf: st => majorRoads(env, st), score: stationScore(type) };
        if (!placeBest(env, s, req)) for (const other of env.settlements) if (other !== s && other.kind !== 'estate' && placeBest(env, other, { ...req, score: around(.45) })) break;
    }
}

export function planLandmarks(env: Env, s: Settlement): void {
    if (s.kind === 'estate') return;
    const { ctx } = env, { random } = ctx, profile = env.layout.profile;
    const place = (req: SiteRequest) => placeBest(env, s, { roadsOf: st => majorRoads(env, st), ...req });
    const centreOver = (limit: number, bonus = true) => (st: Settlement, site: Parameters<ReturnType<typeof around>>[1]) => centrality(st, site) > limit ? centrality(st, site) + (bonus ? hierarchyBonus(site.road) : 0) : null;
    const edgeOnAvenue = (st: Settlement, site: Parameters<ReturnType<typeof around>>[1]) => centrality(st, site) < .35 && (site.road.hierarchy === 'arterial' || site.road.hierarchy === 'collector') ? 1 - centrality(st, site) : null;
    if (s.kind === 'city') {
        place({ type: 'hospital', extra: 3, cells: true, score: (st, site) => around(.45)(st, site) + hierarchyBonus(site.road) });
        for (let i = 0; i < 2 + (random() < .5 ? 1 : 0); i++) place({ type: 'school', extra: 3, cells: true, score: around(.3) });
        place({ type: 'mall', extra: 3, samples: 3000, score: (st, site) => centrality(st, site) < .4 ? 1 + hierarchyBonus(site.road) - Math.abs(centrality(st, site) - .22) : null });
        place({ type: 'church', extra: 2, cells: true, score: around(.55) });
        for (let i = 0; i < 6; i++) place({ type: 'office', extra: 2.5, cells: 'any', score: centreOver(.3) });
        for (let i = 0; i < 11; i++) place({ type: 'restaurant', extra: 7, terrace: true, score: centreOver(.3) });
        for (let i = 0; i < 2; i++) place({ type: 'gas-station', extra: 1, score: edgeOnAvenue });
    } else if (s.kind !== 'village' || (s.hub && (profile === 'urban' || profile === 'mixed'))) {
        const big = s.a * s.b > 8000 * env.f * env.f, must = s.hub && (profile === 'urban' || profile === 'mixed');
        if (big || must || profile === 'urban') place({ type: 'school', extra: 3, cells: true, score: around(.35) });
        if (must || (big && random() < .4)) place({ type: 'hospital', extra: 3, cells: true, score: around(.4) });
        place({ type: 'church', extra: 2, cells: true, score: around(.55) });
        const cafes = 1 + Math.floor(random() * 3) + (profile === 'urban' ? 1 : 0);
        for (let i = 0; i < cafes; i++) place({ type: 'restaurant', extra: 7, terrace: true, score: centreOver(.3, false) });
        if (profile === 'urban') for (let i = 0; i < 2; i++) place({ type: 'office', extra: 2.5, score: centreOver(.12, false) });
        if (random() < .8) place({ type: 'gas-station', extra: 1, score: (st, site) => centrality(st, site) < .4 ? 1 - centrality(st, site) + hierarchyBonus(site.road) : null });
    } else if (random() < .6) {
        place({ type: 'church', extra: 2.5, score: around(.5, .5) });
    }
}

/** A school, hospital or church that ended up without homes around it is removed: skipping beats a church in a field. */
export function verifyCivic(env: Env): void {
    const { layout } = env;
    for (const type of ['school', 'hospital', 'church'] as const) {
        for (const prop of layout.objects.filter(p => p.type === type)) {
            if (residentialNeighbors(layout, prop) < (type === 'church' ? 3 : 4)) layout.objects.splice(layout.objects.indexOf(prop), 1);
        }
    }
}
