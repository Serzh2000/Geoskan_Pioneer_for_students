import { generateTrainingLayout, type TrainingProfile } from '../public/modules/environment/training/layout.js';
import { residentialNeighbors } from '../public/modules/environment/training/settlement-policy.js';
import { distanceToPath } from '../public/modules/environment/training/geography.js';
import { spacingViolations } from './helpers/layout-rules.js';
import { readFileSync } from 'node:fs';
import { MODEL_FOOTPRINTS } from '../public/modules/environment/training/settlement-policy.js';

const profiles: TrainingProfile[] = ['forest', 'hills', 'urban', 'industrial', 'mixed', 'city'];

describe('settlements have a purpose, not a random bag of models', () => {
    test('reserved footprints contain the actual vendored geometry, including the spinning rotor', () => {
        const models = new Map<string, Array<{ position: number[] }>>();
        for (let kit = 1; kit <= 5; kit++) {
            const data = JSON.parse(readFileSync(`public/assets/models/props/landscape-kit-v${kit}.mesh.json`, 'utf8')) as { assets: Record<string, Array<{ position: number[] }>> };
            for (const [name, parts] of Object.entries(data.assets)) models.set(name, parts);
        }
        const aliases: Record<string, string> = { house: 'Cottage', station: 'Station', warehouse: 'Warehouse', 'water-tower': 'WaterTower', barn: 'Barn', silo: 'Silo', 'radio-mast': 'RadioMast', containers: 'ContainerStack', solar: 'SolarArray', greenhouse: 'Greenhouse', 'bus-stop': 'BusStop', hay: 'HayBales', rocks: 'Rocks', 'power-pylon': 'PowerPylon', hangar: 'Hangar', windsock: 'Windsock', church: 'Church', 'gas-station': 'GasStation', 'gantry-crane': 'GantryCrane', 'fire-station': 'FireStation', school: 'School', hospital: 'Hospital', restaurant: 'Restaurant', mall: 'Mall', office: 'Office', 'police-station': 'PoliceStation', bench: 'Bench', 'cafe-table': 'CafeTable', 'wind-turbine': 'WindTurbineTower' };
        for (const [type, name] of Object.entries(aliases)) {
            const radius = MODEL_FOOTPRINTS[type as keyof typeof MODEL_FOOTPRINTS]!;
            for (const part of models.get(name)!) for (let i = 0; i < part.position.length; i += 3) {
                expect(Math.hypot(part.position[i], part.position[i + 1])).toBeLessThanOrEqual(radius);
            }
        }
        for (const part of models.get('TurbineRotor')!) for (let i = 0; i < part.position.length; i += 3) {
            // The rotor turns in XZ around its local Y axis; the hub is offset -1.65m in Y.
            expect(Math.hypot(part.position[i], part.position[i + 2], part.position[i + 1] - 1.65)).toBeLessThanOrEqual(MODEL_FOOTPRINTS['wind-turbine']!);
        }
    });
    test.each(profiles)('%s limits rare buildings even at maximum density', profile => {
        for (const seed of [1, 2, 7, 341, 9001]) {
            const layout = generateTrainingLayout({ profile, seed, density: 1 });
            const count = (type: string) => layout.objects.filter(p => p.type === type).length;
            for (const type of ['station', 'fire-station', 'police-station', 'mall']) expect(count(type)).toBeLessThanOrEqual(1);
            // Several settlements may each have a church, but landmarks never multiply with the area of the woods.
            expect(count('church')).toBeLessThanOrEqual(3);
            expect(count('hospital')).toBeLessThanOrEqual(2);
            expect(count('school')).toBeLessThanOrEqual(4);
            expect(count('water-tower')).toBeLessThanOrEqual(2);
            expect(count('gas-station')).toBeLessThanOrEqual(4);
            expect(count('radio-mast')).toBeLessThanOrEqual(2);
            expect(spacingViolations(layout)).toEqual([]);
        }
    });

    test.each(profiles)('%s keeps farms and cargo inside compatible districts', profile => {
        for (const seed of [1, 7, 341]) {
            const layout = generateTrainingLayout({ profile, seed });
            for (const prop of layout.objects.filter(p => ['barn', 'hay', 'greenhouse', 'containers', 'gantry-crane', 'silo'].includes(p.type))) {
                const district = layout.districts.find(d => d.id === prop.districtId);
                expect([prop.type, prop.districtId, Boolean(district)]).toEqual([prop.type, prop.districtId, true]);
                const kinds = ['containers', 'gantry-crane'].includes(prop.type) ? ['industry'] : prop.type === 'silo' ? ['industry', 'farmland'] : prop.type === 'greenhouse' ? ['farmland', 'village'] : ['farmland'];
                expect(kinds).toContain(district!.kind);
                expect(Math.abs(prop.x - district!.x)).toBeLessThanOrEqual(district!.width / 2);
                expect(Math.abs(prop.y - district!.y)).toBeLessThanOrEqual(district!.depth / 2);
            }
        }
    });

    test.each(['city', 'urban', 'mixed'] as const)('%s schools and hospitals actually serve nearby homes', profile => {
        for (const seed of [1, 2, 7, 341]) {
            const layout = generateTrainingLayout({ profile, seed });
            for (const type of ['school', 'hospital', 'church'] as const) {
                const props = layout.objects.filter(p => p.type === type);
                expect([type, props.length]).not.toEqual([type, 0]);
                for (const prop of props) {
                    expect(residentialNeighbors(layout, prop)).toBeGreaterThanOrEqual(type === 'church' ? 3 : 4);
                    expect(Math.min(...layout.paths.filter(p => p.kind === 'road').map(p => distanceToPath(prop, p.points)))).toBeLessThan(65);
                    for (const other of layout.objects.filter(p => ['warehouse', 'containers', 'gantry-crane', 'gas-station', 'wind-turbine', 'power-pylon'].includes(p.type))) {
                        expect(Math.hypot(prop.x - other.x, prop.y - other.y) - prop.radius - other.radius).toBeGreaterThanOrEqual(24);
                    }
                }
            }
        }
    });

    test('small maps omit buildings when no suitable plot exists and remain reproducible', () => {
        for (const size of [100, 180, 300, 480, 600]) {
            const options = { size, seed: 7, profile: 'mixed' as const, density: 1 };
            const layout = generateTrainingLayout(options);
            expect(generateTrainingLayout(options)).toEqual(layout);
            expect(spacingViolations(layout)).toEqual([]);
            expect(layout.checkpoints).toEqual(generateTrainingLayout({ ...options, density: 0 }).checkpoints);
        }
    });
});
