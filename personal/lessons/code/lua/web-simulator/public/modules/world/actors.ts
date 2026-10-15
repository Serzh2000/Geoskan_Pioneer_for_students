import * as THREE from 'three';

/*
 * People for the living world: a small articulated figure (legs, arms, torso, head, role gear) and a handful of
 * poses. Front is +X and the feet stand on z = 0, like the vehicles. A pose is a pure function of a phase, so crews
 * can be driven frame by frame by the choreography in runtime.ts. Shared geometry and materials keep dozens of
 * figures cheap.
 */
export type Role = 'civilian' | 'firefighter' | 'police' | 'worker' | 'thief' | 'fighter';
export type PoseMode = 'idle' | 'walk' | 'run' | 'work' | 'fight' | 'handsUp' | 'cuffed' | 'sit' | 'carry' | 'crouch';

export type Person = {
    root: THREE.Group;
    body: THREE.Group;                 // everything above the feet: lowered when sitting or crouching
    legs: [THREE.Group, THREE.Group];
    arms: [THREE.Group, THREE.Group];
    role: Role;
    mode: PoseMode;
    phase: number;
};

const shared = {
    leg: new THREE.BoxGeometry(.17, .17, .84).translate(0, 0, -.42),
    arm: new THREE.BoxGeometry(.12, .12, .6).translate(0, 0, -.3),
    torso: new THREE.BoxGeometry(.26, .46, .62).translate(0, 0, .31),
    head: new THREE.SphereGeometry(.14, 12, 10),
    band: new THREE.BoxGeometry(.28, .48, .08),
    hat: new THREE.SphereGeometry(.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    cap: new THREE.CylinderGeometry(.16, .16, .07, 14),
    visor: new THREE.BoxGeometry(.14, .22, .02),
    sack: new THREE.BoxGeometry(.28, .26, .34),
    cuffs: new THREE.BoxGeometry(.12, .2, .06)
};
const materialCache = new Map<number, THREE.MeshStandardMaterial>();
const material = (color: number) => {
    let found = materialCache.get(color);
    if (!found) materialCache.set(color, found = new THREE.MeshStandardMaterial({ name: 'Person', color, roughness: .8 }));
    return found;
};
const SKIN = [0xf0c8a0, 0xd9a577, 0xb97d54, 0x8d5a3b];
const SHIRTS = [0x3b82c4, 0xc4503b, 0x4aa56a, 0xd9a521, 0x8c6bb8, 0xe9e4d8];

const mesh = (geometry: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geometry, material(color)); m.position.set(x, y, z); m.castShadow = true; return m;
};

export function createPerson(role: Role, seed = 0): Person {
    const pick = <T>(list: T[]) => list[Math.abs(Math.floor(seed * 7.13)) % list.length];
    const skin = pick(SKIN);
    const palette: Record<Role, { shirt: number; legs: number; hat?: 'helmet' | 'cap' | 'hardhat' | 'mask' }> = {
        civilian: { shirt: pick(SHIRTS), legs: 0x2d3340 },
        fighter: { shirt: pick(SHIRTS), legs: 0x30343c },
        firefighter: { shirt: 0xd9541a, legs: 0x2a2f3a, hat: 'helmet' },
        police: { shirt: 0x24457a, legs: 0x1b2a46, hat: 'cap' },
        worker: { shirt: 0xf28c1a, legs: 0x3a4250, hat: 'hardhat' },
        thief: { shirt: 0x17191d, legs: 0x17191d, hat: 'mask' }
    };
    const look = palette[role];
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    body.add(mesh(shared.torso, look.shirt, 0, 0, .86));
    const head = mesh(shared.head, look.hat === 'mask' ? 0x17191d : skin, 0, 0, 1.62);
    body.add(head);
    if (look.hat === 'helmet') body.add(mesh(shared.hat, 0xc8231a, 0, 0, 1.64));
    if (look.hat === 'hardhat') body.add(mesh(shared.hat, 0xf2d21a, 0, 0, 1.64));
    if (look.hat === 'cap') { body.add(mesh(shared.cap, 0x1b2a46, 0, 0, 1.73)); body.add(mesh(shared.visor, 0x111827, .15, 0, 1.69)); }
    if (role === 'firefighter' || role === 'worker') body.add(mesh(shared.band, 0xf2f2a0, 0, 0, 1.05));
    const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
    for (const side of [-1, 1]) {
        const leg = new THREE.Group(); leg.position.set(0, side * .11, .86); leg.add(mesh(shared.leg, look.legs)); body.add(leg); legs.push(leg);
        const arm = new THREE.Group(); arm.position.set(0, side * .3, 1.42);
        arm.add(mesh(shared.arm, role === 'civilian' || role === 'fighter' ? look.shirt : look.shirt)); body.add(arm); arms.push(arm);
    }
    // The legs belong to the figure, not to the lowered "body" when sitting: keep the pivots under `body` but the feet
    // reach the ground in every pose by lowering `body.position.z` together with the leg angle.
    root.traverse(node => { node.userData.collidable = false; });
    root.userData.person = true;          // lets tools and tests tell people from props
    root.userData.role = role;
    root.userData.actorRole = role;
    return { root, body, legs: legs as [THREE.Group, THREE.Group], arms: arms as [THREE.Group, THREE.Group], role, mode: 'idle', phase: seed * 6.28 };
}

/** Adds the burglar's sack over the shoulder. */
export function giveSack(person: Person) { person.body.add(mesh(shared.sack, 0x6b5a3a, -.16, .08, 1.12)); }

/** Puts handcuffs on (visible when the arms are behind the back). */
export function giveCuffs(person: Person) {
    if (person.body.getObjectByName('cuffs')) return;
    const cuffs = mesh(shared.cuffs, 0x9aa3ad, -.2, 0, .95); cuffs.name = 'cuffs'; person.body.add(cuffs);
}
export function removeCuffs(person: Person) { person.body.getObjectByName('cuffs')?.removeFromParent(); }

const swing = (value: number) => Math.sin(value);

/** Applies the pose for the current phase. `speed` scales the cadence (1 = a walk). */
export function poseNow(person: Person, mode: PoseMode, dt: number, speed = 1) {
    person.mode = mode;
    const cadence = mode === 'run' ? 10 : mode === 'fight' ? 9 : mode === 'work' ? 6 : mode === 'walk' || mode === 'carry' ? 5.2 : 1.4;
    person.phase += dt * cadence * speed;
    const p = person.phase, [legL, legR] = person.legs, [armL, armR] = person.arms;
    let lean = 0, bodyZ = 0;
    legL.rotation.set(0, 0, 0); legR.rotation.set(0, 0, 0); armL.rotation.set(0, 0, 0); armR.rotation.set(0, 0, 0);
    switch (mode) {
        case 'walk': case 'run': {
            const a = mode === 'run' ? .95 : .55;
            legL.rotation.y = swing(p) * a; legR.rotation.y = -swing(p) * a;
            armL.rotation.y = -swing(p) * a * .9; armR.rotation.y = swing(p) * a * .9;
            lean = mode === 'run' ? .22 : .04; bodyZ = Math.abs(swing(p)) * (mode === 'run' ? .06 : .02);
            break;
        }
        case 'carry': {      // both arms forward, holding something
            legL.rotation.y = swing(p) * .5; legR.rotation.y = -swing(p) * .5;
            armL.rotation.y = -1.25; armR.rotation.y = -1.25; lean = .05;
            break;
        }
        case 'work': {       // hammering / spraying overhead: one arm up and moving, one steadying
            armL.rotation.y = -2.6 + swing(p) * .35; armR.rotation.y = -2.2 - swing(p) * .25; lean = -.05;
            break;
        }
        case 'fight': {      // alternating punches, a little hop
            armL.rotation.y = -1.5 + swing(p) * 1.0; armR.rotation.y = -1.5 - swing(p) * 1.0;
            legL.rotation.y = swing(p * .5) * .35; legR.rotation.y = -swing(p * .5) * .35;
            lean = .18; bodyZ = Math.abs(swing(p * .5)) * .05;
            break;
        }
        case 'handsUp': armL.rotation.y = -3.0; armR.rotation.y = -3.0; break;
        case 'cuffed': armL.rotation.y = .5; armR.rotation.y = .5; lean = .12; break;
        case 'sit': legL.rotation.y = -1.45; legR.rotation.y = -1.45; armL.rotation.y = -.5; armR.rotation.y = -.5; bodyZ = -.4; break;
        case 'crouch': legL.rotation.y = -.9; legR.rotation.y = -.9; lean = .35; bodyZ = -.28; armL.rotation.y = -.6; armR.rotation.y = -.6; break;
        default: armL.rotation.y = swing(p) * .04; armR.rotation.y = -swing(p) * .04; bodyZ = swing(p) * .004;
    }
    person.body.rotation.y = lean;
    person.body.position.z = bodyZ;
}

export function placePerson(person: Person, x: number, y: number, z: number, heading: number) {
    person.root.position.set(x, y, z);
    person.root.rotation.z = heading;
}

// ------------------------------------------------------------------ props: hose and ladder

/** A fire hose drawn as a tube along a few points; rebuilt when the points change. */
export function createHose(): THREE.Mesh {
    const hose = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ name: 'Hose', color: 0xd8b21c, roughness: .7 }));
    hose.castShadow = true; hose.visible = false; hose.userData.collidable = false;
    return hose;
}

export function updateHose(hose: THREE.Mesh, points: THREE.Vector3[]) {
    hose.geometry.dispose();
    if (points.length < 2) { hose.visible = false; return; }
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', .3);
    hose.geometry = new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), .085, 6, false);
    hose.visible = true;
}

export type Ladder = { group: THREE.Group; rungs: THREE.InstancedMesh; rails: THREE.Mesh };
const RUNG_SPACING = .42, MAX_RUNGS = 70;

/** A telescopic ladder lying along +X from its base; `setLadder` orients and lengthens it. */
export function createLadder(): Ladder {
    const group = new THREE.Group(); group.visible = false; group.userData.collidable = false;
    const metal = new THREE.MeshStandardMaterial({ name: 'LadderMetal', color: 0xd9dde2, roughness: .45, metalness: .6 });
    const rails = new THREE.Mesh(new THREE.BoxGeometry(1, .06, .06).translate(.5, 0, 0), metal);
    const railB = rails.clone(); rails.position.y = -.32; railB.position.y = .32; rails.add(railB);
    // `rails` clones share geometry; the second rail is a child so one scale along X lengthens both.
    railB.position.set(0, .64, 0);
    const rungs = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .62, .05), metal, MAX_RUNGS);
    group.add(rails, rungs);
    rails.castShadow = true; rungs.castShadow = true;
    return { group, rungs, rails };
}

const up = new THREE.Vector3(1, 0, 0), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
export function setLadder(ladder: Ladder, base: THREE.Vector3, direction: THREE.Vector3, length: number) {
    ladder.group.visible = length > .05;
    ladder.group.position.copy(base);
    ladder.group.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    ladder.rails.scale.x = Math.max(.01, length);
    const count = Math.min(MAX_RUNGS, Math.floor(length / RUNG_SPACING));
    ladder.rungs.count = count;
    for (let i = 0; i < count; i++) {
        tmpM.compose(new THREE.Vector3((i + .5) * RUNG_SPACING, 0, 0), tmpQ.identity(), new THREE.Vector3(1, 1, 1));
        ladder.rungs.setMatrixAt(i, tmpM);
    }
    ladder.rungs.instanceMatrix.needsUpdate = true;
}
