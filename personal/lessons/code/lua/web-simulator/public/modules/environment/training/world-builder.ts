import { WaterProbe, type Box, type Point2 } from './geography.js';
import type { TrainingLayout } from './layout.js';
import { LESSON_BOX, type RoadSpec } from './road-network.js';
import { planLandmarks, planLanes, planParks, placeServices, verifyCivic } from './town-plan.js';
import { finishTown, frontage } from './town-frontage.js';
import { createContext, hashString, seededRandom } from './world-context.js';
import { clamp, rank, type Env, type Settlement, type Skeleton } from './world-env.js';
import { planExtras, planPower } from './world-extras.js';
import { addOverpass, addPromenade, addSidewalks, closeDeadEnds } from './world-network.js';
import { createPlacers } from './world-places.js';
import type { WaterBody } from './world-plan.js';


/*
 * The procedural world. One pipeline for every inhabited profile:
 *   geography (river, lake, ponds)  ->  railway and station  ->  highway and trunk roads  ->  settlements (street patterns)
 *   ->  industry / farm / airfield plans  ->  one connected road network with junctions and bridges
 *   ->  power line  ->  public buildings with a forecourt on the road  ->  housing along the streets  ->  parks, stops, trees.
 * Pure and seeded; every prop goes through Ctx.fits, which enforces the layout contract (corridor, start radius, bounds,
 * water, path clearance, pairwise spacing). The pieces live in world-places (where towns go), world-network (road finishing),
 * town-plan / town-sites / town-frontage (what a town consists of) and world-extras (industry, farms, airfield, power, woods).
 */
export function buildWorld(layout: TrainingLayout, density: number): TrainingLayout {
    const { size, profile } = layout, half = size / 2, isCity = profile === 'city' && size >= 240;
    const random = seededRandom((layout.seed ^ hashString(profile)) >>> 0);
    const phase = random() * Math.PI * 2;
    const m: 1 | -1 = random() < .5 ? -1 : 1;
    layout.mirror = m;

    // ------------------------------------------------------------------ geography
    const riverBase = size * (isCity ? .34 + random() * .04 : .335 + random() * .065), meander = size * (.025 + random() * .035), wave = 3 + random() * 2.4;
    const lean = (random() - .5) * size * .07;
    const river = Array.from({ length: 33 }, (_, i) => ({ x: -m * (riverBase + Math.sin(i / wave + phase) * meander + lean * (i / 16 - 1)), y: -half + i * size / 32 }));
    const riverWidth = size * (.03 + random() * .014);
    layout.water.push({ id: 'river', kind: 'river', width: riverWidth, points: river });
    const lakeX = -m * size * (.2 + random() * .07), lakeY = -size * (isCity ? .37 + random() * .05 : .2 + random() * .12);
    const lakeRx = size * (.075 + random() * .04), lakeRy = size * (.05 + random() * .03), tilt = (random() - .5) * 1.2, lakeFreq = 2 + Math.floor(random() * 3);
    const blob = (cx: number, cy: number, rx: number, ry: number, rot: number, freq: number): Point2[] => Array.from({ length: 48 }, (_, i) => {
        const a = i / 48 * Math.PI * 2, ripple = 1 + .1 * Math.sin(a * freq + phase) + .07 * Math.cos(a * 7 - phase);
        const ex = Math.cos(a) * rx * ripple, ey = Math.sin(a) * ry * ripple;
        return { x: cx + ex * Math.cos(rot) - ey * Math.sin(rot), y: cy + ex * Math.sin(rot) + ey * Math.cos(rot) };
    });
    layout.water.push({ id: 'lake', kind: 'lake', width: 0, points: blob(lakeX, lakeY, lakeRx, lakeRy, tilt, lakeFreq) });
    // A pond on the dry side now and then: a second water body changes where the towns can stand.
    if (size >= 400 && random() < .45) {
        const px = m * size * (.18 + random() * .22), py = -size * (isCity ? .38 : .08 + random() * .3);
        const pond: WaterBody = { id: 'pond', kind: 'lake', width: 0, points: blob(px, py, size * (.03 + random() * .02), size * (.025 + random() * .02), random() * 3, 3) };
        layout.water.push(pond);
    }
    const probe = new WaterProbe(layout.water, size);
    const ctx = createContext(layout, density, m, probe, random);
    const { book } = ctx;

    // ------------------------------------------------------------------ land that is already spoken for
    const railY = ctx.railY, xs = m * size * .22;
    // The lesson strip, and the whole flight corridor (|x| < 14 at every y): no settlement, farm or yard is laid across it.
    ctx.taken.push({ x0: LESSON_BOX.x0 - 8, x1: LESSON_BOX.x1 + 8, y0: LESSON_BOX.y0 - 8, y1: LESSON_BOX.y1 + 8 }, { x0: -14, x1: 14, y0: -half, y1: half });
    if (ctx.hasRail) ctx.taken.push({ x0: xs - 26, x1: xs + 26, y0: size * .255, y1: size * .36 }, { x0: -half, x1: half, y0: railY - 16, y1: half });
    const settlements: Settlement[] = [], roadOwner = new Map<string, Settlement>();
    const env: Env = {
        ctx, layout, size, half, f: size / 600, isCity, settlements, roadOwner,
        touches: (b: Box, margin = 16) => ctx.taken.some(t => b.x0 < t.x1 + margin && b.x1 > t.x0 - margin && b.y0 < t.y1 + margin && b.y1 > t.y0 - margin),
        dry: (b: Box, margin = 10) => {
            for (let x = b.x0 - margin; x <= b.x1 + margin + 8; x += 14) for (let y = b.y0 - margin; y <= b.y1 + margin + 8; y += 14) if (probe.distance({ x, y }, margin) < margin) return false;
            return true;
        },
        adopt: (s: Settlement, specs: RoadSpec[]) => {
            let n = 0;
            for (const spec of specs) { const road = book.add(spec); if (road) { s.roads.push(road.id); roadOwner.set(road.id, s); n++; } }
            return n;
        }
    };

    // ------------------------------------------------------------------ railway and station
    let stationRoadFrom: Point2 | null = null;
    if (ctx.hasRail) {
        book.add({ id: 'rail-main', kind: 'rail', width: 2.3, points: [{ x: -size * .48, y: railY }, { x: 0, y: railY }, { x: size * .48, y: railY }], label: 'Железнодорожная магистраль', bridge: true });
        book.add({ id: 'rail-siding', kind: 'rail', width: 2.3, points: [{ x: m * size * .1, y: railY }, { x: m * size * .17, y: size * .43 }, { x: m * size * .37, y: size * .43 }, { x: m * size * .44, y: railY }], label: 'Станционный путь', bridge: true });
        stationRoadFrom = { x: xs, y: size * .29 };
    }
    const power = planPower(ctx);

    // ------------------------------------------------------------------ highway ("avenue"), city, towns, trunk roads
    const highwayLow = size * .185, highwayHigh = isCity ? size * .2 : size * (profile === 'industrial' ? .225 : .25);
    const avenueY = highwayLow + random() * (highwayHigh - highwayLow);
    const heights = [-.485, -.3, -.15, 0, .15, .3, .485].map((_, i) => isCity ? 0 : (random() - .5) * size * .05 * (i === 3 ? .3 : 1));
    const highwayPoints = [-.485, -.3, -.15, 0, .15, .3, .485].map((k, i) => ({ x: size * k, y: clamp(avenueY + heights[i], highwayLow, highwayHigh + size * .02) }));
    const sk: Skeleton = { avenueY, highwayPoints, riverBase, riverWidth, meander, lean, river, xs, heightAt: x => {
        for (let i = 1; i < highwayPoints.length; i++) if (x <= highwayPoints[i].x) return highwayPoints[i - 1].y + (highwayPoints[i].y - highwayPoints[i - 1].y) * (x - highwayPoints[i - 1].x) / (highwayPoints[i].x - highwayPoints[i - 1].x);
        return highwayPoints[highwayPoints.length - 1].y;
    } };
    const places = createPlacers(env, sk);
    if (isCity) places.buildCity();
    places.placeHighway();
    // The industrial zone along the railway is claimed before the towns, which then take what is left.
    const extras = planExtras(ctx, { settlements, avenueY: () => sk.heightAt(0), heightAt: sk.heightAt, citySettlement: places.city(), trunks: places.trunks }, power);
    places.placeTowns();
    const citySettlement = places.city();

    for (const s of settlements) {
        ctx.district({ id: `district-${s.id}`, kind: s.kind === 'city' ? 'center' : s.kind === 'town' ? 'suburb' : s.kind === 'estate' ? 'industry' : 'village', x: (s.box.x0 + s.box.x1) / 2, y: (s.box.y0 + s.box.y1) / 2, width: s.box.x1 - s.box.x0 + 28, depth: s.box.y1 - s.box.y0 + 28, roadId: s.main });
        if (s.kind === 'city' || s.kind === 'town') ctx.district({ id: `district-${s.id}-core`, kind: 'center', x: s.c.x, y: s.c.y, width: s.a * .8, depth: s.b * .8, roadId: s.main });
    }

    // ------------------------------------------------------------------ the road network becomes one network
    for (const s of settlements) { planParks(env, s); planLanes(env, s); }
    for (const s of settlements) addSidewalks(env, s);
    book.connectAll('avenue');
    if (stationRoadFrom) {
        // Station approach: the shortest road from the station front to the network, then a footpath to the platform.
        const hit = book.nearestRoad(stationRoadFrom, layout.paths.filter(p => p.kind === 'road'));
        if (hit && hit.distance > 1) book.add({ id: 'station-road', kind: 'road', hierarchy: 'link', width: 3.6, points: [{ ...stationRoadFrom }, hit.point], label: 'Подъезд к станции' });
        book.add({ id: 'station-walk', kind: 'footpath', width: 1.8, points: [{ ...stationRoadFrom }, { x: xs, y: size * .34 - 3.5 }], label: 'Переход к вокзалу' });
    }
    closeDeadEnds(env);
    book.stitch();
    book.connectAll('avenue');
    extras.late();
    book.stitch();
    layout.paths.sort((p, q) => rank(p) - rank(q));
    book.bridges();
    if (isCity && ctx.hasRail) addOverpass(env, sk, citySettlement);
    addPromenade(env, sk);
    ctx.rebuildPaths();
    if (ctx.hasRail) ctx.add({ type: 'station', x: xs, y: size * .34, scale: .85, radius: 6.4, rotation: 0 }, .5);
    extras.powerLine();

    // ------------------------------------------------------------------ public buildings, housing, and the rest
    const weight = (k: Settlement['kind']) => k === 'city' ? 3 : k === 'town' ? 2 : k === 'village' ? 1 : 0;
    const hubs = [...settlements].sort((x, y) => weight(y.kind) * 1e4 + y.a * y.b - (weight(x.kind) * 1e4 + x.a * x.b));
    if (hubs[0]) hubs[0].hub = true;
    placeServices(env);
    for (const s of settlements) planLandmarks(env, s);
    extras.build();
    for (const s of settlements) frontage(env, s);
    for (const s of settlements) finishTown(env, s);
    extras.vegetation(settlements);
    layout.landforms.push(...extras.landforms());
    verifyCivic(env);
    return layout;
}
