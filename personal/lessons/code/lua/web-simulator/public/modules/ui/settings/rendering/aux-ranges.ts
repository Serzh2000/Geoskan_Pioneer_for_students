import { simSettings, type AuxChannelRange, type GamepadInputRef } from '../../../core/state.js';
import { ACTION_AUX_CHANNELS, clamp } from '../constants.js';
import { buildRangesFromPositions, findClosestRangeByCenter, getObservedPositions } from '../input/observed.js';
import type { SettingsDomRefs } from '../dom.js';
import type { SettingsRuntimeState } from '../runtime-state.js';
import type { ActionAuxChannelKey, ChannelKey, ObservedInputStats } from '../types.js';

const RANGE_EDGE_PADDING_PERCENT = 3;

function setTextIfChanged(element: HTMLElement | null, value: string): void {
    if (element && element.textContent !== value) {
        element.textContent = value;
    }
}

function setDisabledIfChanged(
    element: HTMLSelectElement | HTMLInputElement | null,
    disabled: boolean
): void {
    if (element && element.disabled !== disabled) {
        element.disabled = disabled;
    }
}

function setValueIfChanged(
    element: HTMLSelectElement | HTMLInputElement | null,
    value: string
): void {
    if (element && element.value !== value) {
        element.value = value;
    }
}

function setHtmlIfChanged(element: HTMLElement | null, value: string): void {
    if (element && element.innerHTML !== value) {
        element.innerHTML = value;
    }
}

function setClassPresence(element: HTMLElement | null, className: string, enabled: boolean): void {
    if (!element) return;
    const hasClass = element.classList.contains(className);
    if (hasClass !== enabled) {
        element.classList.toggle(className, enabled);
    }
}

function setStyleIfChanged(element: HTMLElement | null, property: 'left' | 'width', value: string): void {
    if (element && element.style[property] !== value) {
        element.style[property] = value;
    }
}

function toRangePercent(value: number): number {
    return clamp(((value - 1000) / 1000) * 100, 0, 100);
}

function toRangeVisualPercent(value: number): number {
    const normalizedPercent = toRangePercent(value) / 100;
    return clamp(
        RANGE_EDGE_PADDING_PERCENT + normalizedPercent * (100 - RANGE_EDGE_PADDING_PERCENT * 2),
        RANGE_EDGE_PADDING_PERCENT,
        100 - RANGE_EDGE_PADDING_PERCENT
    );
}

export function renderAuxRangePresetOptions(params: {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    key: ActionAuxChannelKey;
    getMappingRef: (key: ChannelKey) => GamepadInputRef;
    getAuxRange: (key: ActionAuxChannelKey) => AuxChannelRange;
}): void {
    const { dom, state, key, getMappingRef, getAuxRange } = params;
    const controls = dom.auxRangeControls[key];
    if (!controls.presetSelect) return;

    if (!simSettings.gamepadConnected || !state.activeGamepadHasChannelData) {
        setHtmlIfChanged(controls.presetSelect, '<option value="">Нет сигнала</option>');
        setDisabledIfChanged(controls.presetSelect, true);
        return;
    }

    const ranges = buildRangesFromPositions(getObservedPositions(state.observedInputStats, getMappingRef(key)));
    if (ranges.length === 0) {
        setHtmlIfChanged(controls.presetSelect, '<option value="">Нет положений</option>');
        setDisabledIfChanged(controls.presetSelect, true);
        return;
    }

    const optionsHtml = ranges
        .map((range, index) => {
            const center = range.center ?? Math.round((range.min + range.max) / 2);
            return `<option value="${index}">Положение ${index + 1} (${center})</option>`;
        })
        .join('');
    setHtmlIfChanged(controls.presetSelect, optionsHtml);

    const current = findClosestRangeByCenter(ranges, getAuxRange(key).center);
    const currentIndex = current
        ? ranges.findIndex((range) => range.min === current.min && range.max === current.max && range.center === current.center)
        : 0;
    setValueIfChanged(controls.presetSelect, String(Math.max(0, currentIndex)));
    setDisabledIfChanged(controls.presetSelect, false);
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
    const positions = getObservedPositions(state.observedInputStats, mappedRef);
    const isReady = simSettings.gamepadConnected && state.activeGamepadHasChannelData && Boolean(stats);
    const minValue = Math.min(range.min, range.max);
    const maxValue = Math.max(range.min, range.max);

    setClassPresence(controls.card, 'is-disabled', !isReady);
    renderAuxRangePresetOptions({ dom, state, key, getMappingRef, getAuxRange });
    if (controls.minSlider) {
        setValueIfChanged(controls.minSlider, String(minValue));
        setDisabledIfChanged(controls.minSlider, !isReady);
    }
    if (controls.maxSlider) {
        setValueIfChanged(controls.maxSlider, String(maxValue));
        setDisabledIfChanged(controls.maxSlider, !isReady);
    }
    setTextIfChanged(controls.minValueEl, String(minValue));
    setTextIfChanged(controls.maxValueEl, String(maxValue));
    setTextIfChanged(controls.liveValueEl, `LIVE ${liveValue}`);
    if (controls.fillEl) {
        const minPercent = toRangeVisualPercent(minValue);
        const maxPercent = toRangeVisualPercent(maxValue);
        setStyleIfChanged(controls.fillEl, 'left', `${minPercent}%`);
        setStyleIfChanged(controls.fillEl, 'width', `${Math.max(0, maxPercent - minPercent)}%`);
    }
    if (controls.markerEl) {
        setStyleIfChanged(controls.markerEl, 'left', `${toRangeVisualPercent(liveValue)}%`);
    }
    if (controls.metaEl) {
        if (!simSettings.gamepadConnected) {
            setTextIfChanged(controls.metaEl, 'Пульт не подключен.');
        } else if (!state.activeGamepadHasChannelData) {
            setTextIfChanged(controls.metaEl, 'Нет данных текущего пульта. Жду первый пакет значений.');
        } else if (!stats) {
            setTextIfChanged(controls.metaEl, `Для ${mappedRef.toUpperCase()} ещё нет наблюдаемых значений.`);
        } else {
            setTextIfChanged(
                controls.metaEl,
                `Источник ${mappedRef.toUpperCase()}. Замеченный диапазон ${stats.minRc}-${stats.maxRc}, положений ${positions.length}, сейчас ${stats.lastRc}.`
            );
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
