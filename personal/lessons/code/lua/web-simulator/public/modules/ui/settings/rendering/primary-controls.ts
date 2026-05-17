import { simSettings, type GamepadInputRef, type AuxChannelRange } from '../../../core/state.js';
import { ALL_CHANNELS, PRIMARY_CHANNELS, clamp } from '../constants.js';
import type { SettingsDomRefs } from '../dom.js';
import type { SettingsRuntimeState } from '../runtime-state.js';
import type {
    ActionAuxChannelKey,
    AuxiliaryChannelKey,
    ChannelKey,
    ObservedInputPosition,
    ObservedInputStats,
    PrimaryChannelKey
} from '../types.js';
import { getPrimaryChannelStickSlot, rcToCenteredNormalized, rcToThrottleNormalized } from '../channel-values.js';
import { pickRepresentativePositions } from '../observed-inputs.js';
import { renderAuxRangeEditors } from './aux-ranges.js';
import { renderChannelValue, renderModeMeta } from './status.js';

const PRIMARY_CHANNEL_TITLES: Record<PrimaryChannelKey, string> = {
    roll: 'Крен',
    pitch: 'Тангаж',
    throttle: 'Газ',
    yaw: 'Рыскание'
};

const DEFAULT_MODE_CENTERS = [1167, 1500, 1833];

function updateSignalBar(dom: SettingsDomRefs, key: PrimaryChannelKey, value: number): void {
    const bar = dom.signalBars[key];
    if (!bar) return;

    if (key === 'throttle') {
        const percent = clamp((value - 1000) / 10, 0, 100);
        bar.style.marginLeft = '0%';
        bar.style.width = `${percent}%`;
        return;
    }

    const offsetPercent = clamp(Math.abs(value - 1500) / 10, 0, 50);
    bar.style.marginLeft = value >= 1500
        ? '50%'
        : `${50 - offsetPercent}%`;
    bar.style.width = `${offsetPercent}%`;
}

function setDiscreteIndicatorState(
    indicators: HTMLElement[],
    activeIndex: number,
    segmentCount: number,
    isReady: boolean
): void {
    indicators.forEach((indicator) => {
        indicator.classList.toggle('is-disabled', !isReady);
        const segments = Array.from(indicator.querySelectorAll('.gamepad-switch-segment'));
        segments.forEach((segment, index) => {
            segment.classList.toggle('is-active', index === activeIndex && index < segmentCount);
            segment.toggleAttribute('hidden', index >= segmentCount);
        });
    });
}

function findNearestIndex(value: number, targets: number[]): number {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    targets.forEach((target, index) => {
        const distance = Math.abs(target - value);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });

    return bestIndex;
}

function isValueInsideRange(value: number, range: AuxChannelRange): boolean {
    const minValue = Math.min(range.min, range.max);
    const maxValue = Math.max(range.min, range.max);
    return value >= minValue && value <= maxValue;
}

export function updateBar(dom: SettingsDomRefs, key: PrimaryChannelKey, value: number): void {
    const bar = dom.bars[key];
    if (bar) {
        if (key === 'throttle') {
            const percent = clamp((value - 1000) / 10, 0, 100);
            bar.style.marginLeft = '0%';
            bar.style.width = `${percent}%`;
        } else {
            const centered = clamp((value - 1500) / 10, -50, 50);
            if (centered >= 0) {
                bar.style.marginLeft = '50%';
                bar.style.width = `${centered}%`;
            } else {
                bar.style.marginLeft = `${50 + centered}%`;
                bar.style.width = `${Math.abs(centered)}%`;
            }
        }
    }

    updateSignalBar(dom, key, value);
}

export function renderStickPreview(dom: SettingsDomRefs, values: Record<PrimaryChannelKey, number>): void {
    const coords = {
        left: { x: 0, y: 0 },
        right: { x: 0, y: 0 }
    };
    const labels = {
        left: { x: 'X', y: 'Y' },
        right: { x: 'X', y: 'Y' }
    };

    for (const channel of PRIMARY_CHANNELS) {
        const slot = getPrimaryChannelStickSlot(channel);
        const side = slot.startsWith('left') ? 'left' : 'right';
        const axis = slot.endsWith('x') ? 'x' : 'y';
        const normalized = channel === 'throttle'
            ? rcToThrottleNormalized(values[channel]) * 2 - 1
            : rcToCenteredNormalized(values[channel]);

        coords[side][axis] = clamp(normalized, -1, 1);
        labels[side][axis] = `${axis.toUpperCase()}: ${PRIMARY_CHANNEL_TITLES[channel]}`;
    }

    (['left', 'right'] as const).forEach((side) => {
        const dotEl = dom.stickPreview[side].dotEl;
        const xLabelEl = dom.stickPreview[side].xLabelEl;
        const yLabelEl = dom.stickPreview[side].yLabelEl;
        if (dotEl) {
            const radiusPercent = 34;
            dotEl.style.left = `${50 + coords[side].x * radiusPercent}%`;
            dotEl.style.top = `${50 - coords[side].y * radiusPercent}%`;
        }
        if (xLabelEl) xLabelEl.textContent = labels[side].x;
        if (yLabelEl) yLabelEl.textContent = labels[side].y;
    });
}

function getModeActiveIndex(value: number): number {
    if (value < 1300) return 0;
    if (value > 1700) return 2;
    return 1;
}

export function renderAuxSwitchPreview(params: {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    values: Record<AuxiliaryChannelKey, number>;
    getModePositions: () => ObservedInputPosition[];
    getAuxRange: (key: ActionAuxChannelKey) => AuxChannelRange;
}): void {
    const { dom, state, values, getAuxRange } = params;
    const isReady = simSettings.gamepadConnected && state.activeGamepadHasChannelData;

    const modeActiveIndex = getModeActiveIndex(values.mode);
    setDiscreteIndicatorState(dom.switchIndicators.mode, modeActiveIndex, 3, isReady);

    const armActive = isValueInsideRange(values.arm, getAuxRange('arm')) ? 1 : 0;
    setDiscreteIndicatorState(dom.switchIndicators.arm, armActive, 2, isReady);

    const magnetActive = isValueInsideRange(values.magnet, getAuxRange('magnet')) ? 1 : 0;
    setDiscreteIndicatorState(dom.switchIndicators.magnet, magnetActive, 2, isReady);
}

export function renderChannelDefaults(params: {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    getDefaultChannelValue: (key: ChannelKey) => number;
    getModePositions: () => ObservedInputPosition[];
    getMappingRef: (key: ChannelKey) => GamepadInputRef;
    getAuxRange: (key: ActionAuxChannelKey) => AuxChannelRange;
    getObservedStats: (ref: GamepadInputRef) => ObservedInputStats | null;
}): void {
    const { dom, getDefaultChannelValue, getModePositions } = params;
    const primaryValues = {
        roll: getDefaultChannelValue('roll'),
        pitch: getDefaultChannelValue('pitch'),
        throttle: getDefaultChannelValue('throttle'),
        yaw: getDefaultChannelValue('yaw')
    };
    for (const key of ALL_CHANNELS) {
        const value = getDefaultChannelValue(key);
        renderChannelValue(dom, key, value);
        if (PRIMARY_CHANNELS.includes(key as PrimaryChannelKey)) {
            updateBar(dom, key as PrimaryChannelKey, value);
        }
    }
    renderStickPreview(dom, primaryValues);
    const auxiliaryValues = {
        mode: getDefaultChannelValue('mode'),
        arm: getDefaultChannelValue('arm'),
        magnet: getDefaultChannelValue('magnet')
    };
    renderModeMeta(dom, params.state, auxiliaryValues.mode, getModePositions);
    renderAuxSwitchPreview({
        dom: params.dom,
        state: params.state,
        values: auxiliaryValues,
        getModePositions,
        getAuxRange: params.getAuxRange
    });
    renderAuxRangeEditors({
        dom: params.dom,
        state: params.state,
        getMappingRef: params.getMappingRef,
        getAuxRange: params.getAuxRange,
        getDefaultChannelValue: params.getDefaultChannelValue,
        getObservedStats: params.getObservedStats
    });
}
