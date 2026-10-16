import { insidePolygon, pointAtLength, polylineLength, type Point2 } from './geography.js';
import type { TrainingProp } from './layout.js';
import type { Cell } from './patterns.js';
import { MODEL_FOOTPRINTS, residentialNeighbors } from './settlement-policy.js';
import { APARTMENT_COLORS, centrality, lessonOrPark } from './town-sites.js';
import { dbg } from './world-context.js';
import { clamp, rank, type Env, type Settlement } from './world-env.js';
import type { WorldPath } from './world-plan.js';

/*
 * Houses along the streets: each one set back from the carriageway, its front (local -Y) turned to the street. Apartments
 * stand toward the middle of a place and houses toward its rim; an industrial estate gets warehouses instead.
 */
const R = { apartment: 5.21, house: 4.6 } as const;

export function frontage(env: Env, s: Settlement): void {
    const { ctx } = env, { book, random } = ctx, dense = ctx.density;
    const order = s.roads.map(id => book.get(id)).filter((r): r is WorldPath => !!r && r.kind === 'road').sort((p, q) => rank(p) - rank(q));
    const urbanBias = s.kind === 'city' ? .25 : s.style === 'urban' ? .1 : -.05;
    for (const road of order) {
        const lane = road.hierarchy === 'lane', walks = s.sidewalks.has(road.id), total = polylineLength(road.points);
        const [s0, s1] = road.id === s.main && s.range ? s.range : [0, total];
        for (const side of [1, -1]) {
            let pos = s0 + 3 + random() * 4;
            while (pos < s1 - 3) {
                const { p, tangent } = pointAtLength(road.points, pos);
                const nrm = { x: -tangent.y * side, y: tangent.x * side };
                if (lessonOrPark(s, { x: p.x + nrm.x * 14, y: p.y + nrm.y * 14 })) { dbg('front:park'); pos += 6; continue; }
                if (s.kind !== 'village' && (p.x < s.box.x0 - 16 || p.x > s.box.x1 + 16 || p.y < s.box.y0 - 16 || p.y > s.box.y1 + 16)) { dbg('front:outside'); pos += 10; continue; }
                const c = centrality(s, p);
                // Beyond the built-up area a street thins out into gardens.
                const beyond = c <= 0 && s.kind !== 'village';
                const pApartment = s.kind === 'village' ? 0 : s.kind === 'city' ? clamp((c - .1) * 2.4 + urbanBias, 0, .97) : clamp((c - .25) * 1.9 + urbanBias, 0, .97);
                const apartment = s.style !== 'industrial' && (!lane || (s.kind === 'city' && c > .3)) && random() < pApartment;
                const roll = random();
                const industrial: TrainingProp['type'] | null = s.style !== 'industrial' ? null : roll < .7 ? 'warehouse' : roll < .88 ? 'containers' : roll < .94 ? 'silo' : 'solar';
                const scale = industrial === 'warehouse' ? .72 : apartment ? 1.5 : 1;
                const radius = industrial ? (MODEL_FOOTPRINTS[industrial] ?? 4) * scale : apartment ? R.apartment : R.house;
                const skip = apartment ? .02 : .03 + (1 - dense) * .14 + (beyond ? .25 : 0);
                if (random() < skip) { dbg('front:skip'); pos += radius * 2 + 1; continue; }
                const setback = apartment ? 1.2 + random() * 1.8 : 1.4 + random() * (s.kind === 'village' ? 4.5 : 2.8);
                const off = road.width / 2 + (walks ? 2.4 : 0) + .6 + radius + setback;
                const prop: TrainingProp = { type: industrial ?? (apartment ? 'building' : 'house'), x: p.x + nrm.x * off, y: p.y + nrm.y * off, scale, radius, rotation: Math.atan2(-nrm.x, nrm.y) };
                if (apartment) { prop.floors = Math.round(clamp(3 + c * 11 + (random() - .5) * 4, 3, 12)); prop.color = ctx.pick(APARTMENT_COLORS); }
                if (ctx.add(prop, .6, industrial ? `district-${s.id}` : undefined)) { dbg('front:ok'); pos += radius * 2 + (apartment ? .6 + random() * .8 : industrial ? 1.5 + random() * 4 : 1 + random() * 2.6); }
                else { dbg('front:fail'); pos += 2.5; }
            }
        }
    }
}

function inflate(cell: Cell, margin: number): Point2[] {
    return cell.pts.map(p => { const d = Math.hypot(p.x - cell.cx, p.y - cell.cy) || 1; return { x: p.x + (p.x - cell.cx) / d * margin, y: p.y + (p.y - cell.cy) / d * margin }; });
}

/** Bus stops on the main streets, benches along park paths, tables and benches on the squares. */
export function finishTown(env: Env, s: Settlement): void {
    if (s.kind === 'estate') return;
    const { ctx, layout } = env, { book, random, range } = ctx;
    const roads = s.roads.map(id => book.get(id)!).filter(r => r && (r.hierarchy === 'arterial' || r.hierarchy === 'collector' || r.hierarchy === 'street') && !/-rib/.test(r.id) && polylineLength(r.points) > 50);
    let stops = 0;
    for (const road of roads) {
        const total = polylineLength(road.points), walks = s.sidewalks.has(road.id), ribbon = road.id === s.main && s.range;
        for (let pos = range(25, 55) + (ribbon ? s.range![0] : 0); pos < (ribbon ? s.range![1] : total) - 10 && stops < (s.kind === 'city' ? 10 : 3); pos += range(85, 130)) {
            const { p, tangent } = pointAtLength(road.points, pos), side = random() < .5 ? 1 : -1;
            const nrm = { x: -tangent.y * side, y: tangent.x * side }, off = road.width / 2 + (walks ? 2.4 : 0) + .6 + 2.8 + .6;
            const stop: TrainingProp = { type: 'bus-stop', x: p.x + nrm.x * off, y: p.y + nrm.y * off, scale: 1, radius: 2.8, rotation: Math.atan2(-nrm.x, nrm.y) };
            if (residentialNeighbors(layout, stop, 90) >= 2 && ctx.add(stop, .6)) stops++;
        }
    }
    for (const cell of s.parks) {
        const path = layout.paths.find(p => p.id.startsWith(`walk-park-${s.id}-`) && !p.id.includes('cross') && insidePolygon(p.points[0], inflate(cell, 2)));
        if (path) for (let pos = 8; pos < polylineLength(path.points); pos += range(13, 20)) for (const side of [1, -1]) {
            if (random() < .35) continue;
            const { p, tangent } = pointAtLength(path.points, pos), nrm = { x: -tangent.y * side, y: tangent.x * side };
            ctx.add({ type: 'bench', x: p.x + nrm.x * 2.6, y: p.y + nrm.y * 2.6, scale: 1, radius: 1.2, rotation: Math.atan2(nrm.x, -nrm.y) }, .6);
        }
    }
    for (const cell of s.plazas) for (let n = 0, tries = 0; n < 6 && tries < 80; tries++) {
        const p = { x: cell.cx + (random() - .5) * cell.w * .6, y: cell.cy + (random() - .5) * cell.d * .6 };
        if (insidePolygon(p, cell.pts) && ctx.add({ type: n % 2 ? 'cafe-table' : 'bench', x: p.x, y: p.y, scale: 1, radius: n % 2 ? 2.41 : 1.2, rotation: random() * Math.PI }, .8)) n++;
    }
}
