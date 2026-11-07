import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VEHICLES, type VehicleKind } from './vehicle-kinds.js';

/*
 * Road vehicles built from real side profiles instead of lumps: hatchback, sedan, SUV, van (one parametric car body each),
 * box lorry and bus (boxes). Front is +X, ground is z = 0, the sizes are those of vehicle-kinds.ts. The body geometry of a kind is
 * built once and shared; the wheels are separate (one tyre + one hub geometry per kind) because they turn with the speed.
 * Paint, glass, trim, head lamps and brake lamps are separate materials: the lamps are instance-coloured in the fleet
 * (car-fleet.ts) so that the brake lights can come on per car. Window glass is not named like the building glass, so it does
 * not light up at night; the head lamps do.
 */

/** Extrudes a side profile (x forward, y up) across the vehicle's width, centred on y = 0. */
function profile(points: Array<[number, number]>, width: number): THREE.BufferGeometry {
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
const merge = (list: THREE.BufferGeometry[]) => { const g = mergeGeometries(list.map(item => item.index ? item.toNonIndexed() : item))!; list.forEach(item => item.dispose()); return g; };
/** A slab tilted about Y: runs from (x0, z0) to (x1, z1) in the side view, `thickness` thick, `width` across. */
function slab(x0: number, z0: number, x1: number, z1: number, width: number, thickness: number): THREE.BufferGeometry {
    const length = Math.hypot(x1 - x0, z1 - z0);
    return new THREE.BoxGeometry(length, width, thickness).rotateY(-Math.atan2(z1 - z0, x1 - x0)).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
}

export type VehicleParts = {
    paint: THREE.BufferGeometry; glass: THREE.BufferGeometry; trim: THREE.BufferGeometry;
    headlight: THREE.BufferGeometry; taillight: THREE.BufferGeometry;
    /** One wheel, centred on its axle (the axle runs along Y). */
    tire: THREE.BufferGeometry; hub: THREE.BufferGeometry;
    /** Tyre and hub in one geometry with vertex colours: the fleet draws all the wheels of a kind in one call. */
    wheel: THREE.BufferGeometry;
    wheelRadius: number;
    /** Axle positions: x along the vehicle, y across (negative = right-hand side, looking forward -Y is right). */
    wheels: Array<{ x: number; y: number }>;
};

type CarShape = { wsBase: number; wsTop: number; rrTop: number; rrBase: number; hood: number; belt: number; roof: number; wheelR: number; trunk?: boolean };
const CAR_SHAPES: Partial<Record<VehicleKind, CarShape>> = {
    hatchback: { wsBase: 1.5, wsTop: .78, rrTop: -.85, rrBase: -1.4, hood: .64, belt: .88, roof: 1.4, wheelR: .32 },
    sedan: { wsBase: 1.6, wsTop: .85, rrTop: -.62, rrBase: -1.25, hood: .68, belt: .92, roof: 1.44, wheelR: .33, trunk: true },
    suv: { wsBase: 1.6, wsTop: 1.0, rrTop: -1.45, rrBase: -1.6, hood: .9, belt: 1.1, roof: 1.74, wheelR: .39 },
    van: { wsBase: 2.1, wsTop: 1.75, rrTop: -2.35, rrBase: -2.5, hood: .85, belt: 1.12, roof: 2.08, wheelR: .36 }
};

function carParts(kind: VehicleKind): VehicleParts {
    const { length: L, width: W } = VEHICLES[kind], s = CAR_SHAPES[kind]!, h = L / 2;
    const r = s.wheelR, wheelX = Math.min(1.45, h - .85), wheelY = W / 2 - .12;
    // Painted shell: lower body with the bonnet and boot, then the cabin frame (roof and pillars) with open window apertures:
    // a solid cabin would hide seated occupants.
    const lowerTop = s.belt - .02;
    const lower = profile([[-h, .2], [h, .2], [h, s.hood - .1], [h - .12, s.hood], [s.wsBase, lowerTop - .04], [s.rrBase, lowerTop - (s.trunk ? 0 : .04)], [-h + .08, s.trunk ? lowerTop - .02 : s.belt - .06], [-h, s.belt - .16]], W);
    const roofThick = .08, pillar = .08, belt = s.belt;
    const cabin = [
        box(s.wsTop - s.rrTop + .05, W - .06, roofThick, (s.wsTop + s.rrTop) / 2, 0, s.roof - roofThick / 2),
        ...[-1, 1].flatMap(side => {
            const y = side * (W / 2 - .06);
            const mid = (s.wsTop + s.rrTop) / 2;
            return [
                slab(s.wsBase, belt, s.wsTop, s.roof - .04, .07, pillar).translate(0, y, 0),                // A pillar
                box(pillar, .07, s.roof - belt, mid, y, (belt + s.roof) / 2),                                 // B pillar
                slab(s.rrBase, belt, s.rrTop, s.roof - .04, .07, pillar).translate(0, y, 0)                  // C pillar
            ];
        })
    ];
    const paint = merge([lower, ...cabin]);
    // Glass: side windows as a band slightly proud of the cabin, the raked windscreen and the rear window.
    const sideGlass = merge([-1, 1].map(side => profile([[s.wsBase - .06, belt + .04], [s.wsTop - .02, s.roof - .1], [s.rrTop + .02, s.roof - .1], [s.rrBase + .06, belt + .04]], .012).translate(0, side * W / 2, 0)));
    const windscreen = slab(s.wsBase - .04, belt + .02, s.wsTop + .02, s.roof - .08, W - .16, .03);
    const rear = slab(s.rrBase + .04, belt + .02, s.rrTop - .02, s.roof - .08, W - .18, .03);
    const glass = merge([sideGlass, windscreen, rear]);
    const sill = s.hood * .5;
    const trim = merge([
        box(.16, W - .04, .22, h, 0, .42), box(.16, W - .04, .22, -h, 0, .42),                       // bumpers
        box(.5, .12, .08, s.wsBase - .3, W / 2 + .08, belt + .1), box(.5, .12, .08, s.wsBase - .3, -W / 2 - .08, belt + .1),   // mirrors
        box(.04, .5, .12, h + .02, 0, s.hood - .04),                                                  // grille
        box(L - .5, .04, .04, 0, W / 2 - .02, .24 + sill * .2), box(L - .5, .04, .04, 0, -W / 2 + .02, .24 + sill * .2),   // sills
        ...[-1, 1].flatMap(side => [
            box(.025, .02, belt - .3, .52, side * (W / 2 + .003), (belt + .25) / 2), box(.025, .02, belt - .3, -.6, side * (W / 2 + .003), (belt + .25) / 2),
            box(.14, .03, .03, .1, side * (W / 2 + .01), belt - .1), box(.14, .03, .03, -.9, side * (W / 2 + .01), belt - .1)
        ]),
        box(.05, .2, .1, -h - .02, .55, .28),                                                         // exhaust tip
        box(.02, .4, .1, h + .1, 0, .36), box(.02, .4, .1, -h - .1, 0, .36)                           // number plates
    ]);
    const headlight = merge([-1, 1].map(side => box(.06, .34, .14, h - .02, side * (W / 2 - .3), s.hood - .02)));
    const taillight = merge([-1, 1].map(side => box(.06, .32, .14, -h + .02, side * (W / 2 - .2), s.belt - .24)));
    return { paint, glass, trim, headlight, taillight, ...wheelGeometry(r, .22), wheelRadius: r,
        wheels: [-wheelX, wheelX].flatMap(x => [-wheelY, wheelY].map(y => ({ x, y }))) };
}

/** Tyre with a visible rim: a darker tread cylinder and a lighter hub disc standing a little proud of the sidewall. */
function wheelGeometry(r: number, width: number): { tire: THREE.BufferGeometry; hub: THREE.BufferGeometry; wheel: THREE.BufferGeometry } {
    // A cylinder's own axis is Y, which already runs across the vehicle: no rotation, or the wheels would lie flat.
    const tire = new THREE.CylinderGeometry(r, r, width, 20);
    const spokes = [0, 1, 2, 3, 4].map(i => box(r * 1.1, width + .05, .045, 0, 0, 0).rotateY(i * Math.PI / 5));
    const hub = merge([new THREE.CylinderGeometry(r * .6, r * .6, width + .02, 20), ...spokes]);
    const wheel = merge([paintVertices(tire.clone(), 0x14161a), paintVertices(hub.clone(), 0xaeb4ba)]);
    return { tire, hub, wheel };
}

/** Writes one colour into every vertex of a geometry (sRGB hex, converted to the linear working space). */
export function paintVertices(geometry: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
    const color = new THREE.Color(hex), count = geometry.attributes.position.count, data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { data[i * 3] = color.r; data[i * 3 + 1] = color.g; data[i * 3 + 2] = color.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
    return geometry;
}

function lorryParts(): VehicleParts {
    const { length: L, width: W } = VEHICLES.truck, h = L / 2, r = .5;
    const cabX = h - 1.1, cargoFront = cabX - 1.15;
    const cab = merge([box(2.2, W - .1, 1.9, cabX, 0, 1.55 + .0)]);
    const cargo = box(cargoFront + h - .15, W, 2.15, (cargoFront - h + .15) / 2 - .0, 0, 2.05);
    const paint = merge([cab, cargo]);
    const glass = merge([
        box(.03, W - .35, .75, cabX + 1.1 + .01, 0, 2.0),                                              // windscreen
        ...[-1, 1].map(side => box(1.0, .03, .65, cabX + .3, side * (W / 2 - .03 + .035), 2.0))        // door windows
    ]);
    const trim = merge([
        box(L - 2.4, W - .7, .25, -1.2 + .0, 0, .62),                                                    // chassis frame
        box(.35, W, .3, h, 0, .5), box(.2, W, .25, -h + .1, 0, .5),                                       // bumpers
        box(.04, .9, .5, h + .01, 0, 1.0),                                                                // grille
        ...[-1, 1].map(side => box(.8, .12, .1, cabX + 1.05, side * (W / 2 + .1), 2.3)),                  // mirrors
        ...[-1, 1].map(side => box(5.2, .04, .05, -1.2, side * (W / 2 + .02), 1.0))                       // cargo skirt rails
    ]);
    const headlight = merge([-1, 1].map(side => box(.06, .3, .2, h - .02, side * (W / 2 - .3), .8)));
    const taillight = merge([-1, 1].map(side => box(.06, .26, .22, -h + .1, side * (W / 2 - .2), .8)));
    const wheels = [2.5, -1.9, -3.1].flatMap(x => [-1, 1].map(side => ({ x: x + (x > 0 ? 0 : 0), y: side * (W / 2 - .2) })));
    return { paint, glass, trim, headlight, taillight, ...wheelGeometry(r, .32), wheelRadius: r, wheels };
}

function busParts(): VehicleParts {
    const { length: L, width: W, height: H } = VEHICLES.bus, h = L / 2, r = .5;
    const paint = merge([
        box(L, W, .85, 0, 0, .55 + .425 - .1),                                                           // lower body to the sill
        box(L, W, .22, 0, 0, H - .11),                                                                   // roof
        ...[-1, 1].flatMap(side => [0, 1, 2, 3].map(i => box(.22, .08, 1.85, -h + 1.7 + i * 2.8 + (i > 1 ? 1 : 0), side * (W / 2 - .04), 1.95 + .0)))   // window pillars
    ]);
    const glass = merge([
        ...[-1, 1].map(side => box(L - .5, .03, 1.5, 0, side * (W / 2 + .005), 2.0)),                  // side window band
        box(.03, W - .3, 1.5, h + .005, 0, 2.05),                                                       // windscreen
        box(.03, W - .5, 1.0, -h - .005, 0, 2.15)                                                       // rear window
    ]);
    const trim = merge([
        box(.2, W - .05, .3, h, 0, .5), box(.2, W - .05, .3, -h, 0, .5),                                 // bumpers
        ...[-1, 1].map(side => box(2.4, .05, 1.9, 1.5, side * (W / 2 + .01), 1.5)),                    // doors
        box(.9, .04, .3, h + .01, 0, H - .38),                                                           // route board
        box(2.2, 1.4, .12, -.8, 0, H + .06)                                                              // roof air-conditioner
    ]);
    const headlight = merge([-1, 1].map(side => box(.06, .32, .2, h - .02, side * (W / 2 - .3), .85)));
    const taillight = merge([-1, 1].map(side => box(.06, .26, .3, -h + .02, side * (W / 2 - .2), .9)));
    const wheels = [3.5, -3.2].flatMap(x => [-1, 1].map(side => ({ x, y: side * (W / 2 - .15) })));
    return { paint, glass, trim, headlight, taillight, ...wheelGeometry(r, .34), wheelRadius: r, wheels };
}

const cachedParts = new Map<VehicleKind, VehicleParts>();
export function vehicleParts(kind: VehicleKind): VehicleParts {
    let parts = cachedParts.get(kind);
    if (!parts) cachedParts.set(kind, parts = kind === 'truck' ? lorryParts() : kind === 'bus' ? busParts() : carParts(kind));
    return parts;
}

export const VEHICLE_MATERIALS = {
    glass: new THREE.MeshStandardMaterial({ name: 'CarGlass', color: 0x718d9b, roughness: .15, metalness: .1, transparent: true, opacity: .4, depthWrite: false }),
    wheel: new THREE.MeshStandardMaterial({ name: 'Wheel', vertexColors: true, roughness: .7, metalness: .25 }),
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

/** Brake lamps: dim red with the pedal up, bright when braking (a car that stands at a light keeps them on). */
export const BRAKE_LIT = 0xff2a22, BRAKE_DIM = 0x8a1218;

/** A standalone vehicle (police car): shared body geometry, wheels as separate nodes listed in userData.wheels so that they can turn. */
export function createCar(color: number, kind: VehicleKind = 'hatchback'): THREE.Group {
    const p = vehicleParts(kind), car = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = car) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; parent.add(mesh); return mesh;
    };
    add(p.paint, paint(color)); add(p.glass, VEHICLE_MATERIALS.glass); add(p.trim, VEHICLE_MATERIALS.trim);
    add(p.headlight, VEHICLE_MATERIALS.headlight); add(p.taillight, VEHICLE_MATERIALS.taillight);
    const wheels: THREE.Object3D[] = [];
    for (const w of p.wheels) {
        const node = new THREE.Group();
        node.position.set(w.x, w.y, p.wheelRadius);
        add(p.tire, VEHICLE_MATERIALS.tire, node); add(p.hub, VEHICLE_MATERIALS.hub, node);
        car.add(node); wheels.push(node);
    }
    car.userData.collidable = false;
    car.userData.wheels = wheels; car.userData.wheelRadius = p.wheelRadius;
    return car;
}

/** White car with a blue stripe and a light bar on the roof. */
export function createPoliceCar(): THREE.Group {
    const car = createCar(0xf2f4f6, 'sedan');
    const blue = new THREE.MeshStandardMaterial({ name: 'PoliceBlue', color: 0x1e4fb8, roughness: .5 });
    const stripe = new THREE.Mesh(box(4.5, VEHICLES.sedan.width + .02, .16, 0, 0, .7), blue);
    const barBlue = new THREE.Mesh(box(.28, .5, .12, -.1, -.3, 1.5), new THREE.MeshStandardMaterial({ name: 'PoliceLightBlue', color: 0x2f6bff, emissive: 0x1235a0, roughness: .4 }));
    const barRed = new THREE.Mesh(box(.28, .5, .12, -.1, .3, 1.5), new THREE.MeshStandardMaterial({ name: 'PoliceLightRed', color: 0xff3030, emissive: 0x7a1010, roughness: .4 }));
    car.add(stripe, barBlue, barRed);
    return car;
}
