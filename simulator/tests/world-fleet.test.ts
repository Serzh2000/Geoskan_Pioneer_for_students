import * as THREE from 'three';
import { vehicleParts } from '../public/modules/world/car-model.js';
import { createFleet, type FleetCar } from '../public/modules/world/car-fleet.js';
import { VEHICLES, type VehicleKind } from '../public/modules/world/vehicle-kinds.js';
import { createTraffic } from '../public/modules/world/traffic.js';
import type { RoadLike } from '../public/modules/world/roads.js';

const KINDS = Object.keys(VEHICLES) as VehicleKind[];
const box = (kind: VehicleKind) => {
    const p = vehicleParts(kind), b = new THREE.Box3();
    for (const g of [p.paint, p.glass, p.trim, p.headlight, p.taillight]) { g.computeBoundingBox(); b.union(g.boundingBox!); }
    return b;
};

describe('vehicle models', () => {
    it.each(KINDS)('%s has the real size of its kind, stands on z = 0 and faces +X', (kind) => {
        const b = box(kind), spec = VEHICLES[kind];
        expect(b.max.x - b.min.x).toBeGreaterThan(spec.length * .97);
        expect(b.max.x - b.min.x).toBeLessThan(spec.length * 1.08);
        expect(b.max.y - b.min.y).toBeGreaterThan(spec.width * .95);
        expect(b.max.y - b.min.y).toBeLessThan(spec.width * 1.2);          // mirrors stick out
        expect(b.max.z).toBeGreaterThan(spec.height * .93);
        expect(b.max.z).toBeLessThan(spec.height * 1.1);
        expect(b.min.z).toBeGreaterThanOrEqual(0);
        // The lamps are at the ends: white ones in front (+X), red ones behind.
        const p = vehicleParts(kind);
        p.headlight.computeBoundingBox(); p.taillight.computeBoundingBox();
        expect(p.headlight.boundingBox!.min.x).toBeGreaterThan(0);
        expect(p.taillight.boundingBox!.max.x).toBeLessThan(0);
    });
    it.each(KINDS)('%s has round wheels whose lowest point is the ground', (kind) => {
        const p = vehicleParts(kind);
        p.tire.computeBoundingBox();
        const t = p.tire.boundingBox!;
        expect(t.max.x - t.min.x).toBeCloseTo(t.max.z - t.min.z, 2);           // as tall as long: a disc, not a box
        expect(t.max.y - t.min.y).toBeLessThan(t.max.x - t.min.x);              // the axle runs across and is shorter than the diameter
        expect(p.wheels.length).toBeGreaterThanOrEqual(4);
        expect(p.wheels.some(w => w.y < 0) && p.wheels.some(w => w.y > 0)).toBe(true);
        // wheel centre at z = radius: the tyre touches z = 0 and is not buried.
        const lowest = p.wheelRadius - (t.max.z - t.min.z) / 2;
        expect(lowest).toBeCloseTo(0, 3);
    });
});

describe('car fleet', () => {
    const cars = (): FleetCar[] => KINDS.map((kind, id) => ({ id, kind, x: id * 12, y: 0, z: .06, heading: 0, scale: 1, speed: 10 }));

    it('draws every kind in a handful of instanced meshes, with at least five different kinds', () => {
        const fleet = createFleet(cars(), [0xff0000, 0x00ff00, 0x0000ff]);
        expect(fleet.group.children.length).toBeLessThanOrEqual(KINDS.length * 7);
        expect(new Set(KINDS).size).toBeGreaterThanOrEqual(5);
        fleet.dispose();
    });

    it('turns the wheels by the distance driven over their radius, and not when standing', () => {
        const list = cars(), fleet = createFleet(list, [0xff0000]);
        const wheels = fleet.group.children.find(c => c.name.includes('hatchback колёса')) as THREE.InstancedMesh;
        const angle = () => { const m = new THREE.Matrix4(), q = new THREE.Quaternion(); wheels.getMatrixAt(0, m); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return new THREE.Euler().setFromQuaternion(q, 'YXZ').y; };
        fleet.update(list, 1 / 30);
        const first = angle();
        fleet.update(list, 1 / 30);
        const radius = vehicleParts('hatchback').wheelRadius;
        const step = ((angle() - first) + 2 * Math.PI) % (2 * Math.PI);
        expect(step).toBeCloseTo(10 / 30 / radius % (2 * Math.PI), 2);
        list[0].speed = 0;
        const before = angle();
        fleet.update(list, 1 / 30);
        expect(angle()).toBeCloseTo(before, 5);
        fleet.dispose();
    });

    it('lights the brake lamps while braking or standing and dims them when the car speeds along', () => {
        const list = cars(), fleet = createFleet(list, [0xff0000]);
        const lamp = fleet.group.children.find(c => c.name.includes('hatchback taillight')) as THREE.InstancedMesh;
        const lit = () => { const c = new THREE.Color(); lamp.getColorAt(0, c); return c.r; };
        fleet.update(list, 1 / 30); fleet.update(list, 1 / 30);
        const cruising = lit();
        list[0].speed = 6; fleet.update(list, 1 / 30);          // 4 m/s dropped in a frame: hard braking
        const braking = lit();
        expect(braking).toBeGreaterThan(cruising * 1.5);
        list[0].speed = 0; fleet.update(list, 1 / 30);          // standing still keeps them on
        expect(lit()).toBeCloseTo(braking, 3);
        list[0].speed = 10; fleet.update(list, 1 / 30);
        expect(lit()).toBeCloseTo(cruising, 3);
        fleet.dispose();
    });

    it('seats the cars on the road: the instance z is the car z and every wheel touches it', () => {
        const list = cars(), fleet = createFleet(list, [0xff0000]);
        fleet.update(list, 1 / 30);
        for (const mesh of fleet.group.children as THREE.InstancedMesh[]) {
            if (!mesh.name.includes('колёса')) continue;
            const kind = mesh.name.split(' ')[1] as VehicleKind, p = vehicleParts(kind);
            const m = new THREE.Matrix4(), v = new THREE.Vector3();
            for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); v.setFromMatrixPosition(m); expect(v.z - p.wheelRadius).toBeCloseTo(.06, 4); }
        }
        fleet.dispose();
    });
});

describe('traffic fleet on a real network', () => {
    const road = (id: string, width: number, ...pts: Array<[number, number]>): RoadLike => ({ id, kind: 'road', width, points: pts.map(([x, y]) => ({ x, y })) });
    it('mixes at least five kinds, and cars on a 6 m road are drawn at full size', () => {
        const traffic = createTraffic([road('a', 6, [-300, 0], [300, 0]), road('b', 6, [0, -300], [0, 300]), road('c', 6, [-300, 100], [300, 100]), road('d', 6, [100, -300], [100, 300])], { seed: 5 });
        const kinds = new Set(traffic.agents.map(a => a.kind));
        expect(kinds.size).toBeGreaterThanOrEqual(5);
        for (const a of traffic.agents) { expect(a.scale).toBeGreaterThan(.95); expect(a.length).toBeGreaterThanOrEqual(4 * a.scale); }
    });
});
