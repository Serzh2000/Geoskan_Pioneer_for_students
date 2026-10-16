/** @jest-environment node */
import { QUALITY_TIERS, GOVERNOR, MAX_TIER, createGovernorState, decideTier, lodFlags, median, parseQualitySetting, tierOfSetting } from '../public/modules/scene/core/quality.js';

const slow = GOVERNOR.slowMs + 10, good = GOVERNOR.goodMs - 2, enough = GOVERNOR.minSamples;

describe('quality governor', () => {
    it('median and setting parsing', () => {
        expect(median([5, 1, 9])).toBe(5);
        expect(median([])).toBe(0);
        expect(parseQualitySetting('nonsense')).toBe('auto');
        expect(parseQualitySetting('low')).toBe('low');
        expect(tierOfSetting('auto')).toBeNull();
        expect(tierOfSetting('high')).toBe(0);
        expect(tierOfSetting('low')).toBe(MAX_TIER);
    });

    it('ignores too few samples and does not mutate its input', () => {
        const state = createGovernorState(0, 0);
        expect(decideTier(state, slow, enough - 1, 10000)).toBe(state);
        const next = decideTier(state, slow, enough, 10000);
        expect(next.tier).toBe(1);
        expect(state.tier).toBe(0);
    });

    it('steps down one tier at a time with a cooldown, never below the last tier', () => {
        let state = createGovernorState(0, 0);
        state = decideTier(state, slow, enough, 5000);
        expect(state.tier).toBe(1);
        state = decideTier(state, slow, enough, 5000 + GOVERNOR.downCooldownMs - 1);
        expect(state.tier).toBe(1);
        state = decideTier(state, slow, enough, 5000 + GOVERNOR.downCooldownMs);
        expect(state.tier).toBe(2);
        for (let t = 20000; t < 60000; t += 4000) state = decideTier(state, slow, enough, t);
        expect(state.tier).toBe(MAX_TIER);
    });

    it('steps up only after a long good stretch and after the up-ban', () => {
        let state = createGovernorState(0, 0);
        state = decideTier(state, slow, enough, 5000); // tier 1, ban until 25000
        let now = 6000;
        while (now < 24000) { state = decideTier(state, good, enough, now); now += 1000; }
        expect(state.tier).toBe(1);
        while (now < 40000) { state = decideTier(state, good, enough, now); now += 1000; }
        expect(state.tier).toBe(0);
    });

    it('a middling frame time neither raises nor lowers and resets the good streak', () => {
        let state = createGovernorState(1, 0);
        state = decideTier(state, good, enough, 1000);
        expect(state.goodSince).toBe(1000);
        state = decideTier(state, (GOVERNOR.goodMs + GOVERNOR.slowMs) / 2, enough, 2000);
        expect(state.goodSince).toBeNull();
        expect(state.tier).toBe(1);
    });

    it('doubles the up-ban when an up-step is undone quickly (no flapping)', () => {
        let state = { ...createGovernorState(1, 0), upBlockedUntil: 0 };
        state = decideTier(state, good, enough, 1000);
        state = decideTier(state, good, enough, 1000 + GOVERNOR.upAfterGoodMs);
        expect(state.tier).toBe(0);
        const upAt = state.changedAt;
        const before = state.upBlockMs;
        state = decideTier(state, slow, enough, upAt + GOVERNOR.downCooldownMs);
        expect(state.tier).toBe(1);
        expect(state.upBlockMs).toBe(before * 2);
    });

    it('tiers get cheaper and lodFlags follows them', () => {
        for (let i = 1; i < QUALITY_TIERS.length; i++) {
            expect(QUALITY_TIERS[i].pixelRatioCap).toBeLessThanOrEqual(QUALITY_TIERS[i - 1].pixelRatioCap);
            expect(QUALITY_TIERS[i].hideDistance).toBeLessThanOrEqual(QUALITY_TIERS[i - 1].hideDistance);
            expect(QUALITY_TIERS[i].treeDensity).toBeLessThanOrEqual(QUALITY_TIERS[i - 1].treeDensity);
            expect(QUALITY_TIERS[i].proxyDistance).toBeLessThan(QUALITY_TIERS[i - 1].proxyDistance);
        }
        expect(lodFlags(QUALITY_TIERS[0], 500, 5)).toEqual({ hidden: false, shadow: true, detail: false, far: true });
        expect(lodFlags(QUALITY_TIERS[3], 250, 5).hidden).toBe(true);
        expect(lodFlags(QUALITY_TIERS[3], 250, 200).hidden).toBe(false); // overview camera keeps the whole map
        expect(lodFlags(QUALITY_TIERS[3], 100, 5).hidden).toBe(false);
    });

    it('swaps a building for its box far away, with a margin that stops flicker, and later for big buildings', () => {
        const tier = QUALITY_TIERS[0];
        const edge = tier.proxyDistance;
        expect(lodFlags(tier, edge - 1, 5).far).toBe(false);
        expect(lodFlags(tier, edge + 1, 5).far).toBe(true);
        // Already a box: it stays one until clearly closer (inside PROXY_HYSTERESIS of the distance).
        expect(lodFlags(tier, edge * 0.95, 5, true).far).toBe(true);
        expect(lodFlags(tier, edge * 0.85, 5, true).far).toBe(false);
        // A prop that is not yet a box does not turn into one on the hysteresis margin.
        expect(lodFlags(tier, edge * 0.95, 5, false).far).toBe(false);
        // A big building keeps its detail from farther away.
        expect(lodFlags(tier, edge * 1.5, 5, false, 2).far).toBe(false);
        expect(lodFlags(tier, edge * 2.5, 5, false, 2).far).toBe(true);
    });
});
