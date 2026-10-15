import { pointAtLength, polylineLength } from './geography.js';
import type { Ctx } from './world-context.js';
import type { Settlement } from './world-env.js';
import type { Landform } from './world-plan.js';

/*
 * Trees and small things between the buildings: park and street trees, gardens, woods of the seed's own shapes, rocks on the
 * hills, a water tower and greenhouses in a village. Planted last, within a budget, into whatever room the roads and houses left.
 */
export function plantWorld(ctx: Ctx, settlements: Settlement[], hills: Landform[]): void {
    const { layout, size, half, random } = ctx, profile = layout.profile, f = size / 600;
    const forest = profile === 'forest', budget = forest ? 1900 : profile === 'city' ? 950 : profile === 'hills' ? 800 : 850;
    const cut = Math.round(budget * (.6 + .8 * ctx.density) / 1.04 * Math.min(1.1, (size / 600) ** 2 + .05));
    let planted = 0;
    const tree = (x: number, y: number, deciduous: boolean, gap = .6): boolean => {
        const scale = 1.5 + random() * 1.8;
        if (!ctx.add({ type: 'tree', x, y, scale, radius: .65 * scale, variant: deciduous ? 1 : 0 }, gap)) return false;
        planted++; return true;
    };
    // Parks and squares: trees between the paths.
    for (const d of layout.districts.filter(q => q.kind === 'park')) {
        const n = Math.round(d.width * d.depth / 150);
        for (let i = 0; i < n; i++) tree(d.x + (random() - .5) * d.width, d.y + (random() - .5) * d.depth, random() < .75, 1.2);
    }
    // Street trees in towns, on the verge beside the pavement.
    for (const s of settlements) {
        for (const id of s.roads) {
            const road = layout.paths.find(p => p.id === id);
            if (!road || road.hierarchy === 'lane') continue;
            const walks = s.sidewalks.has(id), total = polylineLength(road.points), [s0, s1] = id === s.main && s.range ? s.range : [0, total];
            for (let pos = s0 + 6; pos < s1 - 4; pos += ctx.range(13, 20)) for (const side of [1, -1]) {
                if (random() < .5) continue;
                const { p, tangent } = pointAtLength(road.points, pos), off = road.width / 2 + (walks ? 2.4 : 0) + .6 + 1.1;
                tree(p.x - tangent.y * side * off, p.y + tangent.x * side * off, true, .5);
            }
        }
    }
    // Gardens: a tree for about every other house, behind it.
    for (const house of layout.objects.filter(p => p.type === 'house' && random() < .35)) {
        const back = { x: -Math.sin(house.rotation ?? 0), y: Math.cos(house.rotation ?? 0) }, side = random() < .5 ? 1 : -1;
        tree(house.x + back.x * 9.5 + back.y * side * 3 * 1.2, house.y + back.y * 9.5 - back.x * side * 3 * 1.2, random() < .6, .4);
    }
    // Woods: dense clumps (spruce and mixed) of the seed's own shapes, then a thin scatter; nothing on farm land or in town.
    const woods = Array.from({ length: forest ? 7 + Math.floor(random() * 3) : 3 + Math.floor(random() * 4) }, () => ({ x: ctx.range(-half + 20, half - 20), y: ctx.range(-half + 20, half - 20), rx: ctx.range(forest ? 45 : 26, forest ? 115 : 62), ry: ctx.range(forest ? 35 : 20, forest ? 85 : 48), a: random() * Math.PI }));
    const farmland = layout.districts.filter(d => d.kind === 'farmland' || d.kind === 'airfield' || d.kind === 'industry');
    const blocked = (x: number, y: number) => farmland.some(d => Math.abs(x - d.x) < d.width / 2 + 4 && Math.abs(y - d.y) < d.depth / 2 + 4)
        || settlements.some(s => x > s.box.x0 - 4 && x < s.box.x1 + 4 && y > s.box.y0 - 4 && y < s.box.y1 + 4);
    const reserve = Math.round(cut * .18);
    for (const w of woods) {
        const want = Math.round(Math.PI * w.rx * w.ry * (forest ? .0125 : .0095));
        const spruce = random() < (forest ? .65 : .5);
        for (let attempt = 0, got = 0; attempt < want * 4 && got < want && planted < cut - reserve; attempt++) {
            // Denser toward the middle of the clump.
            const r = Math.sqrt(random()) * (random() < .5 ? 1 : Math.sqrt(random())), t = random() * Math.PI * 2;
            const u = Math.cos(t) * r * w.rx, v = Math.sin(t) * r * w.ry;
            const x = w.x + u * Math.cos(w.a) - v * Math.sin(w.a), y = w.y + u * Math.sin(w.a) + v * Math.cos(w.a);
            if (Math.abs(x) > half - 8 || Math.abs(y) > half - 8 || blocked(x, y)) continue;
            if (tree(x, y, random() < (spruce ? .1 : .4))) got++;
        }
    }
    for (let attempt = 0; attempt < cut * 6 && planted < cut; attempt++) {
        const x = (random() - .5) * (size - 12), y = (random() - .5) * (size - 12);
        if (blocked(x, y)) continue;
        tree(x, y, random() < .3);
    }
    // Rocks on hills and in the woods; a water tower beside the biggest village.
    const rocks = profile === 'hills' ? 24 : profile === 'forest' ? 18 : profile === 'city' ? 8 : 10;
    for (let i = 0, put = 0; i < rocks * 12 && put < Math.round(rocks * Math.max(.6, f)); i++) {
        const h = hills.length && random() < .6 ? hills[Math.floor(random() * hills.length)] : null;
        const x = h ? h.x + (random() - .5) * h.radius * 1.4 : (random() - .5) * (size - 16), y = h ? h.y + (random() - .5) * h.radius * 1.4 : (random() - .5) * (size - 16);
        if (settlements.some(s => x > s.box.x0 && x < s.box.x1 && y > s.box.y0 && y < s.box.y1)) continue;
        if (ctx.add({ type: 'rocks', x, y, scale: .9 + random() * .3, radius: 4.2, rotation: random() * Math.PI * 2 }, .6)) put++;
    }
    const village = settlements.find(s => s.kind === 'village') ?? settlements[0];
    if (village) {
        for (let i = 0; i < 80; i++) {
            const x = village.box.x0 + random() * (village.box.x1 - village.box.x0) + (random() - .5) * 30, y = village.box.y0 + random() * (village.box.y1 - village.box.y0) + (random() - .5) * 30;
            if (ctx.add({ type: 'water-tower', x, y, scale: .75, radius: 2.2 }, .8)) break;
        }
    }
    // Greenhouses at the edge of a village: vegetable gardens.
    if (village && village.kind === 'village') for (let i = 0; i < 60; i++) {
        const x = village.box.x0 + random() * (village.box.x1 - village.box.x0), y = village.box.y0 + random() * (village.box.y1 - village.box.y0);
        if (ctx.add({ type: 'greenhouse', x, y, scale: 1, radius: 6.8, rotation: Math.floor(random() * 4) * Math.PI / 2 }, .8, districtOfVillage(village))) break;
    }
    function districtOfVillage(s: Settlement): string | undefined { return layout.districts.find(d => d.id === `district-${s.id}`)?.id; }

}
