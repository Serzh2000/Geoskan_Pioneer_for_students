import * as THREE from 'three';
import type { Point2 } from '../environment/training/geography.js';
import type { TrainingLayout } from '../environment/training/layout.js';
import {
    createHose, createLadder, createPerson, giveCuffs, giveSack, placePerson, poseNow, removeCuffs, setLadder, updateHose,
    type Person, type PoseMode
} from './actors.js';
import type { Incident, Responder } from './services.js';

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

// ------------------------------------------------------------------------------------------------- fire

export function createFireCrew(host: CrewHost): Crew {
    const { root, responder } = host;
    const crew = [createPerson('firefighter', 1), createPerson('firefighter', 2), createPerson('firefighter', 3)];
    const hose = createHose();
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(.1, .32, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: .6, depthWrite: false }));
    jet.visible = false; jet.userData.collidable = false;
    crew.forEach(person => { person.root.visible = false; root.add(person.root); });
    root.add(hose, jet);
    let lastHoseKey = '';

    return {
        update(dt) {
            const incident = responder.state === 'working' ? responder.workIncident : null;
            if (!incident || incident.kind !== 'fire') {
                crew.forEach(person => { person.root.visible = false; }); hose.visible = false; jet.visible = false; lastHoseKey = '';
                host.state.fireScale = 1;
                return;
            }
            const p = progress(responder), truck: Point2 = responder;
            const target: Point2 = { x: incident.x, y: incident.y };
            const fromFire = { x: truck.x - target.x, y: truck.y - target.y }, d = Math.hypot(fromFire.x, fromFire.y) || 1;
            const nozzle: Point2 = { x: target.x + fromFire.x / d * 9, y: target.y + fromFire.y / d * 9 };
            const exit = behind(responder, 3.6);
            const extend = smooth(between(p, .02, .26)), retract = smooth(between(p, .84, .98));
            const u = extend * (1 - retract);                       // how far the head of the hose has gone
            const head = lerpPoint(exit, nozzle, u);
            const spraying = p >= .26 && p < .84;
            const [a, b, c] = crew;
            const at = (person: Person, point: Point2, heading: number, mode: PoseMode, speed: number) => {
                person.root.visible = p > .005 && p < .985;
                placePerson(person, point.x, point.y, host.groundAt(point.x, point.y), heading);
                poseNow(person, mode, dt, speed);
            };
            const moving = extend > 0 && extend < 1 || retract > 0 && retract < 1;
            const going = headingTo(exit, nozzle), heading = retract > 0 ? going + Math.PI : going;
            at(a, head, spraying ? headingTo(head, target) : heading, spraying ? 'carry' : 'carry', spraying ? 0 : 1.2);
            at(b, lerpPoint(exit, nozzle, u * .5), spraying ? headingTo(nozzle, target) : heading, moving ? 'walk' : 'carry', moving ? 1.1 : 0);
            at(c, lerpPoint(exit, nozzle, 0.06), spraying ? headingTo(exit, nozzle) : heading, 'work', spraying ? .5 : 0);

            // The hose lies in a gentle S from the engine to the nozzle man and follows him on the way out and back.
            const points: THREE.Vector3[] = [];
            const side = { x: -(head.y - exit.y), y: head.x - exit.x }, sl = Math.hypot(side.x, side.y) || 1;
            for (let i = 0; i <= 6; i++) {
                const t = i / 6, base = lerpPoint(exit, head, t), bend = Math.sin(t * Math.PI) * 1.4;
                const x = base.x + side.x / sl * bend, y = base.y + side.y / sl * bend;
                points.push(new THREE.Vector3(x, y, host.groundAt(x, y) + (i === 6 ? 1.35 : .09)));
            }
            const key = `${Math.round(u * 60)}`;
            if (key !== lastHoseKey) { lastHoseKey = key; updateHose(hose, u > .02 ? points : []); }

            jet.visible = spraying;
            if (spraying) {
                const from = new THREE.Vector3(head.x, head.y, host.groundAt(head.x, head.y) + 1.35);
                const to = new THREE.Vector3(target.x, target.y, host.groundAt(target.x, target.y) + 4.2);
                const dir = to.clone().sub(from), length = dir.length();
                jet.position.copy(from.clone().add(to).multiplyScalar(.5));
                jet.scale.set(1, length, 1);
                jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
                (jet.material as THREE.MeshBasicMaterial).opacity = .5 + .15 * Math.sin(performance.now() / 60);
            }
            // The fire dies down while the jet is on it.
            // Leave visible embers until the service actually reports the fire resolved.
            host.state.fireScale = Math.max(.08, 1 - smooth(between(p, .3, .82)));
        },
        dispose() { crew.forEach(person => person.root.removeFromParent()); hose.removeFromParent(); jet.removeFromParent(); hose.geometry.dispose(); }
    };
}

// ------------------------------------------------------------------------------------------------- repair

export function createRepairCrew(host: CrewHost): Crew {
    const { root, responder } = host;
    const ladder = createLadder();
    const climber = createPerson('worker', 4), mate = createPerson('worker', 5);
    [climber, mate].forEach(person => { person.root.visible = false; root.add(person.root); });
    root.add(ladder.group);
    const torch = new THREE.Mesh(new THREE.IcosahedronGeometry(.18, 0), new THREE.MeshBasicMaterial({ color: 0xfff2ab }));
    torch.userData.collidable = false; torch.name = 'Сварка провода'; torch.visible = false; root.add(torch);
    const base = new THREE.Vector3(), direction = new THREE.Vector3();

    return {
        update(dt) {
            const incident = responder.state === 'working' ? responder.workIncident : null;
            if (!incident || incident.kind !== 'line-break') {
                ladder.group.visible = false; climber.root.visible = false; mate.root.visible = false; torch.visible = false;
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
            const raise = smooth(between(p, .02, .22)) * (1 - smooth(between(p, .88, .99)));
            const length = fullLength * (.2 + .8 * raise) * (p > .005 && p < .995 ? 1 : 0);
            const pitchFull = Math.atan2(targetZ - baseZ, reach), pitch = lerp(.12, pitchFull, raise);
            const azimuth = headingTo(pivot, target);
            direction.set(Math.cos(azimuth) * Math.cos(pitch), Math.sin(azimuth) * Math.cos(pitch), Math.sin(pitch));
            setLadder(ladder, base, direction, length);

            // One worker climbs to the wire, works with a torch and comes back; the other waits at the foot.
            const climb = smooth(between(p, .22, .42)) * (1 - smooth(between(p, .76, .9)));
            const along = Math.max(0, climb * (fullLength - .8));
            const on = base.clone().addScaledVector(direction, along);
            climber.root.visible = p > .02 && p < .97;
            placePerson(climber, on.x, on.y, on.z + .05, azimuth);
            const working = p >= .42 && p < .76;
            torch.visible = working && Math.sin(climber.phase * 4) > -.25;
            torch.position.set(target.x, target.y, target.z);
            poseNow(climber, working ? 'work' : climb > 0 && climb < 1 ? 'walk' : 'idle', dt, working ? 1 : .8);
            const foot = behind(responder, -.2, 2.2);
            mate.root.visible = p > .02 && p < .97;
            placePerson(mate, foot.x, foot.y, host.groundAt(foot.x, foot.y), headingTo(foot, incident));
            poseNow(mate, p < .2 ? 'walk' : 'idle', dt, .6);
            host.state.wireFixed = p > .7;
        },
        dispose() { ladder.group.removeFromParent(); climber.root.removeFromParent(); mate.root.removeFromParent(); torch.removeFromParent(); torch.geometry.dispose(); }
    };
}

// ------------------------------------------------------------------------------------------------- police

export type PoliceCrew = Crew & { capturePrisoner(incident: Incident): void; deliverPrisoner(): void };

export function createPoliceCrew(host: CrewHost): PoliceCrew {
    const { root, responder } = host;
    const officers = [createPerson('police', 6), createPerson('police', 7)];
    const thief = createPerson('thief', 8); giveSack(thief);
    const fighterA = createPerson('fighter', 9), fighterB = createPerson('fighter', 10);
    const everyone = [...officers, thief, fighterA, fighterB];
    everyone.forEach(person => { person.root.visible = false; root.add(person.root); });
    let delivery: { actors: Person[]; from: Point2; to: Point2; t: number } | null = null;
    let prisoner: Person | null = null;
    let chase: { incident: Incident; start: Point2; end: Point2 } | null = null;
    let clock = 0;

    const ground = (point: Point2) => host.groundAt(point.x, point.y);
    const put = (person: Person, point: Point2, heading: number, mode: PoseMode, dt: number, speed = 1) => {
        placePerson(person, point.x, point.y, ground(point), heading);
        poseNow(person, mode, dt, speed);
    };

    function burglary(incident: Incident, dt: number) {
        const prop = host.propAt(incident.x, incident.y);
        const r = prop?.radius ?? 4.7, rot = prop?.rotation ?? 0;
        const front = { x: Math.sin(rot), y: -Math.cos(rot) }, side = { x: Math.cos(rot), y: Math.sin(rot) };
        const doorway: Point2 = { x: incident.x + front.x * (r + 1.1), y: incident.y + front.y * (r + 1.1) };
        const pointOnFront = (s: number): Point2 => ({ x: doorway.x + side.x * s, y: doorway.y + side.y * s });
        const working = responder.state === 'working' && responder.workIncident === incident;
        const p = working ? progress(responder) : 0;
        thief.root.visible = !incident.resolved && incident.active;
        if (!thief.root.visible) return;
        if (!working) {
            // Before anyone arrives: creeping along the wall with the sack, ducking now and then.
            const s = Math.sin(clock * .6) * 3.2, heading = Math.cos(clock * .6) >= 0 ? Math.atan2(side.y, side.x) : Math.atan2(-side.y, -side.x);
            put(thief, pointOnFront(s), heading, Math.sin(clock * 1.7) > .6 ? 'crouch' : 'walk', dt, .6);
            return;
        }
        // Police arrive: he bolts along the wall, is caught, handcuffed and walked to the car.
        if (chase?.incident !== incident) {
            const sideSign = Math.sign(Math.sin(clock * .6) || 1);
            chase = { incident, start: { x: thief.root.position.x, y: thief.root.position.y }, end: pointOnFront(-8 * sideSign) };
        }
        const car: Point2 = responder, catchPoint = chase.end;
        const runT = between(p, .08, .4), escort = smooth(between(p, .6, .9));
        const start = chase.start;
        const spot = escort > 0 ? lerpPoint(catchPoint, car, escort) : lerpPoint(start, catchPoint, smooth(runT));
        const phase: PoseMode = p < .08 ? 'crouch' : p < .4 ? 'run' : p < .6 ? 'handsUp' : 'walk';
        if (p >= .5) { giveCuffs(thief); prisoner = thief; } else removeCuffs(thief);
        thief.root.visible = p < .93;
        put(thief, spot, escort > 0 ? headingTo(spot, car) : headingTo(start, catchPoint), p >= .5 && p < .6 ? 'cuffed' : phase, dt, 1.2);
        // Officers: out of the car, running after him, flanking him on the walk back.
        const [o1, o2] = officers;
        for (const [i, officer] of [o1, o2].entries()) {
            const side2 = i === 0 ? 1.1 : -1.1;
            const out = behind(responder, -1, side2 * 2);
            const chase = lerpPoint(out, { x: spot.x + side.x * side2 * .9, y: spot.y + side.y * side2 * .9 }, smooth(between(p, .02, .42)));
            const flank = escort > 0 ? lerpPoint(chase, { x: lerp(spot.x, car.x, 0) + side2 * .9, y: spot.y }, 1) : chase;
            const where = p < .6 ? chase : { x: flank.x, y: flank.y };
            officer.root.visible = p > .01 && p < .96;
            const mode: PoseMode = p < .42 ? 'run' : p < .6 ? 'idle' : 'walk';
            put(officer, where, headingTo(where, p < .6 ? spot : car), mode, dt, 1.2);
        }
    }

    function fight(incident: Incident, dt: number) {
        const centre: Point2 = { x: incident.x, y: incident.y };
        const working = responder.state === 'working' && responder.workIncident === incident;
        const p = working ? progress(responder) : 0;
        const show = !incident.resolved && incident.active;
        fighterA.root.visible = show; fighterB.root.visible = show;
        if (!show) return;
        // Two men lunging at each other; the brawl drifts a little.
        const lunge = .5 + .35 * Math.sin(clock * 5);
        const orbit = clock * .35;
        const dir = { x: Math.cos(orbit), y: Math.sin(orbit) };
        let a: Point2 = { x: centre.x - dir.x * lunge, y: centre.y - dir.y * lunge }, b: Point2 = { x: centre.x + dir.x * lunge, y: centre.y + dir.y * lunge };
        let modeA: PoseMode = 'fight', modeB: PoseMode = 'fight';
        const car: Point2 = responder;
        const [o1, o2] = officers;
        if (working) {
            const apart = smooth(between(p, .25, .5));
            a = lerpPoint(a, { x: centre.x - dir.x * 1.8, y: centre.y - dir.y * 1.8 }, apart);
            b = lerpPoint(b, { x: centre.x + dir.x * 2.4, y: centre.y + dir.y * 2.4 }, apart);
            modeA = p < .2 ? 'fight' : p < .6 ? 'handsUp' : 'walk'; modeB = p < .2 ? 'fight' : p < .6 ? 'handsUp' : 'walk';
            const escort = smooth(between(p, .6, .9));
            a = escort > 0 ? lerpPoint(a, car, escort) : a;
            b = p > .65 ? lerpPoint(b, { x: b.x + dir.x * 14, y: b.y + dir.y * 14 }, smooth(between(p, .65, .95))) : b;
            if (p >= .45) { giveCuffs(fighterA); prisoner = fighterA; } else removeCuffs(fighterA);
            if (p >= .45 && p < .6) modeA = 'cuffed';
            fighterA.root.visible = p < .93; fighterB.root.visible = p < .96;
            const out1 = behind(responder, -1, 2), out2 = behind(responder, -1, -2);
            const near1 = lerpPoint(out1, { x: a.x - dir.y * 1.1, y: a.y + dir.x * 1.1 }, smooth(between(p, .02, .25)));
            const near2 = lerpPoint(out2, { x: b.x + dir.y * 1.1, y: b.y - dir.x * 1.1 }, smooth(between(p, .02, .25)));
            const w1 = escort > 0 ? { x: a.x - dir.y * 1.1, y: a.y + dir.x * 1.1 } : near1;
            officers.forEach(o => { o.root.visible = p > .01 && p < .96; });
            put(o1, w1, headingTo(w1, escort > 0 ? car : a), p < .25 ? 'run' : escort > 0 ? 'walk' : 'idle', dt, 1.2);
            put(o2, near2, headingTo(near2, b), p < .25 ? 'run' : p > .65 ? 'walk' : 'idle', dt, 1.2);
        }
        put(fighterA, a, headingTo(a, b), modeA, dt, 1.3);
        put(fighterB, b, headingTo(b, a), modeB, dt, 1.3);
    }

    return {
        update(dt) {
            clock += dt;
            const incidents = host.incidents;
            const burglaryIncident = incidents.find(i => i.kind === 'burglary');
            const fightIncident = incidents.find(i => i.kind === 'fight');
            const policeActive = responder.state === 'working' && responder.workIncident;
            if (!policeActive) officers.forEach(o => { o.root.visible = false; });
            if (burglaryIncident) burglary(burglaryIncident, dt); else thief.root.visible = false;
            if (fightIncident) fight(fightIncident, dt); else { fighterA.root.visible = false; fighterB.root.visible = false; }
            if (responder.state === 'returning' && responder.prisoner && prisoner && !delivery) {
                // The same arrested actor rides in the rear seat, following the car's actual pose.
                const c = Math.cos(responder.heading), s = Math.sin(responder.heading);
                placePerson(prisoner, responder.x - c * .65 - s * .3, responder.y - s * .65 + c * .3,
                    host.truck.position.z + .05, responder.heading);
                poseNow(prisoner, 'sit', dt, 0);
                prisoner.root.visible = true;
            }
            if (delivery) {
                delivery.t += dt / 4.5;
                const t = clamp01(delivery.t);
                delivery.actors.forEach((person, i) => {
                    const spot = lerpPoint(delivery!.from, delivery!.to, t);
                    put(person, { x: spot.x + (i - 1) * .7, y: spot.y }, headingTo(delivery!.from, delivery!.to), 'walk', dt, 1);
                    person.root.visible = t < .97;
                });
                if (delivery.t >= 1) { delivery.actors.forEach(person => { person.root.visible = false; }); removeCuffs(delivery.actors[1]); delivery = null; prisoner = null; }
            }
        },
        capturePrisoner(incident) {
            prisoner = incident.kind === 'fight' ? fighterA : incident.kind === 'burglary' ? thief : null;
            if (prisoner) giveCuffs(prisoner);
        },
        deliverPrisoner() {
            if (!host.stationDoor || !prisoner) return;
            const from: Point2 = { x: responder.x, y: responder.y };
            giveCuffs(prisoner);
            delivery = { actors: [officers[0], prisoner, officers[1]], from, to: host.stationDoor, t: 0 };
        },
        dispose() { everyone.forEach(person => person.root.removeFromParent()); }
    };
}
