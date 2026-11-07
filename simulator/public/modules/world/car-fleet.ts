import * as THREE from 'three';
import { BRAKE_DIM, BRAKE_LIT, VEHICLE_MATERIALS, vehicleParts } from './car-model.js';
import type { VehicleKind } from './vehicle-kinds.js';

/*
 * All the ambient cars of a map as a few instanced meshes: one set per vehicle kind (paint, glass, trim, head lamps, brake lamps,
 * tyres, hubs), not seven meshes per car. A car is a matrix per body part and one per wheel; the wheels turn by the distance
 * driven over their radius, the paint is an instance colour and the brake lamps light up (instance colour again) while the car
 * brakes or stands still.
 */
export interface FleetCar { id: number; kind: VehicleKind; x: number; y: number; z: number; heading: number; scale: number; speed: number }
export interface Fleet {
    group: THREE.Group;
    /** Poses the cars; `dt` advances wheel rotation and the brake-lamp state. Cars must be the same list every call. */
    update(cars: ReadonlyArray<FleetCar>, dt: number): void;
    dispose(): void;
}

const PARTS = ['paint', 'glass', 'trim', 'headlight', 'taillight'] as const;
const BRAKE_ON = new THREE.Color(BRAKE_LIT), BRAKE_OFF = new THREE.Color(BRAKE_DIM);

export function createFleet(cars: ReadonlyArray<FleetCar>, colors: ReadonlyArray<number>): Fleet {
    const group = new THREE.Group();
    group.name = 'Машины'; group.userData.collidable = false;
    const kinds = [...new Set(cars.map(c => c.kind))];
    const white = (m: THREE.Material, extra: Partial<THREE.MeshStandardMaterial> = {}) => Object.assign((m as THREE.MeshStandardMaterial).clone(), extra);
    const paintMaterial = new THREE.MeshStandardMaterial({ name: 'CarPaint', color: 0xffffff, roughness: .45, metalness: .35 });
    const brakeMaterial = new THREE.MeshBasicMaterial({ name: 'Taillight', color: 0xffffff });
    const lampMaterial = white(VEHICLE_MATERIALS.headlight);
    const materials: Record<(typeof PARTS)[number], THREE.Material> = { paint: paintMaterial, glass: VEHICLE_MATERIALS.glass, trim: VEHICLE_MATERIALS.trim, headlight: lampMaterial, taillight: brakeMaterial };

    type Set = { cars: FleetCar[]; parts: THREE.InstancedMesh[]; wheels: THREE.InstancedMesh; wheelsPer: number; radius: number };
    const sets = new Map<VehicleKind, Set>();
    for (const kind of kinds) {
        const mine = cars.filter(c => c.kind === kind), p = vehicleParts(kind);
        const parts = PARTS.map(name => {
            const mesh = new THREE.InstancedMesh(p[name], materials[name], mine.length);
            mesh.name = `Машины: ${kind} ${name}`; mesh.frustumCulled = false; mesh.castShadow = name !== 'glass';
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.userData.collidable = false;
            return mesh;
        });
        const wheels = new THREE.InstancedMesh(p.wheel, VEHICLE_MATERIALS.wheel, mine.length * p.wheels.length);
        wheels.name = `Машины: ${kind} колёса`; wheels.frustumCulled = false; wheels.castShadow = true; wheels.userData.collidable = false; wheels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mine.forEach((car, i) => {
            parts[0].setColorAt(i, new THREE.Color(colors[car.id % colors.length]));
            parts[4].setColorAt(i, BRAKE_OFF);
        });
        group.add(...parts, wheels);
        sets.set(kind, { cars: mine, parts, wheels, wheelsPer: p.wheels.length, radius: p.wheelRadius });
    }

    const spin = new Map<number, number>(), lastSpeed = new Map<number, number>(), braking = new Map<number, boolean>();
    const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(), body = new THREE.Matrix4();
    const local = new THREE.Matrix4(), wheel = new THREE.Matrix4(), turn = new THREE.Quaternion(), wheelScale = new THREE.Vector3(1, 1, 1), lp = new THREE.Vector3();
    const axis = new THREE.Vector3(0, 1, 0), up = new THREE.Vector3(0, 0, 1);

    const update = (_cars: ReadonlyArray<FleetCar>, dt: number) => {
        for (const [kind, set] of sets) {
            const p = vehicleParts(kind);
            set.cars.forEach((car, i) => {
                position.set(car.x, car.y, car.z); quaternion.setFromAxisAngle(up, car.heading); scale.setScalar(car.scale);
                body.compose(position, quaternion, scale);
                for (const mesh of set.parts) mesh.setMatrixAt(i, body);
                // The wheel rolls the distance it is driven: speed x dt over its radius (the car is scaled, so is the wheel).
                const angle = ((spin.get(car.id) ?? 0) + car.speed * dt / (set.radius * car.scale)) % (Math.PI * 2);
                spin.set(car.id, angle);
                turn.setFromAxisAngle(axis, angle);
                p.wheels.forEach((w, k) => {
                    lp.set(w.x, w.y, set.radius);
                    local.compose(lp, turn, wheelScale);
                    wheel.multiplyMatrices(body, local);
                    set.wheels.setMatrixAt(i * set.wheelsPer + k, wheel);
                });
                // Brake lamps: slowing down noticeably, or standing (at a red light or in a queue).
                const previous = lastSpeed.get(car.id) ?? car.speed;
                const on = dt > 0 ? (previous - car.speed) / dt > .6 || car.speed < .25 : braking.get(car.id) ?? false;
                lastSpeed.set(car.id, car.speed);
                if (braking.get(car.id) !== on) { braking.set(car.id, on); set.parts[4].setColorAt(i, on ? BRAKE_ON : BRAKE_OFF); if (set.parts[4].instanceColor) set.parts[4].instanceColor.needsUpdate = true; }
            });
            for (const mesh of [...set.parts, set.wheels]) mesh.instanceMatrix.needsUpdate = true;
        }
    };
    for (const set of sets.values()) if (set.parts[0].instanceColor) set.parts[0].instanceColor.needsUpdate = true;
    return {
        group, update,
        dispose() {
            paintMaterial.dispose(); brakeMaterial.dispose(); lampMaterial.dispose();
            for (const set of sets.values()) for (const mesh of [...set.parts, set.wheels]) mesh.dispose();
        }
    };
}
