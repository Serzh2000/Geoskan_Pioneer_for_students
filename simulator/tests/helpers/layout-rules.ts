import { generateTrainingLayout } from '../../public/modules/environment/training/layout.js';
import { distanceToWater } from '../../public/modules/environment/training/world-plan.js';
import { distanceToPath } from '../../public/modules/environment/training/geography.js';

type Layout = ReturnType<typeof generateTrainingLayout>;
/** Every rule of the layout contract, checked with plain loops so a 600 m map with thousands of props stays fast. */
export function spacingViolations(layout: Layout): string[] {
    const out: string[] = [];
    const obstacles = layout.objects.filter(prop => prop.radius > 0);
    const reach = Math.ceil(2 * Math.max(0, ...obstacles.map(prop => prop.radius)) / 30) + 1;
    const order = new Map(obstacles.map((prop, i) => [prop, i]));
    const cell = 30, grid = new Map<string, typeof obstacles>();
    const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    for (const prop of obstacles) {
        if (Math.abs(prop.x) - prop.radius < layout.corridorHalfWidth) out.push(`corridor ${prop.type}`);
        if (Math.hypot(prop.x, prop.y) - prop.radius < 10) out.push(`start ${prop.type}`);
        if (Math.max(Math.abs(prop.x), Math.abs(prop.y)) + prop.radius > layout.size / 2 - 4) out.push(`edge ${prop.type}`);
        if (distanceToWater(layout, prop) < prop.radius + 2) out.push(`water ${prop.type}`);
        for (const path of layout.paths) {
            if (prop.type === 'station' && path.id === 'station-walk') continue;
            if (distanceToPath(prop, path.points) < prop.radius + path.width / 2 + .6 - 1e-9) out.push(`path ${prop.type} ${path.id}`);
        }
        const k = key(prop.x, prop.y);
        const bucket = grid.get(k); if (bucket) bucket.push(prop); else grid.set(k, [prop]);
    }
    for (const a of obstacles) {
        const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
        for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) for (const b of grid.get(`${cx + i},${cy + j}`) ?? []) {
            if (order.get(a)! >= order.get(b)!) continue;
            if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + .6 - 1e-9) out.push(`pair ${a.type} ${b.type}`);
        }
    }
    return out.slice(0, 8);
}

