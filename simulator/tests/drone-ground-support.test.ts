import * as THREE from 'three';
import { setupLuaSim, type LuaSim } from './helpers/lua-sim-harness.js';

/*
 * Дрон стоит на том, что под ним: рельефе учебной карты или крыше. Раньше физика знала только
 * плоскость z = 0: на холме «Целого города» дрон проваливался в склон и на взлёте разбивался
 * о него, а поставленный на крышу падал сквозь неё и разбивался о здание.
 */

const TAKEOFF = 'ap.push(Ev.MCE_PREFLIGHT)\nTimer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)';
const TAKEOFF_AND_LAND = `${TAKEOFF}
function callback(event)
    if event == Ev.TAKEOFF_COMPLETE then Timer.callLater(2, function() ap.push(Ev.MCE_LANDING) end) end
end`;

let sim: LuaSim;
let env: typeof import('../public/modules/environment/index.js');
let ground: typeof import('../public/modules/physics/ground.js');

beforeAll(async () => {
    sim = await setupLuaSim();
    const g = globalThis as Record<string, any>;
    g.document.createElement = () => ({ width: 0, height: 0, getContext: () => null, style: {}, append: () => {}, appendChild: () => {} });
    g.document.documentElement ??= { dataset: {}, getAttribute: () => null };
    g.document.body ??= { dataset: {}, classList: { contains: () => false } };
    g.window.addEventListener ??= () => {};
    g.window.removeEventListener ??= () => {};
    g.window.dispatchEvent ??= () => true;
    env = await import('../public/modules/environment/index.js');
    ground = await import('../public/modules/physics/ground.js');
    env.setupEnvironment(new THREE.Scene());
}, 120_000);

function clearScene() {
    for (const child of [...env.envGroup.children]) {
        if (child.userData.presetName || child.userData.testObstacle) env.envGroup.remove(child);
    }
}

type Watch = { crashed: string | null; startZ: number; maxZ: number; endZ: number };

function run(script: string, seconds: number, x: number, y: number, z = 0): Watch & { events: string[] } {
    const watch: Watch = { crashed: null, startZ: NaN, maxZ: -Infinity, endZ: NaN };
    let drone: { pos: { x: number; y: number; z: number }; status: string } | null = null;
    const events = sim.run(script, seconds, {
        onStep: (t, api) => {
            drone = api.drone;
            if (t === 0) {
                api.drone.pos = { x, y, z };
                api.drone.target_pos = { x, y, z };
            }
            if (t > 0.5 && Number.isNaN(watch.startZ)) watch.startZ = api.drone.pos.z;
            watch.maxZ = Math.max(watch.maxZ, api.drone.pos.z);
            if (!watch.crashed && api.drone.status === 'CRASHED') watch.crashed = `t=${t.toFixed(2)} z=${api.drone.pos.z.toFixed(2)}`;
        }
    }).map(event => event.what);
    const last = drone as { pos: { z: number }; status: string } | null;
    watch.endZ = last ? last.pos.z : NaN;
    // The harness stops on the very step the drone breaks - read the final status too.
    if (!watch.crashed && last?.status === 'CRASHED') watch.crashed = `end z=${last.pos.z.toFixed(2)}`;
    return { ...watch, events };
}

describe('the drone stands on the map relief', () => {
    let hill: { x: number; y: number; z: number };

    beforeAll(() => {
        clearScene();
        const preset = env.addObjectToScene('training-hills', null, {});
        expect(preset).toBeTruthy();
        hill = { x: 0, y: 0, z: 0 };
        for (let x = -80; x < 80; x += 2) for (let y = -80; y < 80; y += 2) {
            const z = ground.terrainHeightAt(x, y);
            if (z > hill.z && z < 3) hill = { x, y, z };
        }
        expect(hill.z).toBeGreaterThan(1);
    }, 120_000);

    test('a drone left inside a hill comes up to its surface and takes off from there', () => {
        const result = run(TAKEOFF, 8, hill.x, hill.y, 0);
        expect(result.crashed).toBeNull();
        expect(result.startZ).toBeCloseTo(hill.z, 1);
        expect(result.events).toContain('fsm FLYING_HOVER');
        expect(result.maxZ).toBeGreaterThan(hill.z + 0.5);
    });

    test('takes off from the hillside and lands back on it without breaking', () => {
        const result = run(TAKEOFF_AND_LAND, 20, hill.x, hill.y, hill.z);
        expect(result.crashed).toBeNull();
        expect(result.events).toEqual(expect.arrayContaining(['fsm FLYING_HOVER', 'fsm LANDING_PROCESS', 'fsm IDLE']));
        expect(result.endZ).toBeCloseTo(hill.z, 1);
    });

    test('flat ground behaves as before', () => {
        const result = run(TAKEOFF, 6, 0, 0, 0);
        expect(result.crashed).toBeNull();
        expect(result.startZ).toBeCloseTo(0, 5);
        expect(result.events).toContain('fsm FLYING_HOVER');
    });
});

describe('roofs and walls', () => {
    beforeAll(() => {
        clearScene();
        const house = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 4), new THREE.MeshBasicMaterial());
        house.position.set(20, 0, 2);
        house.userData = { type: 'Дом', testObstacle: true };
        env.envGroup.add(house);
        house.updateWorldMatrix(true, true);
    });

    test('a drone put on a roof stays on it and takes off without hitting the house', () => {
        const result = run(TAKEOFF, 8, 20, 0, 4);
        expect(result.crashed).toBeNull();
        expect(result.startZ).toBeCloseTo(4, 1);
        expect(result.events).toContain('fsm FLYING_HOVER');
    });

    test('flying into the wall still breaks the drone', () => {
        const script = `${TAKEOFF}
function callback(event)
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(25, 0, 1) end
end`;
        const result = run(script, 30, 10, 0, 0);
        expect(result.crashed).not.toBeNull();
    });
});
