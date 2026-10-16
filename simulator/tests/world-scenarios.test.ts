import * as THREE from 'three';
import { generateTrainingLayout } from '../public/modules/environment/training/layout.js';
import { trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import { buildRoadGraph, findRoute } from '../public/modules/world/roads.js';
import { findPoliceSite, findStationSite, planIncidents } from '../public/modules/world/incidents.js';
import { createWorldServices, type Incident, type Responder } from '../public/modules/world/services.js';
import { droneHull, receiveMessage, resetMailbox, sendMessage, SERVICE_HULLS } from '../public/modules/world/mailbox.js';
import { createFireCrew, createPoliceCrew, createRepairCrew, type Crew, type CrewState, type PoliceCrew } from '../public/modules/world/crews.js';

/*
 * The three end-to-end scenarios from the user's brief, run without a renderer on a real generated city:
 *   1. a drone finds a broken power line and calls the repair crew: truck, ladder, workers, wire repaired, they leave
 *   2. a drone sees a burning building and calls the fire brigade: hose, jet, fire dies down, they leave
 *   3. a drone sees a burglary (or a fight) and calls the police: officers, arrest, prisoner taken to the station
 * Plus the wrong-coordinates case: the crew arrives, finds nothing and leaves with nothing to show.
 */
const layout = generateTrainingLayout({ profile: 'city', seed: 20261009 });
const graph = buildRoadGraph(layout.paths);

function world() {
    resetMailbox();
    const incidents: Incident[] = planIncidents(layout).map(i => ({ ...i, startAt: 0 }));
    const fireSite = findStationSite(layout)!, policeSite = findPoliceSite(layout)!;
    const park = (s: { x: number; y: number; rotation: number }, bay: number, depth: number) => {
        const f = { x: Math.sin(s.rotation), y: -Math.cos(s.rotation) }, r = { x: Math.cos(s.rotation), y: Math.sin(s.rotation) };
        return { x: s.x + f.x * depth + r.x * bay, y: s.y + f.y * depth + r.y * bay, heading: Math.atan2(f.y, f.x) };
    };
    const services = createWorldServices({
        incidents,
        homes: { fire: park(fireSite, 0, 7.6), repair: park(fireSite, -6.5, 7.6), police: park(policeSite, -2.4, 8) },
        route: (from, to) => findRoute(graph, from, to)
    });
    const root = new THREE.Group();
    const state: CrewState = { fireScale: 1, wireFixed: false, wireZ: 10 };
    const crews: Crew[] = []; let police: PoliceCrew | null = null;
    for (const responder of services.responders) {
        const host = {
            root, layout, responder, truck: new THREE.Group(), incidents, state,
            groundAt: (x: number, y: number) => trainingHeightAt(layout, x, y),
            propAt: (x: number, y: number) => { const o = layout.objects.find(p => (p.type === 'building' || p.type === 'house') && Math.hypot(p.x - x, p.y - y) < 2); return o ? { x: o.x, y: o.y, rotation: o.rotation ?? 0, radius: o.radius } : null; },
            stationDoor: { x: policeSite.x, y: policeSite.y }
        };
        if (responder.kind === 'fire') crews.push(createFireCrew(host));
        else if (responder.kind === 'repair') crews.push(createRepairCrew(host));
        else { police = createPoliceCrew(host); crews.push(police); }
    }
    services.onEvent(event => { if (event.type === 'home' && event.responder.kind === 'police' && event.responder.prisoner) police?.deliverPrisoner(); });
    const drone = droneHull('probe');
    const inbox = () => { const out: string[] = []; for (let m = receiveMessage(drone); m; m = receiveMessage(drone)) out.push(`${m.from}:${m.text}`); return out; };
    const tick = (dt = .1) => { services.update(dt); crews.forEach(crew => crew.update(dt)); };
    const run = (seconds: number, each?: () => void) => { for (let t = 0; t < seconds; t += .1) { tick(); each?.(); } };
    return { incidents, services, root, state, drone, inbox, tick, run, responder: (kind: Responder['kind']) => services.responders.find(r => r.kind === kind)! };
}

const shown = (o: THREE.Object3D) => { for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false; return true; };
const meshesVisible = (root: THREE.Object3D, predicate: (o: THREE.Object3D) => boolean) => { let found = false; root.traverse(o => { if (shown(o) && predicate(o)) found = true; }); return found; };
const peopleOnScene = (root: THREE.Object3D, role?: string) => root.children.filter(c => c.userData.person && c.visible && (!role || c.userData.role === role)).length;

describe('scenario 1: broken power line', () => {
    it('the repair crew arrives, raises the ladder to the wire, fixes it and leaves', () => {
        const w = world();
        const wire = w.incidents.find(i => i.kind === 'line-break')!;
        w.run(.2);
        sendMessage(w.drone, SERVICE_HULLS.repair, `repair ${Math.round(wire.x)} ${Math.round(wire.y)}`);
        expect(w.inbox()[0]).toMatch(/^103:accepted \d+$/);
        const truck = w.responder('repair');
        let maxLadder = 0, climbed = false, fixedBeforeDone = false, crewSeen = false;
        w.run(120, () => {
            if (truck.state !== 'working') return;
            crewSeen = true;
            let ladderLength = 0;
            w.root.traverse(o => { if ((o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).count > 0 && o.parent?.visible) ladderLength = Math.max(ladderLength, (o as THREE.InstancedMesh).count * .42); });
            maxLadder = Math.max(maxLadder, ladderLength);
            if (w.root.children.some(c => c.userData.person && c.visible && c.position.z > 6)) climbed = true;
            if (w.state.wireFixed && !wire.resolved) fixedBeforeDone = true;
        });
        expect(wire.resolved).toBe(true);
        expect(crewSeen).toBe(true);
        expect(maxLadder).toBeGreaterThan(8);        // a real telescopic ladder, not a stub
        expect(climbed).toBe(true);                   // a worker rode it up to the wire height
        expect(fixedBeforeDone).toBe(true);           // the wire is mended before the crew packs up
        expect(truck.state).toBe('idle');
        expect(w.inbox()).toEqual(expect.arrayContaining(['103:arrived', '103:done', '103:home']));
        expect(w.state.wireFixed).toBe(false);        // crew hidden and the override cleared once they are gone
    });

    it('a wrong position: the crew finds nothing, no ladder, no worker, the wire stays broken', () => {
        const w = world();
        const wire = w.incidents.find(i => i.kind === 'line-break')!;
        w.run(.2);
        sendMessage(w.drone, SERVICE_HULLS.repair, `repair ${Math.round(wire.x) + 150} ${Math.round(wire.y) - 150}`);
        let ladder = false;
        w.run(150, () => { if (meshesVisible(w.root, o => (o as THREE.InstancedMesh).isInstancedMesh === true)) ladder = true; });
        expect(wire.resolved).toBe(false);
        expect(ladder).toBe(false);
        expect(w.inbox()).toEqual(expect.arrayContaining(['103:nothing found', '103:home']));
    });
});

describe('scenario 2: burning building', () => {
    it('the fire brigade rolls out a hose, the jet puts the fire out, they roll it back and leave', () => {
        const w = world();
        const fire = w.incidents.find(i => i.kind === 'fire')!;
        w.run(.2);
        sendMessage(w.drone, SERVICE_HULLS.fire, `fire ${Math.round(fire.x)} ${Math.round(fire.y)}`);
        expect(w.inbox()[0]).toMatch(/^101:accepted \d+$/);
        const truck = w.responder('fire');
        let hose = false, jet = false, minScale = 1, firemen = 0;
        w.run(150, () => {
            if (truck.state !== 'working') return;
            hose = hose || meshesVisible(w.root, o => (o as THREE.Mesh).isMesh && ((o as THREE.Mesh).material as THREE.Material)?.name === 'Hose');
            jet = jet || meshesVisible(w.root, o => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.type === 'CylinderGeometry' && o.scale.y > 3);
            minScale = Math.min(minScale, w.state.fireScale);
            firemen = Math.max(firemen, peopleOnScene(w.root));
        });
        expect(fire.resolved).toBe(true);
        expect(hose).toBe(true);
        expect(jet).toBe(true);
        expect(minScale).toBeLessThan(.15);           // the flames shrank while the jet was on them
        expect(firemen).toBeGreaterThanOrEqual(3);
        expect(truck.state).toBe('idle');
        expect(peopleOnScene(w.root, 'firefighter')).toBe(0);     // only the burglar and the brawlers (other incidents) remain
        expect(w.inbox()).toEqual(expect.arrayContaining(['101:arrived', '101:done', '101:home']));
    });

    it('the police come along only to cordon the street and nobody is arrested', () => {
        const w = world();
        const fire = w.incidents.find(i => i.kind === 'fire')!;
        w.run(.2);
        sendMessage(w.drone, SERVICE_HULLS.fire, `fire ${Math.round(fire.x)} ${Math.round(fire.y)}`);
        const police = w.responder('police');
        expect(police.assist).toBe(true);
        w.run(150);
        expect(police.state).toBe('idle');
        expect(police.prisoner).toBe(false);
        expect(w.incidents.filter(i => i.resolved).map(i => i.kind)).toEqual(['fire']);
    });
});

describe('scenario 3: crime', () => {
    it.each(['burglary', 'fight'] as const)('police arrest the culprit of a %s and take them to the station', kind => {
        const w = world();
        const crime = w.incidents.find(i => i.kind === kind)!;
        w.run(.2);
        sendMessage(w.drone, SERVICE_HULLS.police, `police ${Math.round(crime.x)} ${Math.round(crime.y)}`);
        expect(w.inbox()[0]).toMatch(/^102:accepted \d+$/);
        const car = w.responder('police');
        let cuffed = false, officers = 0;
        w.run(160, () => {
            if (car.state === 'working') {
                officers = Math.max(officers, peopleOnScene(w.root));
                if (meshesVisible(w.root, o => o.name === 'cuffs')) cuffed = true;
            }
        });
        expect(crime.resolved).toBe(true);
        expect(car.prisoner).toBe(true);
        expect(cuffed).toBe(true);                    // the suspect was handcuffed before being led away
        expect(officers).toBeGreaterThanOrEqual(3);   // two officers and the suspect on the scene
        expect(car.state).toBe('idle');
        expect(w.inbox()).toEqual(expect.arrayContaining(['102:arrived', '102:done', '102:home']));
    });

    it('a call to a quiet street: officers find nobody and drive back without a prisoner', () => {
        const w = world();
        w.run(.2);
        sendMessage(w.drone, SERVICE_HULLS.police, 'police -200 -200');
        w.run(200);
        expect(w.incidents.some(i => (i.kind === 'burglary' || i.kind === 'fight') && i.resolved)).toBe(false);
        expect(w.responder('police').prisoner).toBe(false);
        expect(w.inbox()).toEqual(expect.arrayContaining(['102:nothing found', '102:home']));
    });
});
