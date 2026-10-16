/** Pure, seeded layout generation: independent of rendering and the editor. */
import { populateWorld, type WorldFeatures } from './world-plan.js';
import { populateCity } from './city-plan.js';
import { MODEL_FOOTPRINTS } from './settlement-policy.js';
export const TRAINING_PROFILES = ['field', 'forest', 'hills', 'urban', 'industrial', 'markers', 'mixed', 'city'] as const;
export type TrainingProfile = typeof TRAINING_PROFILES[number];
export type TrainingProp = {
    type: 'tree' | 'hill' | 'building' | 'house' | 'warehouse' | 'station' | 'water-tower' | 'pylon' | 'aruco' | 'pad'
        | 'barn' | 'silo' | 'wind-turbine' | 'radio-mast' | 'containers' | 'solar' | 'greenhouse' | 'bus-stop' | 'hay' | 'rocks'
        | 'church' | 'gas-station' | 'gantry-crane' | 'hangar' | 'windsock' | 'power-pylon' | 'fire-station'
        | 'police-station' | 'school' | 'hospital' | 'restaurant' | 'mall' | 'office' | 'bench' | 'cafe-table';
    x: number; y: number; scale: number; radius: number; value?: number;
    rotation?: number; floors?: number; districtId?: string; color?: number; variant?: number;
};
export type TrainingLayout = WorldFeatures & {
    version: 2; seed: number; profile: TrainingProfile; size: number;
    start: { x: number; y: number; z: number };
    corridorHalfWidth: number; objects: TrainingProp[];
    checkpoints: Array<{ x: number; y: number; z: number; markerId: number }>;
};

export const TRAINING_PROFILE_LABELS: Record<TrainingProfile, string> = {
    field: 'Открытый полигон', forest: 'Лес и поселки', hills: 'Холмистая местность', urban: 'Микрорайоны',
    industrial: 'Промышленный район', markers: 'Лаборатория ArUco', mixed: 'Экспедиция', city: 'Большой город'
};

function randomFromSeed(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let t = Math.imul(state ^ state >>> 15, state | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function generateTrainingLayout(options: { seed?: number; profile?: TrainingProfile; size?: number; density?: number } = {}): TrainingLayout {
    const seed = Number.isFinite(options.seed) ? Math.trunc(options.seed!) >>> 0 : 20261009;
    const profile = TRAINING_PROFILES.includes(options.profile!) ? options.profile! : 'field';
    const simple = profile === 'field' || profile === 'markers';
    // Every map fills the whole 600 m ground by default. The lesson part (start, corridor, markers) keeps the spacing the
    // lessons were written for, whatever the size of the world around it.
    const size = Number.isFinite(options.size) ? Math.max(40, Math.min(600, options.size!)) : 600;
    const lessonSize = Math.min(size, simple ? 100 : 180);
    const density = Number.isFinite(options.density) ? Math.max(0, Math.min(1, options.density!)) : .55;
    const random = randomFromSeed(seed);
    const corridorHalfWidth = 5;
    const checkpoints = [0, 1, 2, 3].map(i => ({ x: 0, y: 8 + i * (lessonSize / 2 - 16) / 3, z: 3, markerId: 10 + i }));
    const objects: TrainingProp[] = [{ type: 'pad', x: 0, y: 0, scale: 1, radius: 0 }];
    for (const point of checkpoints) {
        objects.push({ type: 'aruco', x: point.x, y: point.y, scale: 1.6, radius: 0, value: point.markerId });
    }
    const layout: TrainingLayout = { version: 2, seed, profile, size, start: { x: 0, y: 0, z: 0 }, corridorHalfWidth, objects, checkpoints,
        paths: [], water: [], districts: [], landforms: [], bridges: [] };
    if (profile === 'city' && size >= 240) return populateCity(layout, density);
    if (!simple && size >= 100) return populateWorld(layout, density);
    const base = profile === 'field' || profile === 'markers' ? 12 : Math.round(36 + density * 72);
    // Same calm character, spread over the whole map.
    const count = Math.round(base * Math.min(9, (size / lessonSize) ** 2 * .35));
    for (let attempt = 0; objects.length < count + 5 && attempt < count * 30; attempt++) {
        const x = (random() - .5) * (size - 16);
        const y = (random() - .5) * (size - 16);
        const region: TrainingProfile = profile !== 'mixed' ? profile : x < 0 ? (y < 0 ? 'forest' : 'hills') : (y < 0 ? 'urban' : 'industrial');
        const calmField = (): TrainingProp['type'] => { const roll = random(); return roll < .35 ? 'rocks' : roll < .6 ? 'hay' : roll < .85 ? 'tree' : 'pylon'; };
        const type: TrainingProp['type'] = region === 'forest' ? 'tree' : region === 'hills' ? 'hill' : region === 'urban' ? 'building'
            : profile === 'field' ? calmField() : 'pylon';
        const scale = type === 'rocks' || type === 'hay' ? .9 + random() * .25 : type === 'tree' ? 1.2 + random() * 1.6 : type === 'hill' ? 1.4 + random() * 1.5 : type === 'building' ? .7 + random() * .4 : .7 + random() * .6;
        const radius = Math.max(MODEL_FOOTPRINTS[type] ?? 0, type === 'tree' ? .6 : type === 'hill' ? 2.8 : type === 'building' ? 4 : .7) * scale;
        // Leave the origin, full central flight corridor and boundary clear.
        if (Math.abs(x) < corridorHalfWidth + radius || Math.hypot(x, y) < 10 + radius) continue;
        if (Math.abs(x) + radius > size / 2 - 4 || Math.abs(y) + radius > size / 2 - 4) continue;
        if (objects.some(prop => Math.hypot(prop.x - x, prop.y - y) < prop.radius + radius + 2)) continue;
        objects.push({ type, x, y, scale, radius });
    }
    return layout;
}
