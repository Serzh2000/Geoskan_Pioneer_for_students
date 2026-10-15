import { generateTrainingLayout } from '../public/modules/environment/training/layout.js';
import { spacingViolations } from './helpers/layout-rules.js';
import { distanceToPath } from '../public/modules/environment/training/geography.js';


describe('big city generator', () => {
    const seeds = [1, 2, 3, 7, 20261009];

    it('fills the whole map and is repeatable', () => {
        const layout = generateTrainingLayout({ profile: 'city', seed: 5 });
        expect(layout.size).toBe(600);
        expect(generateTrainingLayout({ profile: 'city', seed: 5 })).toEqual(layout);
        expect(generateTrainingLayout({ profile: 'city', size: 480, seed: 5 }).size).toBe(480);
        expect(generateTrainingLayout({ profile: 'city', size: 1e9, seed: 5 }).size).toBe(600);
    });

    it.each(seeds)('seed %i keeps every spacing rule', seed => {
        const layout = generateTrainingLayout({ profile: 'city', seed });
        expect(spacingViolations(layout)).toEqual([]);
        expect(layout.objects.length).toBeLessThanOrEqual(4200);
    });

    it.each(seeds)('seed %i has a real city: landmarks, an overpass and a logical road network', seed => {
        const layout = generateTrainingLayout({ profile: 'city', seed });
        const types = new Map<string, number>();
        for (const prop of layout.objects) types.set(prop.type, (types.get(prop.type) ?? 0) + 1);
        for (const type of ['hospital', 'school', 'church', 'restaurant', 'fire-station', 'police-station', 'station', 'building', 'house', 'bench', 'cafe-table', 'bus-stop', 'power-pylon']) {
            expect([type, types.get(type) ?? 0]).not.toEqual([type, 0]);
        }
        expect(types.get('building')! + types.get('house')!).toBeGreaterThan(100);
        const overpass = layout.bridges.find(b => b.kind === 'overpass');
        expect(overpass).toBeDefined();
        expect(overpass!.height).toBeGreaterThan(5);
        const rail = layout.paths.find(p => p.id === 'rail-main')!;
        expect(distanceToPath(overpass!, rail.points)).toBeLessThan(.5);
        // The overpass lifts a real road: that road reaches the railway from both sides.
        const artery = layout.paths.find(p => p.id === overpass!.pathId)!;
        expect(artery.kind).toBe('road');
        expect(Math.min(...artery.points.map(p => p.y))).toBeLessThan(rail.points[0].y - 5);
        expect(Math.max(...artery.points.map(p => p.y))).toBeGreaterThan(rail.points[0].y + 5);
        const roads = layout.paths.filter(p => p.kind === 'road');
        expect(roads.length).toBeGreaterThanOrEqual(12);
        // Every long street meets another road (or leaves the map): nothing floats free on the map.
        const half = layout.size / 2;
        for (const road of roads) {
            if (road.hierarchy === 'lane' || /-rib|^farm-lane|^airfield-road|^industry-road|^station-road/.test(road.id)) continue;
            const others = roads.filter(r => r !== road);
            for (const end of [road.points[0], road.points[road.points.length - 1]]) {
                const connected = Math.abs(end.x) > half - 12 || Math.abs(end.y) > half - 12 || others.some(other => distanceToPath(end, other.points) < .6)
                    || layout.paths.some(p => p.kind === 'footpath' && distanceToPath(end, p.points) < .6);
                expect([road.id, connected]).toEqual([road.id, true]);
            }
        }
        expect(layout.bridges.filter(b => b.kind === 'river').length).toBeGreaterThanOrEqual(1);
    });

    it('the lesson strip lies in a park block of the grid, or clear of a radial plan', () => {
        let parks = 0;
        for (let seed = 1; seed <= 16; seed++) {
            const layout = generateTrainingLayout({ profile: 'city', seed });
            const park = layout.districts.find(d => d.id === 'district-park-lesson');
            if (!park) continue;
            parks++;
            for (const marker of layout.checkpoints) expect(Math.abs(marker.x - park.x) < park.width / 2 && Math.abs(marker.y - park.y) < park.depth / 2).toBe(true);
        }
        expect(parks).toBeGreaterThan(2);
    });

    it('generates fast enough to build on demand', () => {
        const start = Date.now();
        generateTrainingLayout({ profile: 'city', seed: 11, size: 600 });
        expect(Date.now() - start).toBeLessThan(4000);
    });
});
