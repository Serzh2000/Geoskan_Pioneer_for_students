import * as THREE from 'three';
import { generateTrainingLayout, type TrainingLayout, type TrainingProp } from '../public/modules/environment/training/layout.js';
import { trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import { distanceToWaterBodies } from '../public/modules/environment/training/geography.js';
import { buildRoadGraph, findRoute } from '../public/modules/world/roads.js';
import { findPoliceSite, findStationSite, planIncidents } from '../public/modules/world/incidents.js';
import { createWorldServices, type Incident, type Responder } from '../public/modules/world/services.js';
import { droneHull, resetMailbox, sendMessage, SERVICE_HULLS } from '../public/modules/world/mailbox.js';
import { createFireCrew, createPoliceCrew, createRepairCrew, type Crew, type CrewState, type PoliceCrew } from '../public/modules/world/crews.js';

/** Solid things a person can not walk through (street furniture and flat pads are not). */
const SOLID: ReadonlyArray<TrainingProp['type']> = ['tree', 'building', 'house', 'warehouse', 'station', 'water-tower', 'barn', 'silo', 'church', 'fire-station',
    'police-station', 'school', 'hospital', 'restaurant', 'mall', 'office', 'gas-station', 'hangar', 'greenhouse', 'power-pylon', 'containers', 'rocks', 'solar', 'gantry-crane'];
const SOLID_SHRINK = .85;   // radii are conservative envelopes of the meshes

const solidCache = new WeakMap<TrainingLayout, Map<string, TrainingProp[]>>();
export function solidAt(layout: TrainingLayout, x: number, y: number, margin = 0): TrainingProp | null {
    let grid = solidCache.get(layout);
    if (!grid) {
        grid = new Map();
        for (const o of layout.objects) if (SOLID.includes(o.type)) {
            const r = o.radius + 2;
            for (let cx = Math.floor((o.x - r) / 16); cx <= Math.floor((o.x + r) / 16); cx++) for (let cy = Math.floor((o.y - r) / 16); cy <= Math.floor((o.y + r) / 16); cy++) {
                const key = `${cx},${cy}`; (grid.get(key) ?? grid.set(key, []).get(key)!).push(o);
            }
        }
        solidCache.set(layout, grid);
    }
    for (const o of grid.get(`${Math.floor(x / 16)},${Math.floor(y / 16)}`) ?? []) if (Math.hypot(o.x - x, o.y - y) < o.radius * SOLID_SHRINK + margin) return o;
    return null;
}
export function inWater(layout: TrainingLayout, x: number, y: number): boolean { return distanceToWaterBodies(layout, { x, y }) < .2; }

export type Sample = { x: number; y: number; z: number; heading: number; mode: string; phase: number; visible: boolean };
export type Track = { id: string; role: string; samples: Array<Sample | null> };

export function makeCrewWorld(layout: TrainingLayout) {
    resetMailbox();
    const graph = buildRoadGraph(layout.paths);
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
    const f = { x: Math.sin(policeSite.rotation), y: -Math.cos(policeSite.rotation) };
    const stationDoor = { x: policeSite.x + f.x * 6.2 + Math.cos(policeSite.rotation) * 6, y: policeSite.y + f.y * 6.2 + Math.sin(policeSite.rotation) * 6 };
    for (const responder of services.responders) {
        const host = {
            root, layout, responder, truck: new THREE.Group(), incidents, state,
            groundAt: (x: number, y: number) => trainingHeightAt(layout, x, y),
            propAt: (x: number, y: number) => { const o = layout.objects.find(p => (p.type === 'building' || p.type === 'house') && Math.hypot(p.x - x, p.y - y) < 2); return o ? { x: o.x, y: o.y, rotation: o.rotation ?? 0, radius: o.radius } : null; },
            stationDoor
        };
        if (responder.kind === 'fire') crews.push(createFireCrew(host));
        else if (responder.kind === 'repair') crews.push(createRepairCrew(host));
        else { police = createPoliceCrew(host); crews.push(police); }
    }
    services.onEvent(event => { if (event.type === 'home' && event.responder.kind === 'police' && event.responder.prisoner) police?.deliverPrisoner(); });
    const drone = droneHull('probe');
    return { layout, incidents, services, root, state, crews, drone, stationDoor, policeSite, fireSite, responder: (kind: Responder['kind']) => services.responders.find(r => r.kind === kind)! };
}

/**
 * Runs a crew world and records every person (a child of the root flagged `person`) at every frame. `mode` and `phase`
 * come from `userData.pose`, which actors.ts does not keep, so they are read through the optional hook `userData.personRef`.
 */
export function recordCrew(kind: 'fire' | 'repair' | 'burglary' | 'fight', seconds: number, layout: TrainingLayout, dt = 1 / 60) {
    const w = makeCrewWorld(layout);
    const target = w.incidents.find(i => i.kind === (kind === 'repair' ? 'line-break' : kind))!;
    const service = kind === 'fire' ? 'fire' : kind === 'repair' ? 'repair' : 'police';
    const tracks = new Map<THREE.Object3D, Track>();
    let frame = 0;
    const record = () => {
        for (const child of w.root.children) {
            if (!child.userData.person) continue;
            let track = tracks.get(child);
            if (!track) { track = { id: `${child.userData.role}#${tracks.size}`, role: child.userData.role, samples: new Array(frame).fill(null) }; tracks.set(child, track); }
            const ref = child.userData.personRef as { mode: string; phase: number } | undefined;
            track.samples.push({ x: child.position.x, y: child.position.y, z: child.position.z, heading: child.rotation.z, mode: ref?.mode ?? '?', phase: ref?.phase ?? 0, visible: child.visible });
        }
        frame++;
    };
    const tick = () => { w.services.update(dt); w.crews.forEach(c => c.update(dt)); record(); };
    for (let t = 0; t < .2; t += dt) tick();
    sendMessage(w.drone, SERVICE_HULLS[service], `${service} ${Math.round(target.x)} ${Math.round(target.y)}`);
    for (let t = 0; t < seconds; t += dt) tick();
    return { w, tracks: [...tracks.values()], dt, target };
}

/** Frame-to-frame metrics of a track while it is visible. */
export function trackMetrics(track: Track, dt: number) {
    let maxSpeed = 0, maxJump = 0, maxTurn = 0, frames = 0;
    let prev: Sample | null = null;
    const modeSpeed: Record<string, number> = {};
    for (const s of track.samples) {
        if (!s || !s.visible || s.mode === 'sit') { prev = null; continue; }      // a passenger rides with the car: its jerks are the car's
        frames++;
        if (prev) {
            const d = Math.hypot(s.x - prev.x, s.y - prev.y), v = d / dt;
            maxSpeed = Math.max(maxSpeed, v); maxJump = Math.max(maxJump, d);
            let dh = s.heading - prev.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
            maxTurn = Math.max(maxTurn, Math.abs(dh) / dt);
            modeSpeed[s.mode] = Math.max(modeSpeed[s.mode] ?? 0, v);
        }
        prev = s;
    }
    return { frames, maxSpeed, maxJump, maxTurn, modeSpeed };
}
export { generateTrainingLayout };
