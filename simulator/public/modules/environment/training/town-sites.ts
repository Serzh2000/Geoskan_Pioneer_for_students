import { insidePolygon, pointAtLength, polylineLength, type Point2 } from './geography.js';
import type { TrainingProp } from './layout.js';
import type { Cell } from './patterns.js';
import { MODEL_FOOTPRINTS } from './settlement-policy.js';
import { dbg } from './world-context.js';
import type { Env, Settlement } from './world-env.js';
import type { WorldPath } from './world-plan.js';

/*
 * Choosing where a building goes: candidate sites along the streets (and in the middle of reserved blocks), scored by how
 * central the place is, filtered by the layout contract (Ctx.fits), the best one taken. Buildings face the road they stand on.
 */
export const APARTMENT_COLORS = [0xc8b99e, 0xbec9c7, 0xb9c2cd, 0xb57b62, 0xd2c4a6, 0xc9a98b, 0xa9b8a0];

export type Site = { x: number; y: number; road: WorldPath };
export type SiteRequest = { type: TrainingProp['type']; scale?: number; extra?: number; floors?: boolean; score: (s: Settlement, site: Site) => number | null;
    roadsOf?: (s: Settlement) => WorldPath[]; forecourt?: boolean; samples?: number; terrace?: boolean;
    /** Also try the middle of housing blocks: the reserved civic blocks, or (with 'any') every block. */ cells?: boolean | 'any' };

/** 1 in the middle of the built-up area, 0 at its rim (a rounded rectangle, so a grid town stays dense over most of its blocks). */
export function centrality(s: Settlement, p: Point2): number {
    if (s.cores) return Math.max(...s.cores.map(k => 1 - Math.min(1, Math.hypot((p.x - k.c.x) / k.a, (p.y - k.c.y) / k.b))));
    const u = Math.abs(p.x - s.c.x) / s.a, v = Math.abs(p.y - s.c.y) / s.b;
    return 1 - Math.min(1, Math.pow(u ** 3 + v ** 3, 1 / 3));
}
export function inCell(cells: Cell[], p: Point2): boolean { return cells.some(c => insidePolygon(p, c.pts)); }
/** True inside the lesson park, a park or a square: no building goes there. */
export function lessonOrPark(s: Settlement, p: Point2): boolean { return !!(s.lessonCell && insidePolygon(p, s.lessonCell.pts)) || inCell(s.parks, p) || inCell(s.plazas, p); }

export const majorRoads = (env: Env, s: Settlement): WorldPath[] =>
    s.roads.map(id => env.ctx.book.get(id)!).filter(r => r && (r.hierarchy === 'arterial' || r.hierarchy === 'collector' || r.hierarchy === 'street'));
export const around = (target: number, width = .35) => (s: Settlement, site: Site) => 1 - Math.abs(centrality(s, site) - target) / width;
export const hierarchyBonus = (r: WorldPath) => r.hierarchy === 'arterial' ? .4 : r.hierarchy === 'collector' ? .25 : 0;

/** Sites on both sides of a road, every `step` metres, set back far enough for a building of `radius` (and the pavement). */
export function sitesAlong(env: Env, road: WorldPath, radius: number, extra: number, step = 5, range?: [number, number]) {
    const out: Array<Site & { rotation: number; s: number }> = [];
    const total = polylineLength(road.points), walks = env.roadOwner.get(road.id)?.sidewalks.has(road.id);
    for (let s = (range?.[0] ?? 0) + radius * .5 + 2; s < (range?.[1] ?? total) - 2; s += step) {
        const { p, tangent } = pointAtLength(road.points, s);
        for (const side of [1, -1]) {
            const nrm = { x: -tangent.y * side, y: tangent.x * side }, off = road.width / 2 + (walks ? 2.4 : 0) + .6 + radius + extra;
            out.push({ x: p.x + nrm.x * off, y: p.y + nrm.y * off, rotation: Math.atan2(-nrm.x, nrm.y), road, s });
        }
    }
    return out;
}

export function placeBest(env: Env, s: Settlement, req: SiteRequest): TrainingProp | null {
    const { ctx } = env, { book, random } = ctx;
    const radius = (MODEL_FOOTPRINTS[req.type] ?? 2) * (req.scale ?? 1);
    const roads = (req.roadsOf?.(s) ?? s.roads.map(id => book.get(id)!).filter(r => r && r.hierarchy !== 'lane')).filter(Boolean);
    const slack = req.type === 'mall' ? 70 : req.type === 'gas-station' ? 30 : req.type === 'hospital' || req.type === 'school' ? radius + 8 : 4;
    let sites = roads.flatMap(r => sitesAlong(env, r, radius, req.extra ?? 1.5, 5, r.id === s.main ? s.range : undefined))
        .filter(site => site.x > s.box.x0 - slack && site.x < s.box.x1 + slack && site.y > s.box.y0 - slack && site.y < s.box.y1 + slack);
    if (req.cells) {
        const all = book.roads();
        for (const c of req.cells === 'any' ? s.cells.filter(k => k.pts.length === 4 && !s.parks.includes(k) && !s.plazas.includes(k) && k !== s.lessonCell) : s.civic ?? []) {
            const hit = book.nearestRoad({ x: c.cx, y: c.cy }, all);
            if (hit) sites.push({ x: c.cx, y: c.cy, rotation: Math.atan2(hit.point.x - c.cx, -(hit.point.y - c.cy)), road: hit.path, s: 0 });
        }
    }
    if (sites.length > (req.samples ?? 500)) sites = sites.sort(() => random() - .5).slice(0, req.samples ?? 500);
    let best: { site: typeof sites[number]; score: number } | null = null;
    for (const site of sites) {
        if (lessonOrPark(s, site)) continue;
        const score = req.score(s, site);
        if (score === null) continue;
        const total = score + random() * .12;
        if (best && total <= best.score) continue;
        if (!ctx.fits({ type: req.type, x: site.x, y: site.y, scale: req.scale ?? 1, radius, rotation: site.rotation }, .6)) continue;
        best = { site, score: total };
    }
    if (!best) { dbg(`place:${req.type}:${s.id}:none`); return null; }
    const prop: TrainingProp = { type: req.type, x: best.site.x, y: best.site.y, scale: req.scale ?? 1, radius, rotation: best.site.rotation };
    if (req.floors) { prop.floors = 5 + Math.floor(random() * 4); prop.color = ctx.pick(APARTMENT_COLORS); }
    if (!ctx.add(prop, .6)) return null;
    const front = { x: Math.sin(prop.rotation!), y: -Math.cos(prop.rotation!) }, right = { x: Math.cos(prop.rotation!), y: Math.sin(prop.rotation!) };
    // An open forecourt toward the road for stations: other props keep out of the strip between the door and the carriageway.
    if (req.forecourt) for (const d of [8, 13, 18]) ctx.reserved.push({ x: prop.x + front.x * d, y: prop.y + front.y * d, r: 5.2, owner: prop });
    if (req.terrace) for (const k of [-1, 1]) ctx.add({ type: 'cafe-table', x: prop.x + front.x * 14.6 + right.x * k * 3.6, y: prop.y + front.y * 14.6 + right.y * k * 3.6, scale: 1, radius: 2.41, rotation: random() * Math.PI }, .6);
    return prop;
}
