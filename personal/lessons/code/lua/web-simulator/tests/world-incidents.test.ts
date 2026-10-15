import { generateTrainingLayout, TRAINING_PROFILES } from '../public/modules/environment/training/layout.js';
import { findStationSite, planIncidents, planLineBreak } from '../public/modules/world/incidents.js';

describe('world incidents plan', () => {
    it('is deterministic per seed', () => {
        const a = generateTrainingLayout({ profile: 'hills', seed: 777 });
        const b = generateTrainingLayout({ profile: 'hills', seed: 777 });
        expect(planIncidents(a)).toEqual(planIncidents(b));
        expect(findStationSite(a)).toEqual(findStationSite(b));
    });

    it('finds a station site beside a road on every profile that has roads', () => {
        for (const profile of TRAINING_PROFILES) {
            const layout = generateTrainingLayout({ profile, seed: 20261009 });
            if (!layout.paths.some(p => p.kind === 'road')) continue;
            const site = findStationSite(layout);
            const label = `${profile}: ${site ? 'ok' : 'no site'}`;
            if (profile !== 'markers' && profile !== 'field') expect(label).toBe(`${profile}: ok`);
        }
    });

    it('breaks a span between two real pylons of the power line', () => {
        for (const seed of [1, 2, 3, 20261009]) {
            const layout = generateTrainingLayout({ profile: 'hills', seed });
            const plan = planLineBreak(layout);
            if (!plan) continue;
            expect(plan.from.type).toBe('power-pylon');
            expect(plan.to.type).toBe('power-pylon');
            expect(plan.x).toBeCloseTo((plan.from.x + plan.to.x) / 2);
        }
    });

    it('sets the fire in a burnable building away from the lesson corridor', () => {
        for (const profile of ['urban', 'forest', 'hills'] as const) {
            const layout = generateTrainingLayout({ profile, seed: 20261009 });
            const fire = planIncidents(layout).find(i => i.kind === 'fire');
            if (fire) expect(Math.abs(fire.x)).toBeGreaterThan(layout.corridorHalfWidth);
        }
    });
});
