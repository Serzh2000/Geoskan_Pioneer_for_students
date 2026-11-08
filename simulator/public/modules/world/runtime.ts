import * as THREE from 'three';
import { envGroup } from '../environment/index.js';
import { createLandscapeAsset } from '../environment/training/landscape-assets.js';
import { createWireSpan } from '../environment/training/world-details.js';
import { trainingHeightAt } from '../environment/training/world-plan.js';
import type { TrainingLayout } from '../environment/training/layout.js';
import type { Point2 } from '../environment/training/geography.js';
import { log } from '../shared/logging/logger.js';
import { resetMailbox } from './mailbox.js';
import { findPoliceSite, findStationSite, lineBreakWorkPoint, planIncidents, planLineBreak } from './incidents.js';
import { createFireCrew, createPoliceCrew, createRepairCrew, type Crew, type CrewState, type PoliceCrew } from './crews.js';
import { buildRoadGraph, findRoute, overpassLift } from './roads.js';
import { createTraffic, type EmergencyVehicle, type Traffic, type TrafficAgent } from './traffic.js';
import { createPoliceCar } from './car-model.js';
import { createFleet, type Fleet, type FleetCar } from './car-fleet.js';
import { createSignalLights, type SignalLights } from './signal-lights.js';
import { createRoadMarks, type RoadMarks } from './road-marks.js';
import { createCrowd, createCrowdView, type Crowd, type CrowdView, type Vehicle } from './pedestrians.js';
import { drones } from '../core/state.js';
import { VEHICLES } from './vehicle-kinds.js';
import { createWorldServices, type Responder, type ServiceEvent, type WorldServices } from './services.js';

/*
 * The living part of a training map: wind-turbine rotors, ambient traffic, an aeroplane over the
 * airfield and the emergency services that answer `mailbox` calls (see services.ts). Everything
 * moves only while the program runs and starts over on reset. Built from the layout, so a seed
 * always yields the same station site, burning building and torn wire.
 */
/** An ambient car: the mesh follows the pose of its agent in traffic.ts, which does the driving. */
type CarRun = { car: FleetCar; agent: TrafficAgent };
type World = {
    key: string; terrain: THREE.Group; root: THREE.Group; layout: TrainingLayout; services: WorldServices;
    meshes: Map<Responder, THREE.Object3D>; cars: CarRun[]; fleet: Fleet | null; traffic: Traffic | null; lights: SignalLights | null; marks: RoadMarks | null; rotors: THREE.Object3D[];
    plane: { mesh: THREE.Object3D; track: Point2[]; lengths: number[]; total: number; s: number } | null;
    fire: { flames: THREE.Group; light: THREE.PointLight } | null;
    wire: { intact: THREE.Object3D | null; broken: THREE.Object3D | null; sparks: THREE.Object3D } | null;
    crews: Crew[]; policeCrew: PoliceCrew | null; crewState: CrewState;
    crowd: Crowd; crowdView: CrowdView;
};

let world: World | null = null;
let running = false;
let phase = 0;

const GROUND = .06;
const EMERGENCY_LANE = .95;                    // m to the right of the centre line while driving
const laneOffset = new WeakMap<object, number>();
const CAR_COLORS = [0x2e6fd8, 0xc4382f, 0xe4e1d8, 0x3a8f5a, 0x30343a, 0xd9a521];

function terrainGroup(): THREE.Group | null {
    return (envGroup?.children.find(child => child.userData?.trainingLayout) as THREE.Group | undefined) ?? null;
}

function polylineLengths(points: Point2[]) {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    return lengths;
}

function sampleAt(points: Point2[], lengths: number[], s: number): { x: number; y: number; heading: number } {
    let i = 1;
    while (i < points.length - 1 && lengths[i] < s) i++;
    const a = points[i - 1], b = points[i], span = lengths[i] - lengths[i - 1] || 1, t = Math.max(0, Math.min(1, (s - lengths[i - 1]) / span));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: Math.atan2(b.y - a.y, b.x - a.x) };
}

const buildPolice = createPoliceCar;

function buildFlames(): { flames: THREE.Group; light: THREE.PointLight } {
    const flames = new THREE.Group();
    const orange = new THREE.MeshBasicMaterial({ color: 0xff7a1c, transparent: true, opacity: .85 });
    const yellow = new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: .9 });
    [[0, 0, 5, orange], [2.2, 1, 3.6, yellow], [-2, -1.4, 4.2, orange], [1, -2.2, 3, yellow]].forEach(([x, y, h, m]) => {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(1.2, h as number, 8), m as THREE.Material);
        flame.rotation.x = Math.PI / 2; flame.position.set(x as number, y as number, 2.2 + (h as number) / 2);
        flame.userData.flicker = h; flames.add(flame);
    });
    for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 + i * .5, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4a4a4a, transparent: true, opacity: .32 - i * .06, depthWrite: false }));
        puff.position.set(i * .6, 0, 9 + i * 2.6); puff.userData.smoke = i + 1; flames.add(puff);
    }
    const light = new THREE.PointLight(0xff7a2a, 4, 40);
    light.position.z = 5;
    flames.userData.collidable = false;
    return { flames, light };
}

function teardown() {
    if (!world) return;
    world.services.dispose();
    world.lights?.dispose();
    world.crowdView.dispose();
    world.fleet?.dispose();
    world.marks?.dispose();
    world.root.parent?.remove(world.root);
    world.root.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry?.dispose();
    });
    resetMailbox();
    world = null;
}

function build(terrain: THREE.Group): World {
    const layout = terrain.userData.trainingLayout as TrainingLayout;
    const root = new THREE.Group();
    root.name = 'Живой мир'; root.userData = { collidable: false, label: 'Живой мир', worldRuntime: true };
    terrain.add(root);
    resetMailbox();

    const graph = buildRoadGraph(layout.paths);
    const route = (from: Point2, to: Point2) => findRoute(graph, from, to);
    const incidents = planIncidents(layout);
    const site = findStationSite(layout);

    // Crews are parked on the forecourt of their station, noses toward the road, one per bay: the fire station has bays
    // at -6.5, 0 and +6.5 m, the police station two garage bays at -7.2 and -2.4 m.
    const policeSite = findPoliceSite(layout);
    const homes: Partial<Record<'fire' | 'repair' | 'police', Point2 & { heading: number }>> = {};
    const parkAt = (s: { x: number; y: number; rotation: number }, bay: number, depth: number) => {
        const front = { x: Math.sin(s.rotation), y: -Math.cos(s.rotation) }, right = { x: Math.cos(s.rotation), y: Math.sin(s.rotation) };
        return { x: s.x + front.x * depth + right.x * bay, y: s.y + front.y * depth + right.y * bay, heading: Math.atan2(front.y, front.x) };
    };
    if (site) {
        homes.fire = parkAt(site, 0, 7.6);
        homes.repair = parkAt(site, -6.5, 7.6);
        homes.police = parkAt(site, 6.5, 8.2);
    }
    if (policeSite) homes.police = parkAt(policeSite, -2.4, 8);
    const stationDoor = policeSite ? (() => { const f = { x: Math.sin(policeSite.rotation), y: -Math.cos(policeSite.rotation) }; return { x: policeSite.x + f.x * 6.2 + Math.cos(policeSite.rotation) * 6, y: policeSite.y + f.y * 6.2 + Math.sin(policeSite.rotation) * 6 }; })() : undefined;

    // Pedestrians (pedestrians.ts); emergency vehicles wait for anyone on a crossing in front of them.
    const traffic = createTraffic(layout.paths, { seed: layout.seed });
    const crowd = createCrowd(layout, { seed: layout.seed, signals: traffic.signals });
    const services = createWorldServices({ incidents, homes, route, hold: responder => {
        const hx = Math.cos(responder.heading), hy = Math.sin(responder.heading);
        return crowd.onRoad().some(w => { const dx = w.x - responder.x, dy = w.y - responder.y, along = dx * hx + dy * hy; return along > -1 && along < 9 && Math.abs(dx * hy - dy * hx) < 2.6; });
    } });
    const meshes = new Map<Responder, THREE.Object3D>();
    for (const responder of services.responders) {
        const mesh = responder.kind === 'fire' ? createLandscapeAsset('FireTruck') : responder.kind === 'repair' ? createLandscapeAsset('RepairTruck') : buildPolice();
        mesh.userData.collidable = false;
        mesh.userData.serviceKind = responder.kind;
        mesh.userData.hull = responder.hull;
        if (responder.kind !== 'police') mesh.scale.setScalar(.85);   // 3 m wide models fit a 3.6-4.8 m road
        root.add(mesh); meshes.set(responder, mesh);
    }

    // Ambient traffic (traffic.ts): cars drive routes over the road network, in their own lane, turning at junctions.
    // All the cars are instanced meshes of one fleet (car-fleet.ts): a handful of draw calls instead of seven per car.
    const cars: CarRun[] = traffic.agents.map(agent => ({ agent, car: { id: agent.id, kind: agent.kind, x: agent.x, y: agent.y, z: 0, heading: agent.heading, scale: agent.scale, speed: agent.speed } }));
    const fleet = cars.length ? createFleet(cars.map(c => c.car), CAR_COLORS) : null;
    if (fleet) root.add(fleet.group);

    // Traffic lights at the junctions the cars obey (signals.ts); two instanced meshes for the whole map.
    const lights = createSignalLights(traffic.signals, (x, y) => trainingHeightAt(layout, x, y));
    root.add(lights.group);
    // Stop lines, zebras and their signs at the same junctions.
    const marks = createRoadMarks(traffic.signals.heads, (x, y) => trainingHeightAt(layout, x, y));
    root.add(marks.group);

    const crowdView = createCrowdView(crowd, (x, y) => trainingHeightAt(layout, x, y));
    root.add(crowdView.group);

    const rotors: THREE.Object3D[] = [];
    terrain.traverse(node => { if (node.userData?.spin) rotors.push(node); });

    // The airfield's aeroplane flies a racetrack that starts and ends on the strip.
    let plane: World['plane'] = null;
    const strip = layout.paths.find(p => p.id === 'airstrip');
    if (strip && strip.points.length >= 2) {
        const a = strip.points[0], b = strip.points[strip.points.length - 1];
        const length = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
        const nx = -uy, ny = ux, r = 32;
        // Strip a->b, half-turn left around b, back parallel to the strip, half-turn around a.
        const track: Point2[] = [a, b];
        for (let i = 1; i <= 8; i++) {
            const t = i / 8 * Math.PI;
            track.push({ x: b.x + nx * r - nx * r * Math.cos(t) + ux * r * Math.sin(t), y: b.y + ny * r - ny * r * Math.cos(t) + uy * r * Math.sin(t) });
        }
        for (let i = 1; i <= 8; i++) {
            const t = i / 8 * Math.PI;
            track.push({ x: a.x + nx * r + nx * r * Math.cos(t) - ux * r * Math.sin(t), y: a.y + ny * r + ny * r * Math.cos(t) - uy * r * Math.sin(t) });
        }
        const lengths = polylineLengths(track);
        const mesh = createLandscapeAsset('Airplane');
        mesh.userData.collidable = false;
        root.add(mesh);
        plane = { mesh, track, lengths, total: lengths[lengths.length - 1], s: 0 };
    }

    // Fire and broken line: dormant until their start time.
    let fire: World['fire'] = null;
    const fireIncident = incidents.find(i => i.kind === 'fire');
    if (fireIncident) {
        fire = buildFlames();
        fire.flames.position.set(fireIncident.x, fireIncident.y, trainingHeightAt(layout, fireIncident.x, fireIncident.y));
        fire.flames.add(fire.light);
        fire.flames.visible = false;
        root.add(fire.flames);
    }

    let wire: World['wire'] = null;
    const plan = planLineBreak(layout);
    if (plan) {
        const intact = createWireSpan(layout, plan.from, plan.to, false);
        const broken = createWireSpan(layout, plan.from, plan.to, true);
        const sparks = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 0), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
        const workPoint = lineBreakWorkPoint(layout, plan);
        sparks.position.set(workPoint.x, workPoint.y, workPoint.z);
        sparks.visible = false;
        if (broken) broken.visible = false;
        for (const m of [intact, broken, sparks]) if (m) root.add(m);
        wire = { intact, broken, sparks };
    }

    // The crews: people, hose, ladder and the incidents' own actors, driven by the progress of each work phase.
    const crewState: CrewState = { fireScale: 1, wireFixed: false, wireZ: 10,
        wirePoint: plan ? lineBreakWorkPoint(layout, plan) : undefined };
    const groundAt = (x: number, y: number) => trainingHeightAt(layout, x, y);
    const propAt = (x: number, y: number) => { const o = layout.objects.find(item => (item.type === 'building' || item.type === 'house') && Math.hypot(item.x - x, item.y - y) < 2); return o ? { x: o.x, y: o.y, rotation: o.rotation ?? 0, radius: o.radius } : null; };
    const crews: Crew[] = []; let policeCrew: PoliceCrew | null = null;
    for (const responder of services.responders) {
        const host = { root, layout, responder, truck: meshes.get(responder)!, incidents, state: crewState, groundAt, propAt, stationDoor };
        if (responder.kind === 'fire') crews.push(createFireCrew(host));
        else if (responder.kind === 'repair') crews.push(createRepairCrew(host));
        else { policeCrew = createPoliceCrew(host); crews.push(policeCrew); }
    }
    const built: World = { key: `${terrain.uuid}:${layout.seed}:${layout.profile}`, terrain, root, layout, services, meshes, cars, fleet, traffic, lights, marks, rotors, plane, fire, wire, crews, policeCrew, crewState, crowd, crowdView };
    services.onEvent(event => onServiceEvent(built, event));
    return built;
}

function onServiceEvent(w: World, event: ServiceEvent) {
    const name = ({ fire: 'Пожарная часть', repair: 'Ремонтная бригада', police: 'Полиция' } as const)[event.responder.kind];
    if (event.type === 'dispatched') log(`${name} (борт ${event.responder.hull}) выехала по вызову`, 'info');
    if (event.type === 'arrived') log(`${name} прибыла на место${event.incident ? '' : ': на месте ничего нет'}`, 'info');
    if (event.type === 'resolved') {
        if (event.responder.kind === 'police' && event.incident) w.policeCrew?.capturePrisoner(event.incident);
        log(`${name}: ${event.incident?.kind === 'fire' ? 'пожар потушен' : event.incident?.kind === 'line-break' ? 'линия восстановлена' : event.incident?.kind === 'burglary' ? 'вор задержан' : 'драка прекращена, нарушитель задержан'}`, 'info');
        if (w.wire && event.incident?.kind === 'line-break') {
            if (w.wire.intact) w.wire.intact.visible = true;
            if (w.wire.broken) w.wire.broken.visible = false;
            w.wire.sparks.visible = false;
        }
        if (w.fire && event.incident?.kind === 'fire') w.fire.flames.visible = false;
    }
    if (event.type === 'false-alarm') log(`${name}: по указанным координатам ничего не найдено, бригада возвращается`, 'warn');
    if (event.type === 'home') {
        log(`${name} вернулась на базу`, 'info');
        if (event.responder.kind === 'police' && event.responder.prisoner) { w.policeCrew?.deliverPrisoner(); log('Задержанного ведут в отделение полиции', 'info'); }
    }
}

function ensureWorld(): World | null {
    const terrain = terrainGroup();
    if (!terrain) { teardown(); return null; }
    const layout = terrain.userData.trainingLayout as TrainingLayout;
    const key = `${terrain.uuid}:${layout.seed}:${layout.profile}`;
    if (world && (world.key !== key || world.root.parent !== terrain)) teardown();
    if (!world) world = build(terrain);
    return world;
}

function place(mesh: THREE.Object3D, layout: TrainingLayout, x: number, y: number, heading: number, lift = GROUND) {
    mesh.position.set(x, y, trainingHeightAt(layout, x, y) + lift);
    mesh.rotation.z = heading;
}

const emergencyOnRoad: EmergencyVehicle[] = [];
const vehicles: Vehicle[] = [];

function driveTraffic(w: World, dt: number) {
    if (!w.traffic) return;
    // Crews that are out of their station are obstacles for the cars (they stop for them and make room).
    emergencyOnRoad.length = 0;
    for (const responder of w.services.responders) if (responder.state !== 'idle') emergencyOnRoad.push(responder);
    // People first: they look at the cars of the previous frame, the cars then stop for those already on a crossing.
    vehicles.length = 0;
    for (const { agent } of w.cars) vehicles.push({ x: agent.x, y: agent.y, heading: agent.heading, speed: agent.speed, length: agent.length, width: agent.modelWidth * agent.scale });
    for (const r of emergencyOnRoad) vehicles.push({ x: r.x, y: r.y, heading: r.heading, speed: (r as Responder).state === 'driving' || (r as Responder).state === 'returning' ? (r as Responder).speed : 0, length: 6, siren: true });
    const drone = Object.values(drones)[0];
    const focus = drone ? { x: drone.pos.x, y: drone.pos.y } : null;
    w.crowd.update(dt, vehicles, focus);
    w.crowdView.update(dt, focus);
    w.traffic.update(dt, emergencyOnRoad, w.crowd.onRoad());
    w.lights?.update();
    for (const { car, agent } of w.cars) {
        car.x = agent.x; car.y = agent.y; car.heading = agent.heading; car.scale = agent.scale; car.speed = agent.speed;
        car.z = trainingHeightAt(w.layout, agent.x, agent.y) + GROUND + overpassLift(w.layout.bridges, agent.roadId, agent.x, agent.y);
    }
    w.fleet?.update(w.cars.map(c => c.car), dt);
}

function animate(w: World, dt: number) {
    phase += dt;
    w.services.update(dt);
    const layout = w.layout;

    for (const rotor of w.rotors) rotor.rotation.y += (rotor.userData.spin as number) * dt;

    driveTraffic(w, dt);

    if (w.plane) {
        const plane = w.plane, speed = 24;
        plane.s = (plane.s + speed * dt) % plane.total;
        const u = plane.s / plane.total;
        const p = sampleAt(plane.track, plane.lengths, plane.s);
        const altitude = 26 * Math.pow(Math.sin(Math.PI * u), 1.4);
        place(plane.mesh, layout, p.x, p.y, p.heading, altitude + .02);
        plane.mesh.rotation.y = -Math.min(.25, altitude / 120); // nose up while climbing is cosmetic only
    }

    for (const [responder, mesh] of w.meshes) {
        // On the road an emergency vehicle keeps to its own lane like everyone else; parked or at work it stands where it stopped.
        const moving = responder.state === 'driving' || responder.state === 'returning';
        const target = moving ? EMERGENCY_LANE : 0;
        const lane = (laneOffset.get(responder) ?? 0) + (target - (laneOffset.get(responder) ?? 0)) * Math.min(1, dt * 2.5);
        laneOffset.set(responder, lane);
        const px = responder.x + Math.sin(responder.heading) * lane, py = responder.y - Math.cos(responder.heading) * lane;
        const wheels = mesh.userData.wheels as THREE.Object3D[] | undefined;
        if (wheels) {
            const moved = Math.hypot(px - mesh.position.x, py - mesh.position.y) * (Math.cos(responder.heading) * (px - mesh.position.x) + Math.sin(responder.heading) * (py - mesh.position.y) >= 0 ? 1 : -1);
            if (Math.abs(moved) < 5) for (const wheel of wheels) wheel.rotation.y += moved / (mesh.userData.wheelRadius as number);
        }
        place(mesh, layout, px, py, responder.heading);
    }

    for (const crew of w.crews) crew.update(dt);

    const fireIncident = w.services.incidents.find(i => i.kind === 'fire');
    if (w.fire && fireIncident) {
        w.fire.flames.visible = fireIncident.active && !fireIncident.resolved && w.crewState.fireScale > .03;
        w.fire.flames.scale.setScalar(Math.max(.05, w.crewState.fireScale));
        if (w.fire.flames.visible) {
            w.fire.flames.children.forEach((child, index) => {
                if (child.userData.flicker) child.scale.set(1, 1, .8 + .35 * Math.sin(phase * 9 + index * 1.7));
                if (child.userData.smoke) child.position.z = 6 + child.userData.smoke * 3.4 + 1.2 * Math.sin(phase * 1.3 + child.userData.smoke);
            });
            w.fire.light.intensity = 3.4 + Math.sin(phase * 13) * .8;
        }
    }

    const breakIncident = w.services.incidents.find(i => i.kind === 'line-break');
    if (w.wire && breakIncident) {
        const down = breakIncident.active && !breakIncident.resolved && !w.crewState.wireFixed;
        if (w.wire.intact) w.wire.intact.visible = !down;
        if (w.wire.broken) w.wire.broken.visible = down;
        w.wire.sparks.visible = down && Math.sin(phase * 17) > 0;
    }
}

/** Твёрдое тело живого мира для физики дрона: ориентированная коробка (или цилиндр, если round) от z0 до z1. */
export interface WorldSolid { x: number; y: number; z0: number; z1: number; heading: number; halfLength: number; halfWidth: number; round: boolean }

const PERSON_HEIGHT = 1.8;
const PERSON_RADIUS = .25;
const RESPONDER_SIZE = { length: 6, width: 2.6, height: 3 };
const solidsOut: WorldSolid[] = [];

/**
 * Что в живом мире можно задеть: машины потока, аварийные машины и люди (они сами `collidable = false` для обхода сцены мешей,
 * поэтому физика берёт их отсюда). Только в радиусе `range` от точки; массив общий, его нельзя хранить между вызовами.
 */
export function worldSolidsNear(x: number, y: number, range: number): readonly WorldSolid[] {
    solidsOut.length = 0;
    if (!running || !world) return solidsOut;
    const w = world;
    const near = (px: number, py: number, extra: number) => Math.abs(px - x) < range + extra && Math.abs(py - y) < range + extra;
    for (const { car } of w.cars) {
        const spec = VEHICLES[car.kind];
        if (!near(car.x, car.y, spec.length)) continue;
        solidsOut.push({ x: car.x, y: car.y, z0: car.z, z1: car.z + spec.height * car.scale, heading: car.heading,
            halfLength: spec.length * car.scale / 2, halfWidth: spec.width * car.scale / 2, round: false });
    }
    for (const r of w.services.responders) {
        if (r.state === 'idle' || !near(r.x, r.y, RESPONDER_SIZE.length)) continue;
        const z = trainingHeightAt(w.layout, r.x, r.y);
        solidsOut.push({ x: r.x, y: r.y, z0: z, z1: z + RESPONDER_SIZE.height, heading: r.heading,
            halfLength: RESPONDER_SIZE.length / 2, halfWidth: RESPONDER_SIZE.width / 2, round: false });
    }
    for (const p of w.crowd.peds) {
        if (p.asleep || p.state === 'inside' || !near(p.x, p.y, 1)) continue;
        const z = trainingHeightAt(w.layout, p.x, p.y);
        solidsOut.push({ x: p.x, y: p.y, z0: z, z1: z + PERSON_HEIGHT, heading: p.heading, halfLength: PERSON_RADIUS, halfWidth: PERSON_RADIUS, round: true });
    }
    return solidsOut;
}

/** Per-frame hook (physics loop). Does nothing until a program is running. */
export function updateWorld(dt: number) {
    if (!running) return;
    const w = ensureWorld();
    if (w) animate(w, dt);
}

export function startWorldSession() {
    running = true;
    ensureWorld();
}

export function stopWorldSession() {
    running = false;
}

/** "Сброс": the world is rebuilt from the layout, so crews are home and nothing is burning. */
export function resetWorld() {
    running = false;
    phase = 0;
    teardown();
}

