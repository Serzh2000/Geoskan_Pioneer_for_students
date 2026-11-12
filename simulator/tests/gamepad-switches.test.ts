import { rangeAround } from '../public/modules/ui/settings/wizard/switches-ui.js';
import { matchesAuxRange } from '../public/modules/core/state.js';

describe('taking a switch position as a range', () => {
    test('the three usual positions become the thirds that the flight modes use', () => {
        expect(rangeAround(1000)).toEqual({ min: 900, max: 1250, center: 1000 });
        expect(rangeAround(1500)).toEqual({ min: 1251, max: 1750, center: 1500 });
        expect(rangeAround(2000)).toEqual({ min: 1751, max: 2100, center: 2000 });
    });

    test('a position that is not one of them gets a window around it, inside the RC limits', () => {
        const range = rangeAround(1700);
        expect(range.min).toBe(1500);
        expect(range.max).toBe(1900);
        expect(matchesAuxRange(1700, range)).toBe(true);
        expect(matchesAuxRange(1100, range)).toBe(false);
        expect(rangeAround(1000 + 150).min).toBeGreaterThanOrEqual(900);
    });

    test('the thirds neighbour each other without a gap', () => {
        for (const rc of [1000, 1250, 1251, 1500, 1750, 1751, 2000]) {
            const hits = [rangeAround(1000), rangeAround(1500), rangeAround(2000)].filter((range) => matchesAuxRange(rc, range));
            expect(hits).toHaveLength(1);
        }
    });
});
