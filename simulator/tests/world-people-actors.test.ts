import * as THREE from 'three';
import { createPerson, giveCuffs, giveSack, placePerson, poseNow, POSES, ROLES, type Person, type PoseMode, type Role } from '../public/modules/world/actors.js';

const SPEED: Partial<Record<PoseMode, number>> = { walk: 1.4, run: 3.6, carry: 1.2 };

/** Ведёт человека `seconds` секунд как это делают бригады: placePerson, затем poseNow. */
function drive(person: Person, mode: PoseMode, seconds: number, onFrame?: (i: number) => void, dt = 1 / 60) {
    const v = SPEED[mode] ?? 0;
    let x = person.root.position.x;
    for (let i = 0; i < Math.round(seconds / dt); i++) {
        x += v * dt; placePerson(person, x, 0, 0, 0); poseNow(person, mode, dt, 1); onFrame?.(i);
    }
}
const feet = (p: Person) => { const out: THREE.Mesh[] = []; p.root.traverse(o => { if (o.name === 'foot') out.push(o as THREE.Mesh); }); return out; };
const minZ = (o: THREE.Object3D) => { o.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(o, true).min.z; };

describe('people: proportions (A1)', () => {
    it('stands about 1.7-1.8 m with a head of 1/7.5, legs of 47% and shoulders wider than hips', () => {
        for (const role of ROLES) for (let seed = 1; seed <= 12; seed++) {
            const p = createPerson(role, seed);
            p.root.updateWorldMatrix(true, true);
            const box = new THREE.Box3().setFromObject(p.root, true), size = box.getSize(new THREE.Vector3());
            expect(size.z).toBeGreaterThan(1.62);
            expect(size.z).toBeLessThan(1.9);
            expect(p.dims.head / p.dims.height).toBeCloseTo(1 / 7.5, 3);
            expect(p.dims.legLength / p.dims.height).toBeGreaterThan(.45);
            expect(p.dims.legLength / p.dims.height).toBeLessThan(.49);
            expect(p.dims.shoulderWidth).toBeGreaterThan(p.dims.hipWidth * 1.8);
        }
    });

    it('has a wider chest than pelvis in the real geometry, a neck, and feet that stick out forward', () => {
        const p = createPerson('civilian', 3);
        const torso = p.chest.geometry.getAttribute('position');
        const width = (z0: number, z1: number) => { let w = 0; for (let i = 0; i < torso.count; i++) { const z = torso.getZ(i) + .82; if (z >= z0 && z <= z1 && torso.getX(i) > -.1) w = Math.max(w, Math.abs(torso.getY(i))); } return w; };
        expect(width(1.3, 1.46)).toBeGreaterThan(width(.78, .95) + .02);
        let neck = 0; for (let i = 0; i < torso.count; i++) { const z = torso.getZ(i) + .82; if (z > 1.47 && z < 1.52 && Math.abs(torso.getY(i)) < .06) neck++; }
        expect(neck).toBeGreaterThan(0);
        const foot = feet(p)[0], fb = new THREE.Box3().setFromObject(foot, true);
        expect(fb.max.x).toBeGreaterThan(.15);                  // носок впереди голеностопа
        expect(fb.min.x).toBeGreaterThan(-.1);
    });

    it('bends its knees and elbows when walking', () => {
        const p = createPerson('police', 2);
        let knee = 0, elbow = 0;
        drive(p, 'walk', 3, () => { knee = Math.max(knee, p.knees[0].rotation.y, p.knees[1].rotation.y); elbow = Math.max(elbow, -p.elbows[0].rotation.y, -p.elbows[1].rotation.y); });
        expect(knee).toBeGreaterThan(.6);
        expect(elbow).toBeGreaterThan(.25);
    });
});

describe('people: feet on the ground in every role and pose (A3)', () => {
    it('keeps the lowest foot point on z = 0 and nothing below the ground', () => {
        for (const role of ROLES) for (const mode of POSES) {
            const p = createPerson(role, 5);
            if (mode === 'cuffed') giveCuffs(p);
            let worst = 0, sink = 0;
            drive(p, mode, 2, i => {
                if (i < 20 || i % 3) return;                                  // сначала смесь поз устаканивается
                const low = Math.min(...feet(p).map(minZ)), all = minZ(p.root);
                worst = Math.max(worst, Math.abs(low)); sink = Math.min(sink, all);
            });
            expect([role, mode, worst < .008]).toEqual([role, mode, true]);
            expect([role, mode, sink > -.008]).toEqual([role, mode, true]);
        }
    });

    it('stays grounded through every pose transition', () => {
        const p = createPerson('worker', 7);
        let worst = 0;
        for (const mode of POSES) drive(p, mode, .5, () => { worst = Math.max(worst, Math.abs(Math.min(...feet(p).map(minZ)))); });
        expect(worst).toBeLessThan(.008);
    });
});

describe('people: gait (A3)', () => {
    /** Дрейф голеностопа по земле, пока стопа стоит плоско и нога идёт назад (фаза опоры), относительно скорости тела. */
    const stanceSlip = (mode: PoseMode) => {
        const p = createPerson('civilian', 4), v = SPEED[mode]!, dt = 1 / 60, v3 = new THREE.Vector3();
        const state = (foot: THREE.Mesh, k: number) => {
            foot.updateWorldMatrix(true, false);
            const pos = foot.geometry.getAttribute('position'), pts: THREE.Vector3[] = [];
            let low = Infinity;
            for (let i = 0; i < pos.count; i++) { v3.fromBufferAttribute(pos, i).applyMatrix4(foot.matrixWorld); pts.push(v3.clone()); low = Math.min(low, v3.z); }
            const xs = pts.filter(q => q.z < low + .006).map(q => q.x);
            return { low, flat: Math.max(...xs) - Math.min(...xs) > .1, x: new THREE.Vector3().setFromMatrixPosition(foot.matrixWorld).x, rot: p.legs[k].rotation.y };
        };
        const prev: Array<ReturnType<typeof state> | null> = [null, null];
        let sum = 0, n = 0;
        drive(p, mode, 5, i => {
            feet(p).forEach((f, k) => {
                const now = state(f, k), before = prev[k];
                if (i > 180 && before && now.low < .004 && before.low < .004 && now.flat && before.flat && now.rot > before.rot) { sum += (now.x - before.x) / dt; n++; }
                prev[k] = now;
            });
        }, dt);
        return { slip: Math.abs(sum / n), v, samples: n };
    };

    it('does not slide the planted foot (ground speed of the stance foot vs body speed)', () => {
        const walk = stanceSlip('walk'), run = stanceSlip('run');
        expect(walk.samples).toBeGreaterThan(60);
        expect(walk.slip / walk.v).toBeLessThan(.12);
        expect(run.slip / run.v).toBeLessThan(.25);
    });

    it('swings legs and arms in opposite phase with sway of the torso', () => {
        const p = createPerson('civilian', 1);
        let agree = 0, frames = 0, sway = 0, legOpp = 0;
        drive(p, 'walk', 4, i => {
            if (i < 120) return;
            frames++;
            const legSwing = p.legs[0].rotation.y - p.legs[1].rotation.y;        // + : правая нога сзади
            const armSwing = p.arms[0].rotation.y - p.arms[1].rotation.y;
            if (legSwing * armSwing < 0 === false) agree++;                      // рука той же стороны идёт вместе с ногой того же знака = плохо
            if (p.legs[0].rotation.y * p.legs[1].rotation.y <= 0) legOpp++;
            sway = Math.max(sway, Math.abs(p.upper.rotation.x), Math.abs(p.upper.rotation.z));
        });
        expect(agree / frames).toBeLessThan(.1);
        expect(legOpp / frames).toBeGreaterThan(.95);
        expect(sway).toBeGreaterThan(.02);
    });

    it('runs with a bigger lean and amplitude than walking', () => {
        const w = createPerson('police', 2), r = createPerson('police', 2);
        let wl = 0, rl = 0, wa = 0, ra = 0;
        drive(w, 'walk', 3, i => { if (i > 90) { wl = Math.max(wl, w.upper.rotation.y); wa = Math.max(wa, Math.abs(w.legs[0].rotation.y)); } });
        drive(r, 'run', 3, i => { if (i > 90) { rl = Math.max(rl, r.upper.rotation.y); ra = Math.max(ra, Math.abs(r.legs[0].rotation.y)); } });
        expect(rl).toBeGreaterThan(wl + .1);
        expect(ra).toBeGreaterThan(wa + .15);
    });

    it('keeps breathing and micro-moving at idle', () => {
        const p = createPerson('civilian', 2);
        const seen = new Set<string>(); let z0 = Infinity, z1 = -Infinity;
        drive(p, 'idle', 6, () => { seen.add(p.chest.scale.y.toFixed(4)); z0 = Math.min(z0, p.upper.rotation.x); z1 = Math.max(z1, p.upper.rotation.x); });
        expect(seen.size).toBeGreaterThan(20);
        expect(z1 - z0).toBeGreaterThan(.005);
    });

    it('changes pose smoothly: no joint moves more than 0.2 m between frames at 60 fps', () => {
        const p = createPerson('thief', 3);
        const tip = new THREE.Vector3(0, 0, -.3);
        const points = () => {
            p.root.updateWorldMatrix(true, true);
            return [...p.ankles, ...p.knees, ...p.elbows, ...p.elbows].flatMap((g, i) => (i >= 6 ? g.localToWorld(tip.clone()) : g.getWorldPosition(new THREE.Vector3())).toArray());
        };
        drive(p, 'idle', .3);
        let worst = 0, where = '', last = points(), lastBody = p.body.position.z;
        for (const mode of ['sit', 'handsUp', 'cuffed', 'fight', 'crouch', 'work', 'carry', 'run', 'walk', 'idle'] as PoseMode[])
            drive(p, mode, 1, () => {
                const now = points(); now.forEach((q, i) => { const d = Math.abs(q - last[i]) - ((SPEED[mode] ?? 0) / 60) * (i % 3 === 0 ? 1 : 0); if (d > worst) { worst = d; where = `${mode} point ${i}`; } }); last = now;
                worst = Math.max(worst, Math.abs(p.body.position.z - lastBody)); lastBody = p.body.position.z;
            });
        expect([where, worst < .2]).toEqual([where, true]);
    });
});

describe('people: cost and variety (A4, A5)', () => {
    it('uses at most 12 meshes (draw calls) per person and shares geometry and material', () => {
        for (const role of ROLES) {
            const a = createPerson(role, 9), b = createPerson(role, 9);
            giveSack(a); giveCuffs(a);
            let n = 0; a.root.traverse(o => { if ((o as THREE.Mesh).isMesh && !['sack', 'cuffs'].includes(o.name)) n++; });
            expect(n).toBeLessThanOrEqual(12);
            const ma: THREE.Mesh[] = [], mb: THREE.Mesh[] = [];
            a.root.traverse(o => { if ((o as THREE.Mesh).isMesh) ma.push(o as THREE.Mesh); }); b.root.traverse(o => { if ((o as THREE.Mesh).isMesh) mb.push(o as THREE.Mesh); });
            expect(mb[0].geometry).toBe(ma[0].geometry);
            expect(mb[0].material).toBe(ma[0].material);
        }
    });

    it('makes the same person for the same seed and at least 6 different civilians', () => {
        const sig = (role: Role, seed: number) => createPerson(role, seed).signature;
        expect(sig('civilian', 17)).toBe(sig('civilian', 17));
        const all = new Set(Array.from({ length: 30 }, (_, i) => sig('civilian', i + 1)));
        expect(all.size).toBeGreaterThanOrEqual(6);
        for (let i = 1; i < 40; i++) expect(sig('civilian', i)).not.toBe(sig('civilian', i + 1));   // нет клонов в ряд
    });

    it('differs in height and build between civilians', () => {
        const h = new Set(Array.from({ length: 20 }, (_, i) => createPerson('civilian', i).dims.height.toFixed(3)));
        expect(h.size).toBeGreaterThanOrEqual(6);
    });
});
