import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import radioUrl from '../../../../assets/models/radio/fs-i6s.glb?url';
import { createDroneModel } from '../../../drone-model/index.js';
import { AUX_SWITCHES, STICK_TRAVEL, type StepTarget, type StickOffsets, type SwitchId } from './radio-model.js';

/*
 * The 3D scene of the setup wizard: a FlySky FS-i6S transmitter (public/assets/models/radio/fs-i6s.glb) next to the
 * Pioneer, which answers every stick the way the real one will. The step lights the control it is about (a ring, a
 * glowing tip, a ghost doing the movement); the student's own input moves the real sticks, switches and the drone.
 *
 * Model contract (see the model's README): gimbal_pitch_<side> turns about local X and gimbal_roll_<side> about local
 * -Z, both within ±25°; switch_SA..SD turn about local X; the mesh `screen` is the LCD.
 */

export interface RadioViewState {
    /** False until a controller is plugged in and moved. */
    connected: boolean;
    target: StepTarget;
    /** `found` once the channel of the step is heard: the ghost goes, the ring turns green. */
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

const FRAME_INTERVAL_MS = 1000 / 30;
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
    tips: Record<Side, THREE.MeshStandardMaterial[]>;
    switches: Record<SwitchId, THREE.Object3D>;
    /** The angle each toggle sits at in the model (its rest position). */
    switchRest: Record<SwitchId, number>;
    rings: Map<string, THREE.Mesh>;
    ghosts: Map<string, THREE.Object3D>;
    screen: THREE.Mesh;
}

function cyanMaterial(opacity: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity, depthWrite: false, toneMapped: false });
}

function makeRing(radius: number, position: THREE.Vector3): THREE.Mesh {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0012, 12, 72), new THREE.MeshBasicMaterial({ color: CYAN, toneMapped: false }));
    ring.rotation.x = Math.PI / 2; // lies on the top face
    ring.position.copy(position);
    ring.visible = false;
    return ring;
}

/** A translucent stand-in for a stick: shaft and cap, turned about the gimbal like the real one. */
function makeStickGhost(position: THREE.Vector3): THREE.Group {
    const ghost = new THREE.Group();
    ghost.position.copy(position);
    const material = cyanMaterial(0.6);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.014, 16), material);
    shaft.position.y = 0.0125;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.009, 24), material);
    cap.position.y = 0.0225;
    ghost.add(shaft, cap);
    ghost.visible = false;
    return ghost;
}

function makeSwitchGhost(position: THREE.Vector3): THREE.Group {
    const ghost = new THREE.Group();
    ghost.position.copy(position);
    const material = cyanMaterial(0.7);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.02, 12), material);
    stem.position.y = 0.01;
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.0075, 0.005, 0.0045), material);
    paddle.position.y = 0.021;
    ghost.add(stem, paddle);
    ghost.visible = false;
    return ghost;
}

/** Wires up the named parts of the radio and adds the rings and ghosts the steps use. */
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
    const ghosts = new Map<string, THREE.Object3D>();
    const tips = { left: [], right: [] } as RadioParts['tips'];

    for (const side of SIDES) {
        // The anodised tip material is shared by both sticks: give each its own so one can glow.
        const own = new Map<THREE.Material, THREE.MeshStandardMaterial>();
        pitch[side].traverse((object) => {
            if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
            const material = object.material as THREE.MeshStandardMaterial;
            if (!material.name.includes('carmine')) return;
            if (!own.has(material)) {
                const copy = material.clone();
                own.set(material, copy);
                tips[side].push(copy);
            }
            object.material = own.get(material)!;
        });
        const at = pitch[side].position;
        const ring = makeRing(0.0345, new THREE.Vector3(at.x, 0.0215, at.z));
        body.add(ring);
        rings.set(side, ring);
        const ghost = makeStickGhost(at);
        body.add(ghost);
        ghosts.set(side, ghost);
    }
    for (const id of SWITCH_IDS) {
        const at = switches[id].position;
        const ring = makeRing(0.0105, new THREE.Vector3(at.x, 0.0275, at.z));
        body.add(ring);
        rings.set(id, ring);
        const ghost = makeSwitchGhost(at);
        body.add(ghost);
        ghosts.set(id, ghost);
    }
    return { pitch, roll, tips, switches, switchRest, rings, ghosts, screen: need('screen') as THREE.Mesh };
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
        const key = `${caption}|${Math.round(level * 40)}|${found}`;
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
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(root);
    resize();

    const targetActive = (name: string, target: StepTarget): boolean =>
        target.kind === 'stick' ? name === target.side : name === target.switchId;

    function applyState(state: RadioViewState, time: number): void {
        if (parts) {
            // Sticks: pull toward the pilot turns the pitch joint forward (+X), a push to the right turns the roll joint (-Z).
            const turn = (offsetX: number, offsetY: number) => ({
                pitch: rad((offsetY / STICK_TRAVEL) * GIMBAL_TRAVEL_DEG),
                roll: -rad((offsetX / STICK_TRAVEL) * GIMBAL_TRAVEL_DEG)
            });
            const left = turn(state.offsets.leftX, state.offsets.leftY);
            const right = turn(state.offsets.rightX, state.offsets.rightY);
            parts.pitch.left.rotation.x = left.pitch;
            parts.roll.left.rotation.z = left.roll;
            parts.pitch.right.rotation.x = right.pitch;
            parts.roll.right.rotation.z = right.roll;

            for (const channel of Object.keys(AUX_SWITCHES) as Array<keyof typeof AUX_SWITCHES>) {
                const id = AUX_SWITCHES[channel].id;
                const rc = state.levers[channel];
                parts.switches[id].rotation.x = rc === null ? parts.switchRest[id] : rad(((rc - 1500) / 500) * SWITCH_SWING_DEG);
            }

            // What the step asks: a ring, a glowing tip, a ghost doing the movement.
            const found = state.phase === 'found';
            const pulse = 0.5 + 0.5 * Math.sin(time / 260);
            const tone = found ? GREEN : CYAN;
            for (const [name, ring] of parts.rings) {
                ring.visible = targetActive(name, state.target);
                (ring.material as THREE.MeshBasicMaterial).color.setHex(tone);
                ring.scale.setScalar(found ? 1 : 1 + 0.06 * pulse);
            }
            for (const [name, ghost] of parts.ghosts) {
                const active = !found && targetActive(name, state.target);
                ghost.visible = active;
                if (!active) continue;
                const swing = Math.sin(time / 520);
                if (state.target.kind === 'stick') {
                    ghost.rotation.set(state.target.axis === 'y' ? swing * rad(GIMBAL_TRAVEL_DEG) : 0, 0, state.target.axis === 'x' ? -swing * rad(GIMBAL_TRAVEL_DEG) : 0);
                } else {
                    const position = state.target.positions === 3 ? swing : Math.sign(swing);
                    ghost.rotation.set(rad(position * SWITCH_SWING_DEG), 0, 0);
                }
            }
            for (const side of SIDES) {
                const lit = state.target.kind === 'stick' && state.target.side === side;
                for (const material of parts.tips[side]) {
                    material.emissive.setHex(lit ? tone : 0x000000);
                    material.emissiveIntensity = lit ? 0.35 + 0.5 * pulse : 0;
                }
            }
            drawScreen?.(state.caption, state.level, found);
        }

        // The drone answers the sticks.
        const { throttle, yaw, pitch, roll } = state.values;
        // Like the real one: at low throttle the props barely turn and the drone stays on the ground, then they spin up
        // and it climbs.
        const lift = Math.max(0, (throttle - 0.15) / 0.85);
        drone.position.set(DRONE_HOME.x + roll * 0.08, -pitch * 0.06, DRONE_HOME.z + lift * lift * 0.7 + lift * 0.1);
        drone.rotation.order = 'ZYX';
        drone.rotation.set(pitch * 0.4, roll * 0.42, -yaw * 0.7);
        const speed = 0.03 + Math.pow(Math.max(0, throttle), 1.4) * 1.3;
        rotors.forEach((rotor, index) => { rotor.rotation.z += speed * (index < 2 ? 1 : -1); });
    }

    return {
        update(state) {
            root.dataset.connected = String(state.connected);
            root.dataset.phase = state.phase;
            root.dataset.target = state.target.kind;
            if (document.visibilityState === 'hidden') return;
            const now = performance.now();
            if (now - lastRender < FRAME_INTERVAL_MS) return;
            lastRender = now;
            applyState(state, now);
            renderer.render(scene, camera);
        }
    };
}
