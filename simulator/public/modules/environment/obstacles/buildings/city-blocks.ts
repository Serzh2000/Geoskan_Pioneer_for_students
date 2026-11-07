import * as THREE from 'three';
import { setCommonMeta } from '../utils.js';
import { attachFarProxy } from '../far-proxy.js';
import { BLOCK_SPECS, HOUSE_SPECS, ROOF_COLORS, type BlockSpec, type HouseSpec } from './city-specs.js';

/*
 * Жилые дома города, построенные кодом: цоколь, окна рядами с ритмом, дверь на уровне земли со ступенями и козырьком,
 * крыша с формой (плоская с парапетом, лифтовой шахтой, вентиляцией и антеннами, либо скатная с трубой).
 * Вся геометрия дома - три меша: фасад (цвет в вершинах), светящееся и тёмное стекло. Геометрия общая у одинаковых домов;
 * ночью окна "Окно" зажигает world/atmosphere.ts (по имени материала), "Стекло" остаётся тёмным.
 * Начало координат - центр основания на земле, Z вверх, фасад с входом смотрит в -Y.
 * Всё, что выступает от стены, не больше 0.2 м, кроме козырька и ступеней, а они записаны в `collisionBoxes`: физика
 * (physics/collisions.ts) проверяет дрон по этим коробкам, поэтому невидимых стен у скатной крыши нет.
 */
const PLINTH = .45;
const SKIRT = .25;
/** Свес щипца вдоль конька: до 0.2 м, чтобы коллайдер не уходил от видимой крыши дальше допуска. */
const GABLE_END = .18;

type Part = 'facade' | 'lit' | 'dark';
type Solid = [number, number, number, number, number, number];
type V3 = [number, number, number];

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s += 0x6d2b79f5; let t = Math.imul(s ^ s >>> 15, s | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const mix = (a: number, b: number, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), k);

class Mesher {
    data: Record<Part, { p: number[]; n: number[]; c: number[] }> = { facade: { p: [], n: [], c: [] }, lit: { p: [], n: [], c: [] }, dark: { p: [], n: [], c: [] } };
    solids: Solid[] = [];
    private tri(part: Part, color: THREE.Color, a: V3, b: V3, c: V3) {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        const d = this.data[part];
        for (const p of [a, b, c]) { d.p.push(p[0], p[1], p[2]); d.n.push(nx, ny, nz); d.c.push(color.r, color.g, color.b); }
    }
    /** Четырёхугольник; обход выбирается так, чтобы нормаль смотрела туда же, куда `hint`. */
    quad(part: Part, color: THREE.Color, a: V3, b: V3, c: V3, d: V3, hint: V3) {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const dot = (uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2];
        if (dot >= 0) { this.tri(part, color, a, b, c); this.tri(part, color, a, c, d); } else { this.tri(part, color, a, d, c); this.tri(part, color, a, c, b); }
    }
    triangle(part: Part, color: THREE.Color, a: V3, b: V3, c: V3, hint: V3) {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const dot = (uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2];
        if (dot >= 0) this.tri(part, color, a, b, c); else this.tri(part, color, a, c, b);
    }
    box(part: Part, color: THREE.Color, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, omit = '', solid = false) {
        const q = (a: V3, b: V3, c: V3, d: V3, h: V3) => this.quad(part, color, a, b, c, d, h);
        if (!omit.includes('+x')) q([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
        if (!omit.includes('-x')) q([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [-1, 0, 0]);
        if (!omit.includes('+y')) q([x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [0, 1, 0]);
        if (!omit.includes('-y')) q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
        if (!omit.includes('+z')) q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
        if (!omit.includes('-z')) q([x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [0, 0, -1]);
        if (solid) this.solids.push([x0, y0, z0, x1, y1, z1]);
    }
    solid(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) { this.solids.push([x0, y0, z0, x1, y1, z1]); }
    geometries(): Partial<Record<Part, THREE.BufferGeometry>> {
        const out: Partial<Record<Part, THREE.BufferGeometry>> = {};
        for (const part of Object.keys(this.data) as Part[]) {
            const d = this.data[part]; if (!d.p.length) continue;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3));
            g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
            g.computeBoundingBox(); g.computeBoundingSphere();
            out[part] = g;
        }
        return out;
    }
}

type Face = 'front' | 'back' | 'left' | 'right';
/** Коробка на грани: u вдоль стены слева направо (если смотреть на неё снаружи), d от стены наружу. */
function faceBox(m: Mesher, part: Part, color: THREE.Color, W: number, D: number, face: Face, u0: number, u1: number, z0: number, z1: number, d0: number, d1: number, solid = false) {
    if (face === 'front') m.box(part, color, -W / 2 + u0, -D / 2 - d1, z0, -W / 2 + u1, -D / 2 - d0, z1, '+y', solid);
    else if (face === 'back') m.box(part, color, W / 2 - u1, D / 2 + d0, z0, W / 2 - u0, D / 2 + d1, z1, '-y', solid);
    else if (face === 'left') m.box(part, color, -W / 2 - d1, D / 2 - u1, z0, -W / 2 - d0, D / 2 - u0, z1, '+x', solid);
    else m.box(part, color, W / 2 + d0, -D / 2 + u0, z0, W / 2 + d1, -D / 2 + u1, z1, '-x', solid);
}

interface WindowStyle { w: number; h: number; sill: number; mullion: 'v' | 'h' | 'none'; lintel?: boolean }
interface Palette { wall: THREE.Color; trim: THREE.Color; plinth: THREE.Color; roof: THREE.Color; door: THREE.Color; accent: THREE.Color; membrane: THREE.Color; metal: THREE.Color; brick: THREE.Color }
function palette(wall: number, roof: number): Palette {
    return { wall: new THREE.Color(wall), trim: mix(wall, 0xffffff, .5), plinth: mix(wall, 0x4a4a48, .55), roof: new THREE.Color(roof), door: new THREE.Color(0x2c3a45),
        accent: mix(wall, 0x38505f, .55), membrane: new THREE.Color(0x3b3f43), metal: new THREE.Color(0x8d949a), brick: new THREE.Color(0x8c4a38) };
}

function windows(m: Mesher, r: () => number, pal: Palette, W: number, D: number, face: Face, nBays: number, floors: number, floorH: number, ws: WindowStyle,
    lit: number, skipBay = -1, ground?: WindowStyle) {
    const len = face === 'front' || face === 'back' ? W : D, bay = len / nBays;
    for (let f = 0; f < floors; f++) {
        const zb = PLINTH + f * floorH, style = f === 0 && ground ? ground : ws;
        for (let b = 0; b < nBays; b++) {
            if (f === 0 && b === skipBay) continue;
            const cu = (b + .5) * bay, w = Math.min(style.w, bay - .5), x0 = cu - w / 2, x1 = cu + w / 2;
            const z0 = zb + style.sill, z1 = z0 + style.h, pane: Part = r() < lit ? 'lit' : 'dark';
            // Рама - коробка 6 см, стекло - ещё 3 см поверх: плоскости не совпадают, мерцания нет.
            faceBox(m, 'facade', pal.trim, W, D, face, x0 - .1, x1 + .1, z0 - .1, z1 + .1, 0, .06);
            faceBox(m, pane, pal.trim, W, D, face, x0, x1, z0, z1, .06, .09);
            if (style.mullion === 'v') faceBox(m, 'facade', pal.trim, W, D, face, cu - .03, cu + .03, z0, z1, .09, .115);
            if (style.mullion === 'h') faceBox(m, 'facade', pal.trim, W, D, face, x0, x1, z0 + style.h * .68, z0 + style.h * .68 + .06, .09, .115);
            faceBox(m, 'facade', pal.trim, W, D, face, x0 - .16, x1 + .16, z0 - .17, z0 - .1, 0, .16);
            if (style.lintel) faceBox(m, 'facade', pal.trim, W, D, face, x0 - .16, x1 + .16, z1 + .1, z1 + .24, 0, .1);
        }
    }
}

/** Входная дверь на уровне земли: три ступени от грунта до порога, наличник, дверь со стеклом, козырёк. */
function entrance(m: Mesher, pal: Palette, W: number, D: number, centre: number, doorW: number, doorH: number, canopyW: number, portal: boolean) {
    faceBox(m, 'facade', pal.trim, W, D, 'front', centre - doorW / 2 - .2, centre + doorW / 2 + .2, PLINTH, PLINTH + doorH + .2, 0, .08);
    faceBox(m, 'facade', pal.door, W, D, 'front', centre - doorW / 2, centre + doorW / 2, PLINTH, PLINTH + doorH, .08, .13);
    faceBox(m, 'dark', pal.door, W, D, 'front', centre - doorW / 2 + .12, centre + doorW / 2 - .12, PLINTH + doorH * .5, PLINTH + doorH - .12, .13, .15);
    faceBox(m, 'facade', pal.roof, W, D, 'front', centre - canopyW / 2, centre + canopyW / 2, PLINTH + doorH + .35, PLINTH + doorH + .5, 0, 1.3, true);
    if (portal) for (const s of [-1, 1]) faceBox(m, 'facade', pal.trim, W, D, 'front', centre + s * (canopyW / 2 - .15) - .1, centre + s * (canopyW / 2 - .15) + .1, 0, PLINTH + doorH + .35, 1.1, 1.3, true);
    for (let i = 0; i < 3; i++) faceBox(m, 'facade', pal.plinth, W, D, 'front', centre - doorW / 2 - .35, centre + doorW / 2 + .35, -SKIRT, .15 * (i + 1), .35 * (2 - i), .35 * (3 - i), true);
}

/** Плоская крыша: парапет, плёнка, лифтовая шахта, вентиляция, антенны. Всё твёрдое попадает в коллайдер. */
function flatRoof(m: Mesher, r: () => number, pal: Palette, W: number, D: number, top: number, machine: boolean, overhang = 0) {
    const t = .25, ph = .6, hw = W / 2 + overhang, hd = D / 2 + overhang;
    if (overhang) m.box('facade', pal.trim, -hw, -hd, top, hw, hd, top + .3, '', true);
    const base = top + (overhang ? .3 : 0);
    m.box('facade', pal.trim, -hw - .05, -hd - .05, base, hw + .05, -hd + t, base + ph, '', true);
    m.box('facade', pal.trim, -hw - .05, hd - t, base, hw + .05, hd + .05, base + ph, '', true);
    m.box('facade', pal.trim, -hw - .05, -hd + t, base, -hw + t, hd - t, base + ph, '', true);
    m.box('facade', pal.trim, hw - t, -hd + t, base, hw + .05, hd - t, base + ph, '', true);
    m.quad('facade', pal.membrane, [-hw + t, -hd + t, base + .05], [hw - t, -hd + t, base + .05], [hw - t, hd - t, base + .05], [-hw + t, hd - t, base + .05], [0, 0, 1]);
    const free = (x: number, y: number, hx: number, hy: number) => Math.abs(x) + hx < W / 2 - .6 && Math.abs(y) + hy < D / 2 - .6;
    if (machine) {
        const sx = (r() - .5) * W * .3, sy = (r() - .5) * D * .25;
        m.box('facade', pal.wall, sx - 1.5, sy - 1.3, base + .05, sx + 1.5, sy + 1.3, base + 2.75, '', true);
        m.box('facade', pal.membrane, sx - 1.6, sy - 1.4, base + 2.75, sx + 1.6, sy + 1.4, base + 2.9, '', true);
        m.box('dark', pal.door, sx - .5, sy - 1.3 - .03, base + .05, sx + .5, sy - 1.3, base + 2.0, '+y');
    }
    const vents = 3 + Math.floor(r() * 3);
    for (let i = 0; i < vents; i++) {
        const x = (r() - .5) * (W - 3), y = (r() - .5) * (D - 3);
        if (machine && Math.abs(x) < 3.5 && Math.abs(y) < 3) continue;
        if (!free(x, y, .45, .45)) continue;
        m.box('facade', pal.metal, x - .4, y - .4, base + .05, x + .4, y + .4, base + .75, '', true);
        m.box('facade', pal.membrane, x - .5, y - .5, base + .75, x + .5, y + .5, base + .85, '', true);
    }
    for (let i = 0; i < 2; i++) {
        const x = (i ? 1 : -1) * W * (.28 + r() * .1), y = (r() - .5) * D * .5;
        m.box('facade', pal.metal, x - .04, y - .04, base + .05, x + .04, y + .04, base + 3.2 + r(), '', true);
        m.box('facade', pal.metal, x - .22, y - .02, base + 2.5, x + .22, y + .02, base + 2.56, '');
    }
    m.box('facade', pal.brick, W * .3 - .3, -D * .3 - .3, base + .05, W * .3 + .3, -D * .3 + .3, base + 1.5, '', true);
}

/** Вальмовая крыша на коробке со сторонами 2*hx, 2*hy (с учётом свеса); конёк вдоль длинной стороны. */
function hipRoof(m: Mesher, pal: Palette, hx: number, hy: number, z: number, h: number) {
    const half = Math.min(hx, hy), rx = hx - half, ry = hy - half;
    const A: V3 = [-hx, -hy, z], B: V3 = [hx, -hy, z], C: V3 = [hx, hy, z], Dd: V3 = [-hx, hy, z];
    const r0: V3 = [-rx, -ry, z + h], r1: V3 = [rx, -ry, z + h], r2: V3 = [rx, ry, z + h], r3: V3 = [-rx, ry, z + h];
    m.quad('facade', pal.roof, A, B, r1, r0, [0, -1, .6]);
    m.quad('facade', pal.roof, C, Dd, r3, r2, [0, 1, .6]);
    m.quad('facade', pal.roof, Dd, A, r0, r3, [-1, 0, .6]);
    m.quad('facade', pal.roof, B, C, r2, r1, [1, 0, .6]);
    m.quad('facade', pal.membrane, A, B, C, Dd, [0, 0, -1]);
}

/** Двускатная крыша; `alongX`: конёк вдоль X (скаты к фасаду и к тыльной стороне), иначе вдоль Y (к фасаду обращён щипец). */
function gableRoof(m: Mesher, pal: Palette, W: number, D: number, oh: number, z: number, h: number, alongX: boolean) {
    const L = alongX ? W : D, S = alongX ? D : W, hl = L / 2 + GABLE_END, hs = S / 2 + oh, ze = z - oh * h / (S / 2);
    const P = (l: number, s: number, zz: number): V3 => alongX ? [l, s, zz] : [s, l, zz];
    const n = (s: number): V3 => alongX ? [0, s, .6] : [s, 0, .6];
    for (const s of [-1, 1]) m.quad('facade', pal.roof, P(-hl, s * hs, ze), P(hl, s * hs, ze), P(hl, 0, z + h), P(-hl, 0, z + h), n(s));
    m.quad('facade', pal.membrane, P(-hl, -hs, ze), P(hl, -hs, ze), P(hl, hs, ze), P(-hl, hs, ze), [0, 0, -1]);
    for (const e of [-1, 1]) m.triangle('facade', pal.wall, P(e * L / 2, -S / 2, z), P(e * L / 2, S / 2, z), P(e * L / 2, 0, z + h), alongX ? [e, 0, 0] : [0, e, 0]);
    // Стык верхних кромок скатов - конёк-коробка 8 см: закрывает щель.
    if (alongX) m.box('facade', pal.membrane, -hl, -.06, z + h - .04, hl, .06, z + h + .05); else m.box('facade', pal.membrane, -.06, -hl, z + h - .04, .06, hl, z + h + .05);
}

interface Built { geometries: Partial<Record<Part, THREE.BufferGeometry>>; solids: Solid[]; height: number; tint: number }

function buildBlock(spec: BlockSpec, floors: number, wallHex: number, seed: number): Built {
    const r = rng(seed), m = new Mesher(), { width: W, depth: D, floorHeight: fh, style } = spec;
    const roofHex = style === 'brick' ? ROOF_COLORS[seed % ROOF_COLORS.length] : style === 'stalin' ? 0x56695a : style === 'modern' ? 0x5a6068 : style === 'tower' ? 0x50565c : 0x4a4f54;
    const pal = palette(wallHex, roofHex), top = PLINTH + floors * fh;
    m.box('facade', pal.wall, -W / 2, -D / 2, -SKIRT, W / 2, D / 2, top, '-z', true);
    m.box('facade', pal.plinth, -W / 2 - .06, -D / 2 - .06, -SKIRT, W / 2 + .06, D / 2 + .06, PLINTH, '-z');
    const nB = Math.max(2, Math.round(W / 3)), skip = nB >> 1, bay = W / nB, centre = (skip + .5) * bay;
    const ws: WindowStyle = style === 'panel' ? { w: 1.5, h: 1.5, sill: .95, mullion: 'v' } : style === 'brick' ? { w: 1.2, h: 1.7, sill: .85, mullion: 'h', lintel: true }
        : style === 'modern' ? { w: 2.7, h: 1.9, sill: .7, mullion: 'none' } : style === 'stalin' ? { w: 1.3, h: 2.1, sill: .8, mullion: 'h', lintel: true } : { w: 1.4, h: 1.5, sill: .95, mullion: 'v' };
    const shop: WindowStyle | undefined = style === 'modern' ? { w: 2.7, h: 2.4, sill: .15, mullion: 'none' } : undefined;
    const lit = .32 + r() * .2;
    windows(m, r, pal, W, D, 'front', nB, floors, fh, ws, lit, skip, shop);
    windows(m, r, pal, W, D, 'back', nB, floors, fh, ws, lit, -1, shop);
    const sideBays = style === 'panel' ? 1 : Math.max(1, Math.floor(D / 3.2));
    for (const face of ['left', 'right'] as Face[]) windows(m, r, pal, W, D, face, sideBays, floors, fh, style === 'panel' ? { ...ws, w: 1.0 } : ws, lit);
    // Лоджии панельного и кирпичного дома: ограждение и плита перекрытия, выступ не больше 0.15 м.
    if (style === 'panel' || style === 'brick' || style === 'tower') for (const face of ['front', 'back'] as Face[]) for (let f = 1; f < floors; f++) for (let b = 0; b < nB; b += 2) {
        if (face === 'front' && b === skip) continue;
        const cu = (b + .5) * bay, zb = PLINTH + f * fh;
        faceBox(m, 'facade', pal.trim, W, D, face, cu - 1.05, cu + 1.05, zb - .02, zb + .1, 0, .15);
        faceBox(m, 'facade', pal.accent, W, D, face, cu - 1.05, cu + 1.05, zb + .1, zb + .55, 0, .12);
    }
    // Пояски между этажами и угловые пилястры.
    if (style !== 'panel') for (let f = 1; f <= floors; f++) {
        const z = PLINTH + f * fh;
        if (style === 'tower' && f === floors) continue;
        m.box('facade', style === 'modern' ? pal.accent : pal.trim, -W / 2 - .06, -D / 2 - .06, z - .12, W / 2 + .06, D / 2 + .06, z + .08, '-z');
    }
    if (style === 'tower') for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const xa = sx * W / 2 - sx * .3, xb = sx * W / 2 + sx * .08, ya = sy * D / 2 - sy * .3, yb = sy * D / 2 + sy * .08;
        m.box('facade', pal.accent, Math.min(xa, xb), Math.min(ya, yb), PLINTH, Math.max(xa, xb), Math.max(ya, yb), top, '');
    }
    // Цокольные продухи.
    if (style !== 'modern') for (let b = 0; b < nB; b++) if (b !== skip) {
        const cu = (b + .5) * bay;
        faceBox(m, 'dark', pal.door, W, D, 'front', cu - .4, cu + .4, .15, .38, .0, .08);
        faceBox(m, 'dark', pal.door, W, D, 'back', cu - .4, cu + .4, .15, .38, .0, .08);
    }
    entrance(m, pal, W, D, centre, 1.5, 2.2, style === 'stalin' || style === 'modern' ? 3.4 : 2.6, style === 'stalin' || style === 'tower');
    let height: number;
    if (style === 'brick' || style === 'stalin') {
        const oh = .6, h = Math.min(W, D) * (style === 'stalin' ? .24 : .3), half = Math.min(W, D) / 2;
        m.box('facade', pal.trim, -W / 2 - .15, -D / 2 - .15, top - .2, W / 2 + .15, D / 2 + .15, top, '-z', true);
        hipRoof(m, pal, W / 2 + oh, D / 2 + oh, top, h);
        for (let i = 0, n = Math.ceil(h / .18); i < n; i++) { const t = i / n, k = t * (half + oh); m.solid(-W / 2 - oh + k, -D / 2 - oh + k, top + t * h, W / 2 + oh - k, D / 2 + oh - k, top + (i + 1) / n * h); }
        m.box('facade', pal.brick, W * .22 - .35, -.35, top + h * .5, W * .22 + .35, .35, top + h + 1.1, '', true);
        height = top + h + 1.1;
    } else { flatRoof(m, r, pal, W, D, top, true, style === 'modern' ? .4 : 0); height = top + 4; }
    return { geometries: m.geometries(), solids: m.solids, height, tint: wallHex };
}

function buildHouse(spec: HouseSpec, wallHex: number, roofHex: number, seed: number): Built {
    const r = rng(seed), m = new Mesher(), { width: W, depth: D, floors, style } = spec, fh = 2.8;
    const pal = palette(wallHex, roofHex), top = PLINTH + floors * fh;
    m.box('facade', pal.wall, -W / 2, -D / 2, -SKIRT, W / 2, D / 2, top, '-z', true);
    m.box('facade', pal.plinth, -W / 2 - .05, -D / 2 - .05, -SKIRT, W / 2 + .05, D / 2 + .05, PLINTH, '-z');
    const big = style === 'flat';
    const ws: WindowStyle = big ? { w: 1.8, h: 1.5, sill: .8, mullion: 'none' } : { w: 1.0, h: 1.2, sill: .9, mullion: style === 'two-storey' ? 'v' : 'h', lintel: style === 'hip' };
    const lit = .4;
    // Фасад: дверь в одной из трёх ячеек, остальные - окна; бока и тыл по одному-два окна на этаж.
    const nB = 3, skip = style === 'hip' ? 1 : Math.floor(r() * 3), bay = W / nB, centre = (skip + .5) * bay;
    windows(m, r, pal, W, D, 'front', nB, floors, fh, ws, lit, skip);
    windows(m, r, pal, W, D, 'back', 2, floors, fh, ws, lit);
    for (const face of ['left', 'right'] as Face[]) windows(m, r, pal, W, D, face, 2, floors, fh, ws, lit);
    entrance(m, pal, W, D, centre, 1.0, 2.05, 1.9, false);
    let height: number;
    if (style === 'flat') { flatRoof(m, r, pal, W, D, top, false, .0); height = top + 1.2; }
    else if (style === 'hip') {
        const oh = .35, h = 1.5, half = Math.min(W, D) / 2;
        hipRoof(m, pal, W / 2 + oh, D / 2 + oh, top, h);
        for (let i = 0, n = Math.ceil(h / .18); i < n; i++) { const t = i / n, k = t * (half + oh); m.solid(-W / 2 - oh + k, -D / 2 - oh + k, top + t * h, W / 2 + oh - k, D / 2 + oh - k, top + (i + 1) / n * h); }
        height = top + h;
    } else {
        const oh = .35, h = style === 'two-storey' ? 1.7 : 1.9, alongX = style === 'gable';
        gableRoof(m, pal, W, D, oh, top, h, alongX);
        // Коллайдер ската: слои по высоте, ширина слоя - сечение крыши на этой высоте.
        const S = alongX ? D : W, L = alongX ? W : D;
        // Свес карниза: две ступени (ошибка до 0.13 м), затем слои ската, ширина слоя - сечение крыши на его высоте.
        const drop = oh * h / (S / 2), hl = L / 2 + GABLE_END, put = (hs: number, z0: number, z1: number) => alongX ? m.solid(-hl, -hs, z0, hl, hs, z1) : m.solid(-hs, -hl, z0, hs, hl, z1);
        put(S / 2 + oh, top - drop, top - drop / 2); put(S / 2 + oh / 2, top - drop, top);
        for (let i = 0, n = Math.ceil(h / .18); i < n; i++) put(S / 2 * (1 - i / n), top + i / n * h, top + (i + 1) / n * h);
        const cx = alongX ? W * .22 : 0, cy = alongX ? 0 : D * .22;
        m.box('facade', pal.brick, cx - .3, cy - .3, top + h * .35, cx + .3, cy + .3, top + h + .8, '', true);
        height = top + h + .8;
    }
    return { geometries: m.geometries(), solids: m.solids, height, tint: wallHex };
}

const cache = new Map<string, Built>();
function cached(key: string, build: () => Built): Built {
    let built = cache.get(key);
    if (!built) { built = build(); cache.set(key, built); }
    return built;
}

function assemble(label: string, radius: number, built: Built, extra: Record<string, unknown>): THREE.Group {
    const group = setCommonMeta(new THREE.Group(), label, { collidableRadius: radius, collisionBoxes: built.solids, buildingHeight: built.height, ...extra });
    const materials: Record<Part, THREE.MeshStandardMaterial> = {
        facade: new THREE.MeshStandardMaterial({ name: 'Фасад', vertexColors: true, roughness: .92, metalness: 0 }),
        lit: new THREE.MeshStandardMaterial({ name: 'Окно', color: 0x2f4a58, roughness: .2, metalness: .3 }),
        dark: new THREE.MeshStandardMaterial({ name: 'Стекло', color: 0x1f3340, roughness: .2, metalness: .3 })
    };
    for (const part of Object.keys(built.geometries) as Part[]) {
        const mesh = new THREE.Mesh(built.geometries[part]!, materials[part]);
        mesh.name = part === 'facade' ? 'Фасад' : part === 'lit' ? 'Окна' : 'Стёкла';
        mesh.castShadow = part === 'facade'; mesh.receiveShadow = true; mesh.userData.batchedShell = true;
        group.add(mesh);
    }
    attachFarProxy(group, { color: built.tint, amount: .85 });
    return group;
}

/** Многоквартирный дом: вариант = стиль из BLOCK_SPECS, этажи ограничены диапазоном стиля. Детерминирован по (вариант, этажи, цвет, seed). */
export function createCityBlockMesh(options: { variant?: number; floors?: number; color?: number; seed?: number } = {}): THREE.Group {
    const spec = BLOCK_SPECS[Math.abs(Math.trunc(options.variant ?? 0)) % BLOCK_SPECS.length];
    const floors = Math.round(Math.min(spec.maxFloors, Math.max(spec.minFloors, options.floors ?? spec.minFloors)));
    const color = options.color ?? spec.palette[0], seed = (options.seed ?? 1) >>> 0;
    const built = cached(`b:${spec.style}:${floors}:${color}:${seed}`, () => buildBlock(spec, floors, color, seed));
    return assemble(spec.label, spec.radius, built, { floors, bodyColor: color, buildingStyle: spec.style, footprint: [spec.width, spec.depth] });
}

/** Частный дом: вариант = стиль из HOUSE_SPECS. */
export function createCityHouseMesh(options: { variant?: number; color?: number; roofColor?: number; seed?: number } = {}): THREE.Group {
    const spec = HOUSE_SPECS[Math.abs(Math.trunc(options.variant ?? 0)) % HOUSE_SPECS.length];
    const color = options.color ?? spec.palette[0], roof = options.roofColor ?? ROOF_COLORS[0], seed = (options.seed ?? 1) >>> 0;
    const built = cached(`h:${spec.style}:${color}:${roof}:${seed}`, () => buildHouse(spec, color, roof, seed));
    return assemble(spec.label, spec.radius, built, { floors: spec.floors, bodyColor: color, buildingStyle: spec.style, footprint: [spec.width, spec.depth] });
}
