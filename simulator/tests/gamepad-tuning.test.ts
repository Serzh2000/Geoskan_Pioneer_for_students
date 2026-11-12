import {
    applyCenteredTuning,
    applyRates,
    applyThrottleTuning,
    clampTuning,
    isDefaultTuning
} from '../public/modules/ui/settings/input/tuning.js';
import { defaultGamepadTuning } from '../public/modules/core/state.js';

const flat = { trim: 0, deadzone: 0, expo: 0, rate: 1 };

describe('gamepad fine tuning', () => {
    test('defaults leave a centred stick as it was: only the old dead zone cuts the middle', () => {
        const tuning = defaultGamepadTuning().roll;
        expect(applyCenteredTuning(0.02, tuning)).toBe(0);
        expect(applyCenteredTuning(0.5, tuning)).toBeCloseTo(0.5);
        expect(applyCenteredTuning(-1, tuning)).toBe(-1);
        expect(isDefaultTuning('roll', tuning)).toBe(true);
    });

    test('the zero point makes a stick that rests off centre read zero and keeps both ends', () => {
        const tuning = { ...flat, trim: 0.1 };
        expect(applyCenteredTuning(0.1, tuning)).toBeCloseTo(0);
        expect(applyCenteredTuning(1, tuning)).toBeCloseTo(1);
        expect(applyCenteredTuning(-1, tuning)).toBeCloseTo(-1);
        expect(applyCenteredTuning(0.55, tuning)).toBeCloseTo(0.5);
    });

    test('the dead zone swallows small movements around zero', () => {
        const tuning = { ...flat, deadzone: 0.1 };
        expect(applyCenteredTuning(0.09, tuning)).toBe(0);
        expect(applyCenteredTuning(-0.09, tuning)).toBe(0);
        expect(applyCenteredTuning(0.2, tuning)).toBeCloseTo(0.2);
    });

    test('rates: expo softens the middle and keeps the ends, rate scales the whole travel', () => {
        expect(applyRates(0.5, 0, 1)).toBeCloseTo(0.5);
        expect(applyRates(0.5, 1, 1)).toBeCloseTo(0.125);
        expect(applyRates(1, 0.7, 1)).toBeCloseTo(1);
        expect(applyRates(-1, 0.7, 0.6)).toBeCloseTo(-0.6);
        expect(applyCenteredTuning(1, { ...flat, rate: 0.5 })).toBeCloseTo(0.5);
    });

    test('the throttle zero is its bottom: the point can only rise, full throttle stays reachable', () => {
        const tuning = { ...flat, trim: 0.1, deadzone: 0.02 };
        expect(applyThrottleTuning(0.1, tuning)).toBe(0);
        expect(applyThrottleTuning(1, tuning)).toBe(1);
        expect(applyThrottleTuning(0.55, tuning)).toBeCloseTo(0.5);
    });

    test('settings are kept inside their limits, and the throttle gets no rates', () => {
        const wild = clampTuning('roll', { trim: 3, deadzone: -1, expo: 5, rate: 0 });
        expect(wild.trim).toBeLessThanOrEqual(0.25);
        expect(wild.deadzone).toBe(0);
        expect(wild.expo).toBe(1);
        expect(wild.rate).toBeGreaterThanOrEqual(0.3);
        const throttle = clampTuning('throttle', { trim: -1, deadzone: 0.02, expo: 0.9, rate: 0.5 });
        expect(throttle.trim).toBe(0);
        expect(throttle.expo).toBe(0);
        expect(throttle.rate).toBe(1);
    });
});
