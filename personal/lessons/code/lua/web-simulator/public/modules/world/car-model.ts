import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/*
 * A small hatchback built from a real side profile instead of boxes: bonnet, raked windscreen, roof and boot, wheels
 * with hubs, lights, bumpers and mirrors. Front is +X, ground is z = 0, 4.2 m long and 1.75 m wide. Geometry is built
 * once and shared by every car; only the paint material differs. Window glass is not named like the building glass,
 * so it does not light up at night; the head lamps do.
 */
const WIDTH = 1.75;

/** Extrudes a side profile (x forward, y up) across the car's width, centred on y = 0. */
function profile(points: Array<[number, number]>, width = WIDTH): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geometry.rotateX(Math.PI / 2);         // shape y -> up, extrusion -> across the car
    geometry.translate(0, width / 2, 0);
    return geometry;
}

const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
// A cylinder's own axis is Y, which already runs across the car: no rotation, or the wheels would lie flat.
const wheel = (r: number, w: number, x: number, y: number) => new THREE.CylinderGeometry(r, r, w, 18).translate(x, y, r);
// Dark half-disc on the body side above a wheel: reads as a wheel arch from the air.
const arch = (x: number, y: number) => new THREE.CylinderGeometry(.43, .43, .05, 16, 1, false, -Math.PI / 2, Math.PI).translate(x, y, .34);

type Parts = Record<'paint' | 'glass' | 'tire' | 'hub' | 'trim' | 'headlight' | 'taillight', THREE.BufferGeometry>;
let cached: Parts | null = null;

function parts(): Parts {
    if (cached) return cached;
    const merge = (list: THREE.BufferGeometry[]) => { const g = mergeGeometries(list.map(item => item.index ? item.toNonIndexed() : item))!; list.forEach(item => item.dispose()); return g; };

    // Painted shell: lower body with the bonnet and boot, the cabin on top of it.
    const lower = profile([[-2.1, .2], [2.1, .2], [2.1, .62], [1.55, .88], [-1.55, .88], [-2.1, .78]]);
    // Open window apertures: a solid extruded cabin would completely hide seated occupants.
    const cabin = [
        box(1.62, WIDTH - .06, .08, -.09, 0, 1.36),
        ...[-1, 1].flatMap(side => [
            new THREE.BoxGeometry(.08, .07, .76).rotateY(Math.atan2(.58, -.54)).translate(1.01, side * (WIDTH / 2 - .06), 1.13),
            box(.08, .07, .5, -.22, side * (WIDTH / 2 - .06), 1.13),
            new THREE.BoxGeometry(.08, .07, .76).rotateY(-Math.atan2(.55, -.54)).translate(-1.175, side * (WIDTH / 2 - .06), 1.13)
        ])
    ];
    const paint = merge([lower, ...cabin]);

    // Glass: side windows as a band slightly proud of the cabin, plus the raked windscreen and rear window.
    const sideGlass = merge([-1, 1].map(side => {
        const window = profile([[1.08, .92], [.66, 1.32], [-.84, 1.32], [-1.3, .92]], .012);
        return window.translate(0, side * WIDTH / 2, 0);
    }));
    const windscreen = new THREE.BoxGeometry(.8, WIDTH - .14, .03).rotateY(Math.atan2(.54, .58)).translate(1.01, 0, 1.13);
    const rear = new THREE.BoxGeometry(.78, WIDTH - .16, .03).rotateY(-Math.atan2(.54, .55)).translate(-1.175, 0, 1.13);
    const glass = merge([sideGlass, windscreen, rear]);

    const wheelX = 1.28, wheelY = WIDTH / 2 - .075;
    const tires: THREE.BufferGeometry[] = [], hubs: THREE.BufferGeometry[] = [], arches: THREE.BufferGeometry[] = [];
    for (const x of [-wheelX, wheelX]) for (const y of [-wheelY, wheelY]) {
        tires.push(wheel(.34, .2, x, y));
        hubs.push(wheel(.2, .22, x, y));
        arches.push(arch(x, Math.sign(y) * (WIDTH / 2 + .005)));
    }
    const trim = merge([
        box(.14, WIDTH - .04, .2, 2.12, 0, .42), box(.14, WIDTH - .04, .2, -2.12, 0, .42),      // bumpers
        box(.5, .12, .08, .86, WIDTH / 2 + .08, 1.02), box(.5, .12, .08, .86, -WIDTH / 2 - .08, 1.02),   // mirrors
        box(.04, .5, .12, 2.12, 0, .62),                                                          // grille
        box(1.7, .04, .04, -.1, WIDTH / 2 - .02, .88), box(1.7, .04, .04, -.1, -WIDTH / 2 + .02, .88),   // sills
        // door seams, handles and the exhaust tip
        ...[-1, 1].flatMap(side => [
            box(.025, .02, .56, .52, side * (WIDTH / 2 + .003), .6), box(.025, .02, .56, -.6, side * (WIDTH / 2 + .003), .6),
            box(.14, .03, .03, .1, side * (WIDTH / 2 + .01), .78), box(.14, .03, .03, -.9, side * (WIDTH / 2 + .01), .78)
        ]),
        box(.05, .2, .1, -2.14, .55, .28), ...arches
    ]);
    const headlight = merge([box(.06, .32, .14, 2.1, -.58, .64), box(.06, .32, .14, 2.1, .58, .64)]);
    const taillight = merge([box(.06, .3, .13, -2.1, -.62, .68), box(.06, .3, .13, -2.1, .62, .68)]);
    cached = { paint, glass, tire: merge(tires), hub: merge(hubs.concat([box(.02, .4, .1, 2.2, 0, .36), box(.02, .4, .1, -2.2, 0, .36)])), trim, headlight, taillight };   // hubs + number plates
    return cached;
}

const materials = {
    glass: new THREE.MeshStandardMaterial({ name: 'CarGlass', color: 0x718d9b, roughness: .15, metalness: .1, transparent: true, opacity: .32, depthWrite: false }),
    tire: new THREE.MeshStandardMaterial({ name: 'Tire', color: 0x14161a, roughness: .9 }),
    hub: new THREE.MeshStandardMaterial({ name: 'Hub', color: 0xaeb4ba, roughness: .4, metalness: .7 }),
    trim: new THREE.MeshStandardMaterial({ name: 'CarTrim', color: 0x24282d, roughness: .6 }),
    headlight: new THREE.MeshStandardMaterial({ name: 'LampLens', color: 0xfff1c9, roughness: .3 }),
    taillight: new THREE.MeshStandardMaterial({ name: 'Taillight', color: 0xb3151b, roughness: .4 })
};
const paints = new Map<number, THREE.MeshStandardMaterial>();
const paint = (color: number) => {
    let material = paints.get(color);
    if (!material) paints.set(color, material = new THREE.MeshStandardMaterial({ name: 'CarPaint', color, roughness: .45, metalness: .35 }));
    return material;
};

export function createCar(color: number): THREE.Group {
    const p = parts(), car = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; car.add(mesh);
    };
    add(p.paint, paint(color)); add(p.glass, materials.glass); add(p.tire, materials.tire); add(p.hub, materials.hub);
    add(p.trim, materials.trim); add(p.headlight, materials.headlight); add(p.taillight, materials.taillight);
    car.userData.collidable = false;
    return car;
}

/** White car with a blue stripe and a light bar on the roof. */
export function createPoliceCar(): THREE.Group {
    const car = createCar(0xf2f4f6);
    const blue = new THREE.MeshStandardMaterial({ name: 'PoliceBlue', color: 0x1e4fb8, roughness: .5 });
    const stripe = new THREE.Mesh(box(3.9, WIDTH + .02, .16, 0, 0, .66), blue);
    const barBlue = new THREE.Mesh(box(.28, .5, .12, -.1, -.3, 1.48), new THREE.MeshStandardMaterial({ name: 'PoliceLightBlue', color: 0x2f6bff, emissive: 0x1235a0, roughness: .4 }));
    const barRed = new THREE.Mesh(box(.28, .5, .12, -.1, .3, 1.48), new THREE.MeshStandardMaterial({ name: 'PoliceLightRed', color: 0xff3030, emissive: 0x7a1010, roughness: .4 }));
    car.add(stripe, barBlue, barRed);
    return car;
}
