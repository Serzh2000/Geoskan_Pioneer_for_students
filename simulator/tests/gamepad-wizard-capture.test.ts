import {
    axisScore,
    calibrationFromDraft,
    findDisplacedAxes,
    firstChannelWithoutInput,
    pickAxisTakeover,
    pickOccupiedTouch,
    resetChannelResult,
    settleReturningAxes,
    type AxisSpan
} from '../public/modules/ui/settings/wizard/capture.js';
import type { AxisMotionStats } from '../public/modules/ui/settings/wizard/types.js';
import { restoreSettingsSnapshot, takeSettingsSnapshot } from '../public/modules/ui/settings/wizard/snapshot.js';
import { defaultGamepadTuning, loadGamepadSettings, saveGamepadSettings, simSettings } from '../public/modules/core/state.js';

const stat = (maxDelta: number, extra: Partial<AxisMotionStats> = {}): AxisMotionStats => ({ maxDelta, travel: maxDelta, activitySamples: Math.round(maxDelta * 10), firstDirection: 1, ...extra });
const quiet = (): AxisMotionStats => ({ maxDelta: 0, travel: 0, activitySamples: 0, firstDirection: 0 });

describe('who gets an axis the student pushes', () => {
    const mapping = { throttle: 'a2', yaw: 'a3' } as const;

    test('a clear push on an axis that another channel has takes it over', () => {
        const stats = [quiet(), quiet(), stat(1), quiet()];
        const pick = pickAxisTakeover({ channel: 'pitch', mapping: { ...mapping }, stats, freeBest: null });
        expect(pick?.ref).toBe('a2');
        expect(pick?.owner).toBe('throttle');
    });

    test('a push that a free axis beats is not a takeover', () => {
        const stats = [stat(1.8), quiet(), stat(0.7), quiet()];
        expect(pickAxisTakeover({ channel: 'pitch', mapping: { ...mapping }, stats, freeBest: 'a0' })).toBeNull();
    });

    test('a light touch is only a hint, not a takeover', () => {
        const stats = [quiet(), quiet(), stat(0.4), quiet()];
        expect(pickAxisTakeover({ channel: 'pitch', mapping: { ...mapping }, stats, freeBest: null })).toBeNull();
        expect(pickOccupiedTouch({ channel: 'pitch', mapping: { ...mapping }, stats })).toEqual({ ref: 'a2', owner: 'throttle' });
    });

    test('an axis nobody owns, and the current channel\'s own axis, are never taken or reported', () => {
        const stats = [stat(1), quiet(), quiet(), quiet()];
        expect(pickAxisTakeover({ channel: 'pitch', mapping: { ...mapping }, stats, freeBest: null })).toBeNull();
        expect(pickOccupiedTouch({ channel: 'pitch', mapping: { ...mapping }, stats })).toBeNull();
        const own = [quiet(), quiet(), stat(1), quiet()];
        expect(pickAxisTakeover({ channel: 'throttle', mapping: { ...mapping }, stats: own, freeBest: null })).toBeNull();
    });

    test('the strongest of several occupied axes wins', () => {
        const stats = [quiet(), quiet(), stat(0.8), stat(1.4)];
        expect(pickAxisTakeover({ channel: 'roll', mapping: { ...mapping }, stats, freeBest: null })?.ref).toBe('a3');
    });

    test('score grows with distance, travel and activity', () => {
        expect(axisScore(undefined)).toBe(0);
        expect(axisScore(stat(1))).toBeGreaterThan(axisScore(stat(0.5)));
    });
});

describe('a stick coming back to rest', () => {
    const draft = new Map<number, AxisSpan>([[2, { min: -1, max: 1, center: -1 }], [3, { min: -1, max: 1, center: 0 }]]);

    test('an axis that began the step away from rest is marked as returning', () => {
        expect(findDisplacedAxes([0, 0, 1, 0], draft)).toEqual(new Set([2]));
        expect(findDisplacedAxes([0, 0, -1, 0.1], draft)).toEqual(new Set());
    });

    test('its movement does not count until it is at rest, then it starts fresh', () => {
        const baseline = [0, 0, 1, 0];
        const last = [0, 0, 1, 0];
        const stats = [quiet(), quiet(), stat(0.5), quiet()];
        const returning = new Set([2]);
        settleReturningAxes({ axes: [0, 0, 0, 0], baseline, last, stats, returning, draft });
        expect(returning.has(2)).toBe(true);
        expect(stats[2].maxDelta).toBe(0);
        expect(baseline[2]).toBe(0);
        settleReturningAxes({ axes: [0, 0, -0.95, 0], baseline, last, stats, returning, draft });
        expect(returning.has(2)).toBe(false);
        expect(baseline[2]).toBe(-0.95);
    });
});

describe('forgetting what a channel found', () => {
    test('input, aux result, skip and the axis calibration are dropped and the direction goes back to the saved one', () => {
        const mapping: Partial<Record<'throttle' | 'yaw', string>> = { throttle: 'a2', yaw: 'a3' };
        const draft = new Map<number, AxisSpan>([[2, { min: -1, max: 1, center: -1 }], [3, { min: -1, max: 1, center: 0 }]]);
        const inversion = [false, false, true, true, false, false, false, false];
        const saved = [false, false, false, true, false, false, false, false];
        resetChannelResult({ channel: 'throttle', mapping: mapping as never, auxResults: {}, skipped: new Set(['throttle']), draft, inversion, savedInversion: saved });
        expect(mapping.throttle).toBeUndefined();
        expect(mapping.yaw).toBe('a3');
        expect(draft.has(2)).toBe(false);
        expect(draft.has(3)).toBe(true);
        expect(inversion[2]).toBe(false);
        expect(inversion[3]).toBe(true);
    });

    test('the wizard goes back for the first channel left without an input, skipped ones excepted', () => {
        const order = ['throttle', 'yaw', 'pitch', 'mode'] as const;
        expect(firstChannelWithoutInput(order, { throttle: 'a0', pitch: 'a1' }, new Set())).toBe(1);
        expect(firstChannelWithoutInput(order, { throttle: 'a0', yaw: 'a2', pitch: 'a1' }, new Set(['mode']))).toBe(-1);
    });
});

describe('what an axis showed becomes its calibration', () => {
    test('a stick pushed both ways keeps what it showed', () => {
        expect(calibrationFromDraft({ min: -0.9, max: 0.95, center: 0.02 }, false)).toEqual({ min: -0.9, max: 0.95, center: 0.02 });
    });

    test('a stick pushed one way only gets the full travel on the other side, so rest still reads zero', () => {
        const result = calibrationFromDraft({ min: 0, max: 1, center: 0 }, false);
        expect(result).toEqual({ min: -1, max: 1, center: 0 });
    });

    test('a throttle keeps its own range and a motionless axis gives nothing', () => {
        expect(calibrationFromDraft({ min: -1, max: 0.8, center: -1 }, true)).toEqual({ min: -1, max: 0.8, center: -1 });
        expect(calibrationFromDraft({ min: 0, max: 0.1, center: 0 }, false)).toBeNull();
    });
});

describe('settings snapshot and storage', () => {
    const store = new Map<string, string>();
    beforeAll(() => {
        (globalThis as unknown as { localStorage: Storage }).localStorage = {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => { store.set(key, value); },
            removeItem: (key: string) => { store.delete(key); },
            clear: () => store.clear(),
            key: () => null,
            length: 0
        } as Storage;
    });

    test('Cancel puts back the mapping, ranges, tuning and calibration, and what was saved in between', () => {
        simSettings.gamepadMapping.roll = 'a0';
        simSettings.gamepadMappingConfirmed = true;
        saveGamepadSettings();
        const before = takeSettingsSnapshot();

        simSettings.gamepadMapping.roll = 'a5';
        simSettings.gamepadInversion[1] = !simSettings.gamepadInversion[1];
        simSettings.gamepadAuxRanges.arm = { min: 1, max: 2, center: 1 };
        simSettings.gamepadModeRanges.loiter = { min: 1, max: 2, center: 1 };
        simSettings.gamepadTuning.pitch = { trim: 0.1, deadzone: 0.1, expo: 0.5, rate: 0.5 };
        simSettings.gamepadCalibration.min[0] = -0.5;
        simSettings.gamepadCalibration.isCalibrated = true;
        simSettings.gamepadMappingConfirmed = false;
        saveGamepadSettings();

        restoreSettingsSnapshot(before);
        expect(simSettings.gamepadMapping.roll).toBe('a0');
        expect(simSettings.gamepadMappingConfirmed).toBe(true);
        expect(simSettings.gamepadTuning.pitch).toEqual(defaultGamepadTuning().pitch);
        expect(simSettings.gamepadCalibration.min[0]).toBe(-1);
        expect(simSettings.gamepadCalibration.isCalibrated).toBe(false);
        expect(JSON.parse(store.get('geoskan_sim_gamepad_settings') ?? '{}').mapping.roll).toBe('a0');
    });

    test('mapping, inversion, tuning, ranges and calibration survive a reload', () => {
        simSettings.gamepadMapping.pitch = 'a1';
        simSettings.gamepadInversion[1] = true;
        simSettings.gamepadTuning.yaw = { trim: 0.05, deadzone: 0.07, expo: 0.4, rate: 0.8 };
        simSettings.gamepadAuxRanges.magnet = { min: 1400, max: 1600, center: 1500 };
        simSettings.gamepadModeRanges.althold = { min: 1300, max: 1700, center: 1500 };
        simSettings.gamepadCalibration.min[3] = -0.8;
        simSettings.gamepadCalibration.max[3] = 0.9;
        simSettings.gamepadCalibration.center[3] = 0.05;
        simSettings.gamepadCalibration.isCalibrated = true;
        simSettings.gamepadMappingConfirmed = true;
        saveGamepadSettings();

        // A reload: everything in memory is lost, then read back from the storage.
        simSettings.gamepadMapping.pitch = 'a9';
        simSettings.gamepadInversion[1] = false;
        simSettings.gamepadTuning.yaw = defaultGamepadTuning().yaw;
        simSettings.gamepadAuxRanges.magnet = { min: 0, max: 0, center: 0 };
        simSettings.gamepadModeRanges.althold = { min: 0, max: 0, center: 0 };
        simSettings.gamepadCalibration.min[3] = -1;
        simSettings.gamepadCalibration.max[3] = 1;
        simSettings.gamepadCalibration.center[3] = 0;
        simSettings.gamepadCalibration.isCalibrated = false;
        simSettings.gamepadMappingConfirmed = false;
        loadGamepadSettings();

        expect(simSettings.gamepadMapping.pitch).toBe('a1');
        expect(simSettings.gamepadInversion[1]).toBe(true);
        expect(simSettings.gamepadTuning.yaw).toEqual({ trim: 0.05, deadzone: 0.07, expo: 0.4, rate: 0.8 });
        expect(simSettings.gamepadAuxRanges.magnet).toEqual({ min: 1400, max: 1600, center: 1500 });
        expect(simSettings.gamepadModeRanges.althold).toEqual({ min: 1300, max: 1700, center: 1500 });
        expect(simSettings.gamepadCalibration.min[3]).toBe(-0.8);
        expect(simSettings.gamepadCalibration.max[3]).toBe(0.9);
        expect(simSettings.gamepadCalibration.center[3]).toBe(0.05);
        expect(simSettings.gamepadCalibration.isCalibrated).toBe(true);
        expect(simSettings.gamepadMappingConfirmed).toBe(true);
    });
});
