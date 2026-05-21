import { simSettings } from '../../core/state.js';
import { normalizeCenteredAxis } from '../settings/input/calibration.js';
import { clamp, clampRc } from '../settings/constants.js';
import { getConnectedGamepads, getGamepadName } from '../settings/mapping.js';

const TOTAL_CHANNELS = 16;
const NEUTRAL_PWM = 1500;
const ACTIVE_OFFSET_PWM = 80;
const MOTION_THRESHOLD_PWM = 6;
const LIVE_HOLD_MS = 220;

type ChannelUi = {
    root: HTMLDivElement;
    valueEl: HTMLSpanElement;
};

type ChannelSample = {
    value: number;
};

type MonitorState = {
    frozen: boolean;
    showPeaks: boolean;
    activeGamepadKey: string | null;
    currentValues: Array<number | null>;
    minValues: number[];
    maxValues: number[];
    lastLiveValues: Array<number | null>;
    lastMotionAt: number[];
};

function escapeHtml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function toTrackPercent(value: number): number {
    return clamp((value - 1000) / 10, 0, 100);
}

function buildChannelCell(channelNumber: number): ChannelUi {
    const root = document.createElement('div');
    root.className = 'channel-monitor-cell';
    root.innerHTML = `
        <span class="channel-monitor-label">CH${channelNumber}</span>
        <div class="channel-monitor-meter">
            <span class="channel-monitor-fill"></span>
            <span class="channel-monitor-peak channel-monitor-peak--min"></span>
            <span class="channel-monitor-peak channel-monitor-peak--max"></span>
        </div>
        <span class="channel-monitor-value is-muted">--</span>
    `;

    return {
        root,
        valueEl: root.querySelector('.channel-monitor-value') as HTMLSpanElement
    };
}

function readChannelSample(gp: Gamepad, channelIndex: number): ChannelSample | null {
    if (channelIndex < gp.axes.length) {
        const rawValue = gp.axes[channelIndex] ?? 0;
        const normalized = normalizeCenteredAxis(simSettings.gamepadCalibration, rawValue, channelIndex);
        return { value: clampRc(NEUTRAL_PWM + normalized * 500) };
    }

    const buttonIndex = channelIndex - gp.axes.length;
    if (buttonIndex >= gp.buttons.length) return null;
    const buttonValue = clamp(gp.buttons[buttonIndex]?.value ?? 0, 0, 1);
    return { value: clampRc(1000 + buttonValue * 1000) };
}

function syncFreezeButton(button: HTMLButtonElement, frozen: boolean): void {
    button.textContent = frozen ? 'Продолжить' : 'Заморозить график';
    button.classList.toggle('is-active', frozen);
}

function updateStatusPill(element: HTMLElement, gamepad: Gamepad | null, frozen: boolean): void {
    if (!gamepad) {
        element.textContent = frozen ? 'Монитор заморожен' : 'Пульт не подключен';
        element.classList.add('is-disconnected');
        element.classList.remove('is-connected');
        return;
    }

    const gamepadName = escapeHtml(getGamepadName(gamepad));
    const inputsCount = Math.min(TOTAL_CHANNELS, gamepad.axes.length + gamepad.buttons.length);
    const freezeMeta = frozen ? ' · стоп' : '';
    element.innerHTML =
        `<span class="gamepad-status-pill__name">${gamepadName}</span><span class="gamepad-status-pill__meta">· ${inputsCount}/16 входов${freezeMeta}</span>`;
    element.classList.add('is-connected');
    element.classList.remove('is-disconnected');
}

function resetPeaks(state: MonitorState): void {
    state.minValues = state.currentValues.map((value) => value ?? NEUTRAL_PWM);
    state.maxValues = state.currentValues.map((value) => value ?? NEUTRAL_PWM);
}

function renderChannelCell(cell: ChannelUi, value: number | null, minValue: number, maxValue: number, frozen: boolean, live: boolean): void {
    cell.root.classList.toggle('has-data', value !== null);
    cell.root.classList.toggle('is-unavailable', value === null);
    cell.root.classList.toggle('is-frozen', frozen);
    cell.root.classList.toggle('is-live', value !== null && live);

    if (value === null) {
        cell.root.style.setProperty('--cm-fill-start', '50%');
        cell.root.style.setProperty('--cm-fill-width', '0%');
        cell.root.style.setProperty('--cm-min-pos', '50%');
        cell.root.style.setProperty('--cm-max-pos', '50%');
        cell.valueEl.textContent = '--';
        cell.valueEl.classList.add('is-muted');
        return;
    }

    const valuePercent = toTrackPercent(value);
    const minPercent = toTrackPercent(minValue);
    const maxPercent = toTrackPercent(maxValue);
    const fillStart = Math.min(valuePercent, 50);
    const fillWidth = Math.abs(valuePercent - 50);

    cell.root.style.setProperty('--cm-fill-start', `${fillStart}%`);
    cell.root.style.setProperty('--cm-fill-width', `${fillWidth}%`);
    cell.root.style.setProperty('--cm-min-pos', `${minPercent}%`);
    cell.root.style.setProperty('--cm-max-pos', `${maxPercent}%`);
    cell.valueEl.textContent = `${value}`;
    cell.valueEl.classList.remove('is-muted');
}

function renderBoardStatus(element: HTMLElement, gamepad: Gamepad | null, activeCount: number, frozen: boolean): void {
    if (!gamepad) {
        element.textContent = frozen
            ? 'Показания заморожены. Для возобновления подключите пульт или отключите режим стоп.'
            : 'Нет данных от активного пульта.';
        return;
    }

    const stateText = frozen ? 'Заморожено' : 'В реальном времени';
    element.textContent = `${stateText} · активны ${activeCount} из 16 каналов`;
}

function pickGamepad(previousKey: string | null): Gamepad | null {
    const connected = getConnectedGamepads();
    if (connected.length === 0) return null;

    if (previousKey) {
        const previous = connected.find((gamepad) => `${gamepad.index}:${gamepad.id}` === previousKey);
        if (previous) return previous;
    }

    return connected[0];
}

export function initChannelMonitor(): void {
    const panel = document.getElementById('channel-monitor-panel');
    const mappingPane = document.getElementById('gamepad-pane-mapping');
    const mappingTab = document.getElementById('gp-tab-mapping') as HTMLButtonElement | null;
    const monitorTab = document.getElementById('gp-tab-monitor') as HTMLButtonElement | null;
    const grid = document.getElementById('channel-monitor-grid');
    const statusEl = document.getElementById('channel-monitor-status');
    const boardStatusEl = document.getElementById('channel-monitor-board-status');
    const freezeBtn = document.getElementById('cm-btn-freeze') as HTMLButtonElement | null;
    const resetBtn = document.getElementById('cm-btn-reset-peaks') as HTMLButtonElement | null;
    const peaksToggle = document.getElementById('cm-toggle-peaks') as HTMLInputElement | null;

    if (panel && mappingPane && mappingTab && monitorTab) {
        const setActivePane = (pane: 'mapping' | 'monitor'): void => {
            const showMonitor = pane === 'monitor';
            mappingPane.classList.toggle('is-active', !showMonitor);
            panel.classList.toggle('is-active', showMonitor);
            mappingTab.classList.toggle('is-active', !showMonitor);
            monitorTab.classList.toggle('is-active', showMonitor);
            mappingTab.setAttribute('aria-selected', String(!showMonitor));
            monitorTab.setAttribute('aria-selected', String(showMonitor));
        };

        mappingTab.addEventListener('click', () => setActivePane('mapping'));
        monitorTab.addEventListener('click', () => setActivePane('monitor'));
        setActivePane('mapping');
    }

    if (!panel || !grid || !statusEl || !boardStatusEl || !freezeBtn || !resetBtn || !peaksToggle) return;

    const cells = Array.from({ length: TOTAL_CHANNELS }, (_, index) => buildChannelCell(index + 1));
    grid.replaceChildren(...cells.map((cell) => cell.root));

    const state: MonitorState = {
        frozen: false,
        showPeaks: peaksToggle.checked,
        activeGamepadKey: null,
        currentValues: Array.from({ length: TOTAL_CHANNELS }, () => null),
        minValues: Array.from({ length: TOTAL_CHANNELS }, () => NEUTRAL_PWM),
        maxValues: Array.from({ length: TOTAL_CHANNELS }, () => NEUTRAL_PWM),
        lastLiveValues: Array.from({ length: TOTAL_CHANNELS }, () => null),
        lastMotionAt: Array.from({ length: TOTAL_CHANNELS }, () => 0)
    };

    const renderSnapshot = (gamepad: Gamepad | null, activeCount: number): void => {
        const now = Date.now();
        cells.forEach((cell, index) => {
            const currentValue = state.currentValues[index];
            const live =
                currentValue !== null && (
                    Math.abs(currentValue - NEUTRAL_PWM) >= ACTIVE_OFFSET_PWM
                    || now - state.lastMotionAt[index] <= LIVE_HOLD_MS
                );
            renderChannelCell(cell, currentValue, state.minValues[index], state.maxValues[index], state.frozen, live);
        });

        grid.classList.toggle('show-peaks', state.showPeaks);
        updateStatusPill(statusEl, gamepad, state.frozen);
        renderBoardStatus(boardStatusEl, gamepad, activeCount, state.frozen);
        syncFreezeButton(freezeBtn, state.frozen);
    };

    freezeBtn.addEventListener('click', () => {
        state.frozen = !state.frozen;
        renderSnapshot(pickGamepad(state.activeGamepadKey), state.currentValues.filter((value) => value !== null).length);
    });

    resetBtn.addEventListener('click', () => {
        resetPeaks(state);
        renderSnapshot(pickGamepad(state.activeGamepadKey), state.currentValues.filter((value) => value !== null).length);
    });

    peaksToggle.addEventListener('change', () => {
        state.showPeaks = peaksToggle.checked;
        grid.classList.toggle('show-peaks', state.showPeaks);
    });

    const tick = (): void => {
        const gamepad = pickGamepad(state.activeGamepadKey);
        const gamepadKey = gamepad ? `${gamepad.index}:${gamepad.id}` : null;

        if (!state.frozen && gamepadKey !== state.activeGamepadKey) {
            state.activeGamepadKey = gamepadKey;
            state.currentValues.fill(null);
            state.lastLiveValues.fill(null);
            state.lastMotionAt.fill(0);
            resetPeaks(state);
        } else if (state.frozen) {
            state.activeGamepadKey = gamepadKey;
        } else {
            state.activeGamepadKey = gamepadKey;
        }

        let activeCount = 0;

        if (!state.frozen && gamepad) {
            const now = Date.now();
            for (let index = 0; index < TOTAL_CHANNELS; index += 1) {
                const sample = readChannelSample(gamepad, index);
                if (!sample) {
                    state.currentValues[index] = null;
                    continue;
                }

                const previousValue = state.lastLiveValues[index];
                if (previousValue === null || Math.abs(sample.value - previousValue) >= MOTION_THRESHOLD_PWM) {
                    state.lastMotionAt[index] = now;
                }

                state.currentValues[index] = sample.value;
                state.lastLiveValues[index] = sample.value;
                state.minValues[index] = Math.min(state.minValues[index], sample.value);
                state.maxValues[index] = Math.max(state.maxValues[index], sample.value);
                activeCount += 1;
            }
        } else {
            activeCount = state.currentValues.filter((value) => value !== null).length;
        }

        renderSnapshot(gamepad, activeCount);
        window.requestAnimationFrame(tick);
    };

    renderSnapshot(null, 0);
    tick();
}

