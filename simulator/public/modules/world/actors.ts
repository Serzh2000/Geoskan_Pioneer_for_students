import * as THREE from 'three';

/*
 * Люди для живого мира: шарнирная фигура ростом ~1.75 м (голова, шея, грудь, таз, бедро/голень/стопа, плечо/предплечье/кисть)
 * и набор поз. Перёд = +X, ступни стоят на z = 0, как у машин. Одна фигура = 11 мешей (торс, 2x бедро, 2x голень, 2x стопа,
 * 2x плечо, 2x предплечье): геометрия общая для всех людей одного наряда, цвета запечены в вершины, материал один.
 *
 * Анимация считается по реальному перемещению root между вызовами placePerson и poseNow: фаза шага продвигается
 * на (пройденный путь / длина шага), поэтому ступня на земле не скользит, а `speed` влияет только на ритм
 * немобильных поз (work, fight). Поза — взвешенная смесь углов суставов (плавные переходы), а высота корпуса каждый кадр
 * выставляется кинематикой так, чтобы самая низкая точка стопы была ровно на z = 0 в любой позе.
 */
import {
    FOOT_R, HEAD, HEEL_X, HEIGHT, HIP_Y, HIP_Z, FOOT_CZ, TOE_X, SHIN, SHOULDER_Y, SHOULDER_Z, THIGH, UPPER_ARM,
    box, buildParts, ell, hashSeed, keyOf, material, merged, outfitFor, partsCache, tint, type Role
} from './person-model.js';

export * from './props.js';

const mesh = (g: THREE.BufferGeometry, name: string) => { const m = new THREE.Mesh(g, material); m.name = name; m.castShadow = true; return m; };
const group = (x: number, y: number, z: number) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
export type { Role };

export type PoseMode = 'idle' | 'walk' | 'run' | 'work' | 'fight' | 'handsUp' | 'cuffed' | 'sit' | 'carry' | 'crouch';
export const ROLES: readonly Role[] = ['civilian', 'firefighter', 'police', 'worker', 'thief', 'fighter'];
export const POSES: readonly PoseMode[] = ['idle', 'walk', 'run', 'work', 'fight', 'handsUp', 'cuffed', 'sit', 'carry', 'crouch'];

type Motion = { has: boolean; lx: number; ly: number; lz: number; vs: number; clock: number; init: boolean; w: Record<PoseMode, number> };

export type Person = {
    root: THREE.Group;
    body: THREE.Group;                 // всё выше земли: опускается при приседе/посадке, масштабируется под рост
    legs: [THREE.Group, THREE.Group];  // тазобедренные суставы [правая (y<0), левая (y>0)]
    arms: [THREE.Group, THREE.Group];  // плечевые суставы
    role: Role;
    mode: PoseMode;
    phase: number;
    upper: THREE.Group;                // таз + торс + голова: наклоняется вокруг бёдер
    knees: [THREE.Group, THREE.Group];
    elbows: [THREE.Group, THREE.Group];
    ankles: [THREE.Group, THREE.Group];
    chest: THREE.Mesh;
    scale: number;                     // рост относительно 1.75 м
    dims: { height: number; head: number; legLength: number; shoulderWidth: number; hipWidth: number };
    signature: string;                 // одинаковый seed и роль дают одинаковую подпись
    motion: Motion;
};


export function createPerson(role: Role, seed = 0): Person {
    const o = outfitFor(role, seed), key = keyOf(o);
    let parts = partsCache.get(key);
    if (!parts) partsCache.set(key, parts = buildParts(o));
    const s = o.stature, g = o.girth;
    const root = new THREE.Group(), body = new THREE.Group(), upper = group(0, 0, HIP_Z);
    body.scale.setScalar(s); root.add(body); body.add(upper);
    const chest = mesh(parts.torso, 'torso'); chest.scale.set(g, g, 1); chest.userData.girth = g; upper.add(chest);
    const legs: THREE.Group[] = [], arms: THREE.Group[] = [], knees: THREE.Group[] = [], elbows: THREE.Group[] = [], ankles: THREE.Group[] = [];
    for (const side of [-1, 1]) {
        const leg = group(0, side * HIP_Y, HIP_Z), knee = group(0, 0, -THIGH), ankle = group(0, 0, -SHIN);
        const thigh = mesh(parts.thigh, 'thigh'); thigh.scale.set(g, g, 1);
        const shin = mesh(parts.shin, 'shin'); shin.scale.set(g, g, 1);
        const foot = mesh(parts.foot, 'foot'); foot.scale.set(1, 1 + (g - 1) * .6, 1);
        leg.add(thigh, knee); knee.add(shin, ankle); ankle.add(foot); body.add(leg);
        legs.push(leg); knees.push(knee); ankles.push(ankle);
        const arm = group(0, side * SHOULDER_Y, SHOULDER_Z - HIP_Z), elbow = group(0, 0, -UPPER_ARM);
        const ua = mesh(parts.upperArm, 'upperArm'); ua.scale.set(g, g, 1);
        const fa = mesh(parts.foreArm, 'foreArm'); fa.scale.set(g, g, 1);
        arm.add(ua, elbow); elbow.add(fa); upper.add(arm);
        arms.push(arm); elbows.push(elbow);
    }
    root.traverse(node => { node.userData.collidable = false; });
    root.userData.person = true;          // lets tools and tests tell people from props
    root.userData.role = role;
    root.userData.actorRole = role;
    const w = {} as Record<PoseMode, number>; for (const m of POSES) w[m] = 0; w.idle = 1;
    const person: Person = {
        root, body, legs: legs as [THREE.Group, THREE.Group], arms: arms as [THREE.Group, THREE.Group], role, mode: 'idle', phase: (hashSeed(seed) % 6283) / 1000,
        upper, knees: knees as [THREE.Group, THREE.Group], elbows: elbows as [THREE.Group, THREE.Group], ankles: ankles as [THREE.Group, THREE.Group], chest, scale: s,
        dims: { height: HEIGHT * s, head: HEAD * s, legLength: HIP_Z * s, shoulderWidth: SHOULDER_Y * 2 * s, hipWidth: HIP_Y * 2 * s },
        signature: `${role}:${key}:${s.toFixed(3)}:${g.toFixed(3)}`,
        motion: { has: false, lx: 0, ly: 0, lz: 0, vs: 0, clock: (hashSeed(seed) % 1000) / 100, init: false, w }
    };
    poseNow(person, 'idle', 0);
    return person;
}

/** Сумка вора на плече. */
const sackGeometry = ell(.14, .13, .17, 0, 0, 0, 0x7a6840, 10, 8);
export function giveSack(person: Person) {
    if (person.upper.getObjectByName('sack')) return;
    const m = new THREE.Mesh(sackGeometry, material); m.name = 'sack'; m.castShadow = true; m.userData.collidable = false;
    m.position.set(-.17, .08, 1.3 - HIP_Z); m.rotation.x = .3; person.upper.add(m);
}

/** Наручники на запястьях за спиной. */
const cuffGeometry = merged([box(.05, .1, .035, 0, 0, 0, 0xaab2bb), tint(new THREE.TorusGeometry(.035, .008, 5, 10).rotateY(Math.PI / 2).translate(0, .05, 0), 0xaab2bb), tint(new THREE.TorusGeometry(.035, .008, 5, 10).rotateY(Math.PI / 2).translate(0, -.05, 0), 0xaab2bb)]);
export function giveCuffs(person: Person) {
    if (person.body.getObjectByName('cuffs')) return;
    const m = new THREE.Mesh(cuffGeometry, material); m.name = 'cuffs'; m.castShadow = true; m.userData.collidable = false;
    m.position.set(-.135, 0, .955 - HIP_Z); person.upper.add(m);
}
export function removeCuffs(person: Person) { person.body.getObjectByName('cuffs')?.removeFromParent(); }

// ------------------------------------------------------------------ позы
// Углы суставов (вперёд положительно): F — бедро, K — сгиб колена, S — плечо, E — сгиб локтя, A — отведение руки,
// R — заведение предплечья к середине, LEAN — наклон корпуса вперёд, TWIST/ROLL — поворот и крен корпуса, BX/BY — сдвиг таза, HAB — разведение ног.
const F0 = 0, F1 = 1, K0 = 2, K1 = 3, S0 = 4, S1 = 5, A0 = 6, A1 = 7, E0 = 8, E1 = 9, R0 = 10, R1 = 11, LEAN = 12, TWIST = 13, ROLL = 14, BX = 15, BY = 16, HAB = 17, NJ = 18;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2, K_TRI = .95, TRI_NORM = Math.asin(K_TRI);
/** Почти треугольная волна: угол ноги меняется почти равномерно, поэтому опорная ступня не «едет». */
const tri = (th: number) => Math.asin(K_TRI * Math.sin(th)) / TRI_NORM;
const GAIT = {
    walk: { A: .42, K: 1.0, S: .42, Eb: .15, Ea: .3, lean: .05, ref: 1.4, strideStep: .5 },
    run: { A: .74, K: 1.9, S: .85, Eb: 1.3, Ea: .35, lean: .22, ref: 3.6, strideStep: .5 }
};

// кинематика ноги в плоскости XZ; rot — поворот вокруг Y (положительный уводит стопу назад)
const rx = (t: number, x: number, z: number) => x * Math.cos(t) + z * Math.sin(t);
const rz = (t: number, x: number, z: number) => -x * Math.sin(t) + z * Math.cos(t);
type Leg = { ankleX: number; ankleZ: number; sum: number };
const legFK = (hip: number, knee: number, cab: number): Leg => {
    const kx = rx(hip, 0, -THIGH * cab), kz = rz(hip, 0, -THIGH * cab), s = hip + knee;
    return { ankleX: kx + rx(s, 0, -SHIN * cab), ankleZ: kz + rz(s, 0, -SHIN * cab), sum: s };
};
/** Самая низкая точка стопы (относительно бедра) и её X при угле стопы `foot` (в системе голени). */
const footLow = (leg: Leg, foot: number) => {
    const a = leg.sum + foot; let bestZ = Infinity, bestX = 0;
    for (const cx of [HEEL_X, TOE_X]) {
        const z = leg.ankleZ + rz(a, cx, FOOT_CZ) - FOOT_R;
        if (z < bestZ) { bestZ = z; bestX = leg.ankleX + rx(a, cx, FOOT_CZ); }
    }
    return { z: bestZ, x: bestX };
};
const toePitch = (f: number) => clamp(-f * .9, -.35, .6);        // угол стопы относительно земли, когда она не стоит

/** Путь голеностопа относительно таза за фазу опоры: за это время (полцикла) тело проходит столько же. */
const stanceTravel = (A: number) => 1.12 * (legFK(-A, .1, 1).ankleX - legFK(A, .1, 1).ankleX);   // 1.12: подбор по тесту на скольжение

type Ctx = { t: number; p: number; gA: number; r: number; A: number; K: number; S: number; Eb: number; Ea: number; lean: number };
const swingK = (th: number) => {            // сгиб колена: в переносе большой, в опоре небольшой
    const u = ((((th + Math.PI / 2) % TAU) + TAU) % TAU) / Math.PI;
    return u <= 1 ? Math.pow(Math.sin(Math.PI * u), .9) * (1 - .25 * u) : 0;
};
const stanceK = (th: number) => {
    const u = ((((th + Math.PI / 2) % TAU) + TAU) % TAU) / Math.PI;
    return u > 1 ? Math.sin(Math.PI * (u - 1)) : 0;
};

function idleBase(J: Float64Array, c: Ctx) {
    J.fill(0);
    const t = c.t;
    J[K0] = J[K1] = .04; J[S0] = .06 + .03 * Math.sin(t * .9); J[S1] = .06 - .03 * Math.sin(t * .9 + .7);
    J[A0] = J[A1] = .07; J[E0] = .22; J[E1] = .24; J[LEAN] = .02 + .012 * Math.sin(t * .35);
    J[ROLL] = .016 * Math.sin(t * .31 + 1); J[BY] = .008 * Math.sin(t * .31 + 1); J[HAB] = .03;
}
function gaitLegs(J: Float64Array, c: Ctx, arms: boolean) {
    const th = c.p;
    J[F0] = c.A * tri(th); J[F1] = c.A * tri(th + Math.PI);
    J[K0] = c.K * swingK(th) + .1 * stanceK(th) + .03; J[K1] = c.K * swingK(th + Math.PI) + .1 * stanceK(th + Math.PI) + .03;
    J[ROLL] = .035 * -Math.cos(th) * (1 - c.r * .4); J[BY] = .018 * Math.cos(th); J[LEAN] = c.lean;
    if (arms) {
        const s0 = c.S * tri(th + Math.PI), s1 = c.S * tri(th);       // рука вперёд, когда противоположная нога вперёд
        J[S0] = s0; J[S1] = s1;
        J[E0] = c.Eb + c.Ea * Math.max(0, s0 / c.S); J[E1] = c.Eb + c.Ea * Math.max(0, s1 / c.S);
        J[TWIST] = (.2 + .1 * c.r) * (s0 / c.S); J[A0] = J[A1] = .07;
    }
}
const tmpIdle = new Float64Array(NJ);
function fill(mode: PoseMode, J: Float64Array, c: Ctx) {
    const p = c.p;
    idleBase(J, c);
    switch (mode) {
        case 'idle': break;
        case 'walk': case 'run': case 'carry': {
            tmpIdle.set(J); gaitLegs(J, c, mode !== 'carry');
            for (let i = 0; i < NJ; i++) J[i] = lerp(tmpIdle[i], J[i], c.gA);
            if (mode === 'carry') { J[S0] = J[S1] = 1.25; J[E0] = J[E1] = .5; J[A0] = J[A1] = .05; J[LEAN] += .03; J[TWIST] = 0; }
            break;
        }
        case 'work': {       // молоток/струя над головой: одна рука работает, другая придерживает
            J[S0] = 2.35 + .12 * Math.sin(p); J[E0] = .5 + .45 * (.5 + .5 * Math.sin(p)); J[S1] = 2.0; J[E1] = .3;
            J[F0] = .12; J[F1] = -.08; J[K0] = J[K1] = .16; J[LEAN] = -.05; J[TWIST] = .1 * Math.sin(p); J[A0] = J[A1] = .12;
            break;
        }
        case 'fight': {      // стойка боксёра, чередующиеся удары
            const p0 = Math.max(0, Math.sin(p)), p1 = Math.max(0, -Math.sin(p));
            J[S0] = 1.0 + .45 * p0; J[E0] = 1.6 - 1.5 * p0; J[S1] = 1.0 + .45 * p1; J[E1] = 1.6 - 1.5 * p1; J[A0] = J[A1] = .12;
            J[F0] = .3; J[F1] = -.26; J[K0] = .3 + .08 * Math.sin(p * 2); J[K1] = .3 + .08 * Math.sin(p * 2 + 1);
            J[LEAN] = .2; J[TWIST] = .35 * (p0 - p1); J[HAB] = .1;
            break;
        }
        case 'handsUp': {
            J[S0] = 2.95 + .03 * Math.sin(c.t * 7); J[S1] = 2.95 + .03 * Math.sin(c.t * 7 + 2); J[A0] = J[A1] = .25; J[E0] = J[E1] = .25;
            J[K0] = J[K1] = .1; J[LEAN] = -.02;
            break;
        }
        case 'cuffed': {     // руки за спиной, кисти сведены у поясницы
            J[S0] = J[S1] = -.3; J[A0] = J[A1] = .22; J[E0] = J[E1] = 0; J[R0] = J[R1] = 1.05; J[LEAN] = .1; J[K0] = J[K1] = .06;
            break;
        }
        case 'sit': {
            J[F0] = J[F1] = 1.5; J[K0] = J[K1] = 1.5; J[S0] = J[S1] = .5; J[E0] = J[E1] = .9; J[A0] = J[A1] = .08; J[LEAN] = .05; J[HAB] = .07;
            break;
        }
        case 'crouch': {
            J[F0] = J[F1] = 1.15; J[K0] = J[K1] = 2.1; J[S0] = J[S1] = .8; J[E0] = J[E1] = .7; J[LEAN] = .5; J[A0] = J[A1] = .1; J[HAB] = .08;
            break;
        }
    }
}

const total = new Float64Array(NJ), part = new Float64Array(NJ);
const CTX: Ctx = { t: 0, p: 0, gA: 0, r: 0, A: 0, K: 0, S: 0, Eb: 0, Ea: 0, lean: 0 };
const sgn = [-1, 1];

/**
 * Применяет позу. `dt` — секунды; темп ходьбы/бега берётся из фактического перемещения root между вызовами (placePerson
 * вызывается до poseNow), `speed` масштабирует ритм поз на месте (work, fight).
 */
export function poseNow(person: Person, mode: PoseMode, dt: number, speed = 1) {
    const m = person.motion, step = clamp(dt, 0, .1), pos = person.root.position;
    person.mode = mode;
    // фактическая скорость по земле (со сглаживанием); скачок > 14 м/с — телепорт, не движение
    if (m.has && dt > 1e-5) {
        const v = Math.hypot(pos.x - m.lx, pos.y - m.ly, pos.z - m.lz) / dt;
        if (v > 14) m.vs = 0; else m.vs += (v - m.vs) * (1 - Math.exp(-step / .12));
    }
    m.lx = pos.x; m.ly = pos.y; m.lz = pos.z; m.has = true;
    m.clock += step;
    // веса поз: плавный переход (~0.2 с), без щелчков
    if (!m.init) { for (const k of POSES) m.w[k] = k === mode ? 1 : 0; m.init = true; }
    else {
        const k = 1 - Math.exp(-step / .2); let sum = 0;
        for (const q of POSES) { m.w[q] += ((q === mode ? 1 : 0) - m.w[q]) * k; sum += m.w[q]; }
        for (const q of POSES) m.w[q] /= sum;
    }
    // параметры шага по скорости
    const vs = m.vs, locomotion = m.w.walk + m.w.run + m.w.carry > .05;
    const gA = smooth(.12, .7, vs);
    const r = lerp(smooth(2.6, 3.6, vs), smooth(1.4, 2.6, vs), m.w.run);
    const gw = GAIT.walk, gr = GAIT.run;
    const q = clamp(.55 + .45 * vs / lerp(gw.ref, gr.ref, r), .55, 1.2);
    const A = lerp(gw.A, gr.A, r) * q;
    const ctx = CTX;
    ctx.t = m.clock; ctx.p = person.phase; ctx.gA = gA; ctx.r = r; ctx.A = A; ctx.K = lerp(gw.K, gr.K, r); ctx.S = lerp(gw.S, gr.S, r) * q;
    ctx.Eb = lerp(gw.Eb, gr.Eb, r); ctx.Ea = lerp(gw.Ea, gr.Ea, r); ctx.lean = lerp(gw.lean, gr.lean, r);
    if (locomotion && gA > .02) person.phase += Math.min(16, Math.PI * Math.max(vs, .05) / Math.max(.2, stanceTravel(A))) * step;
    else if (!locomotion) person.phase += step * (mode === 'fight' ? 9 : mode === 'work' ? 6 : 1.4) * speed;
    if (person.phase > 1e4) person.phase -= Math.floor(person.phase / TAU) * TAU;
    ctx.p = person.phase;

    total.fill(0);
    for (const k of POSES) {
        const w = m.w[k]; if (w < .002) continue;
        fill(k, part, ctx);
        for (let i = 0; i < NJ; i++) total[i] += w * part[i];
    }
    const J = total;
    for (let i = 0; i < 2; i++) {
        const sg = sgn[i], arm = person.arms[i];
        person.legs[i].rotation.set(sg * J[HAB], -J[i === 0 ? F0 : F1], 0);
        person.knees[i].rotation.set(0, J[i === 0 ? K0 : K1], 0);
        const sw = J[i === 0 ? S0 : S1];
        arm.rotation.set(sg * J[i === 0 ? A0 : A1] * (Math.cos(sw) >= 0 ? 1 : -1), -sw, 0);
        person.elbows[i].rotation.set(-sg * J[i === 0 ? R0 : R1], -J[i === 0 ? E0 : E1], 0);
    }
    person.upper.rotation.set(J[ROLL], J[LEAN], J[TWIST]);
    // дыхание: грудная клетка слегка раздувается
    const b = Math.sin(m.clock * 1.75 + 1) * (1 - gA * .6);
    const g = person.chest.userData.girth as number;
    person.chest.scale.set(g * (1 + .008 * b), g * (1 + .012 * b), 1 + .006 * b);
    // опора: подбираем высоту корпуса так, чтобы самая низкая точка стоп была ровно на земле
    const cab = Math.cos(J[HAB]);
    const legs: Leg[] = [legFK(-J[F0], J[K0], cab), legFK(-J[F1], J[K1], cab)];
    const zmin = Math.min(legs[0].ankleZ, legs[1].ankleZ), fs = [J[F0], J[F1]];
    let low = Infinity;
    for (let i = 0; i < 2; i++) {
        const planted = 1 - smooth(0, .06, legs[i].ankleZ - zmin);
        const phi = (1 - planted) * toePitch(fs[i]);
        const foot = -legs[i].sum + phi;
        person.ankles[i].rotation.set(0, foot, 0);
        low = Math.min(low, HIP_Z + footLow(legs[i], foot).z);
    }
    const s = person.scale;
    person.body.position.set(J[BX] * s, J[BY] * s, -low * s);
}

export function placePerson(person: Person, x: number, y: number, z: number, heading: number) {
    person.root.position.set(x, y, z);
    person.root.rotation.z = heading;
}

