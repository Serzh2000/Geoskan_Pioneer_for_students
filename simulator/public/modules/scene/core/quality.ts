import * as THREE from 'three';

/**
 * Graphics quality governor: tiers, the pure step-up/step-down decision, and the runtime that applies a tier
 * (pixel ratio, sun shadow, distance culling of far props, tree thinning).
 */

export type QualitySetting = 'auto' | 'high' | 'medium' | 'low';
export const QUALITY_SETTINGS: QualitySetting[] = ['auto', 'high', 'medium', 'low'];
export const QUALITY_STORAGE_KEY = 'pioneer.graphicsQuality';

export interface QualityTier {
    /** Cap for the device pixel ratio (the real value is min(devicePixelRatio, cap)). */
    pixelRatioCap: number;
    shadows: boolean;
    shadowMapSize: number;
    /** Props farther than this from the camera and every drone stop casting shadows. */
    shadowDistance: number;
    /** Props farther than this are hidden while the camera is low (see LOW_CAMERA_HEIGHT). */
    hideDistance: number;
    /** Balconies and railings of apartment blocks are drawn only closer than this. */
    detailDistance: number;
    /** Buildings farther than this are drawn as a single box (see environment/obstacles/far-proxy.ts). Infinity: never, the machine copes. */
    proxyDistance: number;
    /** Share of the instanced trees that is drawn, 0..1. */
    treeDensity: number;
}

export const QUALITY_TIERS: readonly QualityTier[] = [
    { pixelRatioCap: 2, shadows: true, shadowMapSize: 2048, shadowDistance: Infinity, hideDistance: Infinity, detailDistance: 90, proxyDistance: Infinity, treeDensity: 1 },
    { pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024, shadowDistance: 140, hideDistance: Infinity, detailDistance: 60, proxyDistance: 220, treeDensity: 1 },
    { pixelRatioCap: 0.75, shadows: false, shadowMapSize: 1024, shadowDistance: 0, hideDistance: 320, detailDistance: 40, proxyDistance: 150, treeDensity: 0.75 },
    { pixelRatioCap: 0.6, shadows: false, shadowMapSize: 1024, shadowDistance: 0, hideDistance: 200, detailDistance: 25, proxyDistance: 100, treeDensity: 0.5 }
];
export const MAX_TIER = QUALITY_TIERS.length - 1;
/** Far props are hidden only while the camera is below this height (an overview needs the whole map). */
export const LOW_CAMERA_HEIGHT = 80;

/** Fixed tier of a manual setting; `auto` has none. */
export function tierOfSetting(setting: QualitySetting): number | null {
    return setting === 'high' ? 0 : setting === 'medium' ? 2 : setting === 'low' ? MAX_TIER : null;
}

export function parseQualitySetting(raw: unknown): QualitySetting {
    return QUALITY_SETTINGS.includes(raw as QualitySetting) ? raw as QualitySetting : 'auto';
}

export interface GovernorState {
    tier: number;
    /** Time of the last tier change, ms. */
    changedAt: number;
    /** Since when the frame time has been comfortably good, ms; null when it is not. */
    goodSince: number | null;
    /** Stepping up is forbidden until this time, ms. Grows after an up-step that had to be undone. */
    upBlockedUntil: number;
    upBlockMs: number;
    lastDirection: 'up' | 'down' | null;
}

export const GOVERNOR = {
    /** Median frame time that is too slow (< ~40 fps: a drone sim that stutters is hard to fly, so step down early). */
    slowMs: 24,
    /** Median frame time that counts as good (about 60 fps held). */
    goodMs: 18.5,
    minSamples: 40,
    downCooldownMs: 3000,
    upAfterGoodMs: 15000,
    upCooldownMs: 15000,
    firstUpBlockMs: 20000,
    maxUpBlockMs: 300000,
    /** An up-step undone within this time doubles the ban on going up. */
    failedUpWindowMs: 12000
};

export function createGovernorState(tier = 0, now = 0): GovernorState {
    return { tier, changedAt: now, goodSince: null, upBlockedUntil: 0, upBlockMs: GOVERNOR.firstUpBlockMs, lastDirection: null };
}

export function median(values: readonly number[]): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

/**
 * One decision step. Pure: returns the next state, the input is not changed.
 * Down: median frame time is slow and the last change is old enough. Up: it has been good for a long time,
 * the up-ban is over, and the tier is not the best one. Hysteresis comes from the gap between slowMs and goodMs,
 * the long "good" requirement and an up-ban that doubles whenever an up-step has to be undone.
 */
export function decideTier(state: GovernorState, medianMs: number, sampleCount: number, now: number): GovernorState {
    if (sampleCount < GOVERNOR.minSamples) return state;
    const next = { ...state };
    const sinceChange = now - state.changedAt;
    if (medianMs > GOVERNOR.slowMs) {
        next.goodSince = null;
        if (state.tier < MAX_TIER && sinceChange >= GOVERNOR.downCooldownMs) {
            if (state.lastDirection === 'up' && sinceChange < GOVERNOR.failedUpWindowMs) {
                next.upBlockMs = Math.min(GOVERNOR.maxUpBlockMs, state.upBlockMs * 2);
            }
            // Far too slow (under ~20 fps): one step would take seconds to be noticed again, so take two.
            next.tier = Math.min(MAX_TIER, state.tier + (medianMs > GOVERNOR.slowMs * 2 ? 2 : 1));
            next.changedAt = now;
            next.lastDirection = 'down';
            next.upBlockedUntil = now + next.upBlockMs;
        }
        return next;
    }
    if (medianMs <= GOVERNOR.goodMs) {
        next.goodSince = state.goodSince ?? now;
        if (state.tier > 0 && now >= state.upBlockedUntil && sinceChange >= GOVERNOR.upCooldownMs
            && now - next.goodSince >= GOVERNOR.upAfterGoodMs) {
            next.tier = state.tier - 1;
            next.changedAt = now;
            next.lastDirection = 'up';
            next.goodSince = null;
        }
        return next;
    }
    next.goodSince = null;
    return next;
}

/**
 * Where the automatic setting starts, from what is known before the first frame: the GPU name and the pixels to fill. A
 * software rasteriser starts two tiers down, a phone or integrated GPU one, and a very large canvas one more; the
 * governor then moves from there by the measured frame time, in either direction.
 */
export function initialTier(gpuName: string, pixels: number): number {
    const name = gpuName.toLowerCase();
    let tier = 0;
    if (/swiftshader|llvmpipe|software|basic render/.test(name)) tier = 2;
    else if (/mali|adreno|powervr|apple gpu|videocore/.test(name)) tier = 1;
    else if (/intel/.test(name) && !/arc/.test(name)) tier = 1;
    if (pixels > 8_000_000) tier += 1;
    return Math.min(MAX_TIER, tier);
}

function gpuNameOf(renderer: THREE.WebGLRenderer): string {
    try {
        const gl = renderer.getContext();
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    } catch { return ''; }
}

let startTierChosen = false;

/** Half-width (m) of the sun-shadow window that follows the drone on a big map: 7 cm per texel at 2048. */
export const SHADOW_FOLLOW_EXTENT = 70;

/** Snaps `value` to a multiple of `step`, so the shadow window moves in whole texels and the edges do not shimmer. */
export function snapToStep(value: number, step: number): number {
    return step > 0 ? Math.round(value / step) * step : value;
}

/** A shadow frame is redrawn this often: every frame at full quality, every second one below it (the drone moves little in 16 ms). */
export function shadowRedrawEvery(tier: number): number {
    return tier <= 0 ? 1 : 2;
}

let shadowFrame = 0;
const followState = new WeakMap<THREE.DirectionalLight, { applied: THREE.Vector3; offset: THREE.Vector3 }>();

/**
 * The sun's shadow window stays on the first drone instead of covering the whole map: on a 600 m map that is a window of
 * 900 m at 44 cm per texel, redrawn with every prop on it, for a drone a few metres across. Shadows follow the drone at
 * high resolution and the casters outside the window cost nothing. Whoever else places the sun (the sky model, the map
 * builder) keeps doing so: an outside change of the position is taken as the new direction.
 */
export function followDroneWithSun(light: THREE.DirectionalLight, center: THREE.Vector3 | null, mapSize: number): void {
    const camera = light.shadow.camera;
    if (camera.right > SHADOW_FOLLOW_EXTENT) {
        Object.assign(camera, { left: -SHADOW_FOLLOW_EXTENT, right: SHADOW_FOLLOW_EXTENT, top: SHADOW_FOLLOW_EXTENT, bottom: -SHADOW_FOLLOW_EXTENT });
        camera.updateProjectionMatrix();
    }
    let state = followState.get(light);
    if (!state) { state = { applied: new THREE.Vector3(NaN, NaN, NaN), offset: new THREE.Vector3() }; followState.set(light, state); }
    if (!state.applied.equals(light.position)) state.offset.copy(light.position);    // the others place the sun relative to the origin
    const texel = (camera.right - camera.left) / Math.max(1, mapSize);
    const x = center ? snapToStep(center.x, texel) : light.target.position.x;
    const y = center ? snapToStep(center.y, texel) : light.target.position.y;
    light.target.position.set(x, y, 0);
    light.position.set(x + state.offset.x, y + state.offset.y, state.offset.z);
    light.target.updateMatrixWorld();
    state.applied.copy(light.position);
}

/** Share of the proxy distance below which a far prop goes back to its full model: stops it flickering at the border. */
export const PROXY_HYSTERESIS = 0.9;

/**
 * Is a prop at `distance` from the nearest viewer hidden / out of the sun shadow / minus its detail / a far box.
 * `wasFar` is its previous state: a prop that is already a box stays one until it is clearly closer again.
 */
export function lodFlags(tier: QualityTier, distance: number, cameraHeight: number, wasFar = false, proxyScale = 1) {
    return {
        hidden: cameraHeight < LOW_CAMERA_HEIGHT && distance > tier.hideDistance,
        shadow: distance <= tier.shadowDistance,
        detail: distance <= tier.detailDistance,
        far: distance > tier.proxyDistance * proxyScale * (wasFar ? PROXY_HYSTERESIS : 1)
    };
}

// ------------------------------------------------------------------ runtime

interface QualityContext {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
    /** Positions of everything that must stay fully drawn and collidable (drones). */
    anchors: () => THREE.Object3D[];
    envRoot: () => THREE.Object3D | null;
}

let setting: QualitySetting = loadSetting();
let governor = createGovernorState(0, 0);
let appliedTier = -1;
let frameTimes: number[] = [];
let lastFrameAt = 0;
let lastLodAt = 0;
let sun: THREE.DirectionalLight | null = null;
const listeners = new Set<(info: { setting: QualitySetting; tier: number }) => void>();
const viewer = new THREE.Vector3();
const probe = new THREE.Vector3();

function loadSetting(): QualitySetting {
    try { return parseQualitySetting(globalThis.localStorage?.getItem(QUALITY_STORAGE_KEY)); } catch { return 'auto'; }
}

export function getQualitySetting(): QualitySetting { return setting; }
export function getQualityTier(): number { return manualTier() ?? governor.tier; }
function manualTier() { return tierOfSetting(setting); }

export function onQualityChange(listener: (info: { setting: QualitySetting; tier: number }) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setQualitySetting(next: QualitySetting): void {
    setting = parseQualitySetting(next);
    try { globalThis.localStorage?.setItem(QUALITY_STORAGE_KEY, setting); } catch { /* storage unavailable */ }
    frameTimes = [];
    governor = createGovernorState(manualTier() ?? 0, performance.now());
    startTierChosen = manualTier() !== null;
    appliedTier = -1;
    lastLodAt = 0;
    listeners.forEach(listener => listener({ setting, tier: getQualityTier() }));
}

function findSun(scene: THREE.Scene): THREE.DirectionalLight | null {
    if (sun && sun.parent) return sun;
    sun = null;
    scene.traverse(node => { if (!sun && (node as THREE.DirectionalLight).isDirectionalLight && node.castShadow) sun = node as THREE.DirectionalLight; });
    return sun;
}

function applyTier(ctx: QualityContext, tierIndex: number) {
    const tier = QUALITY_TIERS[tierIndex];
    const ratio = Math.min(globalThis.devicePixelRatio || 1, tier.pixelRatioCap);
    if (Math.abs(ctx.renderer.getPixelRatio() - ratio) > 0.01) ctx.renderer.setPixelRatio(ratio);
    const light = findSun(ctx.scene);
    if (light) {
        if (light.castShadow !== tier.shadows) light.castShadow = tier.shadows;
        if (light.shadow.mapSize.x !== tier.shadowMapSize) {
            light.shadow.mapSize.set(tier.shadowMapSize, tier.shadowMapSize);
            light.shadow.map?.dispose();
            light.shadow.map = null;
        }
    }
    const root = ctx.envRoot();
    root?.traverse(node => {
        const trees = node as THREE.InstancedMesh;
        if (!trees.isInstancedMesh || !trees.userData.treeTotal) return;
        trees.count = Math.max(1, Math.round(trees.userData.treeTotal * tier.treeDensity));
    });
    appliedTier = tierIndex;
    lastLodAt = 0;
}

function setShadowCasting(object: THREE.Object3D, cast: boolean) {
    object.traverse(node => { if ((node as THREE.Mesh).isMesh && !(node as THREE.Mesh).userData.noShadowLod) (node as THREE.Mesh).castShadow = cast; });
}

/**
 * Far: the box stands in for the real meshes. Parts that arrive later (window modules load asynchronously) are caught by
 * the child count; the roof marker and incident effects stay as they are.
 */
function applyFarProxy(prop: THREE.Object3D, far: boolean) {
    const proxy = prop.userData.lodProxy as THREE.Object3D | undefined;
    if (!proxy || !proxy.parent) return;
    if (prop.userData.lodFar === far && prop.userData.lodChildCount === prop.children.length) return;
    prop.userData.lodFar = far;
    prop.userData.lodChildCount = prop.children.length;
    for (const child of prop.children) {
        if (child === proxy || child.userData.keepSeparate || child.userData.isIncidentEffect) continue;
        child.visible = !far;
    }
    proxy.visible = far;
    // Parts shown again must get their detail flags re-applied by the pass below.
    if (!far) prop.userData.lodDetailOn = undefined;
}

/** Distance LOD of the props of training maps and presets. Cheap enough to run a few times a second. */
function updateDistanceLod(ctx: QualityContext, tier: QualityTier) {
    const root = ctx.envRoot();
    if (!root) return;
    const viewers: THREE.Vector3[] = [ctx.camera.getWorldPosition(viewer).clone()];
    for (const anchor of ctx.anchors()) viewers.push(anchor.getWorldPosition(new THREE.Vector3()));
    const cameraHeight = viewers[0].z;
    for (const holder of root.children) {
        if (!holder.userData.presetName) continue;
        for (const prop of holder.children) {
            if (prop.userData.presetSlot === undefined || (prop as THREE.InstancedMesh).isInstancedMesh) continue;
            prop.getWorldPosition(probe);
            let distance = Infinity;
            for (const v of viewers) distance = Math.min(distance, Math.hypot(v.x - probe.x, v.y - probe.y, (v.z - probe.z) * 0.25));
            const flags = lodFlags(tier, distance, cameraHeight, prop.userData.lodFar === true, Number(prop.userData.lodScale) || 1);
            applyFarProxy(prop, flags.far);
            if (flags.hidden && prop.visible) { prop.visible = false; prop.userData.lodHidden = true; }
            else if (!flags.hidden && prop.userData.lodHidden) { prop.visible = true; prop.userData.lodHidden = false; }
            if (prop.userData.lodShadow !== flags.shadow) {
                prop.userData.lodShadow = flags.shadow;
                setShadowCasting(prop, flags.shadow);
            }
            const detail = prop.userData.lodDetail as THREE.Object3D[] | undefined;
            if (detail && !flags.far && prop.userData.lodDetailOn !== flags.detail) {
                prop.userData.lodDetailOn = flags.detail;
                for (const part of detail) part.visible = flags.detail;
            }
        }
    }
}

/** Call once per rendered frame, before renderer.render. Cheap: a few comparisons per call. */
export function updateQuality(ctx: QualityContext, now = performance.now()): void {
    if (!startTierChosen) {
        startTierChosen = true;
        if (manualTier() === null) {
            const size = ctx.renderer.getSize(new THREE.Vector2());
            const ratio = ctx.renderer.getPixelRatio();
            governor = createGovernorState(initialTier(gpuNameOf(ctx.renderer), size.x * size.y * ratio * ratio), now);
        }
    }
    if (lastFrameAt) {
        const delta = now - lastFrameAt;
        if (delta < 1000) {
            frameTimes.push(delta);
            if (frameTimes.length > 120) frameTimes.shift();
        } else frameTimes = [];
    }
    lastFrameAt = now;
    if (manualTier() === null && frameTimes.length >= GOVERNOR.minSamples && now - lastDecisionAt > 500) {
        lastDecisionAt = now;
        const before = governor.tier;
        governor = decideTier(governor, median(frameTimes), frameTimes.length, now);
        if (governor.tier !== before) {
            frameTimes = [];
            listeners.forEach(listener => listener({ setting, tier: governor.tier }));
        }
    }
    const tierIndex = getQualityTier();
    if (tierIndex !== appliedTier) applyTier(ctx, tierIndex);
    const light = findSun(ctx.scene);
    if (light && light.castShadow) {
        const anchor = ctx.anchors()[0];
        followDroneWithSun(light, anchor ? anchor.getWorldPosition(probe) : null, light.shadow.mapSize.x);
        // Redrawn on demand: the renderer would otherwise redraw it every frame, wanted or not.
        ctx.renderer.shadowMap.autoUpdate = false;
        if (shadowFrame++ % shadowRedrawEvery(tierIndex) === 0) ctx.renderer.shadowMap.needsUpdate = true;
    } else ctx.renderer.shadowMap.autoUpdate = true;
    if (now - lastLodAt > 250) {
        lastLodAt = now;
        updateDistanceLod(ctx, QUALITY_TIERS[tierIndex]);
    }
}
let lastDecisionAt = 0;
