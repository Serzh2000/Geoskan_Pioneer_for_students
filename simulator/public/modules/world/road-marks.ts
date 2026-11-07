import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paintVertices } from './car-model.js';
import type { SignalHead } from './signals.js';

/*
 * What the traffic lights of signals.ts also need on the ground: a stop line across every approach, a zebra crossing just beyond the
 * line, in the mouth of the junction, where the road is wide enough for one, and a blue "pedestrian crossing" sign facing the cars. Three
 * instanced meshes for the whole map (marks, sign poles, sign plates): flat paint is lifted a hair above the road surface and
 * drawn with a polygon offset, so it does not flicker against the asphalt at any distance.
 */
const PAINT_Z = .05;
const SIGN = { pole: 2.5, plate: .6 };
const ZEBRA = { depth: 2.2, stripe: .5, pitch: 1, gap: .5, minLane: 1.9 };

export interface RoadMarks { group: THREE.Group; stopLines: number; zebraStripes: number; signs: number; dispose(): void }

export function createRoadMarks(heads: ReadonlyArray<SignalHead>, groundAt: (x: number, y: number) => number): RoadMarks {
    const group = new THREE.Group();
    group.name = 'Разметка перекрёстков'; group.userData.collidable = false;
    const marks: THREE.Matrix4[] = [], signMatrices: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 0, 1), one = new THREE.Vector3(1, 1, 1), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let stopLines = 0, zebraStripes = 0, signs = 0;
    for (const head of heads) {
        const fx = Math.cos(head.heading), fy = Math.sin(head.heading);          // direction of travel
        const nx = -fy, ny = fx;                                                  // across the lane
        const z = groundAt(head.stop.x, head.stop.y) + PAINT_Z;
        q.setFromAxisAngle(up, head.heading);
        // Stop line: 0.4 m wide, across the whole lane, its front edge at the stopping place.
        p.set(head.stop.x - fx * .2, head.stop.y - fy * .2, z); s.set(.4, head.laneWidth - .3, 1);
        marks.push(new THREE.Matrix4().compose(p, q, s)); stopLines++;
        if (head.laneWidth < ZEBRA.minLane) continue;
        // Zebra: stripes along the direction of travel, between the stop line and the junction.
        const count = Math.max(1, Math.floor((head.laneWidth - .5) / ZEBRA.pitch)), first = -(count - 1) / 2 * ZEBRA.pitch;
        for (let i = 0; i < count; i++) {
            const along = ZEBRA.gap + ZEBRA.depth / 2;
            p.set(head.stop.x + fx * along + nx * (first + i * ZEBRA.pitch), head.stop.y + fy * along + ny * (first + i * ZEBRA.pitch), z);
            s.set(ZEBRA.depth, ZEBRA.stripe, 1);
            marks.push(new THREE.Matrix4().compose(p, q, s)); zebraStripes++;
        }
        // Sign: on the kerb beside the head, a little before the stop line, its plate turned to the oncoming cars.
        const hx = head.x - fx * 1.6, hy = head.y - fy * 1.6, gz = groundAt(hx, hy);
        // One instance = pole and plate (the plate faces the cars: against the direction of travel).
        p.set(hx, hy, gz); signMatrices.push(new THREE.Matrix4().compose(p, q, one)); signs++;
    }
    const paint = new THREE.MeshStandardMaterial({ color: 0xe8e6d8, roughness: .85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const signMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3 });
    const flat = (g: THREE.BufferGeometry) => g.index ? g.toNonIndexed() : g;
    const sign = mergeGeometries([
        paintVertices(flat(new THREE.CylinderGeometry(.04, .04, SIGN.pole, 8).rotateX(Math.PI / 2).translate(0, 0, SIGN.pole / 2)), 0x8a9096),
        paintVertices(flat(new THREE.BoxGeometry(.03, SIGN.plate, SIGN.plate).translate(-.06, 0, SIGN.pole - SIGN.plate / 2 + .05)), 0x1f5fbf),
        // A white bar and a white block on the blue field: the pedestrian on the crossing, reduced to what reads from 40 m.
        paintVertices(flat(new THREE.BoxGeometry(.03, .08, .36).translate(-.09, 0, SIGN.pole - SIGN.plate / 2 + .05)), 0xffffff),
        paintVertices(flat(new THREE.BoxGeometry(.03, .26, .06).translate(-.09, 0, SIGN.pole - SIGN.plate / 2 - .1)), 0xffffff)
    ])!;
    const geometries: THREE.BufferGeometry[] = [sign];
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[], name: string, shadow = false) => {
        geometries.push(geometry);
        if (!matrices.length) return;
        const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; mesh.castShadow = shadow; mesh.receiveShadow = !shadow;
        mesh.name = name; mesh.userData.collidable = false;
        group.add(mesh);
    };
    instanced(new THREE.PlaneGeometry(1, 1), paint, marks, 'Разметка: стоп-линии и зебры');
    instanced(sign, signMaterial, signMatrices, 'Знаки: «пешеходный переход»', true);
    return { group, stopLines, zebraStripes, signs, dispose() { geometries.forEach(g => g.dispose()); paint.dispose(); signMaterial.dispose(); } };
}
