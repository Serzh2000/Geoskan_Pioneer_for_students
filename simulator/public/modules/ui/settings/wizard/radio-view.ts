import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import radioUrl from '../../../../assets/models/radio/fs-i6s.glb?url';
import { createDroneModel } from '../../../drone-model/index.js';
import { AUX_SWITCHES, STICK_TRAVEL, type StepTarget, type StickOffsets, type SwitchId } from './radio-model.js';

/*
 * The 3D scene of the setup wizard: a FlySky FS-i6S transmitter (public/assets/models/radio/fs-i6s.glb) next to the
 * Pioneer, which answers every stick the way the real one will. The step lights the control it is about (a ring, a
 * arrows at the ends of its travel, and the stick or switch itself shows the movement); the student's own input moves the real sticks, switches and the drone.
 *
 * Model contract (see the model's README): gimbal_pitch_<side> turns about local X and gimbal_roll_<side> about local
 * -Z, both within ±25°; switch_SA..SD turn about local X; the mesh `screen` is the LCD.
 */

export interface RadioViewState {
    /** False until a controller is plugged in and moved. */
    connected: boolean;
    /** The control the step is about, or null on screens that are about none (the fine tuning). */
    target: StepTarget | null;
    /** `found` once the channel of the step is heard: the demonstration stops, the ring turns green. */
    phase: 'waiting' | 'found';
    offsets: StickOffsets;
    /** Flight channels as the drone sees them: throttle 0..1, the others -1..1. */
    values: { throttle: number; yaw: number; pitch: number; roll: number };
    /** RC values (1000-2000) of the switches the wizard knows about, or null while they are not heard. */
    levers: Record<keyof typeof AUX_SWITCHES, number | null>;
    /** Short instruction shown on the transmitter's own screen. */
    caption: string;
    /** Live value of the asked channel, 0..1, drawn as the bar under the caption. */
    level: number;
}

export interface RadioView {
    update(state: RadioViewState): void;
}

/** Easing speed (1/s): higher follows the input tighter. The controller is sampled at 20 Hz, the picture is drawn every frame in between. */
const FOLLOW_RATE = 18;
const damp = (current: number, target: number, dt: number, rate = FOLLOW_RATE) => current + (target - current) * (1 - Math.exp(-rate * dt));
/** The stage fills the window: a device pixel ratio of 2 would be four times the pixels for no visible gain on a 3D prop. */
const MAX_PIXEL_RATIO = 1.5;
const GIMBAL_TRAVEL_DEG = 25;
const SWITCH_SWING_DEG = 35;
/** Three columns across the frame: the card with the channels (HTML), the drone in the middle, the transmitter on the right. */
const DRONE_HOME = { x: -0.1, z: -0.12 };
const CYAN = 0x35d0f2;
const GREEN = 0x4fd18b;
const SIDES = ['left', 'right'] as const;
const SWITCH_IDS: SwitchId[] = ['SA', 'SB', 'SC', 'SD'];
const rad = THREE.MathUtils.degToRad;

type Side = (typeof SIDES)[number];

interface RadioParts {
    pitch: Record<Side, THREE.Object3D>;
    roll: Record<Side, THREE.Object3D>;
    switches: Record<SwitchId, THREE.Object3D>;
    /** The angle each toggle sits at in the model (its rest position). */
    switchRest: Record<SwitchId, number>;
    rings: Map<string, THREE.Mesh>;
    /** Two small triangles at the ends of the travel of each stick axis, keyed `side:axis`. */
    arrows: Map<string, THREE.Group>;
    screen: THREE.Mesh;
}

function makeRing(radius: number, position: THREE.Vector3): THREE.Mesh {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0012, 12, 72), new THREE.MeshBasicMaterial({ color: CYAN, toneMapped: false }));
    ring.rotation.x = Math.PI / 2; // lies on the top face
    ring.position.copy(position);
    ring.visible = false;
    (ring.material as THREE.MeshBasicMaterial).transparent = true;
    return ring;
}

/** A flat triangle pointing along (dx, dz) on the top face: it marks one end of a stick's travel. */
function makeArrow(material: THREE.Material, position: THREE.Vector3, dx: number, dz: number): THREE.Group {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.0052); shape.lineTo(-0.0044, -0.0036); shape.lineTo(0.0044, -0.0036); shape.closePath();
    const triangle = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    triangle.rotation.x = -Math.PI / 2; // lies on the face, its tip toward -Z
    const group = new THREE.Group();
    group.add(triangle);
    group.rotation.y = Math.atan2(-dx, -dz);
    group.position.copy(position);
    return group;
}

/** Wires up the named parts of the radio and adds the rings and arrows the steps use. */
function collectParts(root: THREE.Object3D): RadioParts {
    const need = (name: string): THREE.Object3D => {
        const found = root.getObjectByName(name);
        if (!found) throw new Error(`FS-i6S model is missing ${name}`);
        return found;
    };
    const body = need('FS-i6S');
    const pitch = { left: need('gimbal_pitch_left'), right: need('gimbal_pitch_right') };
    const roll = { left: need('gimbal_roll_left'), right: need('gimbal_roll_right') };
    const switches = Object.fromEntries(SWITCH_IDS.map((id) => [id, need(`switch_${id}`)])) as Record<SwitchId, THREE.Object3D>;
    const switchRest = Object.fromEntries(SWITCH_IDS.map((id) => [id, switches[id].rotation.x])) as Record<SwitchId, number>;
    const rings = new Map<string, THREE.Mesh>();
    const arrows = new Map<string, THREE.Group>();

    for (const side of SIDES) {
        const at = pitch[side].position;
        const ring = makeRing(0.0345, new THREE.Vector3(at.x, 0.0305, at.z));
        body.add(ring);
        rings.set(side, ring);
        for (const axis of ['x', 'y'] as const) {
            const group = new THREE.Group();
            const reach = 0.0345 + 0.007;
            const material = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
            const unit = axis === 'x' ? [1, 0] : [0, 1];
            group.add(makeArrow(material, new THREE.Vector3(unit[0] * reach, 0.0308, unit[1] * reach), unit[0], unit[1]));
            group.add(makeArrow(material, new THREE.Vector3(-unit[0] * reach, 0.0308, -unit[1] * reach), -unit[0], -unit[1]));
            group.position.set(at.x, 0, at.z);
            group.visible = false;
            group.userData.material = material;
            body.add(group);
            arrows.set(`${side}:${axis}`, group);
        }
    }
    for (const id of SWITCH_IDS) {
        const at = switches[id].position;
        const ring = makeRing(0.0105, new THREE.Vector3(at.x, 0.0275, at.z));
        body.add(ring);
        rings.set(id, ring);
    }
    return { pitch, roll, switches, switchRest, rings, arrows, screen: need('screen') as THREE.Mesh };
}

/** The transmitter's LCD, drawn on a canvas so it can show what the step asks. */
function createScreen(mesh: THREE.Mesh): (caption: string, level: number, found: boolean) => void {
    const canvas = document.createElement('canvas');
    canvas.width = 310; canvas.height = 150;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    // The model's own screen mesh is a bevelled box with an atlas of UVs: a flat plane of the same size sits on it instead.
    mesh.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    mesh.geometry.boundingBox!.getSize(size);
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(size.x * mesh.scale.x, size.z * mesh.scale.z),
        new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0 })
    );
    plane.rotation.x = -Math.PI / 2; // faces up, the top of the picture toward the back of the radio
    plane.position.copy(mesh.position);
    plane.position.y += (mesh.geometry.boundingBox!.max.y * mesh.scale.y) + 0.0004;
    mesh.parent?.add(plane);
    mesh.visible = false;
    let last = '';
    return (caption, level, found) => {
        const key = `${caption}|${Math.round(level * 24)}|${found}`;
        if (key === last) return;
        last = key;
        const g = canvas.getContext('2d');
        if (!g) return;
        g.fillStyle = '#9fcf9c'; g.fillRect(0, 0, 310, 150);
        g.fillStyle = '#12281b';
        g.font = '600 15px "Courier New", monospace'; g.textAlign = 'left';
        g.fillText('PIONEER', 14, 26);
        g.textAlign = 'right'; g.fillText(found ? 'OK' : '...', 296, 26);
        g.fillRect(14, 36, 282, 2);
        g.textAlign = 'center'; g.font = '700 22px "Courier New", monospace';
        g.fillText(caption, 155, 82);
        g.strokeStyle = '#12281b'; g.lineWidth = 3; g.strokeRect(30, 106, 250, 22);
        g.fillRect(34, 110, Math.max(0, Math.min(1, level)) * 242, 14);
        texture.needsUpdate = true;
    };
}

/** One move of a demonstration: glide to `to` over `ms`, so a hold is simply a move to the same value. */
interface Key { to: number; ms: number }
const smootherstep = (t: number) => t * t * t * (t * (6 * t - 15) + 10);

/** Plays keys in a loop; the last key must end where `start` is, so the loop has no jump. */
function play(keys: Key[], start: number, time: number): number {
    const total = keys.reduce((sum, key) => sum + key.ms, 0);
    let t = time % total;
    let from = start;
    for (const key of keys) {
        if (t < key.ms) return from + (key.to - from) * smootherstep(t / key.ms);
        t -= key.ms;
        from = key.to;
    }
    return start;
}

/** A stick: out to one end, across to the other, back to centre, a breath of rest. */
const STICK_DEMO: Key[] = [{ to: 1, ms: 1000 }, { to: 1, ms: 250 }, { to: -1, ms: 1700 }, { to: -1, ms: 250 }, { to: 0, ms: 1000 }, { to: 0, ms: 900 }];
/** Switches click quickly between positions and rest on each. Positions are -1, 0 and 1 (RC 1000, 1500, 2000). */
const SWITCH_DEMO_3: Key[] = [{ to: -1, ms: 800 }, { to: 0, ms: 240 }, { to: 0, ms: 800 }, { to: 1, ms: 240 }, { to: 1, ms: 800 }, { to: 0, ms: 240 }, { to: 0, ms: 800 }, { to: -1, ms: 240 }];
const SWITCH_DEMO_2: Key[] = [{ to: -1, ms: 900 }, { to: 1, ms: 240 }, { to: 1, ms: 900 }, { to: -1, ms: 240 }];
/** The student touched the control: the demonstration steps aside and comes back after this long without input. */
const DEMO_IDLE_MS = 1600;

export function createRadioView(root: HTMLElement): RadioView {
    root.replaceChildren();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.className = 'gp-radio__canvas';
    root.append(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(1.2, -1.6, 2.2);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.2));

    const camera = new THREE.PerspectiveCamera(30, 1.8, 0.1, 20);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -2.1, 0.9);
    camera.lookAt(0, 0, 0.28);

    // The drone on the left: the same model the simulator flies.
    const drone = createDroneModel();
    drone.scale.setScalar(0.85);
    drone.position.set(DRONE_HOME.x, 0, DRONE_HOME.z);
    scene.add(drone);
    const rotors = [0, 1, 2, 3].map((index) => drone.getObjectByName(`rotor_${index}`)).filter((r): r is THREE.Object3D => !!r);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.22, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
    floor.position.set(DRONE_HOME.x, 0, DRONE_HOME.z - 0.1);
    scene.add(floor);

    // The transmitter on the right, tilted up so the controls face the viewer.
    const tilt = new THREE.Group();
    tilt.position.set(0.56, 0, 0.3);
    tilt.rotation.x = 0.95;
    tilt.scale.setScalar(3.1);
    scene.add(tilt);

    let parts: RadioParts | null = null;
    let drawScreen: ((caption: string, level: number, found: boolean) => void) | null = null;
    let lastRender = 0;
    // What is drawn lags a little behind what is read, so 20 Hz samples become a smooth motion.
    const shown = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, throttle: 0, yaw: 0, pitch: 0, roll: 0, level: 0, demo: 0, cue: 0 };
    const shownLevers: Record<string, number> = {};
    // The student's last real input on the control the step asks about: the demonstration waits for quiet.
    const activity = { target: '', value: 0, at: 0 };

    new GLTFLoader().loadAsync(radioUrl).then(({ scene: radio }) => {
        radio.rotation.x = Math.PI / 2; // glTF is Y-up, the scene is Z-up
        tilt.add(radio);
        parts = collectParts(radio);
        drawScreen = createScreen(parts.screen);
    }).catch((error: unknown) => console.error('[RadioView] Failed to load the FS-i6S model.', error));

    const resize = () => {
        const width = Math.max(240, root.clientWidth);
        const height = Math.max(180, root.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // A narrow window would cut the transmitter off at the right: back the camera off until it fits.
        camera.position.y = -Math.max(2.1, 0.8 / (Math.tan(rad(15)) * camera.aspect));
        camera.lookAt(0, 0, 0.28);
        // In a narrow, tall window the card covers the top of the stage: the picture sits lower so the drone is not hidden behind it.
        if (camera.aspect < 1.35) camera.setViewOffset(width, height, 0, -height * 0.16, width, height);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(root);
    resize();

    type ViewTarget = StepTarget | { kind: 'none' };
    const targetActive = (name: string, target: ViewTarget): boolean =>
        target.kind === 'stick' ? name === target.side : target.kind === 'switch' ? name === target.switchId : false;

    function applyState(state: RadioViewState, time: number, dt: number): void {
        shown.throttle = damp(shown.throttle, state.values.throttle, dt, 9);
        shown.yaw = damp(shown.yaw, state.values.yaw, dt, 9);
        shown.pitch = damp(shown.pitch, state.values.pitch, dt, 9);
        shown.roll = damp(shown.roll, state.values.roll, dt, 9);
        shown.level = damp(shown.level, state.level, dt, 12);
        const found = state.phase === 'found';
        // Has the student touched what the step asks? A real change in the stick or switch pauses the demonstration.
        const target: ViewTarget = state.target ?? { kind: 'none' };
        const targetId = target.kind === 'stick' ? `${target.side}:${target.axis}` : target.kind === 'switch' ? target.switchId : '';
        const channelOfTarget = target.kind === 'switch'
            ? (Object.keys(AUX_SWITCHES) as Array<keyof typeof AUX_SWITCHES>).find((channel) => AUX_SWITCHES[channel].id === target.switchId)
            : undefined;
        const touched = target.kind === 'stick'
            ? state.offsets[`${target.side}${target.axis === 'x' ? 'X' : 'Y'}` as keyof StickOffsets]
            : (channelOfTarget ? state.levers[channelOfTarget] ?? 1500 : 1500);
        if (activity.target !== targetId) { activity.target = targetId; activity.value = touched; activity.at = time - DEMO_IDLE_MS + 700; }
        else if (Math.abs(touched - activity.value) > (target.kind === 'stick' ? 1.2 : 40)) { activity.value = touched; activity.at = time; }
        const wantDemo = target.kind !== 'none' && !found && time - activity.at > DEMO_IDLE_MS;
        shown.demo = damp(shown.demo, wantDemo ? 1 : 0, dt, wantDemo ? 3 : 12);
        shown.cue = damp(shown.cue, found ? 0 : 1, dt, 6);

        if (parts) {
            const demoPosition = target.kind === 'stick'
                ? play(STICK_DEMO, 0, time)
                : target.kind === 'switch' ? play(target.positions === 3 ? SWITCH_DEMO_3 : SWITCH_DEMO_2, -1, time) : 0;
            // Sticks: pull toward the pilot turns the pitch joint forward (+X), a push to the right turns the roll joint (-Z).
            const goals = { ...state.offsets };
            if (target.kind === 'stick') {
                const key = `${target.side}${target.axis === 'x' ? 'X' : 'Y'}` as keyof StickOffsets;
                // The demonstration goes first the way the step names: up or forward (the knob away from the pilot), or to the right.
                const first = target.axis === 'y' ? -1 : 1;
                goals[key] += (first * demoPosition * STICK_TRAVEL * 0.9 - goals[key]) * shown.demo;
            }
            shown.leftX = damp(shown.leftX, goals.leftX, dt, 16);
            shown.leftY = damp(shown.leftY, goals.leftY, dt, 16);
            shown.rightX = damp(shown.rightX, goals.rightX, dt, 16);
            shown.rightY = damp(shown.rightY, goals.rightY, dt, 16);
            const turn = (offsetX: number, offsetY: number) => ({
                pitch: rad((offsetY / STICK_TRAVEL) * GIMBAL_TRAVEL_DEG),
                roll: -rad((offsetX / STICK_TRAVEL) * GIMBAL_TRAVEL_DEG)
            });
            const left = turn(shown.leftX, shown.leftY);
            const right = turn(shown.rightX, shown.rightY);
            parts.pitch.left.rotation.x = left.pitch;
            parts.roll.left.rotation.z = left.roll;
            parts.pitch.right.rotation.x = right.pitch;
            parts.roll.right.rotation.z = right.roll;

            for (const channel of Object.keys(AUX_SWITCHES) as Array<keyof typeof AUX_SWITCHES>) {
                const id = AUX_SWITCHES[channel].id;
                const rc = state.levers[channel];
                let goal = rc === null ? parts.switchRest[id] : rad(((rc - 1500) / 500) * SWITCH_SWING_DEG);
                if (target.kind === 'switch' && target.switchId === id) goal += (rad(demoPosition * SWITCH_SWING_DEG) - goal) * shown.demo;
                shownLevers[id] = damp(shownLevers[id] ?? goal, goal, dt, 22);
                parts.switches[id].rotation.x = shownLevers[id];
            }

            // What the step asks: a quiet ring around the control and, for a stick, arrows at the ends of its travel.
            const breath = 0.5 + 0.5 * Math.sin(time / 1100);
            const tone = found ? GREEN : CYAN;
            for (const [name, ring] of parts.rings) {
                ring.visible = targetActive(name, target);
                const material = ring.material as THREE.MeshBasicMaterial;
                material.color.setHex(tone);
                material.opacity = found ? 1 : 0.55 + 0.4 * breath;
            }
            for (const [name, group] of parts.arrows) {
                const active = target.kind === 'stick' && name === `${target.side}:${target.axis}`;
                const material = group.userData.material as THREE.MeshBasicMaterial;
                group.visible = active && shown.cue > 0.01;
                material.opacity = shown.cue * (0.6 + 0.35 * breath) * (1 - 0.35 * shown.demo);
            }
            drawScreen?.(state.caption, shown.level, found);
        }

        // The drone answers the sticks.
        const { throttle, yaw, pitch, roll } = shown;
        // Like the real one: at low throttle the props barely turn and the drone stays on the ground, then they spin up
        // and it climbs.
        const lift = Math.max(0, (throttle - 0.15) / 0.85);
        drone.position.set(DRONE_HOME.x + roll * 0.08, pitch * 0.06, DRONE_HOME.z + lift * lift * 0.7 + lift * 0.1);
        drone.rotation.order = 'ZYX';
        // Forward (pitch high, as in the simulator's flight) is nose down.
        drone.rotation.set(-pitch * 0.4, roll * 0.42, -yaw * 0.7);
        const speed = 0.03 + Math.pow(Math.max(0, throttle), 1.4) * 1.3;
        rotors.forEach((rotor, index) => { rotor.rotation.z += speed * (index < 2 ? 1 : -1); });
    }

    return {
        update(state) {
            root.dataset.connected = String(state.connected);
            root.dataset.phase = state.phase;
            root.dataset.target = state.target?.kind ?? 'none';
            if (document.visibilityState === 'hidden') return;
            const now = performance.now();
            const dt = lastRender === 0 ? 1 / 60 : Math.min(0.1, (now - lastRender) / 1000);
            lastRender = now;
            applyState(state, now, dt);
            renderer.render(scene, camera);
        }
    };
}
