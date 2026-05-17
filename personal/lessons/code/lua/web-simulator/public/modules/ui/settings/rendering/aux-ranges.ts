import { simSettings, type AuxChannelRange } from '../../../core/state.js';
import { ACTION_AUX_CHANNELS, clamp } from '../constants.js';
import { buildRangesFromPositions, findClosestRangeByCenter, getObservedPositions } from '../observed-inputs.js';
import type { GamepadInputRef } from '../../../core/state.js';
import type { SettingsDomRefs } from '../dom.js';
import type { SettingsRuntimeState } from '../runtime-state.js';
import type { ActionAuxChannelKey, ChannelKey, ObservedInputStats } from '../types.js';
import type { AuxRangeRenderingParams } from './status.js';

const RANGE_EDGE_PADDING_PERCENT = 3;

const toRangePercent = (value: number): number => clamp(((value - 1000) / 1000) * 100, 0, 100);
const toRangeVisualPercent = (value: number): number => {
    const normalizedPercent = toRangePercent(value) / 100;
    return clamp(
        RANGE_EDGE_PADDING_PERCENT + normalizedPercent * (100 - RANGE_EDGE_PADDING_PERCENT * 2),
        RANGE_EDGE_PADDING_PERCENT,
        100 - RANGE_EDGE_PADDING_PERCENT
    );
};

export function renderAuxRangePresetOptions(params: AuxRangeRenderingParams): void {
    const { dom, state, key, getMappingRef, getAuxRange } = params;
    const controls = dom.auxRangeControls[key];
    if (!controls.presetSelect) return;

    if (!simSettings.gamepadConnected || !state.activeGamepadHasChannelData) {
        controls.presetSelect.innerHTML = '<option value="">Нет сигнала</option>';
        controls.presetSelect.disabled = true;
        return;
    }

    const ranges = buildRangesFromPositions(getObservedPositions(state.observedInputStats, getMappingRef(key)));
    if (ranges.length === 0) {
        controls.presetSelect.innerHTML = '<option value="">Нет положений</option>';
        controls.presetSelect.disabled = true;
        return;
    }

    controls.presetSelect.innerHTML = ranges
        .map((range, index) => {
            const center = range.center ?? Math.round((range.min + range.max) / 2);
            return `<option value="${index}">Положение ${index + 1} (${center})</option>`;
        })
        .join('');

    const current = findClosestRangeByCenter(ranges, getAuxRange(key).center);
    const currentIndex = current
        ? ranges.findIndex((range) => range.min === current.min && range.max === current.max && range.center === current.center)
        : 0;
    controls.presetSelect.value = String(Math.max(0, currentIndex));
    controls.presetSelect.disabled = false;
}

export function renderAuxRangeEditor(params: {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    key: ActionAuxChannelKey;
    liveValue: number;
    getMappingRef: (key: ChannelKey) => GamepadInputRef;
    getAuxRange: (key: ActionAuxChannelKey) => AuxChannelRange;
    getObservedStats: (ref: GamepadInputRef) => ObservedInputStats | null;
}): void {
    const { dom, state, key, liveValue, getMappingRef, getAuxRange, getObservedStats } = params;
    const controls = dom.auxRangeControls[key];
    const range = getAuxRange(key);
    const mappedRef = getMappingRef(key);
    const stats = getObservedStats(mappedRef);
    const isReady = simSettings.gamepadConnected && state.activeGamepadHasChannelData && Boolean(stats);
    const minValue = Math.min(range.min, range.max);
    const maxValue = Math.max(range.min, range.max);

    if (controls.card) {
        controls.card.classList.toggle('is-disabled', !isReady);
    }
    renderAuxRangePresetOptions({ dom, state, key, getMappingRef, getAuxRange });
    if (controls.minSlider) {
        controls.minSlider.value = String(minValue);
        controls.minSlider.disabled = !isReady;
    }
    if (controls.maxSlider) {
        controls.maxSlider.value = String(maxValue);
        controls.maxSlider.disabled = !isReady;
    }
    if (controls.minValueEl) controls.minValueEl.textContent = String(minValue);
    if (controls.maxValueEl) controls.maxValueEl.textContent = String(maxValue);
    if (controls.liveValueEl) controls.liveValueEl.textContent = `LIVE ${liveValue}`;
    if (controls.fillEl) {
        const minPercent = toRangeVisualPercent(minValue);
        const maxPercent = toRangeVisualPercent(maxValue);
        controls.fillEl.style.marginLeft = `${minPercent}%`;
        controls.fillEl.style.width = `${Math.max(0, maxPercent - minPercent)}%`;
    }
    if (controls.markerEl) {
        controls.markerEl.style.marginLeft = `${toRangeVisualPercent(liveValue)}%`;
    }
    if (controls.metaEl) {
        if (!simSettings.gamepadConnected) {
            controls.metaEl.textContent = 'Пульт не подключен.';
        } else if (!state.activeGamepadHasChannelData) {
            controls.metaEl.textContent = 'Нет данных текущего пульта. Жду первый пакет значений.';
        } else if (!stats) {
            controls.metaEl.textContent = `Для ${mappedRef.toUpperCase()} ещё нет наблюдаемых значений.`;
        } else {
            controls.metaEl.textContent = `Источник ${mappedRef.toUpperCase()}. Замеченный диапазон ${stats.minRc}-${stats.maxRc}, положений ${getObservedPositions(state.observedInputStats, mappedRef).length}, сейчас ${stats.lastRc}.`;
        }
    }
}

export function renderAuxRangeEditors(params: {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    getMappingRef: (key: ChannelKey) => GamepadInputRef;
    getAuxRange: (key: ActionAuxChannelKey) => AuxChannelRange;
    getDefaultChannelValue: (key: ChannelKey) => number;
    getObservedStats: (ref: GamepadInputRef) => ObservedInputStats | null;
}): void {
    const { dom, getDefaultChannelValue } = params;
    for (const key of ACTION_AUX_CHANNELS) {
        renderAuxRangeEditor({
            ...params,
            key,
            liveValue: Number(dom.valueEls[key]?.textContent ?? getDefaultChannelValue(key))
        });
    }
}
