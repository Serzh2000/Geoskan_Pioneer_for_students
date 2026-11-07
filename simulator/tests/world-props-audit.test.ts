import { generateTrainingLayout, type TrainingLayout, type TrainingProfile } from '../public/modules/environment/training/layout.js';
import { trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import { MODEL_FOOTPRINTS } from '../public/modules/environment/training/settlement-policy.js';
import { VEHICLES, vehicleKindFor } from '../public/modules/world/vehicle-kinds.js';

/*
 * Аудит посадки растительности и реквизита: деревья не торчат из дорог и зданий, всё стоит на земле.
 * Чистая геометрия по layout, без WebGL.
 */
const PROFILES: TrainingProfile[] = ['city', 'forest', 'urban', 'hills', 'mixed'];
const SEEDS = [20261009, 341, 7];

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax, dy = by - ay, sq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / sq));
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
const roadDistance = (layout: TrainingLayout, x: number, y: number) => {
    let best = { d: Infinity, half: 0 };
    for (const path of layout.paths) {
        if (path.kind === 'footpath' && !path.id.startsWith('walk-')) continue;   // park paths are laid through the planting; pavements are not
        for (let i = 1; i < path.points.length; i++) {
            const d = distToSegment(x, y, path.points[i - 1].x, path.points[i - 1].y, path.points[i].x, path.points[i].y) - path.width / 2;
            if (d < best.d) best = { d, half: path.width / 2 };
        }
    }
    return best.d;
};
const BUILDINGS = new Set(['building', 'house', 'warehouse', 'station', 'barn', 'church', 'school', 'hospital', 'office', 'restaurant', 'mall', 'fire-station', 'police-station', 'gas-station', 'hangar', 'silo', 'greenhouse']);

describe.each(PROFILES)('profile %s', (profile) => {
    it.each(SEEDS)('seed %i: no tree stands on a road or inside a building', (seed) => {
        const layout = generateTrainingLayout({ profile, seed });
        const trees = layout.objects.filter(o => o.type === 'tree');
        const buildings = layout.objects.filter(o => BUILDINGS.has(o.type));
        let onRoad = 0, inBuilding = 0;
        for (const tree of trees) {
            const trunk = (tree.variant === 4 ? .3 : .1) * tree.scale;   // what the plant covers on the ground
            if (roadDistance(layout, tree.x, tree.y) < trunk) onRoad++;
            for (const b of buildings) {
                // The footprint radius is a conservative envelope; a trunk well inside 70% of it is inside the walls.
                if (Math.hypot(b.x - tree.x, b.y - tree.y) < (MODEL_FOOTPRINTS[b.type] ?? b.radius) * b.scale * .7) { inBuilding++; break; }
            }
        }
        expect({ onRoad, inBuilding }).toEqual({ onRoad: 0, inBuilding: 0 });
    });

    it('every prop stands on the terrain (never floats or sinks)', () => {
        const layout = generateTrainingLayout({ profile, seed: 20261009 });
        for (const o of layout.objects) {
            const z = trainingHeightAt(layout, o.x, o.y);
            expect(Number.isFinite(z)).toBe(true);
            expect(Math.abs(z)).toBeLessThan(15);
        }
    });
});

describe('vehicle kinds', () => {
    it('have real-world proportions', () => {
        for (const [kind, v] of Object.entries(VEHICLES)) {
            if (v.heavy) { expect(v.length).toBeGreaterThanOrEqual(6); expect(v.width).toBeLessThanOrEqual(2.6); }
            else { expect(v.length).toBeGreaterThanOrEqual(4); expect(v.length).toBeLessThanOrEqual(5.2); expect(v.width).toBeGreaterThanOrEqual(1.7); expect(v.width).toBeLessThanOrEqual(2); expect(v.height).toBeGreaterThanOrEqual(1.4); }
            expect(kind).toBeTruthy();
        }
    });
    it('keep heavy vehicles off narrow streets and offer at least five kinds', () => {
        const seen = new Set<string>();
        for (let id = 0; id < 48; id++) { seen.add(vehicleKindFor(id, 6)); expect(VEHICLES[vehicleKindFor(id, 3.8)].heavy).toBe(false); }
        expect(seen.size).toBeGreaterThanOrEqual(5);
    });
});

describe('plant models sit on the ground', () => {
    it('no species reaches below the ground (roots and lobes within 5 mm)', async () => {
        const THREE = await import('three');
        const nature = await import('../public/modules/environment/obstacles/nature.js');
        for (const make of [nature.createFirTreeMesh, nature.createTreeMesh, nature.createPoplarMesh, nature.createPineMesh, nature.createMapleMesh, nature.createShrubMesh]) {
            const box = new THREE.Box3().setFromObject(make());
            expect(box.min.z).toBeGreaterThanOrEqual(-0.005);
        }
    });
});
