import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SignalHead, SignalState, Signals } from './signals.js';

/*
 * The traffic lights of signals.ts as geometry. Every head is a pole with a three-lamp housing at the stop line, on the
 * kerb to the right of its lane, facing the cars that come towards it. The whole map is two draw calls: one instanced
 * mesh for all the poles and housings, one for all the lamps (three per head, coloured per instance). A lamp is only
 * recoloured when its signal changes state.
 */

const POLE_HEIGHT = 3.3;
const HOUSING = { depth: .28, width: .34, height: 1.0, centre: 2.75 };
const LAMP_RADIUS = .115;
/** Heights of the red, yellow and green lamp above the ground. */
const LAMP_Z: Record<SignalState, number> = { red: 3.0, yellow: 2.75, green: 2.5 };
const LAMP_ORDER: SignalState[] = ['red', 'yellow', 'green'];
const LIT: Record<SignalState, number> = { red: 0xff3b30, yellow: 0xffbf1f, green: 0x35ff86 };
const DIM = .13;

export interface SignalLights {
    group: THREE.Group;
    /** Recolour the lamps of the heads whose signal changed since the last call. */
    update(): void;
    dispose(): void;
}

function bodyGeometry(): THREE.BufferGeometry {
    const pole = new THREE.CylinderGeometry(.055, .07, POLE_HEIGHT, 8);
    pole.rotateX(Math.PI / 2);                              // the cylinder's axis is Y: stand it up along Z
    pole.translate(0, 0, POLE_HEIGHT / 2);
    const housing = new THREE.BoxGeometry(HOUSING.depth, HOUSING.width, HOUSING.height);
    housing.translate(0, 0, HOUSING.centre);
    // Backplate: a wider dark panel behind the lamps makes the lit ones readable from a distance.
    const plate = new THREE.BoxGeometry(.03, HOUSING.width + .16, HOUSING.height + .16);
    plate.translate(HOUSING.depth / 2 + .005, 0, HOUSING.centre);
    const merged = mergeGeometries([pole, housing, plate].map(part => part.index ? part.toNonIndexed() : part))!;
    [pole, housing, plate].forEach(part => part.dispose());
    return merged;
}

function lampGeometry(): THREE.BufferGeometry {
    const lamp = new THREE.CylinderGeometry(LAMP_RADIUS, LAMP_RADIUS, .05, 14);
    lamp.rotateZ(-Math.PI / 2);                             // the lamp faces +X, out of the housing's front
    return lamp;
}

const litColor = (state: SignalState) => new THREE.Color(LIT[state]);
const dimColor = (state: SignalState) => new THREE.Color(LIT[state]).multiplyScalar(DIM);

export function createSignalLights(signals: Signals, groundAt: (x: number, y: number) => number): SignalLights {
    const group = new THREE.Group();
    group.name = 'Светофоры';
    group.userData.collidable = false;
    const heads = signals.heads;
    const signalOf = new Map<number, (typeof signals.signals)[number]>(signals.signals.map(signal => [signal.node, signal]));
    if (!heads.length) return { group, update() {}, dispose() {} };

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: .7, metalness: .35 });
    const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const bodies = new THREE.InstancedMesh(bodyGeometry(), bodyMaterial, heads.length);
    const lamps = new THREE.InstancedMesh(lampGeometry(), lampMaterial, heads.length * LAMP_ORDER.length);
    bodies.name = 'Светофоры: корпуса'; lamps.name = 'Светофоры: лампы';
    // The instances cover the whole map and are few: culling by a stale bound would only make lights pop out.
    bodies.frustumCulled = false; lamps.frustumCulled = false;
    bodies.castShadow = true; lamps.castShadow = false;

    const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), unit = new THREE.Vector3(1, 1, 1);
    heads.forEach((head: SignalHead, index) => {
        const ground = groundAt(head.x, head.y);
        // The lamps look back at the cars: opposite to the direction of travel.
        rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), head.heading + Math.PI);
        position.set(head.x, head.y, ground);
        bodies.setMatrixAt(index, matrix.compose(position, rotation, unit));
        LAMP_ORDER.forEach((state, slot) => {
            const offset = new THREE.Vector3(HOUSING.depth / 2 + .03, 0, LAMP_Z[state]).applyQuaternion(rotation);
            position.set(head.x + offset.x, head.y + offset.y, ground + offset.z);
            lamps.setMatrixAt(index * LAMP_ORDER.length + slot, matrix.compose(position, rotation, unit));
        });
    });
    bodies.instanceMatrix.needsUpdate = true; lamps.instanceMatrix.needsUpdate = true;
    // Every lamp starts dark; the first update lights the right one.
    for (let i = 0; i < heads.length * LAMP_ORDER.length; i++) lamps.setColorAt(i, dimColor(LAMP_ORDER[i % LAMP_ORDER.length]));
    group.add(bodies, lamps);

    const shown = new Array<SignalState | null>(heads.length).fill(null);
    const update = () => {
        let changed = false;
        heads.forEach((head, index) => {
            const signal = signalOf.get(head.node);
            if (!signal) return;
            const state = signals.stateOfGroup(signal, head.group);
            if (shown[index] === state) return;
            shown[index] = state;
            changed = true;
            LAMP_ORDER.forEach((lamp, slot) => lamps.setColorAt(index * LAMP_ORDER.length + slot, lamp === state ? litColor(lamp) : dimColor(lamp)));
        });
        if (changed && lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
    };
    update();

    return {
        group, update,
        dispose() {
            bodies.geometry.dispose(); lamps.geometry.dispose();
            bodyMaterial.dispose(); lampMaterial.dispose();
            bodies.dispose(); lamps.dispose();
        }
    };
}
