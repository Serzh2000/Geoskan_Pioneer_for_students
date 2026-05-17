import { normalizeCenteredInput, normalizeInputValue, quantizeDiscreteLevel } from '../public/modules/ui/settings/calibration.js';
import { createDefaultCalibration, createDefaultProfile } from '../public/modules/ui/settings/constants.js';
import { createInputSourcesFromGamepad, createProfileForDevice, detectMappingConflicts, detectStickMode } from '../public/modules/ui/settings/mapping.js';

describe('RC settings core logic', () => {
    test('normalizes centered axis with deadzone and trim', () => {
        const calibration = {
            ...createDefaultCalibration(),
            min: -1,
            center: 0,
            max: 1,
            deadzone: 0.1,
            trim: 0.05
        };

        expect(normalizeCenteredInput(0.02, calibration)).toBe(0);
        expect(normalizeCenteredInput(0.5, calibration)).toBeCloseTo(0.55, 2);
        expect(normalizeCenteredInput(-0.5, calibration)).toBeCloseTo(-0.45, 2);
    });

    test('maps throttle and selector inputs to expected PWM ranges', () => {
        const calibration = {
            ...createDefaultCalibration(),
            min: -1,
            center: 0,
            max: 1
        };

        const throttleLow = normalizeInputValue(-1, calibration, 'throttle', 'axis');
        const throttleHigh = normalizeInputValue(1, calibration, 'throttle', 'axis');
        const selectorMid = normalizeInputValue(0, calibration, 'selector-6pos', 'axis');

        expect(throttleLow.pwmValue).toBe(1000);
        expect(throttleHigh.pwmValue).toBe(2000);
        expect(selectorMid.discreteLevel).toBe(3);
        expect(selectorMid.pwmValue).toBeGreaterThanOrEqual(1500);
    });

    test('quantizes discrete levels consistently', () => {
        expect(quantizeDiscreteLevel(0, 3)).toBe(0);
        expect(quantizeDiscreteLevel(0.5, 3)).toBe(1);
        expect(quantizeDiscreteLevel(1, 3)).toBe(2);
        expect(quantizeDiscreteLevel(0.81, 6)).toBe(4);
    });

    test('detects stick mode for common mode 2 layout', () => {
        const profile = createDefaultProfile();
        profile.channelMappings[0].sourceId = 'a2';
        profile.channelMappings[1].sourceId = 'a3';
        profile.channelMappings[2].sourceId = 'a1';
        profile.channelMappings[3].sourceId = 'a0';

        expect(detectStickMode(profile)).toBe(2);
    });

    test('reports duplicated source conflicts across channels', () => {
        const profile = createDefaultProfile();
        profile.channelMappings[0].sourceId = 'a0';
        profile.channelMappings[1].sourceId = 'a0';
        profile.controlBindings[0].channel = 7;

        const conflicts = detectMappingConflicts(profile);

        expect(conflicts.some((message) => message.includes('a0'))).toBe(true);
        expect(conflicts.some((message) => message.includes('Arm'))).toBe(true);
    });

    test('keeps hardware axis sources neutral for Radiomaster autodetect flow', () => {
        const sources = createInputSourcesFromGamepad('radio-1', 'Radiomaster Boxer', 8, 4);

        expect(sources[0]).toMatchObject({ id: 'a0', label: 'Axis 0', group: 'Axes' });
        expect(sources[3]).toMatchObject({ id: 'a3', label: 'Axis 3', group: 'Axes' });
    });

    test('creates hardware profile without prebinding primary stick axes', () => {
        const profile = createProfileForDevice({
            id: 'radio-1',
            name: 'Radiomaster Boxer',
            kind: 'rc-transmitter',
            transport: 'gamepad-api',
            connected: true,
            axes: 8,
            buttons: 4,
            likelyRadio: true,
            warnings: []
        });

        expect(profile.deviceKind).toBe('rc-transmitter');
        expect(profile.channelMappings.slice(0, 4).every((mapping) => mapping.sourceId === null)).toBe(true);
    });
});
