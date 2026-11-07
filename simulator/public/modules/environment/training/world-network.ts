import { distanceToPath, nearestOnPath, polylineLength } from './geography.js';
import { ROAD_WIDTH } from './road-network.js';
import { dbg } from './world-context.js';
import type { Env, Settlement, Skeleton } from './world-env.js';

/* Finishing touches of the road network: dead ends, pavements, the overpass of the city and the riverside walk. */

/** A long street that stops in the fields is joined to the nearest road of another place, or ends in a turning circle. */
export function closeDeadEnds(env: Env): void {
    const { ctx, half, roadOwner } = env, { book } = ctx;
    let n = 0;
    for (const road of book.roads()) {
        if (road.hierarchy === 'lane' || /^(farm-lane|airfield-road|industry-road|station-road|yard-link|join-|turn-)|-rib/.test(road.id) || polylineLength(road.points) < 40) continue;
        for (const which of ['start', 'finish'] as const) {
            // Re-read the ends each time: joining the first end may have inserted vertices into this road.
            const end = which === 'start' ? 0 : road.points.length - 1, e = road.points[end];
            if (Math.abs(e.x) > half - 12 || Math.abs(e.y) > half - 12 || n >= 60) continue;
            const roads = book.roads();
            if (roads.some(o => o !== road && distanceToPath(e, o.points) < .6)) continue;
            const owner = roadOwner.get(road.id);
            const hit = book.nearestRoad(e, roads.filter(o => o !== road && (!owner || roadOwner.get(o.id) !== owner)));
            // A join that doubles back along the street it leaves (its middle lies on that street) is a second layer of asphalt, not a link.
            const mid = hit ? { x: (e.x + hit.point.x) / 2, y: (e.y + hit.point.y) / 2 } : e;
            if (hit && hit.distance > 5 && hit.distance < 150 && distanceToPath(mid, road.points) > road.width / 2 + 2 && book.add({ id: `join-${++n}`, kind: 'road', hierarchy: 'street', width: ROAD_WIDTH.link, points: [e, hit.point], label: 'Улица' })) { book.stitch(); continue; }
            const prev = road.points[end === 0 ? 1 : road.points.length - 2], d = Math.hypot(e.x - prev.x, e.y - prev.y) || 1, out = { x: (e.x - prev.x) / d, y: (e.y - prev.y) / d };
            const c = { x: e.x + out.x * 10, y: e.y + out.y * 10 };
            const ring = Array.from({ length: 13 }, (_, k) => { const a = Math.atan2(-out.y, -out.x) + k / 12 * Math.PI * 2; return { x: c.x + Math.cos(a) * 10, y: c.y + Math.sin(a) * 10 }; });
            if (book.add({ id: `turn-${++n}`, kind: 'road', hierarchy: 'street', width: ROAD_WIDTH.link, points: ring, label: 'Разворотный круг' })) book.stitch(); else dbg('dead:turn-failed:' + road.id);
        }
    }
}

/** Pavements along the arterials and collectors of towns and cities; props are set back to leave them free. */
export function addSidewalks(env: Env, s: Settlement): void {
    if (s.kind === 'village' || s.kind === 'estate') return;
    const { book } = env.ctx;
    for (const id of s.roads) {
        const road = book.get(id);
        if (!road || (road.hierarchy !== 'arterial' && road.hierarchy !== 'collector') || id.includes('ring0') || polylineLength(road.points) < 70) continue;
        for (const side of [1, -1]) {
            // A ring road is closed (first vertex = last): its tangent at the seam is taken across it, or the pavement's two
            // ends would overlap and cross.
            const n = road.points.length, closed = Math.hypot(road.points[0].x - road.points[n - 1].x, road.points[0].y - road.points[n - 1].y) < .01;
            const off = road.width / 2 + 1.6, pts = road.points.map((p, i) => {
                const a = road.points[i > 0 ? i - 1 : closed ? n - 2 : 0], b = road.points[i < n - 1 ? i + 1 : closed ? 1 : n - 1], d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                return { x: p.x - (b.y - a.y) / d * off * side, y: p.y + (b.x - a.x) / d * off * side };
            });
            if (closed) pts[n - 1] = { ...pts[0] };
            // On the inside of a tight bend the offset curve folds over itself (a loop, a "bow tie"): drop the vertices that fell
            // closer to the carriageway than the offset, then the loop is gone and the pavement runs smoothly round the corner.
            const clean = pts.filter((p, i) => i === 0 || i === pts.length - 1 || distanceToPath(p, road.points) > off * .94);
            book.add({ id: `walk-${id}-${side > 0 ? 'a' : 'b'}`, kind: 'footpath', width: 1.6, points: clean, label: 'Тротуар' });
        }
        s.sidewalks.add(id);
    }
}

/** A northern artery leaves the city and crosses the railway on an overpass (a road, lifted above the rails). */
export function addOverpass(env: Env, sk: Skeleton, city: Settlement | null): void {
    if (!city) return;
    const { ctx, layout, half, size, roadOwner } = env, { book, random } = ctx;
    const siding = book.get('rail-siding');
    const vertices = layout.paths.filter(p => p.kind === 'road' && roadOwner.get(p.id) === city).flatMap(p => p.points).filter(v => v.y > city.box.y1 - 60);
    vertices.sort((a, b) => (b.y - a.y) + (random() - .5) * 30);
    // Failing that, the artery leaves the avenue itself.
    const avenue = book.get('avenue');
    if (avenue) for (let x = -size * .35; x <= size * .35; x += 14) { const hit = nearestOnPath({ x, y: sk.avenueY }, avenue.points); if (hit.distance < 30) vertices.push(hit.point); }
    for (const top of vertices) {
        if (Math.abs(top.x) < 30 || Math.abs(top.x - sk.xs) < 44 || Math.abs(top.x) > half - 30) continue;
        if (siding && siding.points.some((q, i) => i && Math.min(q.x, siding.points[i - 1].x) - 6 <= top.x && Math.max(q.x, siding.points[i - 1].x) + 6 >= top.x)) continue;
        const id = 'north-artery';
        if (book.add({ id, kind: 'road', hierarchy: 'collector', width: ROAD_WIDTH.collector, points: [top, { x: top.x, y: half - 8 }], label: 'Северная магистраль', crossRail: true })) {
            book.stitch();
            layout.bridges.push({ x: top.x, y: ctx.railY, pathId: id, length: 22, width: 6.8, rotation: Math.PI / 2, kind: 'overpass', height: 6.4 });
            break;
        }
    }
}

/** A footpath along the bank of the river where it flows through the settled part of the map. */
export function addPromenade(env: Env, sk: Skeleton): void {
    const { size, ctx } = env, m = ctx.m;
    const pts = sk.river.filter(p => p.y >= -size * .1 && p.y <= size * .3).map((p, i, all) => {
        const a = all[Math.max(0, i - 1)], b = all[Math.min(all.length - 1, i + 1)], d = Math.hypot(b.x - a.x, b.y - a.y) || 1, off = sk.riverWidth / 2 + 3.5;
        return { x: p.x - m * Math.abs((b.y - a.y) / d) * off, y: p.y };
    });
    // Where it would touch the water or a road the book rejects it.
    ctx.book.add({ id: 'riverside-walk', kind: 'footpath', width: 1.4, points: pts, label: 'Береговая прогулочная дорожка' });
}

/**
 * Turning area at every loose end of a street: an asphalt disc (drawn by world-surfaces) that houses and props keep clear of.
 * Two passes. `planTurnarounds` runs before houses and reserves the disc at the ends of real streets (not lanes and stubs shorter
 * than 40 m), so frontage keeps clear of them. `finishTurnarounds` runs when everything is placed and gives every remaining
 * loose end the largest disc that fits between the objects that stand there (never smaller than the road itself): a lane end
 * must not push apartment blocks out of a quarter. The radius is 4.2 m (3.4 m for lanes and links) at most.
 */
export function planTurnarounds(env: Env): void { env.layout.turnarounds = []; turnarounds(env, true); }
export function finishTurnarounds(env: Env): void { turnarounds(env, false); }

function turnarounds(env: Env, reserve: boolean): void {
    const { ctx, layout, half } = env;
    const list = layout.turnarounds ?? (layout.turnarounds = []);
    for (const road of layout.paths.filter(p => p.kind === 'road')) {
        if (/^turn-/.test(road.id)) continue;
        const major = road.hierarchy !== 'lane' && road.hierarchy !== 'link' && polylineLength(road.points) >= 40;
        if (reserve && !major) continue;
        for (const end of [road.points[0], road.points[road.points.length - 1]]) {
            if (Math.abs(end.x) > half - 12 || Math.abs(end.y) > half - 12) continue;
            if (layout.paths.some(o => o !== road && o.kind !== 'rail' && distanceToPath(end, o.points) < .6)) continue;
            if (list.some(t => Math.hypot(t.x - end.x, t.y - end.y) < 1.5)) continue;
            const wanted = road.hierarchy === 'lane' || road.hierarchy === 'link' ? 3.4 : 4.2, least = road.width / 2 + .4;
            let r = wanted;
            const blocked = (rr: number) => ctx.probe.distance(end, rr + 1) < rr + 1
                || ctx.index.some(end.x, end.y, rr + 32, o => Math.hypot(o.x - end.x, o.y - end.y) < o.radius + rr + .3)
                || layout.paths.some(o => o !== road && o.kind !== 'rail' && distanceToPath(end, o.points) < rr + o.width / 2 - .2 && distanceToPath(end, o.points) > .6);
            while (r > least && blocked(r)) r -= .4;
            r = Math.max(least, r);
            list.push({ x: end.x, y: end.y, r: +r.toFixed(2), roadId: road.id });
            if (reserve) ctx.reserved.push({ x: end.x, y: end.y, r: r + .5 });
        }
    }
}
