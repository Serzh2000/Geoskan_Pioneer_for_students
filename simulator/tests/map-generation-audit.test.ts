import { jest } from '@jest/globals';
import { generateTrainingLayout, type TrainingProfile } from '../public/modules/environment/training/layout.js';
import { trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import { GROUND_CHAINS, GROUND_LAYER, GROUND_LAYER_Z, layerOffset } from '../public/modules/environment/ground/layers.js';
import { decalViolations, fingerprint, placementViolations, roadViolations, terrainViolations } from './helpers/map-audit.js';

/**
 * Автоматический аудит генерации карт (без браузера): 30 seed на каждый из шести обитаемых профилей = 180 карт.
 * Условия: G2 (чистота плана), G3 (размещение), G6 (разнообразие и детерминизм), G1 (порядок слоёв), G5 (край карты).
 * Тот же набор проверок запускает `npm run check:maps` (tools/check-map-generation.mjs).
 */
jest.setTimeout(1_800_000);

const PROFILES: TrainingProfile[] = ['city', 'urban', 'mixed', 'forest', 'industrial', 'hills'];
const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
// Генерация одной карты - сотни миллисекунд: считаем каждую карту один раз и держим планы в памяти для всех проверок.
const layouts = new Map<string, ReturnType<typeof generateTrainingLayout>>();
const layoutOf = (profile: TrainingProfile, seed: number) => {
    const key = `${profile}#${seed}`;
    if (!layouts.has(key)) layouts.set(key, generateTrainingLayout({ profile, seed }));
    return layouts.get(key)!;
};
const each = (fn: (layout: ReturnType<typeof layoutOf>, label: string) => void) => {
    for (const profile of PROFILES) for (const seed of SEEDS) fn(layoutOf(profile, seed), `${profile}#${seed}`);
};

describe('map generation audit (180 maps)', () => {
    test('G2: roads cross only at junctions, with no kinks, bow ties, double asphalt, or water/lesson-strip crossings', () => {
        const bad: string[] = [];
        each((layout, label) => {
            const v = roadViolations(layout);
            for (const k of ['crossing', 'selfCross', 'kink', 'tinySegment', 'doubleAsphalt', 'water', 'lessonStrip', 'footpathFloating']) if (v[k].length) bad.push(`${label} ${k}: ${v[k].slice(0, 2).join('; ')}`);
        });
        expect(bad).toEqual([]);
    });

    test('G2: every loose street end has a turning area and nothing stands in it', () => {
        const bad: string[] = [];
        each((layout, label) => {
            const v = { ...roadViolations(layout), ...placementViolations(layout) };
            for (const k of ['noTurnaround', 'turnaroundBlocked']) if (v[k].length) bad.push(`${label} ${k}: ${v[k].slice(0, 2).join('; ')}`);
        });
        expect(bad).toEqual([]);
    });

    test('G3: props never overlap each other, roads, water, the corridor or the edge; every plot has a road and a district', () => {
        const bad: string[] = [];
        each((layout, label) => {
            const v = placementViolations(layout);
            for (const k of ['spacing', 'noRoad', 'districtMissing', 'crowded']) if (v[k].length) bad.push(`${label} ${k}: ${v[k].slice(0, 2).join('; ')}`);
        });
        expect(bad).toEqual([]);
    });

    test('G3: yards (flat layers) do not lie on roads, water, other objects or other yards', () => {
        const bad: string[] = [];
        each((layout, label) => { const v = decalViolations(layout); for (const k of Object.keys(v)) if (v[k].length) bad.push(`${label} ${k}: ${v[k].slice(0, 2).join('; ')}`); });
        expect(bad).toEqual([]);
    });

    test('G3: settled districts have no half-block holes', () => {
        const bad: string[] = [];
        each((layout, label) => { const v = placementViolations(layout); if (v.emptyBlock.length) bad.push(`${label}: ${v.emptyBlock.join('; ')}`); });
        expect(bad).toEqual([]);
    });

    test('G6: one seed always gives the same map', () => {
        for (const profile of PROFILES) for (const seed of [1, 7, 19]) {
            expect(JSON.stringify(generateTrainingLayout({ profile, seed }))).toBe(JSON.stringify(layoutOf(profile, seed)));
        }
    });

    test('G6: different seeds give different maps (topology, density, districts)', () => {
        for (const profile of PROFILES) {
            const prints = SEEDS.map(seed => fingerprint(layoutOf(profile, seed)));
            const signatures = new Set(prints.map(f => `${f.topology}|${f.roadLength}|${f.homes}`));
            expect(signatures.size).toBe(SEEDS.length);
            const roads = prints.map(f => f.roads), homes = prints.map(f => f.homes);
            expect(Math.max(...roads) - Math.min(...roads)).toBeGreaterThanOrEqual(10);
            expect(Math.max(...homes) - Math.min(...homes)).toBeGreaterThanOrEqual(15);
            // Mirror and river placement vary as well: not one composition with different trees.
            expect(new Set(prints.map(f => f.mirror)).size).toBe(2);
            expect(new Set(prints.map(f => Math.round(f.riverX / 12))).size).toBeGreaterThanOrEqual(6);
        }
    });

    test('G6: districts of different kinds appear across the seeds (centre, residential, industrial, park, suburb)', () => {
        const kinds = new Set<string>();
        each(layout => layout.districts.forEach(d => kinds.add(d.kind)));
        for (const kind of ['center', 'suburb', 'village', 'industry', 'park', 'farmland']) expect(kinds.has(kind)).toBe(true);
    });

    test('G5: relief fades to zero at the map edge (no step against the surroundings)', () => {
        each((layout, label) => {
            const half = layout.size / 2;
            for (let t = -half; t <= half; t += 15) for (const [x, y] of [[t, half], [t, -half], [half, t], [-half, t]]) {
                expect([label, trainingHeightAt(layout, x, y)]).toEqual([label, 0]);
            }
        });
    });

    test('G5: the built relief mesh never rises over a road, a path or a turning area, and is flat on every edge of the map', () => {
        const bad: string[] = [];
        for (const profile of PROFILES) for (const seed of SEEDS.slice(0, 8)) {
            const v = terrainViolations(layoutOf(profile, seed));
            for (const k of Object.keys(v)) if (v[k].length) bad.push(`${profile}#${seed} ${k}: ${v[k].slice(0, 2).join('; ')}`);
        }
        expect(bad).toEqual([]);
    });

    test('G1: in every chain of overlapping ground layers both the height and the polygon offset strictly rise', () => {
        for (const chain of GROUND_CHAINS) for (let i = 1; i < chain.length; i++) {
            const lo = chain[i - 1], hi = chain[i];
            expect([lo, hi, GROUND_LAYER_Z[hi] - GROUND_LAYER_Z[lo] >= .0015]).toEqual([lo, hi, true]);
            // patchShoulder shares the rank of the road shoulder (it caps the same carriageway) but sits 5 mm above it.
            expect([lo, hi, layerOffset(GROUND_LAYER[hi]).polygonOffsetUnits <= layerOffset(GROUND_LAYER[lo]).polygonOffsetUnits]).toEqual([lo, hi, true]);
        }
        // Chains that put two layers at one rank must separate them by at least 5 mm of height instead.
        expect(GROUND_LAYER_Z.patchShoulder - GROUND_LAYER_Z.shoulder).toBeGreaterThanOrEqual(.0005);
        // Offsets are bounded: a rank above 7 would pull a flat patch more than 1.5 m in front of a wall at 300 m (near = 0.025).
        expect(Math.max(...Object.values(GROUND_LAYER))).toBeLessThanOrEqual(7);
    });
});
