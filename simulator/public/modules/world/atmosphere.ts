import * as THREE from 'three';
import { camera, scene } from '../scene/core/scene-init.js';
import { envGroup } from '../environment/index.js';
import {
    DEFAULT_ATMOSPHERE, landscapeFogDensity, mixColor, normalizeHour, sanitizeAtmosphere, seasonLook, sunAt, weatherLook,
    type AtmosphereState, type Season, type Weather
} from './atmosphere-model.js';

/*
 * Applies the sky model to the live scene: sun and moon, sky and fog colour, glowing windows and street lamps at
 * night, the season on the ground and the trees, clouds, rain and snow. It only acts while a training terrain is in
 * the scene; the plain laboratory keeps the look of the chosen theme. State is shared through get/set/subscribe so
 * the viewport control and any script can drive it.
 */
const STORAGE_KEY = 'geoskan_atmosphere_v1';
const DAY_SECONDS = 240;                      // one full day while the clock runs by itself
const GLOW_MATERIALS = /^(Окно|DarkGlass|Glass|GreenGlass|LampLens)$/;

let state: AtmosphereState = load();
const listeners = new Set<(state: AtmosphereState) => void>();
let started = false;
let appliedTerrain: THREE.Object3D | null = null;
let lastFrame = 0;

type LightBase = { intensity: number; color: number };
const lightBase = new WeakMap<THREE.Light, LightBase>();
const sceneBase = { background: null as THREE.Color | null, fog: null as number | null, fogDensity: 0 };

function load(): AtmosphereState {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return sanitizeAtmosphere(JSON.parse(raw)); } catch { /* private mode */ }
    return { ...DEFAULT_ATMOSPHERE };
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ } }

export function getAtmosphere(): AtmosphereState { return { ...state }; }
export function subscribeAtmosphere(listener: (state: AtmosphereState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
export function setAtmosphere(patch: Partial<AtmosphereState>): void {
    const next = sanitizeAtmosphere({ ...state, ...patch });
    const seasonChanged = next.season !== state.season;
    state = next;
    save();
    if (seasonChanged) appliedTerrain = null;     // re-colour the ground and trees
    apply();
    listeners.forEach(listener => listener(getAtmosphere()));
}

function terrain(): THREE.Group | null {
    return (envGroup?.children.find(child => child.userData?.trainingLayout) as THREE.Group | undefined) ?? null;
}

// ------------------------------------------------------------------ lights, sky, fog

function sceneLights(): { sun: THREE.DirectionalLight | null; others: THREE.Light[] } {
    let sun: THREE.DirectionalLight | null = null;
    const others: THREE.Light[] = [];
    scene.traverse(node => {
        const light = node as THREE.Light;
        if (!light.isLight) return;
        if ((light as THREE.DirectionalLight).isDirectionalLight && light.castShadow) sun = light as THREE.DirectionalLight;
        else others.push(light);
    });
    return { sun, others };
}

function remember(light: THREE.Light) {
    if (!lightBase.has(light)) lightBase.set(light, { intensity: light.intensity, color: light.color.getHex() });
}

let moon: THREE.DirectionalLight | null = null;

function applySky(active: boolean) {
    const { sun, others } = sceneLights();
    if (!sceneBase.background && scene.background instanceof THREE.Color) {
        sceneBase.background = scene.background.clone();
    }
    if (scene.fog instanceof THREE.FogExp2 && sceneBase.fog === null) { sceneBase.fog = scene.fog.color.getHex(); sceneBase.fogDensity = scene.fog.density; }
    const baseBackground = sceneBase.background;

    if (sun) remember(sun);
    others.forEach(remember);

    if (!active) {
        // Back to the laboratory: original intensities, theme background and fog.
        if (sun) { const b = lightBase.get(sun)!; sun.intensity = b.intensity; sun.color.setHex(b.color); sun.position.set(-6, -4, 12); }
        others.forEach(light => { const b = lightBase.get(light)!; light.intensity = b.intensity; light.color.setHex(b.color); });
        if (moon) moon.visible = false;
        return;
    }

    const sky = sunAt(state.hour);
    const weather = weatherLook(state.weather, state.season);
    const winter = state.season === 'winter';
    if (sun) {
        const distance = 120;
        sun.position.set(sky.direction[0] * distance, sky.direction[1] * distance, sky.direction[2] * distance);
        sun.color.setHex(sky.sunColor);
        sun.intensity = sky.sunIntensity * weather.sunScale * (winter ? .85 : 1);
        // The training map is far wider than the lab arena: let the shadow follow it.
        sun.shadow.camera.left = -70; sun.shadow.camera.right = 70; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
        sun.shadow.camera.far = 400; sun.shadow.camera.updateProjectionMatrix();
    }
    if (!moon) {
        moon = new THREE.DirectionalLight(0x9db4ff, 0);
        moon.name = 'Луна';
        scene.add(moon);
    }
    moon.visible = true;
    moon.position.set(-sky.direction[0] * 100, -sky.direction[1] * 100, Math.abs(sky.direction[2]) * 100 + 20);
    moon.intensity = sky.moonIntensity * (1 - .5 * (weather.greyAmount));

    for (const light of others) {
        const b = lightBase.get(light)!;
        if ((light as THREE.AmbientLight).isAmbientLight) { light.intensity = sky.ambient + .08 * sky.night; light.color.setHex(mixColor(0xffffff, 0xaab6ff, sky.night)); }
        else if ((light as THREE.HemisphereLight).isHemisphereLight) {
            const hemi = light as THREE.HemisphereLight;
            hemi.intensity = sky.hemiIntensity * (.55 + .45 * weather.sunScale);
            hemi.color.setHex(sky.hemiSky); hemi.groundColor.setHex(sky.hemiGround);
        } else if ((light as THREE.DirectionalLight).isDirectionalLight && light !== moon) {
            light.intensity = b.intensity * (1 - sky.night * .9) * (.5 + .5 * weather.sunScale);   // the soft studio fills
        }
    }

    const skyColor = mixColor(sky.sky, mixColor(weather.grey, 0x0b0f1a, sky.night * .8), weather.greyAmount);
    const wintry = winter ? mixColor(skyColor, 0xdfe7ee, .2 * (1 - sky.night)) : skyColor;
    scene.background = new THREE.Color(wintry);
    if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(wintry);
        scene.fog.density = (sceneBase.fogDensity || .008) * weather.fogScale;
    }
    void baseBackground;
}

function restoreSky() {
    if (sceneBase.background) scene.background = sceneBase.background.clone();
    if (scene.fog instanceof THREE.FogExp2 && sceneBase.fog !== null) { scene.fog.color.setHex(sceneBase.fog); scene.fog.density = sceneBase.fogDensity; }
}

// ------------------------------------------------------------------ night glow

function applyNightGlow(group: THREE.Object3D, night: number, cloudy: number) {
    const intensity = Math.max(0, Math.min(1, night + cloudy * .25 * (1 - night) * (state.mode === 'clock' ? 1 : 0)));
    group.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials as THREE.MeshStandardMaterial[]) {
            if (!material || !GLOW_MATERIALS.test(material.name ?? '')) continue;
            material.emissive.setHex(0xffc56b);
            material.emissiveIntensity = intensity * (material.name === 'LampLens' ? 2.6 : .85);
        }
    });
}

// ------------------------------------------------------------------ seasons

type GroundBase = { colors: Float32Array };
const trunkOrLeaf = new WeakMap<THREE.Material, { base: number; kind: 'leaf' | 'fir' | 'other' }>();

function greenish(color: THREE.Color) { return color.g > color.r * 1.05 && color.g > color.b * 1.05; }

function applySeason(group: THREE.Group) {
    const look = seasonLook(state.season);
    group.traverse(node => {
        if (node.userData?.trainingGround) {
            const mesh = node as THREE.Mesh;
            const attribute = mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
            const store = mesh.geometry.userData as { baseColors?: Float32Array } & GroundBase;
            if (!store.baseColors) store.baseColors = new Float32Array(attribute.array as Float32Array);
            const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
            const target = new THREE.Color(look.ground), tmp = new THREE.Color();
            for (let i = 0; i < attribute.count; i++) {
                tmp.setRGB(store.baseColors[i * 3], store.baseColors[i * 3 + 1], store.baseColors[i * 3 + 2]);
                const x = position.getX(i), y = position.getY(i);
                const noise = (Math.sin(x * .31 + y * .17) + Math.cos(y * .23 - x * .11)) * .25 + .5;     // 0..1 patchiness
                const height = position.getZ(i);
                const amount = Math.min(1, look.groundAmount * (.75 + .5 * noise) + (state.season === 'winter' ? Math.min(.1, height / 80) : 0));
                tmp.lerp(target, amount);
                attribute.setXYZ(i, tmp.r, tmp.g, tmp.b);
            }
            attribute.needsUpdate = true;
        }
        const name = node.name;
        if (name === 'Река' || name === 'Озеро') {
            const material = (node as THREE.Mesh).material as THREE.MeshStandardMaterial;
            const base = name === 'Река' ? 0x527c80 : 0x487582;
            material.color.setHex(mixColor(base, look.water, look.waterAmount));
            material.roughness = state.season === 'winter' ? .55 : .26;
        }
        const mesh = node as THREE.InstancedMesh;
        if (mesh.isInstancedMesh && /tree|рощи|деревья/i.test(name)) {
            const leafy = name === 'tree-collisions-1' || name === 'Лиственные деревья';
            const material = mesh.material as THREE.MeshStandardMaterial;
            let info = trunkOrLeaf.get(material);
            if (!info) { info = { base: material.color.getHex(), kind: greenish(material.color) ? (leafy ? 'leaf' : 'fir') : 'other' }; trunkOrLeaf.set(material, info); }
            if (info.kind === 'leaf') {
                material.color.setHex(mixColor(info.base, look.leaf, look.leafAmount));
                mesh.visible = look.leavesVisible;
            } else if (info.kind === 'fir') {
                material.color.setHex(mixColor(info.base, 0xf2f6f8, look.firSnow));
            }
        }
    });
}

// ------------------------------------------------------------------ weather particles and clouds

let weatherGroup: THREE.Group | null = null;
let rain: THREE.LineSegments | null = null;
let snow: THREE.Points | null = null;
let clouds: THREE.Group | null = null;
const BOX = 70, TOP = 45;

function ensureWeather() {
    if (weatherGroup) return;
    weatherGroup = new THREE.Group(); weatherGroup.name = 'Погода'; weatherGroup.userData.collidable = false;

    const rainPositions = new Float32Array(1600 * 6);
    for (let i = 0; i < 1600; i++) {
        const x = (Math.random() - .5) * BOX * 2, y = (Math.random() - .5) * BOX * 2, z = Math.random() * TOP;
        rainPositions.set([x, y, z, x - .15, y, z + 1.3], i * 6);
    }
    const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0xaecbe6, transparent: true, opacity: .55, fog: false }));
    rain.frustumCulled = false; rain.visible = false; weatherGroup.add(rain);

    const snowPositions = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) snowPositions.set([(Math.random() - .5) * BOX * 2, (Math.random() - .5) * BOX * 2, Math.random() * TOP], i * 3);
    const snowGeometry = new THREE.BufferGeometry(); snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    snow = new THREE.Points(snowGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: .22, transparent: true, opacity: .9, depthWrite: false, fog: false }));
    snow.frustumCulled = false; snow.visible = false; weatherGroup.add(snow);

    clouds = new THREE.Group(); clouds.name = 'Облака';
    const puff = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 20; i++) {
        const bank = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92, depthWrite: false, fog: false });
        for (let k = 0; k < 6; k++) {
            const mesh = new THREE.Mesh(puff, material);
            mesh.scale.set(14 + Math.random() * 14, 10 + Math.random() * 8, 5 + Math.random() * 3);
            mesh.position.set((k - 2.5) * 14 + (Math.random() - .5) * 8, (Math.random() - .5) * 14, (Math.random() - .5) * 3);
            bank.add(mesh);
        }
        bank.position.set((Math.random() - .5) * 700, (Math.random() - .5) * 700, 95 + Math.random() * 35);
        bank.userData.speed = 1.2 + Math.random() * 1.6;
        clouds.add(bank);
    }
    weatherGroup.add(clouds);
    scene.add(weatherGroup);
}

function applyWeather(active: boolean) {
    ensureWeather();
    const look = weatherLook(state.weather, state.season);
    const sky = sunAt(state.hour);
    weatherGroup!.visible = active || state.weather !== 'clear';
    rain!.visible = look.rain > 0; snow!.visible = look.snow > 0;
    clouds!.children.forEach((bank, i) => {
        bank.visible = i < look.clouds;
        const tone = mixColor(0xffffff, look.grey, look.greyAmount * .9);
        const lit = mixColor(0x1a2234, tone, 1 - sky.night * .85);
        ((bank.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(lit);
    });
}

function animateWeather(dt: number) {
    if (!weatherGroup || !weatherGroup.visible) return;
    weatherGroup.position.set(camera.position.x, camera.position.y, 0);
    if (clouds) clouds.children.forEach(bank => {
        bank.position.x += bank.userData.speed * dt;
        if (bank.position.x > 380) bank.position.x = -380;
    });
    // Particles fall in a box that rides along with the camera; each wraps to the top when it reaches the ground.
    if (rain?.visible) {
        const p = rain.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i += 2) {
            const fall = 28 * dt;
            for (const k of [i, i + 1]) p.setZ(k, p.getZ(k) - fall);
            if (p.getZ(i) < 0) { p.setZ(i, TOP); p.setZ(i + 1, TOP + 1.3); }
        }
        p.needsUpdate = true;
    }
    if (snow?.visible) {
        const p = snow.geometry.getAttribute('position') as THREE.BufferAttribute;
        const t = performance.now() / 1000;
        for (let i = 0; i < p.count; i++) {
            p.setZ(i, p.getZ(i) - 2.2 * dt);
            p.setX(i, p.getX(i) + Math.sin(t * .8 + i) * .4 * dt);
            if (p.getZ(i) < 0) p.setZ(i, TOP);
        }
        p.needsUpdate = true;
    }
}

// ------------------------------------------------------------------ orchestration

export function apply(): void {
    const ground = terrain();
    const active = Boolean(ground);
    const clock = state.mode === 'clock';
    if (!active) {
        applySky(false); restoreSky();
        if (weatherGroup) weatherGroup.visible = false;
        appliedTerrain = null;
        return;
    }
    if (clock) applySky(true); else { applySky(false); restoreSky(); }
    const look = weatherLook(state.weather, state.season);
    // Use the same extent-aware haze as the environment; a fixed density hides a distant overview.
    if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = landscapeFogDensity(Number(ground!.userData.trainingLayout?.size)) * (clock ? look.fogScale : 1);
    }
    if (camera.far < 1800) { camera.far = 1800; camera.updateProjectionMatrix(); }
    applyNightGlow(ground!, clock ? sunAt(state.hour).night : 0, look.greyAmount);
    if (appliedTerrain !== ground) { applySeason(ground!); appliedTerrain = ground; }
    applyWeather(true);
}

function frame(now: number) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    const ground = terrain();
    if (ground !== appliedTerrain) apply();          // a new map was built: colour it for the current season
    if (state.auto && ground && state.mode === 'clock') {
        state = { ...state, hour: normalizeHour(state.hour + dt * 24 / DAY_SECONDS) };
        // Re-lighting walks the whole scene (glowing windows), so do it a few times a second, not every frame.
        pendingSince += dt;
        if (pendingSince >= .2) {
            pendingSince = 0;
            apply();
            listeners.forEach(l => l(getAtmosphere()));
            save();
        }
    }
    animateWeather(dt);
}
let pendingSince = 0;

export function initAtmosphere(): void {
    if (started) return;
    started = true;
    requestAnimationFrame(frame);
}

export type { AtmosphereState, Season, Weather };
