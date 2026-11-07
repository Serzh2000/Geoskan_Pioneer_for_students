import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* Размеры, наряды и сборка геометрии людей (цвета запечены в вершины, материал общий). Подробности — в actors.ts. */
export type Role = 'civilian' | 'firefighter' | 'police' | 'worker' | 'thief' | 'fighter';
// ------------------------------------------------------------------ размеры (стоя, метры, ступни на z = 0)
export const HEIGHT = 1.75, HEAD = HEIGHT / 7.5;
export const HIP_Z = .82, THIGH = .41, SHIN = .33;           // ноги = 47% роста
export const HIP_Y = .095, SHOULDER_Y = .205, SHOULDER_Z = 1.43, UPPER_ARM = .29, FOREARM = .25;
export const FOOT_R = .045, HEEL_X = -.015, TOE_X = .135, FOOT_CZ = -.035;   // стопа: капсула вдоль X

// ------------------------------------------------------------------ сборка геометрии с запечёнными цветами
export const tint = (g: THREE.BufferGeometry, hex: number) => {
    const c = new THREE.Color(hex), n = g.getAttribute('position').count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
};
/** Эллипсоид с осью Z вверх. */
export const ell = (rx: number, ry: number, rz: number, x: number, y: number, z: number, hex: number, w = 10, h = 6) =>
    tint(new THREE.SphereGeometry(1, w, h).rotateX(Math.PI / 2).scale(rx, ry, rz).translate(x, y, z), hex);
/** Капсула вдоль Z: полная длина `len`, радиус r. */
const cap = (r: number, len: number, x: number, y: number, z: number, hex: number, sx = 1, sy = 1) =>
    tint(new THREE.CapsuleGeometry(r, Math.max(0, len - 2 * r), 2, 8).rotateX(Math.PI / 2).scale(sx, sy, 1).translate(x, y, z), hex);
/** Эллиптический цилиндр с осью Z. */
const cyl = (rx: number, ry: number, h: number, x: number, y: number, z: number, hex: number, seg = 12) =>
    tint(new THREE.CylinderGeometry(1, 1, h, seg).rotateX(Math.PI / 2).scale(rx, ry, 1).translate(x, y, z), hex);
export const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, hex: number) =>
    tint(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), hex);
/** Купол (верхняя часть сферы) для шапок и волос; `tilt` — наклон назад/вперёд. */
const dome = (rx: number, ry: number, rz: number, x: number, y: number, z: number, hex: number, theta = Math.PI / 2, tilt = 0) =>
    tint(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, theta).rotateX(Math.PI / 2).rotateY(tilt).scale(rx, ry, rz).translate(x, y, z), hex);

export const merged = (list: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(list, false)!; list.forEach(p => p.dispose()); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
};

// ------------------------------------------------------------------ наряды
type Hat = 'helmet' | 'hardhat' | 'police' | 'ballcap' | 'mask' | null;
type Hair = 'bald' | 'short' | 'buzz' | 'long' | 'pony' | 'bun';
type Gear = 'none' | 'fire' | 'police' | 'worker' | 'thief';
export type Outfit = {
    skin: number; shirt: number; longSleeves: boolean; pants: number; shorts: boolean; shoes: number; boots: boolean; glove: number | null;
    hair: number; style: Hair; hat: Hat; hatColor: number; gear: Gear; backpack: number | null; girth: number; stature: number;
};
const SKIN = [0xf1cba6, 0xe0ac81, 0xc68a5e, 0xa5673f, 0x7d4a2d, 0xf5d6bd];
const HAIR = [0x1c1612, 0x3a2616, 0x6b4423, 0xb98a4a, 0x8a8a8a, 0x8b2f1a, 0xd9c27a];
const SHIRTS = [0x3b82c4, 0xc4503b, 0x4aa56a, 0xd9a521, 0x8c6bb8, 0xe9e4d8, 0x2f9aa3, 0xd36b9a, 0x6b7a3a, 0x9aa3ad];
const PANTS = [0x2d3a5a, 0x23262d, 0x8a7a5a, 0x555b66, 0x3a4a3a, 0x5a3f2e];
const SHOES = [0x1b1b1f, 0xe8e8e8, 0x6b4a2f, 0xb03a2e, 0x2a4a8a];
const STYLES: Hair[] = ['short', 'buzz', 'long', 'pony', 'bun', 'bald', 'short'];

export const hashSeed = (seed: number) => {
    let h = Math.imul((Math.floor(seed * 1000) | 0) ^ 0x9e3779b9, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
};
const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const POOL = 29;       // простое: соседние seed всегда дают разные наряды
let civilianPool: Outfit[] | null = null;
const civilians = () => {
    if (civilianPool) return civilianPool;
    const r = rng(20260711), pick = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)];
    civilianPool = [];
    for (let i = 0; i < POOL; i++) {
        const shirt = SHIRTS[i % SHIRTS.length], pants = PANTS[(i * 5 + Math.floor(r() * 3)) % PANTS.length];
        const hatRoll = r();
        civilianPool.push({
            skin: pick(SKIN), shirt, longSleeves: r() < .45, pants, shorts: r() < .15, shoes: pick(SHOES), boots: false, glove: null,
            hair: pick(HAIR), style: pick(STYLES), hat: hatRoll < .18 ? 'ballcap' : null, hatColor: pick(SHIRTS),
            gear: 'none', backpack: r() < .3 ? pick(SHIRTS) : null, girth: .9 + r() * .3, stature: .95 + r() * .1
        });
    }
    return civilianPool;
};

const ROLE_OUTFIT: Record<Exclude<Role, 'civilian' | 'fighter'>, Partial<Outfit>> = {
    firefighter: { shirt: 0xcf2e22, longSleeves: true, pants: 0x1f232b, shoes: 0x14141a, boots: true, glove: 0x2a2a2e, hat: 'helmet', hatColor: 0xd7351f, gear: 'fire' },
    police: { shirt: 0x1f3a6e, longSleeves: true, pants: 0x151d33, shoes: 0x0e0e12, boots: true, glove: null, hat: 'police', hatColor: 0x1b2c55, gear: 'police' },
    worker: { shirt: 0x4b5a72, longSleeves: true, pants: 0x3a4250, shoes: 0x5a4630, boots: true, glove: 0xe0b020, hat: 'hardhat', hatColor: 0xffd21a, gear: 'worker' },
    thief: { shirt: 0x15171b, longSleeves: true, pants: 0x181a1f, shoes: 0x0e0e10, boots: false, glove: 0x15171b, hat: 'mask', hatColor: 0x15171b, gear: 'thief', hair: 0x15171b }
};

export const outfitFor = (role: Role, seed: number): Outfit => {
    const h = hashSeed(seed), r = rng(h);
    const idx = (((Math.round(seed * 997) * 7) % POOL) + POOL) % POOL;
    const base = { ...civilians()[idx] };
    if (role === 'civilian') return base;
    if (role === 'fighter') {     // гражданская одежда, но с контрастными футболками и короткими рукавами
        base.longSleeves = false; base.shorts = false; base.hat = null; base.backpack = null;
        base.shirt = [0xd23b3b, 0x2f6fd0, 0x1f1f24, 0xe8e8e8, 0xe3a21a][idx % 5];
        return base;
    }
    const o = { ...base, ...ROLE_OUTFIT[role], shorts: false, backpack: null, style: 'short' as Hair };
    o.skin = SKIN[Math.floor(r() * SKIN.length)];
    if (role !== 'thief') o.hair = HAIR[Math.floor(r() * 5)];
    o.girth = .94 + r() * .14; o.stature = .97 + r() * .06;
    return o;
};

export type Parts = { torso: THREE.BufferGeometry; thigh: THREE.BufferGeometry; shin: THREE.BufferGeometry; foot: THREE.BufferGeometry; upperArm: THREE.BufferGeometry; foreArm: THREE.BufferGeometry };
export const partsCache = new Map<string, Parts>();
export const keyOf = (o: Outfit, skinOnly = false) => JSON.stringify([o.skin, o.shirt, o.longSleeves, o.pants, o.shorts, o.shoes, o.boots, o.glove, o.hair, o.style, o.hat, o.hatColor, o.gear, o.backpack, skinOnly]);

export function buildParts(o: Outfit): Parts {
    const mask = o.hat === 'mask', skinHead = mask ? o.shirt : o.skin;
    const hz = HEIGHT - HEAD / 2;                       // центр головы
    const t: THREE.BufferGeometry[] = [];
    // таз и торс: плечи шире бёдер, талия уже груди
    t.push(ell(.115, .17, .11, 0, 0, .88, o.pants), ell(.105, .15, .17, 0, 0, 1.07, o.shirt), ell(.125, .19, .2, 0, 0, 1.28, o.shirt), ell(.085, .205, .07, 0, 0, 1.41, o.shirt));
    t.push(cyl(.047, .047, .12, 0, 0, 1.5, skinHead, 10));
    // голова
    t.push(ell(.105, .092, HEAD / 2, 0, 0, hz, skinHead, 14, 10));
    if (!mask) {
        t.push(ell(.02, .013, .02, .104, 0, hz - .012, o.skin, 8, 6));                                // нос — «перёд» читается с высоты
        t.push(ell(.012, .01, .026, 0, .094, hz, o.skin, 6, 5), ell(.012, .01, .026, 0, -.094, hz, o.skin, 6, 5));
        t.push(ell(.011, .011, .011, .098, .035, hz + .02, 0x15151a, 6, 5), ell(.011, .011, .011, .098, -.035, hz + .02, 0x15151a, 6, 5));
    } else {
        t.push(ell(.109, .097, HEAD / 2 + .004, 0, 0, hz, o.shirt), box(.012, .075, .022, .098, 0, hz + .018, o.skin));
    }
    const hairOk = !o.hat || o.hat === 'ballcap';
    if (hairOk && o.style !== 'bald') {
        const k = o.style === 'buzz' ? 1.03 : 1.075;
        t.push(dome(.105 * k, .092 * k, .1165 * k, -.012, 0, hz + .002, o.hair, 1.85, -.35));
        if (o.style === 'long') t.push(ell(.05, .1, .13, -.082, 0, hz - .06, o.hair));
        if (o.style === 'pony') t.push(cap(.03, .2, -.12, 0, hz - .06, o.hair, 1, 1));
        if (o.style === 'bun') t.push(ell(.045, .045, .045, -.075, 0, hz + .09, o.hair, 8, 6));
    }
    if (o.hat === 'helmet') {
        t.push(dome(.125, .115, .1, -.004, 0, hz + .02, o.hatColor, Math.PI / 2), ell(.145, .125, .02, -.05, 0, hz + .018, o.hatColor), ell(.1, .1, .012, .09, 0, hz + .02, 0xf2c41a, 10, 4), ell(.125, .016, .102, -.004, 0, hz + .022, 0xf2f2f2, 10, 5));
    } else if (o.hat === 'hardhat') {
        t.push(dome(.125, .115, .1, -.004, 0, hz + .02, o.hatColor), cyl(.15, .14, .014, 0, 0, hz + .02, o.hatColor, 18), ell(.1, .022, .106, -.004, 0, hz + .02, o.hatColor, 8, 5));
    } else if (o.hat === 'police') {
        t.push(dome(.118, .105, .075, -.006, 0, hz + .05, o.hatColor), cyl(.118, .105, .03, -.006, 0, hz + .05, 0xe9ecf2, 18), ell(.085, .09, .008, .115, 0, hz + .058, 0x0e0e12, 12, 4), ell(.012, .02, .016, .121, 0, hz + .07, 0xd9b53a, 6, 4));
    } else if (o.hat === 'ballcap') {
        t.push(dome(.115, .1, .08, -.008, 0, hz + .035, o.hatColor), ell(.07, .085, .008, .12, 0, hz + .04, o.hatColor, 10, 4));
    }
    // снаряжение на теле
    if (o.gear === 'fire') {
        t.push(cyl(.128, .198, .05, 0, 0, 1.22, 0xf2c41a), cyl(.108, .152, .05, 0, 0, 1.0, 0xf2c41a), cyl(.07, .07, .42, -.17, 0, 1.24, 0xbfc5cc, 12), cyl(.05, .05, .04, -.17, 0, 1.46, 0x6a7078, 8));
    } else if (o.gear === 'police') {
        t.push(cyl(.098, .139, .04, 0, 0, .955, 0x0c0c10), box(.05, .035, .12, 0, -.165, .86, 0x0c0c10), ell(.045, .05, .012, 0, .17, 1.47, 0xe9ecf2, 8, 4), ell(.045, .05, .012, 0, -.17, 1.47, 0xe9ecf2, 8, 4), ell(.01, .025, .03, .122, .06, 1.3, 0xd9b53a, 6, 4));
    } else if (o.gear === 'worker') {
        t.push(ell(.134, .2, .205, 0, 0, 1.28, 0xff7a14), ell(.112, .157, .17, 0, 0, 1.07, 0xff7a14), cyl(.138, .204, .035, 0, 0, 1.22, 0xdfe3e8), cyl(.116, .16, .035, 0, 0, 1.03, 0xdfe3e8), cyl(.1, .146, .035, 0, 0, .94, 0x3a2f22));
    } else if (o.backpack !== null) {
        t.push(ell(.07, .14, .19, -.15, 0, 1.22, o.backpack, 10, 7));
    }
    const torso = merged(t.map(g => g.translate(0, 0, -HIP_Z)));

    const sleeve = o.shirt, skin = o.skin, longSleeve = o.longSleeves || o.gear !== 'none';
    const ua: THREE.BufferGeometry[] = [ell(.058, .058, .06, 0, 0, 0, sleeve, 10, 6)];
    if (longSleeve) ua.push(cap(.05, UPPER_ARM + .02, 0, 0, -UPPER_ARM / 2, sleeve));
    else ua.push(cap(.051, .17, 0, 0, -.085, sleeve), cap(.044, .2, 0, 0, -.19, skin));
    if (o.gear === 'worker') ua.push(cap(.052, .17, 0, 0, -.085, 0xff7a14));
    const fa: THREE.BufferGeometry[] = [];
    fa.push(cap(.042, FOREARM + .02, 0, 0, -FOREARM / 2, longSleeve ? sleeve : skin));
    if (o.gear === 'fire') fa.push(cyl(.047, .047, .04, 0, 0, -.12, 0xf2c41a, 10));
    fa.push(ell(.03, .024, .06, .004, 0, -FOREARM - .035, o.glove ?? skin, 8, 6));

    const th: THREE.BufferGeometry[] = [];
    if (o.shorts) th.push(cap(.073, .27, 0, 0, -.135, o.pants), cap(.062, .2, 0, 0, -.28, skin));
    else th.push(cap(.073, THIGH + .03, 0, 0, -THIGH / 2 + .0, o.pants));
    const sh: THREE.BufferGeometry[] = [];
    if (o.shorts) sh.push(cap(.056, SHIN + .02, 0, 0, -SHIN / 2 - .005, skin));
    else sh.push(cap(.057, SHIN + .02, 0, 0, -SHIN / 2 - .005, o.pants));
    if (o.boots) sh.push(cyl(.062, .062, .15, 0, 0, -SHIN + .09, o.shoes, 10));
    // стопа: начало координат в голеностопе, капсула вдоль X, нижняя точка = центр - FOOT_R
    const foot = tint(new THREE.CapsuleGeometry(FOOT_R, TOE_X - HEEL_X, 2, 8).rotateZ(Math.PI / 2).translate((HEEL_X + TOE_X) / 2, 0, FOOT_CZ), o.shoes);
    return { torso, thigh: merged(th), shin: merged(sh), foot, upperArm: merged(ua), foreArm: merged(fa) };
}

export const material = new THREE.MeshStandardMaterial({ name: 'Person', vertexColors: true, roughness: .85, metalness: 0 });

