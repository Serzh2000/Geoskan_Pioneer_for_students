import { currentDroneId, drones, saveGamepadSettings, simSettings } from '../../core/state.js';
import { DEFAULT_PWM_MAX, DEFAULT_PWM_MIN, RC_CHANNEL_COUNT } from './constants.js';
import { getCalibration } from './runtime-profile.js';
import type { DeviceProfile, DeviceSummary } from './types.js';

export function syncLegacyState(profile: DeviceProfile, device: DeviceSummary | null, channelValues: number[]): void {
    simSettings.gamepadConnected = Boolean(device?.connected);
    simSettings.gamepadStickMode = profile.stickMode;

    const mappingByRole = new Map(profile.channelMappings.map((mapping) => [mapping.role, mapping]));
    const assignLegacy = (key: keyof typeof simSettings.gamepadMapping, role: 'roll' | 'pitch' | 'throttle' | 'yaw' | 'flightMode' | 'arm' | 'magnet') => {
        const sourceId = mappingByRole.get(role === 'flightMode' ? 'flightMode' : role)?.sourceId;
        if (sourceId && /^[ab]\d+$/.test(sourceId)) {
            (simSettings.gamepadMapping[key] as string) = sourceId;
        }
    };

    assignLegacy('roll', 'roll');
    assignLegacy('pitch', 'pitch');
    assignLegacy('throttle', 'throttle');
    assignLegacy('yaw', 'yaw');
    assignLegacy('modeSwitch', 'flightMode');
    assignLegacy('armSwitch', 'arm');
    assignLegacy('magnetBtn', 'magnet');

    for (const [index, mapping] of profile.channelMappings.slice(0, 8).entries()) {
        simSettings.gamepadInversion[index] = Boolean(mapping.invert);
    }

    for (const source of profile.inputSources) {
        const match = source.id.match(/^a(\d+)$/);
        if (!match) continue;
        const axisIndex = Number(match[1]);
        const calibration = getCalibration(profile, source.id);
        simSettings.gamepadCalibration.min[axisIndex] = calibration.min;
        simSettings.gamepadCalibration.max[axisIndex] = calibration.max;
        simSettings.gamepadCalibration.center[axisIndex] = calibration.center;
    }
    simSettings.gamepadCalibration.isCalibrated = profile.channelMappings.slice(0, 4).every((mapping) => Boolean(mapping.sourceId));

    const modeChannel = channelValues[4] ?? DEFAULT_PWM_MIN;
    simSettings.gamepadModeRanges.loiter = { min: DEFAULT_PWM_MIN, max: 1250, center: 1000 };
    simSettings.gamepadModeRanges.althold = { min: 1251, max: 1750, center: 1500 };
    simSettings.gamepadModeRanges.stabilize = { min: 1751, max: DEFAULT_PWM_MAX, center: 2000 };
    simSettings.gamepadAuxRanges.arm = {
        min: 1750,
        max: DEFAULT_PWM_MAX,
        center: channelValues[5] ?? DEFAULT_PWM_MAX
    };
    simSettings.gamepadAuxRanges.magnet = {
        min: 1500,
        max: DEFAULT_PWM_MAX,
        center: channelValues[6] ?? modeChannel
    };

    const drone = drones[currentDroneId];
    if (drone) {
        drone.rcChannels = channelValues.slice(0, RC_CHANNEL_COUNT);
    }

    saveGamepadSettings();
}
