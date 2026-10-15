import { drones, currentDroneId, simSettings } from '../../core/state.js';
import { getCameraMode } from '../../scene/core/camera-mode-state.js';

const STATS_UPDATE_INTERVAL_MS = 50;

const stateAlt = document.getElementById('state-alt') as HTMLElement | null;
const stateSpd = document.getElementById('state-spd') as HTMLElement | null;
const stateBat = document.getElementById('state-bat') as HTMLElement | null;
const stateStatus = document.getElementById('state-status') as HTMLElement | null;
const chartAltLine = document.getElementById('flight-chart-alt-line');
const chartAltArea = document.getElementById('flight-chart-alt-area');
const chartSpdLine = document.getElementById('flight-chart-spd-line');
const stateBatBar = document.getElementById('state-bat-bar') as HTMLElement | null;
const stateTime = document.getElementById('state-time') as HTMLElement | null;
const stateMode = document.getElementById('state-mode') as HTMLElement | null;
const hudStatMode = document.getElementById('hud-stat-mode') as HTMLElement | null;
// #run-state-chip lives in the editor header, which can be mounted after this module is evaluated.
let runStateChip: HTMLElement | null = null;
function getRunStateChip(): HTMLElement | null {
    if (!runStateChip || !runStateChip.isConnected) runStateChip = document.getElementById('run-state-chip');
    return runStateChip;
}
const camParams = document.getElementById('cam-params') as HTMLElement | null;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement | null;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement | null;

// `led-pixel-*` cells are created at runtime by initLEDMatrixUI(), which can
// run after this module is first evaluated, so the lookup is deferred to
// first use (and retried while any id is still missing) rather than done
// once at import time, or every matrix cell would stay stuck at null.
let ledElements: Array<HTMLElement | null> | null = null;
function getLedElements(): Array<HTMLElement | null> {
    if (ledElements && ledElements.every((el) => el !== null)) return ledElements;
    ledElements = Array.from({ length: 29 }, (_unused, index) => {
        if (index < 4) {
            return document.getElementById(`led-base-${index}`) as HTMLElement | null;
        }
        return document.getElementById(`led-pixel-${index}`) as HTMLElement | null;
    });
    return ledElements;
}

let lastAltText = '';
let lastSpeedText = '';
let lastBatteryText = '';
const lastChipView = new WeakMap<HTMLElement, string>();
let lastTimeText = '';
let lastAutopilotRowText = '';
let lastHudModeVisible: boolean | null = null;
let lastCamParamsVisible: boolean | null = null;
let lastRunButtonDisabled: boolean | null = null;
let lastStopButtonDisabled: boolean | null = null;
const lastLedStyles = Array.from({ length: 29 }, () => '');
let lastStatsUpdateAt = 0;

// Состояние автопилота - один словарь для чипа телеметрии (#state-status), чипа в шапке
// редактора (#run-state-chip) и строки «Автопилот». Тон задаёт класс чипа (panel-kit.css),
// поэтому тему разбирает CSS, а не JS.
export type AutopilotTone = 'plain' | 'accent' | 'success' | 'warning' | 'danger';
export interface AutopilotStateView {
    label: string;
    tone: AutopilotTone;
}

const AUTOPILOT_STATES: Record<string, AutopilotStateView> = {
    IDLE: { label: 'На земле', tone: 'plain' },
    PREFLIGHT: { label: 'Взвод', tone: 'warning' },
    TAKEOFF_PROCESS: { label: 'Взлёт', tone: 'accent' },
    FLYING_HOVER: { label: 'Висение', tone: 'success' },
    FLYING_MOVING: { label: 'В полёте', tone: 'success' },
    LANDING_PROCESS: { label: 'Посадка', tone: 'accent' },
    DISARMED_FALL: { label: 'Авария', tone: 'danger' },
    CRASHED: { label: 'Авария', tone: 'danger' },
    // Статусы внешнего Python-скрипта приходят по-русски и заглавными.
    'ОШИБКА': { label: 'Ошибка', tone: 'danger' },
    'РАБОТАЕТ': { label: 'Работает', tone: 'accent' },
    'ЗАВЕРШЕН': { label: 'Завершено', tone: 'plain' },
    'ОСТАНОВЛЕН': { label: 'Остановлено', tone: 'plain' }
};

const TONE_CLASSES = ['accent', 'success', 'warning', 'danger'].map((tone) => `pk-chip--${tone}`);

/** Лётная подпись и тон для состояния автопилота (`drone.status` / `drone.fsmState`). */
export function describeAutopilotState(state: string | null | undefined): AutopilotStateView {
    const key = (state ?? '').trim();
    if (!key) return AUTOPILOT_STATES.IDLE;
    const known = AUTOPILOT_STATES[key] ?? AUTOPILOT_STATES[key.toUpperCase()];
    if (known) return known;
    // Неизвестный статус читается обычным словом, а не заглавными.
    return { label: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(), tone: 'plain' };
}

function applyStateChip(chip: HTMLElement | null, view: AutopilotStateView, rawState: string): void {
    if (!chip) return;
    const signature = `${view.label}|${view.tone}|${rawState}`;
    if (lastChipView.get(chip) === signature) return;
    lastChipView.set(chip, signature);
    chip.textContent = view.label;
    chip.title = `Состояние автопилота: ${rawState || 'IDLE'}`;
    chip.classList.remove(...TONE_CLASSES);
    if (view.tone !== 'plain') chip.classList.add(`pk-chip--${view.tone}`);
    chip.dataset.tone = view.tone;
}

function updateBatteryBar(battery: number): void {
    if (!stateBatBar) return;

    const percent = Math.max(0, Math.min(100, battery));
    stateBatBar.parentElement?.setAttribute('aria-valuenow', String(percent));
    stateBatBar.parentElement?.setAttribute('aria-valuetext', `${percent} %`);
    stateBatBar.style.width = `${percent}%`;
    stateBatBar.classList.toggle('is-low', percent <= 30 && percent > 15);
    stateBatBar.classList.toggle('is-critical', percent <= 15);
}

/*
 * Flight profile: altitude and speed of the last 30 s, each scaled to its own maximum (at least 2 m and 1 m/s),
 * so the shape of the flight reads at a glance. The chart restarts when another drone is selected.
 */
const CHART_WINDOW_MS = 30000;
const CHART_SAMPLE_MS = 250;
const chartSamples: Array<{ at: number; alt: number; spd: number }> = [];
let chartDroneId = '';

function updateFlightChart(alt: number, speed: number): void {
    if (!chartAltLine || !chartAltArea || !chartSpdLine) return;
    const now = performance.now();
    if (chartDroneId !== currentDroneId) {
        chartDroneId = currentDroneId;
        chartSamples.length = 0;
    }
    const last = chartSamples[chartSamples.length - 1];
    if (last && now - last.at < CHART_SAMPLE_MS) return;
    chartSamples.push({ at: now, alt: Math.max(0, alt), spd: speed });
    while (chartSamples.length && now - chartSamples[0].at > CHART_WINDOW_MS) chartSamples.shift();

    const maxAlt = Math.max(2, ...chartSamples.map(sample => sample.alt));
    const maxSpd = Math.max(1, ...chartSamples.map(sample => sample.spd));
    const x = (at: number) => (100 - ((now - at) / CHART_WINDOW_MS) * 100).toFixed(2);
    const y = (value: number, max: number) => (38 - (value / max) * 34).toFixed(2);
    const altPoints = chartSamples.map(sample => `${x(sample.at)},${y(sample.alt, maxAlt)}`).join(' ');
    chartAltLine.setAttribute('points', altPoints);
    chartSpdLine.setAttribute('points', chartSamples.map(sample => `${x(sample.at)},${y(sample.spd, maxSpd)}`).join(' '));
    const firstX = chartSamples.length ? x(chartSamples[0].at) : '0';
    chartAltArea.setAttribute('points', `${firstX},40 ${altPoints} 100,40`);
}

function updateTelemetry(speed: number): void {
    const altText = drones[currentDroneId].pos.z.toFixed(2);
    const speedText = speed.toFixed(1);
    const battery = Math.floor(drones[currentDroneId].battery);
    const batteryText = battery.toString();
    const timeText = drones[currentDroneId].current_time.toFixed(1);

    if (stateAlt && lastAltText !== altText) {
        stateAlt.textContent = altText;
        lastAltText = altText;
    }

    if (stateSpd && lastSpeedText !== speedText) {
        stateSpd.textContent = speedText;
        lastSpeedText = speedText;
    }

    if (lastBatteryText !== batteryText) {
        if (stateBat) stateBat.textContent = batteryText;
        updateBatteryBar(battery);
        lastBatteryText = batteryText;
    }

    const rawStatus = drones[currentDroneId].status;
    const stateView = describeAutopilotState(rawStatus);
    applyStateChip(stateStatus, stateView, rawStatus);
    applyStateChip(getRunStateChip(), stateView, rawStatus);

    if (stateTime && lastTimeText !== timeText) {
        stateTime.textContent = timeText;
        lastTimeText = timeText;
    }
}

// Строка «Автопилот» в телеметрии: то же слово, что в чипе, плюс режим пульта, когда он подключён.
// Скрывается классом, только если данных нет (нет выбранного дрона).
function updateFlightMode(): void {
    const drone = drones[currentDroneId];
    const hasData = Boolean(drone);

    if (hudStatMode && lastHudModeVisible !== hasData) {
        hudStatMode.classList.toggle('metric--empty', !hasData);
        lastHudModeVisible = hasData;
    }
    if (!drone) return;

    const label = describeAutopilotState(drone.status).label;
    const rowText = simSettings.gamepadConnected ? `${label} · ${drone.flightMode}` : label;
    if (stateMode && lastAutopilotRowText !== rowText) {
        stateMode.textContent = rowText;
        lastAutopilotRowText = rowText;
    }
}

function updateCameraParamsVisibility(): void {
    const shouldShowCamParams = getCameraMode() === 'fpv';
    if (camParams && lastCamParamsVisible !== shouldShowCamParams) {
        camParams.style.display = shouldShowCamParams ? 'flex' : 'none';
        lastCamParamsVisible = shouldShowCamParams;
    }
}

function updateButtons(): void {
    const runDisabled = drones[currentDroneId].running;
    const stopDisabled = !drones[currentDroneId].running;

    if (runBtn && lastRunButtonDisabled !== runDisabled) {
        runBtn.disabled = runDisabled;
        runBtn.style.cursor = runDisabled ? 'not-allowed' : 'pointer';
        lastRunButtonDisabled = runDisabled;
    }

    if (stopBtn && lastStopButtonDisabled !== stopDisabled) {
        stopBtn.disabled = stopDisabled;
        stopBtn.style.cursor = stopDisabled ? 'not-allowed' : 'pointer';
        lastStopButtonDisabled = stopDisabled;
    }
}

function updateLeds(): void {
    if (!drones[currentDroneId].leds) return;
    const elements = getLedElements();

    for (let i = 0; i < drones[currentDroneId].leds.length; i += 1) {
        const led = drones[currentDroneId].leds[i];
        if (!led || i >= elements.length) continue;

        const r = Math.round(led.r || 0);
        const g = Math.round(led.g || 0);
        const b = Math.round(led.b || 0);
        const signature = `${r},${g},${b}`;
        if (lastLedStyles[i] === signature) continue;

        const colorStr = `rgb(${r},${g},${b})`;
        const ledEl = elements[i];
        if (!ledEl) continue;

        // Погашенный светодиод возвращаем стилям панели, иначе он станет
        // чёрным пятном вместо углубления в плате.
        const isLit = r + g + b > 0;
        ledEl.style.backgroundColor = isLit ? colorStr : '';
        ledEl.style.boxShadow = isLit ? `0 0 10px ${colorStr}, inset 0 0 6px rgba(255, 255, 255, 0.3)` : '';
        ledEl.title = i < 4
            ? `Базовый светодиод ${i}\nRGB: ${r}, ${g}, ${b}`
            : `Светодиод матрицы ${i}\nRGB: ${r}, ${g}, ${b}`;
        lastLedStyles[i] = signature;
    }

    for (let i = drones[currentDroneId].leds.length; i < elements.length; i += 1) {
        if (!lastLedStyles[i]) continue;
        const ledEl = elements[i];
        if (!ledEl) continue;

        ledEl.style.backgroundColor = '';
        ledEl.style.boxShadow = '';
        ledEl.title = '';
        lastLedStyles[i] = '';
    }
}

export function updateStats() {
    if (document.visibilityState === 'hidden') {
        return;
    }

    const now = performance.now();
    if (lastStatsUpdateAt && now - lastStatsUpdateAt < STATS_UPDATE_INTERVAL_MS) {
        return;
    }
    lastStatsUpdateAt = now;

    const speed = Math.sqrt(drones[currentDroneId].vel.x**2 + drones[currentDroneId].vel.y**2 + drones[currentDroneId].vel.z**2);

    updateTelemetry(speed);
    updateFlightChart(drones[currentDroneId].pos.z, speed);
    updateFlightMode();
    updateCameraParamsVisibility();
    updateButtons();
    updateLeds();
}
