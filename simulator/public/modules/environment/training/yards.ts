import { distanceToPath, insidePolygon, type Point2 } from './geography.js';
import { distanceToWater } from './world-plan.js';
import type { TrainingLayout, TrainingProp } from './layout.js';

/**
 * Двор дома: квадрат 9 x 9 м в системе координат дома (фасад к улице). Раньше рисовался всегда и целиком: на повёрнутых домах
 * угол двора (6.4 м от центра) заходил на проезжую часть, тротуар и на двор соседа - плоские слои наезжали друг на друга.
 * Теперь двор уменьшается ступенями, пока не перестанет пересекать дорогу, воду, соседние объекты и уже принятые дворы;
 * если и самый малый не помещается - двора нет (дом стоит на траве). Одна функция для рисования и для автоматического аудита.
 */
export type Yard = { prop: TrainingProp; owner: string; cx: number; cy: number; r: number; scale: number; poly: Point2[]; samples: Point2[] };

export const YARD_HALF = 4.5;
const SCALES = [1, .82, .66, .52];

function frame(prop: TrainingProp) {
    const r = prop.rotation ?? 0, c = Math.cos(r), s = Math.sin(r);
    return (lx: number, ly: number): Point2 => ({ x: prop.x + lx * c - ly * s, y: prop.y + lx * s + ly * c });
}

export function yardOf(prop: TrainingProp, scale: number): Yard {
    const at = frame(prop), h = YARD_HALF * scale;
    const poly = [at(-h, -h), at(h, -h), at(h, h), at(-h, h)];
    const samples: Point2[] = [];
    const n = 6;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) if (i === 0 || j === 0 || i === n || j === n || (i % 2 === 0 && j % 2 === 0)) samples.push(at(-h + 2 * h * i / n, -h + 2 * h * j / n));
    return { prop, owner: `house@${prop.x.toFixed(0)},${prop.y.toFixed(0)}`, cx: prop.x, cy: prop.y, r: h * Math.SQRT2, scale, poly, samples };
}

export function yardsOf(layout: TrainingLayout, fit = true): Yard[] {
    const out: Yard[] = [];
    if (!fit) return layout.objects.filter(p => p.type === 'house').map(p => yardOf(p, 1));
    const placed = new Map<string, Yard[]>(), cell = 24;
    const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const houses = layout.objects.filter(p => p.type === 'house');
    const solids = layout.objects.filter(p => p.radius > 0);
    for (const prop of houses) {
        const nearPaths = layout.paths.filter(p => distanceToPath(prop, p.points) < 14 + p.width / 2);
        const nearObjects = solids.filter(o => o !== prop && Math.hypot(o.x - prop.x, o.y - prop.y) < 12 + o.radius);
        const cx = Math.floor(prop.x / cell), cy = Math.floor(prop.y / cell);
        const neighbours: Yard[] = [];
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) neighbours.push(...placed.get(`${cx + dx},${cy + dy}`) ?? []);
        for (const scale of SCALES) {
            const yard = yardOf(prop, scale);
            const bad = yard.samples.some(c => nearPaths.some(p => distanceToPath(c, p.points) < p.width / 2 + .1)
                || nearObjects.some(o => Math.hypot(c.x - o.x, c.y - o.y) < o.radius - .2)
                || distanceToWater(layout, c) < .5)
                || neighbours.some(z => Math.hypot(z.cx - yard.cx, z.cy - yard.cy) < z.r + yard.r
                    && (yard.samples.some(c => insidePolygon(c, z.poly)) || z.samples.some(c => insidePolygon(c, yard.poly))));
            if (bad) continue;
            out.push(yard);
            const k = key(prop.x, prop.y); (placed.get(k) ?? placed.set(k, []).get(k)!).push(yard);
            break;
        }
    }
    return out;
}
