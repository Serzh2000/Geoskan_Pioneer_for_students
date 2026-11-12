import { simSettings, defaultGamepadTuning } from '../public/modules/core/state.js';
import { readRefRcValue } from '../public/modules/ui/settings/input/values.js';

/** A pad with the axes the user's BETAFPV reports: a0 roll, a1 pitch, a2 throttle, a3 yaw. */
const pad = (axes: number[]): Gamepad => ({ axes, buttons: [] } as unknown as Gamepad);

describe('the tuning reaches the flight', () => {
    beforeEach(() => {
        simSettings.gamepadTuning = defaultGamepadTuning();
        simSettings.gamepadInversion = simSettings.gamepadInversion.map(() => false);
    });

    test('a stick at rest is 1500 and the ends are 1000 / 2000', () => {
        expect(readRefRcValue(pad([0, 0, 0, 0]), 'a0', 'roll')).toBe(1500);
        expect(readRefRcValue(pad([1]), 'a0', 'roll')).toBe(2000);
        expect(readRefRcValue(pad([-1]), 'a0', 'roll')).toBe(1000);
    });

    test('the zero point shifts the rest position and keeps the ends', () => {
        simSettings.gamepadTuning.roll = { ...simSettings.gamepadTuning.roll, trim: 0.1 };
        expect(readRefRcValue(pad([0.1]), 'a0', 'roll')).toBe(1500);
        expect(readRefRcValue(pad([1]), 'a0', 'roll')).toBe(2000);
    });

    test('the dead zone holds 1500 for small movements', () => {
        simSettings.gamepadTuning.yaw = { ...simSettings.gamepadTuning.yaw, deadzone: 0.1 };
        expect(readRefRcValue(pad([0.08]), 'a0', 'yaw')).toBe(1500);
        expect(readRefRcValue(pad([0.5]), 'a0', 'yaw')).toBeGreaterThan(1500);
    });

    test('rate and expo shape what the drone is sent', () => {
        simSettings.gamepadTuning.roll = { ...simSettings.gamepadTuning.roll, rate: 0.5 };
        expect(readRefRcValue(pad([1]), 'a0', 'roll')).toBe(1750);
        simSettings.gamepadTuning.roll = { ...simSettings.gamepadTuning.roll, rate: 1, expo: 1 };
        expect(readRefRcValue(pad([0.5]), 'a0', 'roll')).toBe(1563);
        expect(readRefRcValue(pad([1]), 'a0', 'roll')).toBe(2000);
    });

    test('the direction switch flips the channel, and the tuning still applies after it', () => {
        simSettings.gamepadInversion[simSettings.gamepadInversion.length > 1 ? 1 : 0] = true;
        const forward = readRefRcValue(pad([0, 1]), 'a1', 'pitch', true);
        expect(forward).toBe(1000);
        simSettings.gamepadTuning.pitch = { ...simSettings.gamepadTuning.pitch, rate: 0.5 };
        expect(readRefRcValue(pad([0, 1]), 'a1', 'pitch', true)).toBe(1250);
    });

    test('pitch is like the other channels: the simulator flies forward when the channel is high', () => {
        // Checked against the flight physics: RC pitch 1800 flies forward (+Y, nose down), 1200 flies backward.
        // A pad whose stick reads +1 when pushed forward therefore needs no reversing.
        expect(readRefRcValue(pad([0, 1]), 'a1', 'pitch', false)).toBe(2000);
        expect(readRefRcValue(pad([0, -1]), 'a1', 'pitch', false)).toBe(1000);
        // A pad that reads -1 forward (the usual for a gamepad's up) needs the reverse.
        expect(readRefRcValue(pad([0, -1]), 'a1', 'pitch', true)).toBe(2000);
    });

    test('the throttle: its bottom is 1000 and its top 2000, with the zero point only raising the bottom', () => {
        expect(readRefRcValue(pad([0, 0, -1]), 'a2', 'throttle')).toBe(1000);
        expect(readRefRcValue(pad([0, 0, 1]), 'a2', 'throttle')).toBe(2000);
        simSettings.gamepadTuning.throttle = { ...simSettings.gamepadTuning.throttle, trim: 0.1 };
        expect(readRefRcValue(pad([0, 0, -0.8]), 'a2', 'throttle')).toBe(1000);
        expect(readRefRcValue(pad([0, 0, 1]), 'a2', 'throttle')).toBe(2000);
    });
});
