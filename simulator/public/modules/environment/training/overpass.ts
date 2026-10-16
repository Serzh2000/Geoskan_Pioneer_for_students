import * as THREE from 'three';
import { OVERPASS_RAMP, overpassHeight, overpassSpans } from '../../world/roads.js';
import type { TrainingLayout } from './layout.js';

/*
 * The road bridge over the railway: a level span on two abutments, earth ramps rising smoothly on both sides (the
 * road ribbon itself is lifted along the same curve, see overpassLift in world/roads.ts) and parapets that follow the
 * slope. Everything is built in the bridge's own frame: x along the road, y across it.
 */
const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b5a5, roughness: .95, side: THREE.DoubleSide });
const dark = new THREE.MeshStandardMaterial({ color: 0x6f777a, roughness: .9 });
/** The ramps are solid with vertical retaining walls, like a viaduct approach. */
const retaining = new THREE.MeshStandardMaterial({ color: 0x9a978a, roughness: .95, side: THREE.DoubleSide });

type Section = Array<[number, number]>;

/** Solid swept along x: `section(x)` is a closed polygon in (y, z); consecutive sections are joined by quads. */
function sweep(xs: number[], section: (x: number) => Section, material: THREE.Material): THREE.Mesh {
    const positions: number[] = [], indices: number[] = [];
    let m = 0;
    xs.forEach((x, i) => {
        const polygon = section(x);
        m = polygon.length;
        for (const [y, z] of polygon) positions.push(x, y, z);
        if (i === 0) return;
        const a = (i - 1) * m, b = i * m;
        for (let k = 0; k < m; k++) {
            const n = (k + 1) % m;
            indices.push(a + k, b + k, b + n, a + k, b + n, a + n);
        }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true; mesh.castShadow = true;
    return mesh;
}

export function addOverpasses(parent: THREE.Group, layout: TrainingLayout): void {
    for (const bridge of overpassSpans(layout.paths, layout.bridges)) {
        const road = layout.paths.find(p => p.id === bridge.pathId);
        const hw = (road?.width ?? bridge.width) / 2, height = overpassHeight(bridge), half = bridge.length / 2, rampLength = bridge.ramp ?? OVERPASS_RAMP;
        const deck = new THREE.Group();
        deck.name = 'Путепровод'; deck.position.set(bridge.x, bridge.y, 0); deck.rotation.z = bridge.rotation;
        deck.userData.collidable = false;
        const lift = (x: number) => {
            const t = Math.max(0, Math.min(1, (half + rampLength - Math.abs(x)) / rampLength));
            return height * t * t * (3 - 2 * t);
        };
        const box = (x: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
            mesh.position.set(x, 0, z); mesh.receiveShadow = true; mesh.castShadow = true;
            deck.add(mesh);
        };
        // Span: a girder under the carriageway, abutments at both ends.
        box(0, height - .42, bridge.length, hw * 2 + 1.1, .8, concrete);
        for (const side of [-1, 1]) box(side * (half - .7), (height - .8) / 2, 1.4, hw * 2 + 1.1, height - .8, dark);
        // Ramps and parapets.
        const steps = Math.ceil(rampLength / 2);
        const ramp: number[] = [];
        for (let i = 0; i <= steps; i++) ramp.push(half + rampLength * i / steps);
        const sides = [-1, 1];
        for (const side of sides) {
            const xs = ramp.map(x => x * side).sort((a, b) => a - b);
            deck.add(sweep(xs, x => {
                const f = lift(x), top = hw + .55;
                return [[-top, f - .04], [top, f - .04], [top, -.02], [-top, -.02]];
            }, retaining));
        }
        const all = [...ramp.map(x => -x).reverse(), ...ramp.slice(1)];
        const spanXs = [-half, half];
        const railXs = [...new Set([...all, ...spanXs])].sort((a, b) => a - b);
        for (const side of sides) {
            const y = side * (hw + .42);
            deck.add(sweep(railXs, x => {
                const f = lift(x) - .03, h = .3 + .55 * Math.min(1, lift(x) / 1.5);
                return [[y - .12, f], [y + .12, f], [y + .12, f + h], [y - .12, f + h]];
            }, concrete));
        }
        parent.add(deck);
    }
}
