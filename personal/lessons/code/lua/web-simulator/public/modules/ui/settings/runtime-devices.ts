import { VIRTUAL_DEVICE_ID } from './constants.js';
import { inferDeviceKind, isLikelyRadioSummary } from './mapping.js';
import { rawCache, virtualAxes, virtualButtons } from './runtime-store.js';
import type { DeviceSummary } from './types.js';

function getGamepads(): Gamepad[] {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return [];
    return Array.from(navigator.getGamepads()).filter((item): item is Gamepad => Boolean(item));
}

export function buildDeviceId(gamepad: Gamepad): string {
    return `gamepad-${gamepad.index}-${gamepad.id}`;
}

export function buildDeviceSummaries(): DeviceSummary[] {
    const summaries: DeviceSummary[] = getGamepads().map((gamepad) => {
        const id = buildDeviceId(gamepad);
        const kind = inferDeviceKind(gamepad.id);
        const warnings: string[] = [];
        if (gamepad.timestamp === 0) {
            warnings.push('Устройство подключено, но еще не передает данные.');
        }
        return {
            id,
            name: gamepad.id || `Gamepad ${gamepad.index + 1}`,
            kind,
            transport: 'gamepad-api',
            connected: gamepad.connected,
            axes: gamepad.axes.length,
            buttons: gamepad.buttons.length,
            likelyRadio: kind === 'rc-transmitter',
            warnings
        };
    });
    summaries.sort((left, right) => Number(isLikelyRadioSummary(right)) - Number(isLikelyRadioSummary(left)));
    return summaries;
}

export function getRawInputMap(deviceId: string | null): Record<string, number> {
    if (!deviceId) return {};
    if (deviceId === VIRTUAL_DEVICE_ID) {
        const raw: Record<string, number> = {};
        virtualAxes.forEach((value, index) => {
            raw[`va${index}`] = value;
        });
        virtualButtons.forEach((value, index) => {
            raw[`vb${index}`] = value;
        });
        return raw;
    }

    const gamepad = getGamepads().find((item) => buildDeviceId(item) === deviceId);
    if (!gamepad) return {};

    const raw: Record<string, number> = {};
    gamepad.axes.forEach((value, index) => {
        raw[`a${index}`] = value;
    });
    gamepad.buttons.forEach((button, index) => {
        raw[`b${index}`] = button.value;
    });
    return raw;
}

export function computeActivity(rawInputs: Record<string, number>): Record<string, number> {
    const activity: Record<string, number> = {};
    for (const [sourceId, rawValue] of Object.entries(rawInputs)) {
        const previous = rawCache.get(sourceId) ?? rawValue;
        const delta = Math.abs(rawValue - previous);
        activity[sourceId] = Math.max(delta, Math.abs(rawValue) > 0.55 ? Math.abs(rawValue) * 0.35 : 0);
        rawCache.set(sourceId, rawValue);
    }
    return activity;
}
