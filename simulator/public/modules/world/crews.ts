import * as THREE from 'three';
import type { Point2 } from '../environment/training/geography.js';
import type { TrainingLayout } from '../environment/training/layout.js';
import {
    createHose, createLadder, createPerson, giveCuffs, giveSack, placePerson, poseNow, removeCuffs, setLadder, updateHose,
    type Person, type PoseMode
} from './actors.js';
import type { Incident, Responder } from './services.js';
import { Gait, Mover, RUN_SPEED, WALK_SPEED, type Solid } from './walkers.js';

/*
 * Choreography of the three crews. Each one reads the progress of its work phase from the service
 * (p = 0..1, derived from the work timer) and moves its people, hose, ladder and the incident's own actors to match,
 * so the picture always agrees with the protocol: nothing is put out, repaired or arrested before the service says so.
 *
 *   fire     hose rolled out from the engine, a jet at the flames that shrink, hose rolled back
 *   repair   a telescopic ladder rises from the truck to the broken wire, a worker climbs, welds and comes down
 *   police   officers chase the suspect, cuff him, walk him to the car; a fight is broken up and the aggressor is taken
 */
export type CrewState = { fireScale: number; wireFixed: boolean; wireZ: number; wirePoint?: Point2 & { z: number } };
export type CrewHost = {
    root: THREE.Group;
    layout: TrainingLayout;
    responder: Responder;
    truck: THREE.Object3D;
    incidents: Incident[];
    state: CrewState;
    groundAt(x: number, y: number): number;
    /** The building (position, facing, radius) a burglary happens at. */
    propAt(x: number, y: number): { x: number; y: number; rotation: number; radius: number } | null;
    /** Where the police crew's station door is (the point prisoners are walked to). */
    stationDoor?: Point2;
};
export type Crew = { update(dt: number): void; dispose(): void };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPoint = (a: Point2, b: Point2, t: number): Point2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const headingTo = (from: Point2, to: Point2) => Math.atan2(to.y - from.y, to.x - from.x);
/** Ramp of progress between two instants. */
const between = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

function progress(responder: Responder): number {
    return responder.workTotal > 0 ? clamp01(1 - responder.timer / responder.workTotal) : 0;
}
function behind(truck: Responder, distance: number, side = 0): Point2 {
    const c = Math.cos(truck.heading), s = Math.sin(truck.heading);
    return { x: truck.x - c * distance - s * side, y: truck.y - s * distance + c * side };
}


/** Things a person walks around, not through (radii are conservative envelopes of the meshes, hence the 0.85). */
const SOLID_TYPES: ReadonlySet<string> = new Set(['tree', 'building', 'house', 'warehouse', 'station', 'water-tower', 'barn', 'silo', 'church', 'fire-station',
    'police-station', 'school', 'hospital', 'restaurant', 'mall', 'office', 'gas-station', 'hangar', 'greenhouse', 'power-pylon', 'containers', 'rocks', 'solar', 'gantry-crane']);
export const SOLID_SHRINK = .85;
export function solidsOf(layout: Pick<TrainingLayout, 'objects'>): Solid[] {
    return layout.objects.filter(o => SOLID_TYPES.has(o.type)).map(o => ({ x: o.x, y: o.y, r: o.radius * SOLID_SHRINK + .06 }));
}
/** The nearest point outside every solid (a door in the wall of a building is reached from the pavement in front of it). */
function outsideSolids(point: Point2, solids: ReadonlyArray<Solid>): Point2 {
    let { x, y } = point;
    for (let pass = 0; pass < 3; pass++) for (const s of solids) {
        const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy);
        if (d < s.r) { const k = s.r / (d || 1); x = d ? s.x + dx * k : s.x + s.r; y = d ? s.y + dy * k : s.y; }
    }
    return { x, y };
}

/**
 * One actor of a crew: the figure, the body that carries it (a Mover) and whether it is on show. Showing a hidden actor
 * puts it down at the given spot (a door of the vehicle); from then on it only ever walks.
 */
class Actor {
    readonly mover: Mover;
    shown = false;
    constructor(readonly person: Person, ground: (x: number, y: number) => number, solids: ReadonlyArray<Solid>) {
        this.mover = new Mover(person, ground); this.mover.solids = solids;
    }
    get x() { return this.mover.x; }
    get y() { return this.mover.y; }
    show(on: boolean, spawn: Point2, heading: number) {
        if (on && !this.shown) this.mover.reset(spawn.x, spawn.y, heading);
        this.shown = on; this.person.root.visible = on;
    }
    /** Walk or run to `goal` and face `face` there; `pace` fixes the speed, otherwise the actor runs when far behind. */
    go(dt: number, goal: Point2, o: { face?: number; still?: PoseMode; carry?: boolean; pace?: number } = {}) {
        if (!this.shown) return;
        const far = Math.hypot(goal.x - this.mover.x, goal.y - this.mover.y);
        this.mover.drive(dt, goal, { ...o, pace: o.pace ?? (far > 4 ? RUN_SPEED : WALK_SPEED) });
    }
    /** Scripted pose that moves itself (a brawl): the figure is placed directly, but never faster than a person can go. */
    scripted(dt: number, point: Point2, heading: number, mode: PoseMode, speed: number) {
        const m = this.mover;
        m.x = point.x; m.y = point.y; m.heading = heading; m.speed = 0;
        m.z = m.ground(point.x, point.y);
        placePerson(this.person, point.x, point.y, m.z, heading);
        poseNow(this.person, mode, dt, speed);
    }
}

// ------------------------------------------------------------------------------------------------- fire

export function createFireCrew(host: CrewHost): Crew {
    const { root, responder } = host;
    const solids = solidsOf(host.layout);
    const crew = [1, 2, 3].map(seed => new Actor(createPerson('firefighter', seed), host.groundAt, solids));
    const hose = createHose();
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(.1, .32, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: .6, depthWrite: false }));
    jet.visible = false; jet.userData.collidable = false;
    crew.forEach(actor => { actor.person.root.visible = false; root.add(actor.person.root); });
    root.add(hose, jet);
    let lastHoseKey = '';

    return {
        update(dt) {
            const incident = responder.state === 'working' ? responder.workIncident : null;
            if (!incident || incident.kind !== 'fire') {
                crew.forEach(actor => { actor.show(false, responder, 0); }); hose.visible = false; jet.visible = false; lastHoseKey = '';
                host.state.fireScale = 1;
                return;
            }
            const p = progress(responder), truck: Point2 = responder;
            const target: Point2 = { x: incident.x, y: incident.y };
            const fromFire = { x: truck.x - target.x, y: truck.y - target.y }, d = Math.hypot(fromFire.x, fromFire.y) || 1;
            const nozzle: Point2 = outsideSolids({ x: target.x + fromFire.x / d * 9, y: target.y + fromFire.y / d * 9 }, solids);
            const exit = behind(responder, 3.6);
            const extend = smooth(between(p, .02, .26)), retract = smooth(between(p, .76, .97));
            const u = extend * (1 - retract);                       // how far the head of the hose is meant to be
            const scriptHead = lerpPoint(exit, nozzle, u);
            const spraying = p >= .26 && p < .76;
            const [a, b, c] = crew;
            const on = p > .005 && p < .985;
            // They climb out of the cab on the far side of the engine and chase the hose head, the second man half way.
            const door = (i: number) => behind(responder, -.6, 1.7 + i * .8);
            const facing = headingTo(exit, nozzle);
            crew.forEach((actor, i) => actor.show(on, door(i), facing));
            a.go(dt, scriptHead, { face: spraying ? headingTo(a, target) : facing, still: 'carry', carry: true });
            b.go(dt, lerpPoint(exit, nozzle, u * .5), { face: spraying ? headingTo(b, target) : facing, still: 'idle' });
            c.go(dt, lerpPoint(exit, nozzle, .06), { face: spraying ? facing : headingTo(c, nozzle), still: spraying ? 'work' : 'idle' });
            const head: Point2 = a.shown ? { x: a.x, y: a.y } : scriptHead;

            // The hose lies in a gentle S from the engine to the nozzle man and follows him on the way out and back.
            const points: THREE.Vector3[] = [];
            const side = { x: -(head.y - exit.y), y: head.x - exit.x }, sl = Math.hypot(side.x, side.y) || 1;
            for (let i = 0; i <= 6; i++) {
                const t = i / 6, base = lerpPoint(exit, head, t), bend = Math.sin(t * Math.PI) * 1.4;
                const x = base.x + side.x / sl * bend, y = base.y + side.y / sl * bend;
                points.push(new THREE.Vector3(x, y, host.groundAt(x, y) + (i === 6 ? 1.35 : .09)));
            }
            const hoseLength = Math.hypot(head.x - exit.x, head.y - exit.y);
            const key = `${Math.round(hoseLength * 6)}`;
            if (key !== lastHoseKey) { lastHoseKey = key; updateHose(hose, hoseLength > .5 ? points : []); }

            jet.visible = spraying;
            if (spraying) {
                const from = new THREE.Vector3(head.x, head.y, host.groundAt(head.x, head.y) + 1.35);
                const to = new THREE.Vector3(target.x, target.y, host.groundAt(target.x, target.y) + 4.2);
                const dir = to.clone().sub(from), length = dir.length();
                jet.position.copy(from.clone().add(to).multiplyScalar(.5));
                jet.scale.set(1, length, 1);
                jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
                (jet.material as THREE.MeshBasicMaterial).opacity = .5 + .15 * Math.sin(p * 400);
            }
            // The fire dies down while the jet is on it.
            // Leave visible embers until the service actually reports the fire resolved.
            host.state.fireScale = Math.max(.08, 1 - smooth(between(p, .3, .74)));
        },
        dispose() { crew.forEach(actor => actor.person.root.removeFromParent()); hose.removeFromParent(); jet.removeFromParent(); hose.geometry.dispose(); }
    };
}

// ------------------------------------------------------------------------------------------------- repair

export function createRepairCrew(host: CrewHost): Crew {
    const { root, responder } = host;
    const ladder = createLadder();
    const solids = solidsOf(host.layout);
    const climber = createPerson('worker', 4), mateActor = new Actor(createPerson('worker', 5), host.groundAt, solids), mate = mateActor.person;
    const climbGait = new Gait(climber);
    [climber, mate].forEach(person => { person.root.visible = false; root.add(person.root); });
    root.add(ladder.group);
    const torch = new THREE.Mesh(new THREE.IcosahedronGeometry(.18, 0), new THREE.MeshBasicMaterial({ color: 0xfff2ab }));
    torch.userData.collidable = false; torch.name = 'Сварка провода'; torch.visible = false; root.add(torch);
    const base = new THREE.Vector3(), direction = new THREE.Vector3(), lastOn = new THREE.Vector3();
    let climberShown = false;

    return {
        update(dt) {
            const incident = responder.state === 'working' ? responder.workIncident : null;
            if (!incident || incident.kind !== 'line-break') {
                ladder.group.visible = false; climber.root.visible = false; climberShown = false; mateActor.show(false, responder, 0); torch.visible = false;
                host.state.wireFixed = false;
                return;
            }
            const p = progress(responder);
            const c = Math.cos(responder.heading), s = Math.sin(responder.heading);
            // The ladder is hinged on the truck bed, a little behind the cab.
            const pivot: Point2 = { x: responder.x - c * 1.4, y: responder.y - s * 1.4 };
            const baseZ = host.groundAt(pivot.x, pivot.y) + 2.5;
            base.set(pivot.x, pivot.y, baseZ);
            const target = host.state.wirePoint ?? { x: incident.x, y: incident.y, z: host.groundAt(incident.x, incident.y) + host.state.wireZ };
            const reach = Math.hypot(target.x - pivot.x, target.y - pivot.y);
            const targetZ = target.z;
            const fullLength = Math.hypot(reach, targetZ - baseZ) + .4;
            const raise = smooth(between(p, .02, .22)) * (1 - smooth(between(p, .9, .99)));
            const length = fullLength * (.2 + .8 * raise) * (p > .005 && p < .995 ? 1 : 0);
            const pitchFull = Math.atan2(targetZ - baseZ, reach), pitch = lerp(.12, pitchFull, raise);
            const azimuth = headingTo(pivot, target);
            direction.set(Math.cos(azimuth) * Math.cos(pitch), Math.sin(azimuth) * Math.cos(pitch), Math.sin(pitch));
            setLadder(ladder, base, direction, length);

            // One worker climbs to the wire, works with a torch and comes back; the other waits at the foot.
            const climb = smooth(between(p, .12, .44)) * (1 - smooth(between(p, .56, .88)));
            const along = Math.max(0, climb * (fullLength - .8));
            const on = base.clone().addScaledVector(direction, along);
            const showClimber = p > .02 && p < .97;
            climber.root.visible = showClimber;
            placePerson(climber, on.x, on.y, on.z + .05, azimuth);
            // His legs climb as fast as he rises: the stride follows the ground (the ladder) he covers.
            const climbSpeed = showClimber && climberShown ? on.distanceTo(lastOn) / dt : 0;
            lastOn.copy(on); climberShown = showClimber;
            const working = p >= .44 && p < .56;
            torch.visible = working && Math.sin(p * 600) > -.25;
            torch.position.set(target.x, target.y, target.z);
            climbGait.update(dt, climbSpeed, working ? 'work' : 'idle');
            // The mate climbs down from the cab, steps to the foot of the ladder and watches it.
            const foot = outsideSolids(behind(responder, -.2, 2.2), solids);
            mateActor.show(showClimber, behind(responder, -.6, 1.3), headingTo(foot, incident));
            mateActor.go(dt, foot, { face: headingTo(foot, incident), pace: WALK_SPEED });
            host.state.wireFixed = p > .5;
        },
        dispose() { ladder.group.removeFromParent(); climber.root.removeFromParent(); mate.root.removeFromParent(); torch.removeFromParent(); torch.geometry.dispose(); }
    };
}

// ------------------------------------------------------------------------------------------------- police

export type PoliceCrew = Crew & { capturePrisoner(incident: Incident): void; deliverPrisoner(): void };

export function createPoliceCrew(host: CrewHost): PoliceCrew {
    const { root, responder } = host;
    const solids = solidsOf(host.layout);
    const mk = (role: 'police' | 'thief' | 'fighter', seed: number) => new Actor(createPerson(role, seed), host.groundAt, solids);
    const officers = [mk('police', 6), mk('police', 7)];
    const thief = mk('thief', 8); giveSack(thief.person);
    const fighterA = mk('fighter', 9), fighterB = mk('fighter', 10);
    const everyone = [...officers, thief, fighterA, fighterB];
    everyone.forEach(actor => { actor.person.root.visible = false; root.add(actor.person.root); });
    let delivery: { actors: Actor[]; goals: Point2[]; time: number } | null = null;
    let prisoner: Actor | null = null;
    let chase: { incident: Incident; start: Point2; end: Point2 } | null = null;
    let patrol = { end: 1, wait: 1.2 };
    let clock = 0;
    const carDoor = (side: number): Point2 => behind(responder, -1, side * 2);

    function burglary(incident: Incident, dt: number) {
        const prop = host.propAt(incident.x, incident.y);
        const r = prop?.radius ?? 4.7, rot = prop?.rotation ?? 0;
        const front = { x: Math.sin(rot), y: -Math.cos(rot) }, side = { x: Math.cos(rot), y: Math.sin(rot) };
        const doorway: Point2 = { x: incident.x + front.x * (r + 1.1), y: incident.y + front.y * (r + 1.1) };
        const pointOnFront = (s: number): Point2 => outsideSolids({ x: doorway.x + side.x * s, y: doorway.y + side.y * s }, solids);
        const working = responder.state === 'working' && responder.workIncident === incident;
        const p = working ? progress(responder) : 0;
        const show = !incident.resolved && incident.active && (!working || p < .93);
        thief.show(show, pointOnFront(0), Math.atan2(side.y, side.x));
        if (!working) {
            if (!show) return;
            // Before anyone arrives: creeping along the wall with the sack, stopping at each end to look round.
            const goal = pointOnFront(patrol.end * 3.2);
            if (Math.hypot(goal.x - thief.x, goal.y - thief.y) < .25) {
                patrol.wait -= dt;
                if (patrol.wait <= 0) patrol = { end: -patrol.end, wait: 1.5 + (Math.floor(clock) % 3) };
                thief.go(dt, goal, { still: patrol.wait > .6 ? 'crouch' : 'idle', face: Math.atan2(front.y, front.x), pace: .9 });
            } else thief.go(dt, goal, { pace: .9 });
            return;
        }
        // Police arrive: he bolts along the wall away from the car, is caught, handcuffed and walked to the car.
        if (chase?.incident !== incident) {
            const ends = [pointOnFront(-8), pointOnFront(8)];
            const far = ends.sort((x, y) => Math.hypot(y.x - responder.x, y.y - responder.y) - Math.hypot(x.x - responder.x, x.y - responder.y))[0];
            chase = { incident, start: { x: thief.x, y: thief.y }, end: far };
        }
        const car: Point2 = responder, catchPoint = chase.end;
        const runT = between(p, .06, .34), escort = smooth(between(p, .52, .88));
        const start = chase.start;
        const spot = escort > 0 ? lerpPoint(catchPoint, car, escort) : lerpPoint(start, catchPoint, smooth(runT));
        if (p >= .4) { giveCuffs(thief.person); prisoner = thief; } else removeCuffs(thief.person);
        const still: PoseMode = p < .06 ? 'crouch' : p >= .44 && p < .52 ? 'cuffed' : p < .52 ? 'handsUp' : 'idle';
        // (the suspect gets into the car just before the officers are done, but they keep walking until they are)
        thief.go(dt, spot, { face: headingTo(start, catchPoint), still, pace: p < .34 ? RUN_SPEED : WALK_SPEED });
        // Officers: out of the car, running after him, flanking him on the walk back.
        officers.forEach((officer, i) => {
            const side2 = i === 0 ? 1.1 : -1.1;
            const out = carDoor(side2 / 1.1);
            const chasing = lerpPoint(out, { x: spot.x + side.x * side2 * .9, y: spot.y + side.y * side2 * .9 }, smooth(between(p, .02, .34)));
            const where = p < .52 ? chasing : { x: spot.x + side2 * .9, y: spot.y };
            officer.show(p > .01 && p < .96, out, headingTo(out, spot));
            officer.go(dt, where, { face: headingTo(where, p < .52 ? spot : car), still: 'idle' });
        });
    }

    function fight(incident: Incident, dt: number) {
        const centre: Point2 = { x: incident.x, y: incident.y };
        const working = responder.state === 'working' && responder.workIncident === incident;
        const p = working ? progress(responder) : 0;
        const show = !incident.resolved && incident.active;
        // Two men lunging at each other; the brawl drifts a little.
        const lunge = .5 + .35 * Math.sin(clock * 5);
        const orbit = clock * .35;
        const dir = { x: Math.cos(orbit), y: Math.sin(orbit) };
        let a: Point2 = { x: centre.x - dir.x * lunge, y: centre.y - dir.y * lunge }, b: Point2 = { x: centre.x + dir.x * lunge, y: centre.y + dir.y * lunge };
        fighterA.show(show && (!working || p < .93), a, headingTo(a, b)); fighterB.show(show && (!working || p < .96), b, headingTo(b, a));
        if (!show) return;
        if (!working) {
            fighterA.scripted(dt, a, headingTo(a, b), 'fight', 1.3);
            fighterB.scripted(dt, b, headingTo(b, a), 'fight', 1.3);
            return;
        }
        const car: Point2 = responder;
        const apart = smooth(between(p, .2, .4));
        const aTo = lerpPoint(a, { x: centre.x - dir.x * 1.8, y: centre.y - dir.y * 1.8 }, apart);
        const bTo = lerpPoint(b, { x: centre.x + dir.x * 2.4, y: centre.y + dir.y * 2.4 }, apart);
        const escort = smooth(between(p, .52, .88));
        a = escort > 0 ? lerpPoint(aTo, car, escort) : aTo;
        b = p > .55 ? lerpPoint(bTo, { x: bTo.x + dir.x * 14, y: bTo.y + dir.y * 14 }, smooth(between(p, .55, .94))) : bTo;
        if (p >= .4) { giveCuffs(fighterA.person); prisoner = fighterA; } else removeCuffs(fighterA.person);
        // The brawl goes on until the officers are on them; then the men are pulled apart and walk, they do not slide.
        if (p < .2) {
            fighterA.scripted(dt, a, headingTo(a, b), 'fight', 1.3);
            fighterB.scripted(dt, b, headingTo(b, a), 'fight', 1.3);
        } else {
            fighterA.go(dt, a, { still: p >= .4 && p < .52 ? 'cuffed' : 'handsUp', face: headingTo(a, b), pace: escort > 0 ? WALK_SPEED : undefined });
            fighterB.go(dt, b, { still: 'handsUp', face: headingTo(b, a), pace: p > .55 ? WALK_SPEED : undefined });
        }
        const out1 = carDoor(1), out2 = carDoor(-1);
        const near1 = lerpPoint(out1, { x: a.x - dir.y * 1.1, y: a.y + dir.x * 1.1 }, smooth(between(p, .02, .22)));
        const near2 = lerpPoint(out2, { x: b.x + dir.y * 1.1, y: b.y - dir.x * 1.1 }, smooth(between(p, .02, .22)));
        const w1 = escort > 0 ? { x: a.x - dir.y * 1.1, y: a.y + dir.x * 1.1 } : near1;
        officers.forEach((o, i) => o.show(p > .01 && p < .96, i === 0 ? out1 : out2, headingTo(i === 0 ? out1 : out2, centre)));
        officers[0].go(dt, w1, { face: headingTo(w1, escort > 0 ? car : a), still: 'idle' });
        officers[1].go(dt, near2, { face: headingTo(near2, b), still: 'idle' });
    }

    return {
        update(dt) {
            clock += dt;
            const incidents = host.incidents;
            const burglaryIncident = incidents.find(i => i.kind === 'burglary');
            const fightIncident = incidents.find(i => i.kind === 'fight');
            const policeActive = responder.state === 'working' && responder.workIncident;
            if (!policeActive && !delivery) officers.forEach(o => { o.show(false, responder, 0); });
            if (burglaryIncident) burglary(burglaryIncident, dt); else thief.show(false, responder, 0);
            if (fightIncident) fight(fightIncident, dt); else { fighterA.show(false, responder, 0); fighterB.show(false, responder, 0); }
            if (responder.state === 'returning' && responder.prisoner && prisoner && !delivery) {
                // The same arrested actor rides in the rear seat, following the car's actual pose.
                const c = Math.cos(responder.heading), s = Math.sin(responder.heading);
                prisoner.mover.heading = responder.heading;
                placePerson(prisoner.person, responder.x - c * .65 - s * .3, responder.y - s * .65 + c * .3,
                    host.truck.position.z + .05, responder.heading);
                poseNow(prisoner.person, 'sit', dt, 0);
                prisoner.shown = true; prisoner.person.root.visible = true;
            }
            if (delivery) {
                delivery.time += dt;
                let done = true;
                delivery.actors.forEach((actor, i) => {
                    const goal = delivery!.goals[i];
                    const left = actor.mover.drive(dt, goal, { pace: WALK_SPEED, still: 'idle', face: headingTo(actor, goal) });
                    if ((left > .4 && !actor.mover.blocked) || actor.mover.speed > .1) done = false;
                });
                if (done || delivery.time > 60) {
                    delivery.actors.forEach(actor => actor.show(false, responder, 0));
                    removeCuffs(delivery.actors[1].person); delivery = null; prisoner = null;
                }
            }
        },
        capturePrisoner(incident) {
            prisoner = incident.kind === 'fight' ? fighterA : incident.kind === 'burglary' ? thief : null;
            if (prisoner) giveCuffs(prisoner.person);
        },
        deliverPrisoner() {
            if (!host.stationDoor || !prisoner) return;
            const door = outsideSolids(host.stationDoor, solids);
            giveCuffs(prisoner.person);
            // The officers get out of the car on both sides and the prisoner from the rear seat; they walk to the door together.
            const seat = { x: prisoner.person.root.position.x, y: prisoner.person.root.position.y };
            officers[0].show(true, carDoor(1), responder.heading); officers[1].show(true, carDoor(-1), responder.heading);
            prisoner.shown = false; prisoner.show(true, seat, responder.heading);
            const toDoor = headingTo(responder, door), nx = -Math.sin(toDoor), ny = Math.cos(toDoor);
            delivery = { actors: [officers[0], prisoner, officers[1]], time: 0,
                goals: [-1, 0, 1].map(k => outsideSolids({ x: door.x + nx * k * .8, y: door.y + ny * k * .8 }, solids)) };
        },
        dispose() { everyone.forEach(actor => actor.person.root.removeFromParent()); }
    };
}
