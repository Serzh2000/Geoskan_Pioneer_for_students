import * as THREE from 'three';
import { createSignalLights } from '../public/modules/world/signal-lights.js';
import { createTraffic } from '../public/modules/world/traffic.js';
import type { RoadLike } from '../public/modules/world/roads.js';

const road = (id: string, width: number, ...pts: Array<[number, number]>): RoadLike => ({ id, kind: 'road', width, points: pts.map(([x, y]) => ({ x, y })) });
const crossing = () => [road('a', 4, [-120, 0], [120, 0]), road('b', 4, [0, -120], [0, 120])];

/** Which lamp of head `index` is lit: 0 red, 1 yellow, 2 green; -1 when none or several. */
function litLamp(lamps: THREE.InstancedMesh, index: number): number {
    const color = new THREE.Color();
    const lit: number[] = [];
    for (let slot = 0; slot < 3; slot++) {
        lamps.getColorAt(index * 3 + slot, color);
        if (Math.max(color.r, color.g, color.b) > .5) lit.push(slot);
    }
    return lit.length === 1 ? lit[0] : -1;
}

describe('traffic light geometry', () => {
    const lampOf = { red: 0, yellow: 1, green: 2 } as const;

    it('draws a whole map of lights in two instanced meshes, three lamps per head', () => {
        const traffic = createTraffic(crossing(), { seed: 3 });
        const lights = createSignalLights(traffic.signals, () => 0);
        const [bodies, lamps] = lights.group.children as THREE.InstancedMesh[];
        expect(lights.group.children).toHaveLength(2);
        expect(bodies.count).toBe(traffic.signals.heads.length);
        expect(lamps.count).toBe(traffic.signals.heads.length * 3);
        lights.dispose();
    });

    it('stands each head on the ground at its stop line and faces the lamps at the oncoming cars', () => {
        const traffic = createTraffic(crossing(), { seed: 3 });
        const lights = createSignalLights(traffic.signals, (x, y) => 2 + x * 0 + y * 0);
        const [bodies, lamps] = lights.group.children as THREE.InstancedMesh[];
        const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
        traffic.signals.heads.forEach((head, index) => {
            bodies.getMatrixAt(index, matrix);
            position.setFromMatrixPosition(matrix);
            expect(position.x).toBeCloseTo(head.x, 6);
            expect(position.y).toBeCloseTo(head.y, 6);
            expect(position.z).toBeCloseTo(2, 6);
            // The red lamp is above the green one and sits in front of the housing, towards the cars.
            const heights = [0, 1, 2].map(slot => { lamps.getMatrixAt(index * 3 + slot, matrix); return new THREE.Vector3().setFromMatrixPosition(matrix); });
            expect(heights[0].z).toBeGreaterThan(heights[1].z);
            expect(heights[1].z).toBeGreaterThan(heights[2].z);
            const toward = { x: -Math.cos(head.heading), y: -Math.sin(head.heading) };
            expect((heights[0].x - head.x) * toward.x + (heights[0].y - head.y) * toward.y).toBeGreaterThan(0);
        });
        lights.dispose();
    });

    it('lights exactly the lamp that matches the state of its phase, through the whole cycle', () => {
        const traffic = createTraffic(crossing(), { seed: 3 });
        const lights = createSignalLights(traffic.signals, () => 0);
        const lamps = lights.group.children[1] as THREE.InstancedMesh;
        const seen = new Set<string>();
        for (let t = 0; t < 80; t += .5) {
            traffic.signals.update(.5);
            lights.update();
            const signal = traffic.signals.signals[0];
            traffic.signals.heads.forEach((head, index) => {
                const state = traffic.signals.stateOfGroup(signal, head.group);
                expect(litLamp(lamps, index)).toBe(lampOf[state]);
                seen.add(state);
            });
        }
        expect(seen).toEqual(new Set(['red', 'yellow', 'green']));
        lights.dispose();
    });

    it('recolours only when a signal changes', () => {
        const traffic = createTraffic(crossing(), { seed: 3 });
        const lights = createSignalLights(traffic.signals, () => 0);
        const lamps = lights.group.children[1] as THREE.InstancedMesh;
        lights.update();
        const version = lamps.instanceColor!.version;
        traffic.signals.update(.01);
        lights.update(); lights.update();
        expect(lamps.instanceColor!.version).toBe(version);
        traffic.signals.update(30);                                    // well past a phase change
        lights.update();
        expect(lamps.instanceColor!.version).toBeGreaterThan(version);
        lights.dispose();
    });

    it('is empty, and harmless, on a map without junctions', () => {
        const traffic = createTraffic([road('only', 4, [-100, 0], [100, 0])], { seed: 3 });
        const lights = createSignalLights(traffic.signals, () => 0);
        expect(lights.group.children).toHaveLength(0);
        expect(() => { lights.update(); lights.dispose(); }).not.toThrow();
    });
});
