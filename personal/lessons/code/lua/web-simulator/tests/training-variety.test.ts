import { generateTrainingLayout, type TrainingProfile } from '../public/modules/environment/training/layout.js';
import { distanceToWater } from '../public/modules/environment/training/world-plan.js';
import { spacingViolations } from './helpers/layout-rules.js';

const WORLD: TrainingProfile[] = ['forest', 'hills', 'urban', 'industrial', 'mixed'];
const ADDED = ['barn', 'silo', 'wind-turbine', 'radio-mast', 'containers', 'solar', 'greenhouse', 'bus-stop', 'hay', 'rocks',
    'church', 'gas-station', 'gantry-crane', 'hangar', 'windsock', 'power-pylon'];

describe('Procedural variety', () => {
    test.each(WORLD)('%s keeps every rule for 8 different seeds', profile => {
        for (let seed = 1; seed <= 8; seed++) {
            const layout = generateTrainingLayout({ profile, seed });
            expect(layout.size).toBe(600);
            expect(layout.objects.length).toBeLessThanOrEqual(4200);
            expect(spacingViolations(layout)).toEqual([]);
            expect(layout.paths.find(path => path.id === 'avenue')).toBeDefined();
            for (const district of layout.districts) expect(layout.paths.some(path => path.id === district.roadId)).toBe(true);
            expect(layout.bridges.length).toBeGreaterThanOrEqual(2);
            expect(layout.objects.some(prop => prop.type === 'station')).toBe(true);
        }
    });

    test('the seed changes the geography itself, not only the scenery', () => {
        const layouts = Array.from({ length: 12 }, (_, i) => generateTrainingLayout({ profile: 'mixed', seed: i + 1 }));
        expect(new Set(layouts.map(layout => layout.mirror))).toEqual(new Set([1, -1]));
        const riverSides = new Set(layouts.map(layout => Math.sign(layout.water[0].points[12].x)));
        expect(riverSides.size).toBe(2);
        expect(new Set(layouts.map(layout => layout.districts.map(d => d.kind).join())).size).toBeGreaterThan(2);
        expect(new Set(layouts.map(layout => Math.round(layout.paths.find(path => path.id === 'avenue')!.points[0].y))).size).toBeGreaterThan(2);
        // The lesson part never moves.
        for (const layout of layouts) expect(layout.checkpoints).toEqual(layouts[0].checkpoints);
    });

    test.each([['hills', 'wind-turbine'], ['urban', 'bus-stop'], ['industrial', 'containers'], ['forest', 'rocks'], ['mixed', 'barn']] as const)(
        '%s places %s', (profile, type) => {
            const hits = Array.from({ length: 6 }, (_, i) => generateTrainingLayout({ profile, seed: i + 100 }).objects.filter(prop => prop.type === type).length);
            expect(hits.filter(count => count > 0).length).toBeGreaterThanOrEqual(5);
        });

    test('the expedition map keeps houses, blocks and warehouses on both sides of the river', () => {
        for (let seed = 1; seed <= 8; seed++) {
            const types = new Set(generateTrainingLayout({ profile: 'mixed', seed }).objects.map(prop => prop.type));
            for (const type of ['house', 'building', 'warehouse', 'station']) expect(types.has(type as never)).toBe(true);
        }
    });

    test('every element of the new kit is reachable from some profile', () => {
        const seen = new Set<string>();
        for (const profile of WORLD) for (let seed = 1; seed <= 4; seed++) for (const prop of generateTrainingLayout({ profile, seed }).objects) seen.add(prop.type);
        for (const type of ADDED) expect(seen.has(type)).toBe(true);
    });

    test('airfield and power line keep clear of water, the lesson corridor and each other', () => {
        let airfields = 0, lines = 0;
        for (const profile of WORLD) for (let seed = 1; seed <= 8; seed++) {
            const layout = generateTrainingLayout({ profile, seed });
            const strip = layout.paths.find(path => path.id === 'airstrip');
            if (strip) {
                airfields++;
                for (let i = 0; i <= 11; i++) {
                    const t = i / 11, point = { x: strip.points[0].x + (strip.points[1].x - strip.points[0].x) * t, y: strip.points[0].y + (strip.points[1].y - strip.points[0].y) * t };
                    expect(distanceToWater(layout, point)).toBeGreaterThan(strip.width / 2);
                    expect(Math.abs(point.x)).toBeGreaterThan(layout.corridorHalfWidth + strip.width / 2);
                }
                expect(layout.objects.some(prop => prop.type === 'hangar')).toBe(true);
            }
            const pylons = layout.objects.filter(prop => prop.type === 'power-pylon');
            if (pylons.length) {
                lines++;
                expect(pylons.length).toBeGreaterThanOrEqual(3);
                // One continuous line along an edge: ordered by y, evenly spaced, wires strung pylon to pylon.
                const ordered = [...pylons].sort((a, b) => a.y - b.y);
                for (let i = 1; i < ordered.length; i++) {
                    const gap = Math.hypot(ordered[i].x - ordered[i - 1].x, ordered[i].y - ordered[i - 1].y);
                    expect(gap).toBeGreaterThan(20); expect(gap).toBeLessThan(56);
                }
                expect(Math.abs(pylons[0].x)).toBeGreaterThan(layout.corridorHalfWidth + 20);
            }
        }
        // They are optional where the map is crowded, but must appear often enough to matter.
        expect(airfields).toBeGreaterThanOrEqual(10);
        expect(lines).toBeGreaterThan(30);
    });

    test('the beginner field gets calm variety without geographic hazards', () => {
        const types = new Set(generateTrainingLayout({ profile: 'field', seed: 5 }).objects.map(prop => prop.type));
        expect(['rocks', 'hay', 'tree', 'pylon'].some(type => types.has(type as never))).toBe(true);
    });
});
