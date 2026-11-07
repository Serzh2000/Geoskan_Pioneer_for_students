/**
 * Автоматический аудит сгенерированной карты без браузера: только план (layout). Считает нарушения по группам G2 (геометрия плана),
 * G3 (размещение), G6 (разнообразие). Используется и тестом tests/map-generation-audit.test.ts, и tools/check-map-generation.mjs.
 */
import type { TrainingLayout, TrainingProp } from '../../public/modules/environment/training/layout.js';
import { distanceToPath, insidePolygon, nearestOnPath, segmentCrossing, type Point2 } from '../../public/modules/environment/training/geography.js';
import { distanceToWater } from '../../public/modules/environment/training/world-plan.js';
import { LESSON_BOX } from '../../public/modules/environment/training/road-network.js';
import { yardsOf } from '../../public/modules/environment/training/yards.js';
import { spacingViolations } from './layout-rules.js';
import { buildTerrain } from '../../public/modules/environment/training/terrain-mesh.js';

export type Violations = Record<string, string[]>;

const HOMES: TrainingProp['type'][] = ['house', 'building'];
const NEEDS_ROAD: TrainingProp['type'][] = ['house', 'building', 'school', 'hospital', 'church', 'fire-station', 'police-station', 'restaurant', 'mall', 'office', 'gas-station', 'warehouse', 'hangar', 'barn'];
const near = (a: Point2, b: Point2, d: number) => Math.hypot(a.x - b.x, a.y - b.y) < d;
const hasVertex = (points: Point2[], p: Point2, d = .6) => points.some(q => near(q, p, d));

function turnAngle(a: Point2, b: Point2, c: Point2): number {
    const u = Math.atan2(b.y - a.y, b.x - a.x), v = Math.atan2(c.y - b.y, c.x - b.x);
    let d = Math.abs(v - u); if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
}

/** G2: чистота плана. Дороги пересекаются только в вершинах обеих дорог, без изломов, двойного асфальта, торчащих концов. */
export function roadViolations(layout: TrainingLayout): Violations {
    const out: Violations = { crossing: [], selfCross: [], kink: [], tinySegment: [], doubleAsphalt: [], noTurnaround: [], water: [], lessonStrip: [], footpathFloating: [] };
    const half = layout.size / 2, roads = layout.paths.filter(p => p.kind === 'road');
    const solid = layout.paths.filter(p => p.kind === 'road');
    for (let a = 0; a < solid.length; a++) for (let b = a + 1; b < solid.length; b++) {
        const A = solid[a], B = solid[b];
        for (let i = 1; i < A.points.length; i++) for (let j = 1; j < B.points.length; j++) {
            const h = segmentCrossing(A.points[i - 1], A.points[i], B.points[j - 1], B.points[j]);
            if (h && !(hasVertex(A.points, h) && hasVertex(B.points, h))) out.crossing.push(`${A.id} x ${B.id} @${h.x.toFixed(0)},${h.y.toFixed(0)}`);
        }
    }
    for (const r of layout.paths) {
        if (r.kind === 'rail' || r.kind === 'runway') continue;
        const closed = near(r.points[0], r.points[r.points.length - 1], .01);
        for (let i = 1; i < r.points.length; i++) {
            const a = r.points[i - 1], b = r.points[i];
            if (Math.hypot(b.x - a.x, b.y - a.y) < .3) out.tinySegment.push(`${r.id}#${i}`);
            for (let j = i + 2; j < r.points.length; j++) {
                if (closed && i === 1 && j === r.points.length - 1) continue;
                if (segmentCrossing(a, b, r.points[j - 1], r.points[j])) out.selfCross.push(`${r.id} ${i}/${j}`);
            }
        }
        // Излом: поворот > 100 градусов в вершине, не являющейся перекрёстком (развороты кольца и ответвления не считаем).
        if (r.kind === 'road') for (let i = 1; i < r.points.length - 1; i++) {
            const turn = turnAngle(r.points[i - 1], r.points[i], r.points[i + 1]);
            const junction = roads.some(o => o !== r && hasVertex(o.points, r.points[i], .6));
            if (turn > Math.PI * .56 && !junction) out.kink.push(`${r.id}#${i} ${(turn * 180 / Math.PI).toFixed(0)}deg`);
        }
    }
    // Двойной асфальт: две дороги идут рядом так, что их полотна перекрываются на отрезке длиннее 6 м (вне перекрёстка).
    for (let a = 0; a < roads.length; a++) for (let b = a + 1; b < roads.length; b++) {
        const A = roads[a], B = roads[b];
        let run = 0, worst = 0;
        const total = A.points.reduce((t, q, i) => i ? t + Math.hypot(q.x - A.points[i - 1].x, q.y - A.points[i - 1].y) : 0, 0);
        let walked = 0;
        for (let i = 1; i < A.points.length; i++) {
            const p = A.points[i - 1], q = A.points[i], len = Math.hypot(q.x - p.x, q.y - p.y), steps = Math.max(1, Math.ceil(len / 1.5));
            for (let k = 0; k < steps; k++) {
                const s = { x: p.x + (q.x - p.x) * (k + .5) / steps, y: p.y + (q.y - p.y) * (k + .5) / steps };
                const along = walked + len * (k + .5) / steps;
                // The first and last 6 m of a road are where it joins the network (a shallow T-junction may run beside its host).
                if (along < 6 || along > total - 6) { run = 0; continue; }
                const hit = nearestOnPath(s, B.points), d = hit.distance, lim = (A.width + B.width) / 2 * .8;
                // Только параллельный ход (угол < 20 градусов): поперечный перекрёсток не двойной асфальт.
                const bb = B.points[hit.segment], bc = B.points[hit.segment + 1];
                const dot = Math.abs(((q.x - p.x) * (bc.x - bb.x) + (q.y - p.y) * (bc.y - bb.y)) / ((len || 1) * (Math.hypot(bc.x - bb.x, bc.y - bb.y) || 1)));
                if (d < lim && dot > .94) { run += len / steps; worst = Math.max(worst, run); } else run = 0;
            }
            walked += len;
        }
        if (worst > 8 && !(A.id.startsWith('turn-') || B.id.startsWith('turn-'))) out.doubleAsphalt.push(`${A.id} ~ ${B.id} ${worst.toFixed(0)} m`);
    }
    const turnarounds = layout.turnarounds ?? [];
    for (const r of roads) {
        for (const end of [r.points[0], r.points[r.points.length - 1]]) {
            if (Math.abs(end.x) > half - 12 || Math.abs(end.y) > half - 12) continue;
            const joined = layout.paths.some(o => o !== r && o.kind !== 'rail' && distanceToPath(end, o.points) < .6);
            if (joined) continue;
            if (/^turn-/.test(r.id)) continue;
            if (!turnarounds.some(t => near(t, end, 1.5))) out.noTurnaround.push(`${r.id} @${end.x.toFixed(0)},${end.y.toFixed(0)}`);
        }
    }
    // Тротуары и дорожки не висят в воздухе: оба конца у дороги/дорожки/воды, на краю карты или у станции/площади.
    for (const f of layout.paths.filter(p => p.kind === 'footpath')) {
        for (const end of [f.points[0], f.points[f.points.length - 1]]) {
            if (Math.abs(end.x) > half - 12 || Math.abs(end.y) > half - 12) continue;
            if (near(f.points[0], f.points[f.points.length - 1], .01)) continue;
            const joined = layout.paths.some(o => o !== f && o.kind !== 'rail' && distanceToPath(end, o.points) < o.width / 2 + f.width / 2 + 2.5) || distanceToWater(layout, end) < 8
                || layout.objects.some(o => o.type === 'station' && near(o, end, o.radius + 6));
            if (!joined) out.footpathFloating.push(`${f.id} @${end.x.toFixed(0)},${end.y.toFixed(0)}`);
        }
    }
    for (const p of layout.paths) {
        if (p.kind === 'runway') continue;
        for (let i = 1; i < p.points.length; i++) {
            const a = p.points[i - 1], b = p.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
            for (let k = 0; k <= steps; k++) {
                const s = { x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps };
                if (p.kind !== 'rail' && distanceToWater(layout, s) < .1 && !layout.bridges.some(br => br.pathId === p.id && near(br, s, br.length / 2 + 2))) { out.water.push(`${p.id}@${s.x.toFixed(0)},${s.y.toFixed(0)}`); k = steps; i = p.points.length; }
                if (p.kind !== 'rail' && s.x > LESSON_BOX.x0 && s.x < LESSON_BOX.x1 && s.y > LESSON_BOX.y0 && s.y < LESSON_BOX.y1 && !/^(lesson|walk-park)/.test(p.id)) { out.lessonStrip.push(`${p.id}@${s.x.toFixed(0)},${s.y.toFixed(0)}`); k = steps; i = p.points.length; }
            }
        }
    }
    return out;
}

/** Прямоугольник (двор) пересекает дорогу/дорожку, воду или чужой двор, дом или здание: плоские слои друг на друге. */
export function decalViolations(layout: TrainingLayout, fit = true): Violations {
    const out: Violations = { yardOnRoad: [], yardOverlap: [], yardOnObject: [] };
    const yards = yardsOf(layout, fit);
    const cell = 24, grid = new Map<string, number[]>();
    yards.forEach((y, i) => { const k = `${Math.floor(y.cx / cell)},${Math.floor(y.cy / cell)}`; (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); });
    for (const [i, y] of yards.entries()) {
        for (const c of y.samples) for (const path of layout.paths) {
            if (path.kind === 'rail' && distanceToPath(c, path.points) > path.width) continue;
            if (distanceToPath(c, path.points) < path.width / 2 + .05) { out.yardOnRoad.push(`${y.owner}->${path.id}`); break; }
        }
        for (const o of layout.objects) {
            if (o === y.prop || o.radius <= 0 || !near(o, { x: y.cx, y: y.cy }, 12 + o.radius)) continue;
            if (y.samples.some(c => near(c, o, o.radius - .2))) { out.yardOnObject.push(`${y.owner}->${o.type}`); break; }
        }
        const gx = Math.floor(y.cx / cell), gy = Math.floor(y.cy / cell);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
            if (j <= i) continue;
            const z = yards[j];
            if (Math.hypot(y.cx - z.cx, y.cy - z.cy) > y.r + z.r) continue;
            if (y.samples.some(c => insidePolygon(c, z.poly)) || z.samples.some(c => insidePolygon(c, y.poly))) out.yardOverlap.push(`${y.owner}~${z.owner}`);
        }
    }
    return out;
}

/** G3: размещение. Здания не пересекаются, у каждого есть выход к дороге, кварталы не пустуют и не набиты. */
export function placementViolations(layout: TrainingLayout): Violations {
    const out: Violations = { spacing: spacingViolations(layout), noRoad: [], emptyBlock: [], crowded: [], districtMissing: [], turnaroundBlocked: [] };
    const roads = layout.paths.filter(p => p.kind === 'road');
    for (const p of layout.objects) {
        if (!NEEDS_ROAD.includes(p.type)) continue;
        if (p.districtId?.includes('farm') || p.districtId?.includes('airfield')) continue;
        const best = roads.reduce((m, r) => Math.min(m, nearestOnPath(p, r.points).distance), Infinity);
        if (best > Math.max(30, p.radius + 22)) out.noRoad.push(`${p.type}@${p.x.toFixed(0)},${p.y.toFixed(0)} ${best.toFixed(0)} m`);
    }
    // Пустоты внутри застройки: окно 48x48 м внутри центра города/посёлка без объектов, дорог, воды, парка и учебной полосы.
    const settled = layout.districts.filter(d => d.kind === 'center' || d.kind === 'suburb');
    const win = 24, step = 12;
    for (const d of settled) {
        let holes = 0; const holeAt: string[] = [];
        // The outer 30 m of a district box is its fringe (woods, gardens), not a block: only the interior is checked.
        const fringe = win + 30;
        for (let x = d.x - d.width / 2 + fringe; x < d.x + d.width / 2 - fringe; x += step) for (let y = d.y - d.depth / 2 + fringe; y < d.y + d.depth / 2 - fringe; y += step) {
            if (Math.abs(x) < 20 || (x > LESSON_BOX.x0 - 24 && x < LESSON_BOX.x1 + 24 && y > LESSON_BOX.y0 - 24 && y < LESSON_BOX.y1 + 24)) continue;
            if (distanceToWater(layout, { x, y }) < win + 4) continue;
            if (layout.districts.some(o => (o.kind === 'park') && Math.abs(x - o.x) < o.width / 2 + win && Math.abs(y - o.y) < o.depth / 2 + win)) continue;
            if (layout.districts.some(o => (o.kind === 'industry' || o.kind === 'farmland' || o.kind === 'airfield') && Math.abs(x - o.x) < o.width / 2 + win && Math.abs(y - o.y) < o.depth / 2 + win)) continue;
            if (layout.objects.some(o => o.radius > 0 && Math.abs(o.x - x) < win + o.radius && Math.abs(o.y - y) < win + o.radius)) continue;
            if (layout.paths.some(p => p.kind !== 'rail' && distanceToPath({ x, y }, p.points) < win * .5)) continue;
            holes++; holeAt.push(`${x.toFixed(0)},${y.toFixed(0)}`);
        }
        if (holes > 0) out.emptyBlock.push(`${d.id}: ${holes} windows at ${holeAt.slice(0, 3).join(' ')}`);
    }
    // Нагромождение: слишком много зданий на 1000 м2 в центре посёлка.
    for (const d of settled) {
        const inside = layout.objects.filter(o => HOMES.includes(o.type) && Math.abs(o.x - d.x) < d.width / 2 && Math.abs(o.y - d.y) < d.depth / 2);
        const area = d.width * d.depth, density = inside.length / area * 1000;
        if (density > 4.5) out.crowded.push(`${d.id}: ${density.toFixed(1)} per 1000 m2`);
    }
    for (const t of layout.turnarounds ?? []) for (const o of layout.objects) if (o.radius > 0 && Math.hypot(o.x - t.x, o.y - t.y) < t.r + o.radius - .05) out.turnaroundBlocked.push(`${t.roadId}: ${o.type}@${o.x.toFixed(0)},${o.y.toFixed(0)}`);
    for (const p of layout.objects) if (HOMES.includes(p.type) && !p.districtId) out.districtMissing.push(`${p.type}@${p.x.toFixed(0)},${p.y.toFixed(0)}`);
    return out;
}

/** G6: «отпечаток» карты для сравнения seed между собой. */
export function fingerprint(layout: TrainingLayout) {
    const roads = layout.paths.filter(p => p.kind === 'road');
    const kinds = new Set(layout.districts.map(d => d.kind));
    const types: Record<string, number> = {};
    for (const o of layout.objects) types[o.type] = (types[o.type] ?? 0) + 1;
    const river = layout.water.find(w => w.kind === 'river');
    return {
        roads: roads.length, roadLength: Math.round(roads.reduce((s, r) => s + r.points.reduce((t, q, i) => i ? t + Math.hypot(q.x - r.points[i - 1].x, q.y - r.points[i - 1].y) : 0, 0), 0)),
        objects: layout.objects.length, homes: layout.objects.filter(o => HOMES.includes(o.type)).length, districts: layout.districts.length, kinds: [...kinds].sort().join(','),
        water: layout.water.length, riverX: Math.round(river ? river.points[16].x : 0), mirror: layout.mirror ?? 1, landforms: layout.landforms.length, types,
        topology: roads.map(r => `${r.hierarchy}:${r.points.length}`).sort().join('|')
    };
}

export function all(layout: TrainingLayout): Violations {
    return { ...roadViolations(layout), ...decalViolations(layout), ...placementViolations(layout), ...terrainViolations(layout) };
}

/**
 * G5: рельеф как ПОСТРОЕННЫЙ меш (треугольники сетки), а не формула trainingHeightAt: высота под каждой точкой дорог, дорожек и
 * разворотных кругов не выше 1.5 см над базовым уровнем, иначе склон перекрывает асфальт (разрыв/«ступенька» на стыке слоёв).
 */
export function terrainViolations(layout: TrainingLayout): Violations {
    const out: Violations = { terrainOverRoad: [], terrainEdge: [] };
    const mesh = buildTerrain(layout), pos = mesh.geometry.attributes.position, res = Math.round(Math.sqrt(pos.count)) - 1, half = layout.size / 2, step = layout.size / res;
    const z = (ix: number, iy: number) => pos.getZ(iy * (res + 1) + ix) - .006;
    const at = (x: number, y: number): number => {
        const ix = Math.max(0, Math.min(res - 1, Math.floor((x + half) / step))), iy = Math.max(0, Math.min(res - 1, Math.floor((half - y) / step)));
        const u = (x + half) / step - ix, v = (half - y) / step - iy;   // u to the east, v to the south; cell corners (ix,iy) NW .. (ix+1,iy+1) SE
        // three's PlaneGeometry: triangles (a,b,d) and (b,c,d) with a = NW, b = SW, c = SE, d = NE.
        const a = z(ix, iy), b = z(ix, iy + 1), c = z(ix + 1, iy + 1), d = z(ix + 1, iy);
        return u + v <= 1 ? a + (d - a) * u + (b - a) * v : c + (b - c) * (1 - u) + (d - c) * (1 - v);
    };
    for (const p of layout.paths) {
        if (p.kind === 'rail' || p.kind === 'runway') continue;
        for (let i = 1; i < p.points.length; i++) {
            const A = p.points[i - 1], B = p.points[i], n = Math.max(1, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 1.5));
            for (let k = 0; k <= n; k++) {
                const x = A.x + (B.x - A.x) * k / n, y = A.y + (B.y - A.y) * k / n, h = at(x, y);
                if (h > .015) { out.terrainOverRoad.push(`${p.id}@${x.toFixed(0)},${y.toFixed(0)} ${h.toFixed(2)} m`); k = n; i = p.points.length; }
            }
        }
    }
    for (let t = -half; t <= half; t += 10) for (const [x, y] of [[t, half], [t, -half], [half, t], [-half, t]]) if (Math.abs(at(x, y)) > 1e-6) { out.terrainEdge.push(`${x},${y}`); break; }
    mesh.geometry.dispose();
    return out;
}
