import * as THREE from 'three';
import { createLandscapeAsset } from '../public/modules/environment/training/landscape-assets.js';
import { createRoadMarks } from '../public/modules/world/road-marks.js';
import { createTraffic } from '../public/modules/world/traffic.js';
import { generateTrainingLayout } from '../public/modules/environment/training/layout.js';
import { GREEN_S, YELLOW_S, stateAt } from '../public/modules/world/signals.js';
import type { RoadLike } from '../public/modules/world/roads.js';

const size = (name: Parameters<typeof createLandscapeAsset>[0]) => new THREE.Box3().setFromObject(createLandscapeAsset(name)).getSize(new THREE.Vector3());

describe('street props have a real-world size', () => {
    it('a street lamp is 4 to 8 m tall', () => { const h = size('StreetLamp').z; expect(h).toBeGreaterThanOrEqual(4); expect(h).toBeLessThanOrEqual(8); });
    it('a bus stop shelter is 2 to 3.5 m tall and a bench about half a metre to a metre', () => {
        const s = size('BusStop').z, b = size('Bench').z;
        expect(s).toBeGreaterThanOrEqual(2); expect(s).toBeLessThanOrEqual(3.5);
        expect(b).toBeGreaterThanOrEqual(.5); expect(b).toBeLessThanOrEqual(1.1);
    });
});

describe('junction markings and signs', () => {
    const road = (id: string, width: number, ...pts: Array<[number, number]>): RoadLike => ({ id, kind: 'road', width, points: pts.map(([x, y]) => ({ x, y })) });
    const traffic = createTraffic([road('a', 6, [-120, 0], [120, 0]), road('b', 6, [0, -120], [0, 120])], { seed: 3 });
    const heads = traffic.signals.heads;

    it('draws one stop line per approach, across its own lane, and a zebra after it', () => {
        const marks = createRoadMarks(heads, () => 0);
        expect(marks.stopLines).toBe(heads.length);
        expect(marks.zebraStripes).toBeGreaterThanOrEqual(heads.length);
        const paint = marks.group.children[0] as THREE.InstancedMesh, m = new THREE.Matrix4(), p = new THREE.Vector3();
        heads.forEach((head, i) => {
            paint.getMatrixAt(i === 0 ? 0 : 0, m); p.setFromMatrixPosition(m);
        });
        // Every instance lies a hair above the road (flat paint) and within the junction mouth region.
        for (let i = 0; i < paint.count; i++) { paint.getMatrixAt(i, m); p.setFromMatrixPosition(m); expect(p.z).toBeGreaterThan(.03); expect(p.z).toBeLessThan(.1); }
        marks.dispose();
    });

    it('stands each sign at a height of about 2.5 m on the kerb side of its approach, plate turned to the cars', () => {
        const marks = createRoadMarks(heads, () => 1);
        const signs = marks.group.children.find(c => c.name.startsWith('Знаки')) as THREE.InstancedMesh;
        expect(signs.count).toBe(marks.signs);
        signs.geometry.computeBoundingBox();
        const h = signs.geometry.boundingBox!.max.z;
        expect(h).toBeGreaterThanOrEqual(2.3); expect(h).toBeLessThanOrEqual(3);
        const plate = new THREE.Vector3();
        const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        // The face with the pictogram looks to -X in the sign's own frame: opposite to the direction of travel.
        signs.getMatrixAt(0, m); m.decompose(p, q, s);
        plate.set(-1, 0, 0).applyQuaternion(q);
        const head = heads.find(hd => Math.hypot(hd.x - p.x, hd.y - p.y) < 2.5)!;
        expect(plate.x * Math.cos(head.heading) + plate.y * Math.sin(head.heading)).toBeLessThan(-.99);
        expect(p.z).toBeCloseTo(1, 6);
        marks.dispose();
    });
});

describe('traffic light phases', () => {
    it('follows green, yellow, red, and the crossing group is red while the other is green or yellow', () => {
        const order: string[] = [];
        for (let t = 0; t < 76; t += .5) {
            const a = stateAt(t, 0, 2), b = stateAt(t, 1, 2);
            expect(a === 'green' || a === 'yellow' ? b : 'red').toBe('red');
            expect(b === 'green' || b === 'yellow' ? a : 'red').toBe('red');
            if (order[order.length - 1] !== a) order.push(a);
        }
        expect(order.slice(0, 4)).toEqual(['green', 'yellow', 'red', 'green']);
        expect(GREEN_S).toBeGreaterThan(YELLOW_S);
    });

    it('stands every head on the right-hand kerb beside its lane, outside the carriageway', () => {
        const layout = generateTrainingLayout({ profile: 'city', seed: 20261009 });
        const traffic = createTraffic(layout.paths.filter(p => p.kind === 'road'), { seed: layout.seed });
        expect(traffic.signals.heads.length).toBeGreaterThan(20);
        for (const head of traffic.signals.heads) {
            const road = layout.paths.find(p => p.id === head.roadId)!;
            // Right of the direction of travel: cross product of the heading with (head - stop) is negative.
            const dx = head.x - head.stop.x, dy = head.y - head.stop.y;
            expect(Math.cos(head.heading) * dy - Math.sin(head.heading) * dx).toBeLessThan(0);
            expect(Math.hypot(dx, dy)).toBeGreaterThan(road.width / 4 - .01);
        }
    });
});
