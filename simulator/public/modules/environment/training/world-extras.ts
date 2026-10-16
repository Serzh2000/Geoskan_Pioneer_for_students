import { distanceToBox, pointAtLength, polylineLength, type Box, type Point2 } from './geography.js';
import type { TrainingProp } from './layout.js';
import { ROAD_WIDTH } from './road-network.js';
import { MODEL_FOOTPRINTS } from './settlement-policy.js';
import { dbg, type Ctx } from './world-context.js';
import type { Landform, WorldPath } from './world-plan.js';
import type { Settlement } from './world-env.js';
import { plantWorld } from './world-woods.js';

/*
 * Everything that is not a street pattern: the power line, the industrial zone along the railway, farms, the airfield, the
 * wind farm, hills, woods. Each `plan*` call reserves land and lays its roads straight away (so the road network can be joined
 * as one) and returns the props to place later, when the roads are final.
 */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type PowerPlan = { build(): void };

/** The power line follows a map edge; its corridor is kept free of settlements before they are placed. */
export function planPower(ctx: Ctx): PowerPlan {
    const { layout, size, half, random, m } = ctx, profile = layout.profile;
    const chance = profile === 'city' || profile === 'industrial' ? 1 : profile === 'urban' ? .85 : .94;
    if (random() >= chance || size < 240) return { build() {} };
    // Candidate lines: opposite the river first, the far bank second; each leans a little so the line is not a ruler.
    const lines: Point2[][] = [];
    for (const side of [m, m, -m, m, m, -m] as const) {
        const inset = ctx.range(11, 30) + (side === m ? 0 : 6), bend = ctx.range(-22, 22) * (side === m ? 1 : .6), top = half - 14, bottom = -half + 14;
        const xAt = (t: number) => side * (half - inset) + bend * Math.sin(t * Math.PI * (1 + Math.floor(random() * 2)) * .9 + random());
        const wave = ctx.range(.6, 1.4), phase = random() * 6;
        lines.push(Array.from({ length: 9 }, (_, i) => { const t = i / 8; return { x: clamp(side * (half - inset) + bend * Math.sin(t * Math.PI * wave + phase) * (side === m ? 1 : .6), -half + 12, half - 12), y: bottom + t * (top - bottom) }; }));
        void xAt;
    }
    // Keep settlements away: the strip along the first line is taken (wide enough for the pylon, its wires and a margin).
    const line = lines[0];
    for (let i = 1; i < line.length; i++) ctx.taken.push({ x0: Math.min(line[i - 1].x, line[i].x) - 30, x1: Math.max(line[i - 1].x, line[i].x) + 30, y0: Math.min(line[i - 1].y, line[i].y), y1: Math.max(line[i - 1].y, line[i].y) });
    return {
        build() {
            for (const candidate of lines) {
                const total = polylineLength(candidate), count = Math.floor(total / 36) + 1, placed: TrainingProp[] = [];
                let ok = true;
                for (let i = 0; i < count && ok; i++) {
                    const target = Math.min(total - 1, i * total / Math.max(1, count - 1));
                    ok = false;
                    for (const shift of [0, 3, -3, 6, -6, 9, -9, 12, -12, 15, -15, 18, -18, 21, -21]) {
                        const { p, tangent } = pointAtLength(candidate, clamp(target + shift, 0, total));
                        const prop: TrainingProp = { type: 'power-pylon', x: p.x, y: p.y, scale: 1, radius: 2.1, rotation: Math.atan2(tangent.y, tangent.x), variant: 0 };
                        const prev = placed[placed.length - 1];
                        if (prev && (Math.hypot(prev.x - prop.x, prev.y - prop.y) < 22 || Math.hypot(prev.x - prop.x, prev.y - prop.y) > 55 || prop.y <= prev.y)) { dbg('pylon:spacing'); continue; }
                        if (!ctx.fits(prop, .6)) { dbg('pylon:fits'); continue; }
                        placed.push(prop); ok = true; break;
                    }
                }
                if (ok && placed.length >= 3) { for (const prop of placed) { ctx.layout.objects.push(prop); } return; }
            }
        }
    };
}

export type ExtrasInput = { settlements: Settlement[]; avenueY: () => number; heightAt: (x: number) => number; citySettlement: Settlement | null; trunks: string[] };
export type Extras = { late(): void; build(): void; vegetation(settlements: Settlement[]): void; landforms(): Landform[]; powerLine(): void };

export function planExtras(ctx: Ctx, input: ExtrasInput, power: PowerPlan): Extras {
    const { layout, size, half, random, m, book, probe } = ctx, profile = layout.profile, f = size / 600;
    const builders: Array<() => void> = [];
    const touches = (b: Box, margin = 14) => ctx.taken.some(t => b.x0 < t.x1 + margin && b.x1 > t.x0 - margin && b.y0 < t.y1 + margin && b.y1 > t.y0 - margin);
    const dryBox = (b: Box, margin = 10) => {
        for (let x = b.x0 - margin; x <= b.x1 + margin + 6; x += 12) for (let y = b.y0 - margin; y <= b.y1 + margin + 6; y += 12) if (probe.distance({ x, y }, margin) < margin) return false;
        return true;
    };
    const roadsNow = () => layout.paths.filter(p => p.kind === 'road');
    const nearestRoad = (p: Point2) => book.nearestRoad(p, roadsNow());

    // ---------------------------------------------------------------- industrial zone along the railway
    const industryChance: Record<string, number> = { industrial: 1, mixed: 1, city: .95, urban: .4, forest: .08, hills: .08 };
    if (ctx.hasRail && random() < (industryChance[profile] ?? 0)) {
        const big = profile === 'industrial';
        const xsAbs = Math.abs(m * size * .22), riverEdge = size * .335 - size * .05;
        const options: Array<[number, number]> = [[m * (xsAbs + 36), m * (half - 34)], [-m * 34, -m * Math.max(90, riverEdge - 36)], [m * 34, m * (xsAbs - 36)]];
        const viable = options.filter(([a, b]) => Math.abs(b - a) >= 90 * f).sort(() => random() - .5);
        const roadY = ctx.railY - 40, spurY = ctx.railY - 7;
        const trials = viable.flatMap(([ra, rb]) => [1, .8, .64, .5].map(k => ({ ra, rb, k })));
        for (const { ra, rb, k } of trials) {
            const len = Math.min(Math.abs(rb - ra), (big ? ctx.range(170, 230) : ctx.range(100, 150)) * Math.max(.7, f)) * k;
            if (len < 64 * Math.max(.7, f)) continue;
            const dir = Math.sign(rb - ra), start = ra + dir * ctx.range(0, Math.max(0, Math.abs(rb - ra) - len)), end = start + dir * len;
            const x0 = Math.min(start, end), x1 = Math.max(start, end);
            const zone: Box = { x0, x1, y0: roadY - (big ? 30 : 22), y1: ctx.railY - 2 };
            if (touches({ ...zone, y1: zone.y1 - 18 }, 0)) { dbg('industry:taken'); continue; }
            if (!dryBox(zone, 8)) { dbg('industry:wet'); continue; }
            const pts = [0, .34, .67, 1].map(t => ({ x: start + (end - start) * t, y: roadY }));
            if (!book.add({ id: 'industry-road', kind: 'road', hierarchy: 'collector', width: ROAD_WIDTH.collector, points: pts, label: 'Подъезд к грузовому двору' })) { dbg('industry:road'); continue; }
            // Two links to the network; the nearest roads below.
            let linked = 0;
            for (const t of [.34, .67]) {
                const from = pts[t < .5 ? 1 : 2], hit = book.nearestRoad({ x: from.x, y: from.y - 6 }, roadsNow().filter(r => !r.id.startsWith('industry') && !r.id.startsWith('yard-')));
                if (hit && hit.distance < 150 && hit.point.y < roadY - 4 && book.add({ id: `yard-link-${linked + 1}`, kind: 'road', hierarchy: 'link', width: 3.6, points: [from, hit.point], label: 'Въезд на грузовой двор' })) linked++;
            }
            if (!linked) { dbg('industry:link'); const road = layout.paths.find(p => p.id === 'industry-road'); if (road) layout.paths.splice(layout.paths.indexOf(road), 1); continue; }
            const spur = { x: start + dir * 8, y: ctx.railY };
            book.add({ id: 'rail-spur', kind: 'rail', width: 2.3, points: [spur, { x: spur.x + dir * 12, y: spurY }, { x: end, y: spurY }], label: 'Подъездной путь' });
            const id = 'district-industry';
            ctx.district({ id, kind: 'industry', x: (x0 + x1) / 2, y: (zone.y0 + zone.y1) / 2, width: x1 - x0, depth: zone.y1 - zone.y0, roadId: 'industry-road' });
            ctx.taken.push(zone); ctx.zones.push({ box: zone, id });
            builders.push(() => buildIndustry(pts, spurY, zone, id, big, dir));
            break;
        }
    }
    function buildIndustry(pts: Point2[], spurY: number, zone: Box, id: string, big: boolean, dir: number) {
        const roadY = pts[0].y, hw = ROAD_WIDTH.collector / 2;
        const [lo, hi] = [Math.min(pts[0].x, pts[3].x), Math.max(pts[0].x, pts[3].x)];
        // The gantry crane first, on the loading side between the road and the spur.
        for (let n = 0; n < (big ? 2 : 1); n++) for (let t = 0; t < 12; t++) {
            const cx = lo + 20 + random() * Math.max(1, hi - lo - 40);
            if (ctx.add({ type: 'gantry-crane', x: cx, y: roadY + 12.4 + random() * 5, scale: 1, radius: 11.2, rotation: Math.floor(random() * 2) * Math.PI / 2 }, .6, id)) break;
        }
        // South of the road: warehouses facing it (front toward +Y). North of the road: the loading side by the spur.
        for (const side of [-1, 1]) {
            let x = lo + 6 + random() * 5;
            while (x < hi - 6) {
                const roll = random();
                const type: TrainingProp['type'] = side < 0 ? (roll < .8 ? 'warehouse' : roll < .92 ? 'containers' : 'silo') : (roll < .3 ? 'warehouse' : roll < .65 ? 'containers' : roll < .75 ? 'silo' : roll < .85 ? 'solar' : 'gantry-crane');
                const scale = type === 'warehouse' ? .72 : 1, radius = (MODEL_FOOTPRINTS[type] ?? 4) * scale;
                const y = roadY + side * (hw + .6 + radius + 1.2 + random() * 1.5);
                const prop: TrainingProp = { type, x, y, scale, radius, rotation: side < 0 ? Math.PI : 0 };
                if (type === 'warehouse' || type === 'solar') prop.rotation = side < 0 ? Math.PI : 0;
                else prop.rotation = Math.floor(random() * 4) * Math.PI / 2;
                if (y < zone.y0 + 2 || y > spurY - 2) { x += 6; continue; }
                x += ctx.add(prop, .6, id) ? radius * 2 + 1.2 : 4;
            }
        }
        // Second row of the big yard.
        if (big) for (let n = 0; n < 6; n++) {
            const type = ctx.pick(['warehouse', 'containers', 'warehouse'] as const), scale = type === 'warehouse' ? .72 : 1;
            ctx.add({ type, x: lo + random() * (hi - lo), y: roadY - 21 - random() * 5, scale, radius: (MODEL_FOOTPRINTS[type] ?? 4) * scale, rotation: Math.floor(random() * 4) * Math.PI / 2 }, .6, id);
        }
        void dir;
    }

    // ---------------------------------------------------------------- farms
    const farms = profile === 'forest' || profile === 'hills' ? 1 + (random() < .6 ? 1 : 0) : profile === 'mixed' ? 1 + (random() < .4 ? 1 : 0) : profile === 'industrial' ? (random() < .5 ? 1 : 0) : profile === 'city' ? (random() < .7 ? 1 : 0) : random() < .5 ? 1 : 0;
    /** Farms and the airfield are laid out after the road network is final, so that no later link road cuts through them. */
    function late() {
        for (let n = 0; n < (size < 300 ? Math.min(1, farms) : farms); n++) planFarm(n);
        if (size >= 400 && random() < (airfieldChance[profile] ?? 0)) planAirfield();
        planLandscape();
    }
    const roadTouchesBox = (b: Box, margin: number): boolean => roadsNow().some(r => {
        for (let i = 1; i < r.points.length; i++) {
            const a = r.points[i - 1], c = r.points[i], n = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / 6));
            for (let k = 0; k <= n; k++) if (distanceToBox({ x: a.x + (c.x - a.x) * k / n, y: a.y + (c.y - a.y) * k / n }, b) < margin) return true;
        }
        return false;
    });
    function planFarm(n: number) {
        for (let attempt = 0; attempt < 1500; attempt++) {
            const cx = ctx.range(-half + 60, half - 60), cy = ctx.range(-half + 50, ctx.hasRail ? ctx.railY - 60 : half - 50);
            const box: Box = { x0: cx - 42, x1: cx + 42, y0: cy - 30, y1: cy + 30 };
            if (touches(box, 2)) { dbg('farm:taken'); continue; }
            if (!dryBox(box, 10)) { dbg('farm:wet'); continue; }
            if (roadTouchesBox(box, 6)) { dbg('farm:road'); continue; }
            const hit = nearestRoad({ x: cx, y: cy });
            if (!hit || hit.distance < 40 || hit.distance > 240) { dbg('farm:hit'); continue; }
            // The lane arrives at the yard from the road; the farm stands around its end.
            const dx = cx - hit.point.x, dy = cy - hit.point.y, d = Math.hypot(dx, dy), u = { x: dx / d, y: dy / d };
            const end = { x: hit.point.x + u.x * (d - 12), y: hit.point.y + u.y * (d - 12) };
            const lane = book.add({ id: `farm-lane-${n + 1}`, kind: 'road', hierarchy: 'lane', width: 3.2, points: [hit.point, end], label: 'Дорога к ферме' });
            if (!lane) continue;
            const id = `district-farm-${n + 1}`;
            ctx.district({ id, kind: 'farmland', x: cx, y: cy, width: 84, depth: 60, roadId: lane.id });
            ctx.taken.push(box); ctx.zones.push({ box, id });
            builders.push(() => {
                const v = { x: -u.y, y: u.x };
                const spot = (along: number, across: number) => ({ x: end.x + u.x * along + v.x * across, y: end.y + u.y * along + v.y * across });
                const face = (side: number) => Math.atan2(-v.x * side, v.y * side);
                const items: Array<[TrainingProp['type'], number, number]> = [['barn', 8, 14], ['house', 10, -13], ['silo', 18, 14], ['hay', 8, 26], ['hay', 16, 27], ['greenhouse', 4, -26], ['hay', 24, 20], ['solar', 22, -25]];
                for (const [type, along, across] of items) {
                    for (const jitter of [0, 3, -3, 6, -6]) {
                        const p = spot(along + jitter, across), radius = MODEL_FOOTPRINTS[type] ?? 4;
                        const prop: TrainingProp = { type, x: p.x, y: p.y, scale: 1, radius: type === 'house' ? 4.6 : radius, rotation: type === 'barn' || type === 'house' ? face(across > 0 ? 1 : -1) : Math.floor(random() * 4) * Math.PI / 2 };
                        if (Math.abs(p.x - cx) + prop.radius > 42 || Math.abs(p.y - cy) + prop.radius > 30) { dbg('farm:item:' + type + ':bounds'); continue; }
                        if (ctx.add(prop, .6, type === 'house' ? undefined : id)) { dbg('farm:item:' + type + ':ok'); break; }
                    }
                }
            });
            return;
        }
    }

    // ---------------------------------------------------------------- airfield
    const airfieldChance: Record<string, number> = { forest: .8, hills: .7, mixed: .6, urban: .25, industrial: .3, city: .3 };
    function planAirfield() {
        for (let attempt = 0; attempt < 1500; attempt++) {
            const cx = ctx.range(-half + 80, half - 80), cy = ctx.range(-half + 50, (ctx.hasRail ? ctx.railY - 55 : half - 50));
            const box: Box = { x0: cx - 50, x1: cx + 50, y0: cy - 26, y1: cy + 28 };
            if (touches(box, 2)) { dbg('air:taken'); continue; }
            if (!dryBox(box, 10)) { dbg('air:wet'); continue; }
            if (roadTouchesBox(box, 6)) { dbg('air:road'); continue; }
            const flip = random() < .5 ? 1 : -1, dx = ctx.range(-10, 10);
            const strip: Point2[] = [{ x: cx - 28, y: cy }, { x: cx + 28, y: cy }];
            if (!book.valid({ points: strip, width: 9, kind: 'runway' })) continue;
            const hangar: TrainingProp = { type: 'hangar', x: cx + dx, y: cy + flip * 16, scale: .6, radius: 8.3, rotation: flip > 0 ? 0 : Math.PI };
            const hit = nearestRoad({ x: cx, y: cy + flip * 16 });
            if (!hit || hit.distance < 30 || hit.distance > 210) { dbg('air:hit'); continue; }
            const apron = { x: cx + dx + 15, y: cy + flip * 17 };
            const lane = book.add({ id: 'airfield-road', kind: 'road', hierarchy: 'link', width: 3.4, points: [hit.point, apron], label: 'Подъезд к аэродрому' });
            if (!lane) { dbg('air:lane'); continue; }
            if (!book.valid({ points: strip, width: 9, kind: 'runway' })) { layout.paths.splice(layout.paths.indexOf(lane), 1); continue; }
            layout.paths.push({ id: 'airstrip', kind: 'runway', width: 9, points: strip, label: 'Взлётная полоса' });
            const id = 'district-airfield';
            ctx.district({ id, kind: 'airfield', x: cx, y: cy, width: 100, depth: 54, roadId: lane.id });
            ctx.taken.push(box); ctx.zones.push({ box, id });
            builders.push(() => {
                // The hangar tries both sides of the strip and a few shifts; an airfield without a hangar is withdrawn altogether.
                let placed = false;
                for (const side of [flip, -flip]) for (const shift of [dx, -10, 0, 10, 16, -16]) {
                    if (!placed && ctx.add({ ...hangar, x: cx + shift, y: cy + side * 16, rotation: side > 0 ? 0 : Math.PI }, .6, id)) placed = true;
                }
                if (!placed) {
                    const strip = layout.paths.findIndex(q => q.id === 'airstrip'); if (strip >= 0) layout.paths.splice(strip, 1);
                    const district = layout.districts.findIndex(q => q.id === id); if (district >= 0) layout.districts.splice(district, 1);
                    return;
                }
                ctx.add({ type: 'windsock', x: cx + 30, y: cy - flip * 11, scale: 1, radius: 1.2, rotation: 0 }, .6, id);
            });
            return;
        }
    }

    // ---------------------------------------------------------------- hills and the wind farm
    const hills: Landform[] = [];
    const hilly = profile === 'hills';
    const hillCount = Math.round((hilly ? 10 : profile === 'forest' ? 6 : 4) * Math.max(.5, f));
    /** Hills and the wind farm are planned after the towns, on the land they left. */
    function planLandscape() {
    }

    function planHills() {
        const tooClose = (p: Point2, r: number) => ctx.taken.some(t => distanceToBox(p, t) < r * .55 + 8) || hills.some(h => Math.hypot(h.x - p.x, h.y - p.y) < (h.radius + r) * .5);
        for (let attempt = 0; attempt < hillCount * 25 && hills.length < hillCount; attempt++) {
            const radius = hilly ? ctx.range(24, 62) * Math.max(.6, f) : ctx.range(12, 34) * Math.max(.6, f);
            const p = { x: ctx.range(-half + radius * .6, half - radius * .6), y: ctx.range(-half + radius * .6, half - radius * .6) };
            if (distanceToBox(p, { x0: -22, x1: 22, y0: -28, y1: 104 }) < radius * .7 + 6) continue;
            if (probe.distance(p, radius * .8) < radius * .8 || tooClose(p, radius)) continue;
            hills.push({ x: p.x, y: p.y, radius, height: hilly ? ctx.range(5, 10) : ctx.range(2, 5) });
        }
    }
    planHills();
    if (hilly || profile === 'forest') {
        // Foothills a short walk from the start, so the first flights already see rising ground (never on the strip itself).
        for (let n = 0, attempt = 0; n < (hilly ? 2 : 1) && attempt < 80; attempt++) {
            const radius = ctx.range(24, 36) * Math.max(.6, f), side = random() < .5 ? -1 : 1, p = { x: side * ctx.range(52, 82), y: ctx.range(-60, 80) };
            if (probe.distance(p, radius) < radius || hills.some(h => Math.hypot(h.x - p.x, h.y - p.y) < (h.radius + radius) * .6)) continue;
            if (ctx.taken.slice(1).some(t => distanceToBox(p, t) < radius * .6)) continue;
            hills.push({ x: p.x, y: p.y, radius, height: ctx.range(6, 10) }); n++;
        }
    }
    const windChance: Record<string, number> = { hills: .95, forest: .35, mixed: .85, city: .6, urban: .3, industrial: .5 };
    const windPlanned = size >= 300 && random() < (windChance[profile] ?? 0);
    if (windPlanned && !hills.some(h => Math.hypot(h.x, h.y - 30) > 150)) {
        // The wind farm needs a ridge of its own, far from the lesson strip and the towns.
        for (let attempt = 0; attempt < 200; attempt++) {
            const radius = ctx.range(34, 54) * Math.max(.7, f), p = { x: ctx.range(-half + radius, half - radius), y: ctx.range(-half + radius, half - radius) };
            if (Math.hypot(p.x, p.y - 30) < 170 || probe.distance(p, radius * .9) < radius * .9 || ctx.taken.some(t => distanceToBox(p, t) < radius * .8 + 8)) continue;
            hills.push({ x: p.x, y: p.y, radius, height: ctx.range(5, 9) });
            break;
        }
    }
    if (windPlanned && hills.length) builders.push(() => {
        const ridge = [...hills].filter(h => Math.hypot(h.x, h.y - 30) > 150).sort((a, b) => b.height * b.radius - a.height * a.radius)[0];
        if (!ridge) return;
        // A loose row along the ridge: positions are tried over its whole crest until the farm is as big as planned.
        const count = Math.min(6, 3 + Math.floor(random() * 4)), heading = random() * Math.PI;
        let placed = 0;
        for (let i = 0; i < 120 && placed < count; i++) {
            const along = (random() - .5) * 2 * ridge.radius * 1.3, across = (random() - .5) * ridge.radius * .7;
            const x = ridge.x + Math.cos(heading) * along - Math.sin(heading) * across, y = ridge.y + Math.sin(heading) * along + Math.cos(heading) * across;
            if (ctx.add({ type: 'wind-turbine', x, y, scale: 1, radius: 2.4, rotation: heading + Math.PI / 2 }, .8)) placed++;
        }
        // The mast of the radio link crowns the same ridge.
        for (let i = 0; i < 40; i++) if (ctx.add({ type: 'radio-mast', x: ridge.x + (random() - .5) * ridge.radius * 1.2, y: ridge.y + (random() - .5) * ridge.radius * 1.2, scale: 1, radius: 2.4, rotation: 0 }, .8)) break;
    });


    return {
        late,
        build() { for (const run of builders) run(); },
        vegetation: (settlements: Settlement[]) => plantWorld(ctx, settlements, hills),
        landforms: () => hills,
        powerLine: () => power.build()
    };
}

export type { WorldPath };
