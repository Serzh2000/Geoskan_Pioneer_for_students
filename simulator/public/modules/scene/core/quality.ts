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
    /** Buildings farther than this are drawn as a single box (see environment/obstacles/far-proxy.ts). */
    proxyDistance: number;
    /** Share of the instanced trees that is drawn, 0..1. */
    treeDensity: number;
}

export const QUALITY_TIERS: readonly QualityTier[] = [
    { pixelRatioCap: 2, shadows: true, shadowMapSize: 2048, shadowDistance: Infinity, hideDistance: Infinity, detailDistance: 90, proxyDistance: 220, treeDensity: 1 },
    { pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024, shadowDistance: 140, hideDistance: Infinity, detailDistance: 60, proxyDistance: 160, treeDensity: 1 },
    { pixelRatioCap: 0.75, shadows: false, shadowMapSize: 1024, shadowDistance: 0, hideDistance: 320, detailDistance: 40, proxyDistance: 110, treeDensity: 0.75 },
    { pixelRatioCap: 0.6, shadows: false, shadowMapSize: 1024, shadowDistance: 0, hideDistance: 200, detailDistance: 25, proxyDistance: 75, treeDensity: 0.5 }
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
            next.tier = state.tier + 1;
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
    if (now - lastLodAt > 250) {
        lastLodAt = now;
        updateDistanceLod(ctx, QUALITY_TIERS[tierIndex]);
    }
}
let lastDecisionAt = 0;
