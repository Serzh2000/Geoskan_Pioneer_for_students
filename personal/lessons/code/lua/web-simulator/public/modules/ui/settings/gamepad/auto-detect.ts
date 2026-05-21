import { AUTO_DETECT_AUX_AXIS_THRESHOLD, AUTO_DETECT_AXIS_THRESHOLD, AUTO_DETECT_BUTTON_THRESHOLD, AUTO_DETECT_CONFIRM_MS, AUTO_DETECT_INPUT_SETTLE_MS, AUTO_DETECT_TIMEOUT_MS, PRIMARY_CHANNELS, axisRef, buttonRef } from '../constants.js';
import type { SettingsRuntimeState } from '../runtime-state.js';
import type { ChannelKey, PrimaryChannelKey } from '../types.js';
import type { GamepadInputRef } from '../../../core/state.js';

export function stopAutoDetection(
    state: SettingsRuntimeState,
    setAutoStatus: (mode: 'idle' | 'success', text: string) => void,
    mode: 'idle' | 'success',
    text = 'Нажмите AUTO и подвигайте нужный стик или тумблер.'
): void {
    state.autoDetectState = null;
    setAutoStatus(mode, text);
}

export function startAutoDetection(params: {
    state: SettingsRuntimeState;
    channel: ChannelKey;
    findActiveGamepad: () => Gamepad | null;
    hasChannelData: () => boolean;
    setAutoStatus: (mode: 'idle' | 'listening' | 'success', text: string) => void;
}): void {
    const { state, channel, findActiveGamepad, hasChannelData, setAutoStatus } = params;
    const gp = findActiveGamepad();
    if (!gp) {
        stopAutoDetection(state, setAutoStatus, 'idle', 'Подключите пульт, чтобы использовать AUTO-привязку.');
        return;
    }
    if (!hasChannelData()) {
        stopAutoDetection(state, setAutoStatus, 'idle', 'Сначала дождитесь получения значений каналов от текущего пульта.');
        return;
    }
    if (state.autoDetectState?.channel === channel) {
        stopAutoDetection(state, setAutoStatus, 'idle');
        return;
    }

    state.autoDetectState = {
        channel,
        startedAt: Date.now(),
        ignoreUntil: Date.now() + AUTO_DETECT_INPUT_SETTLE_MS,
        baselineAxes: [...gp.axes],
        baselineButtons: gp.buttons.map((button) => button.value),
        candidateRef: null,
        candidateSince: 0
    };
    setAutoStatus('listening', `AUTO для ${getChannelLabel(channel)}: подвигайте нужный стик или переключите тумблер.`);
}

export function detectAutoInput(params: {
    state: SettingsRuntimeState;
    gp: Gamepad;
    setMappingRef: (channel: ChannelKey, ref: GamepadInputRef) => void;
    syncSelectWithMapping: (channel: ChannelKey) => void;
    setAutoStatus: (mode: 'idle' | 'listening' | 'success', text: string) => void;
}): void {
    const { state, gp, setMappingRef, syncSelectWithMapping, setAutoStatus } = params;
    const detectionState = state.autoDetectState;
    if (!detectionState) return;

    const now = Date.now();
    if (now - detectionState.startedAt > AUTO_DETECT_TIMEOUT_MS) {
        stopAutoDetection(state, setAutoStatus, 'idle', 'AUTO не нашёл активность. Нажмите кнопку ещё раз и двигайте только нужный канал.');
        return;
    }
    if (now < detectionState.ignoreUntil) return;

    const { channel, baselineAxes, baselineButtons } = detectionState;
    let detectedRef: GamepadInputRef | null = null;
    let detectedStrength = 0;

    if (PRIMARY_CHANNELS.includes(channel as PrimaryChannelKey)) {
        for (let index = 0; index < gp.axes.length; index += 1) {
            const baseline = baselineAxes[index] ?? 0;
            const axisValue = gp.axes[index] ?? 0;
            const delta = Math.abs(axisValue - baseline);
            if (delta >= AUTO_DETECT_AXIS_THRESHOLD && delta > detectedStrength) {
                detectedStrength = delta;
                detectedRef = axisRef(index);
            }
        }
    } else {
        for (let index = 0; index < gp.buttons.length; index += 1) {
            const baseline = baselineButtons[index] ?? 0;
            const buttonValue = gp.buttons[index]?.value ?? 0;
            const delta = Math.abs(buttonValue - baseline);
            if (delta >= AUTO_DETECT_BUTTON_THRESHOLD) {
                const strength = delta + Math.max(buttonValue, baseline);
                if (strength > detectedStrength) {
                    detectedStrength = strength;
                    detectedRef = buttonRef(index);
                }
            }
        }
        for (let index = 0; index < gp.axes.length; index += 1) {
            const baseline = baselineAxes[index] ?? 0;
            const axisValue = gp.axes[index] ?? 0;
            const delta = Math.abs(axisValue - baseline);
            if (delta >= AUTO_DETECT_AUX_AXIS_THRESHOLD && delta > detectedStrength) {
                detectedStrength = delta;
                detectedRef = axisRef(index);
            }
        }
    }

    if (!detectedRef) {
        detectionState.candidateRef = null;
        detectionState.candidateSince = 0;
        return;
    }

    if (detectionState.candidateRef !== detectedRef) {
        detectionState.candidateRef = detectedRef;
        detectionState.candidateSince = now;
        return;
    }

    if (now - detectionState.candidateSince < AUTO_DETECT_CONFIRM_MS) return;

    setMappingRef(channel, detectedRef);
    syncSelectWithMapping(channel);
    stopAutoDetection(state, setAutoStatus, 'success', `${getChannelLabel(channel)} автоматически назначен на ${detectedRef.toUpperCase()}.`);
}

function getChannelLabel(key: ChannelKey): string {
    switch (key) {
        case 'roll':
            return 'Roll';
        case 'pitch':
            return 'Pitch';
        case 'throttle':
            return 'Throttle';
        case 'yaw':
            return 'Yaw';
        case 'mode':
            return 'Mode';
        case 'arm':
            return 'Arm';
        case 'magnet':
            return 'Magnet';
    }
}
