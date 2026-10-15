import { generateTrainingLayout, TRAINING_PROFILES } from '../public/modules/environment/training/layout.js';
import { distanceToWater, trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import { distanceToPath } from '../public/modules/environment/training/geography.js';
import { spacingViolations } from './helpers/layout-rules.js';

describe('Reproducible training terrain', () => {
    test.each(TRAINING_PROFILES)('%s is repeatable and reserves a clear route and start volume', profile => {
        const layout = generateTrainingLayout({ profile, seed: 341 });
        expect(generateTrainingLayout({ profile, seed: 341 })).toEqual(layout);
        expect(spacingViolations(layout)).toEqual([]);
        expect(new Set(layout.checkpoints.map(point => point.markerId)).size).toBe(4);
        expect(layout.objects.length).toBeLessThanOrEqual(4200);
    });
    test('seed changes scenery while preserving lesson markers and constraints', () => {
        const a = generateTrainingLayout({ profile: 'mixed', seed: 1 });
        const b = generateTrainingLayout({ profile: 'mixed', seed: 2 });
        expect(a.objects).not.toEqual(b.objects);
        expect(a.checkpoints).toEqual(b.checkpoints);
        expect(a.size).toBe(600);
        const types = new Set(a.objects.map(prop => prop.type));
        for (const type of ['pad', 'aruco', 'tree', 'building', 'house', 'warehouse', 'station', 'water-tower'] as const) expect(types.has(type)).toBe(true);
        // The expedition map shows the new farm, energy and street elements as well.
        const added = ['barn', 'silo', 'wind-turbine', 'radio-mast', 'containers', 'solar', 'greenhouse', 'bus-stop', 'hay', 'rocks'];
        expect(added.filter(type => (types as Set<string>).has(type)).length).toBeGreaterThanOrEqual(5);
    });
    test('untrusted configuration stays finite and bounded', () => {
        for (const options of [{ size: Infinity, seed: NaN, density: Infinity }, { size: -1, density: 300 }, { size: 1e9 }]) {
            const layout = generateTrainingLayout(options);
            expect(layout.size).toBeGreaterThanOrEqual(40);
            expect(layout.size).toBeLessThanOrEqual(600);
            expect(layout.objects.length).toBeLessThanOrEqual(4200);
            expect(Number.isFinite(layout.seed)).toBe(true);
        }
    });

    test.each(['forest', 'hills', 'urban', 'industrial', 'mixed'] as const)('%s plans connected districts, water, a station and crossings', profile => {
        const layout = generateTrainingLayout({ profile, seed: 341 });
        expect(layout.water.slice(0, 2).map(w => w.kind)).toEqual(['river','lake']);
        expect(layout.objects.some(p => p.type === 'station')).toBe(true);
        expect(layout.paths.filter(p => p.kind === 'rail').length).toBeGreaterThanOrEqual(2);
        expect(layout.districts.length).toBeGreaterThanOrEqual(3);
        for (const district of layout.districts) expect([district.id, layout.paths.some(p => p.id === district.roadId)]).toEqual([district.id, true]);
        // The highway is the road the others hang on.
        expect(layout.paths.find(p => p.id === 'avenue')).toBeDefined();
        expect(layout.bridges.length).toBeGreaterThanOrEqual(2);
        for (const bridge of layout.bridges) {
            expect(layout.paths.some(p => p.id === bridge.pathId)).toBe(true);
            expect(distanceToWater(layout,bridge)).toBeLessThan(.5);
        }
        for (const prop of layout.objects.filter(p=>p.radius>0)) {
            expect(distanceToWater(layout,prop)).toBeGreaterThanOrEqual(prop.radius+2);
            for (const path of layout.paths) {
                if(prop.type==='station' && path.id==='station-walk') {
                    // The pedestrian approach ends outside the actual 7.3 m deep station shell.
                    expect(prop.y-path.points[path.points.length-1].y).toBeGreaterThan(7.3*prop.scale/2);
                } else expect(distanceToPath(prop,path.points)).toBeGreaterThanOrEqual(prop.radius+path.width/2+.6);
            }
        }
        for (let y=-layout.size/2;y<=layout.size/2;y+=2) {
            expect(trainingHeightAt(layout,0,y)).toBe(0);
            expect(distanceToWater(layout,{x:0,y})).toBeGreaterThan(5);
        }
    });

    test('beginner field and marker lab remain calm without geographic hazards',()=>{
        for (const profile of ['field','markers'] as const) {
            const layout=generateTrainingLayout({profile});
            expect(layout.size).toBe(600);
            expect(layout.water).toHaveLength(0);
            expect(layout.districts).toHaveLength(0);
            expect(layout.landforms).toHaveLength(0);
        }
    });
});
