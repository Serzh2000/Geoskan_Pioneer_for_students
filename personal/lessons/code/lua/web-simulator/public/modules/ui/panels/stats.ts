import { simState, simSettings } from '../../core/state.js';

const STATS_UPDATE_INTERVAL_MS = 50;

const stateAlt = document.getElementById('state-alt') as HTMLElement | null;
const stateSpd = document.getElementById('state-spd') as HTMLElement | null;
const stateBat = document.getElementById('state-bat') as HTMLElement | null;
const stateStatus = document.getElementById('state-status') as HTMLElement | null;
const stateTime = document.getElementById('state-time') as HTMLElement | null;
const stateMode = document.getElementById('state-mode') as HTMLElement | null;
const hudStatMode = document.getElementById('hud-stat-mode') as HTMLElement | null;
const camParams = document.getElementById('cam-params') as HTMLElement | null;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement | null;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement | null;
const ledElements = Array.from({ length: 29 }, (_unused, index) => {
    if (index < 4) {
        return document.getElementById(`led-base-${index}`) as HTMLElement | null;
    }
    return document.getElementById(`led-pixel-${index}`) as HTMLElement | null;
});

let lastAltText = '';
let lastSpeedText = '';
let lastBatteryText = '';
let lastStatusText = '';
let lastStatusColor = '';
let lastTimeText = '';
let lastFlightModeText = '';
let lastHudModeVisible: boolean | null = null;
let lastCamParamsVisible: boolean | null = null;
let lastRunButtonDisabled: boolean | null = null;
let lastStopButtonDisabled: boolean | null = null;
const lastLedStyles = Array.from({ length: 29 }, () => '');
let lastStatsUpdateAt = 0;

function getStatusColor(isDarkTheme: boolean): string {
    if (
        simState.fsmState === 'TAKEOFF_PROCESS'
        || simState.fsmState === 'FLYING_HOVER'
        || simState.fsmState === 'FLYING_MOVING'
        || simState.fsmState === 'LANDING_PROCESS'
    ) {
        return isDarkTheme ? '#4ade80' : '#15803d';
    }

    if (simState.fsmState === 'PREFLIGHT') {
        return isDarkTheme ? '#fbbf24' : '#b45309';
    }

    if (simState.status === 'ОШИБКА' || simState.status === 'CRASHED') {
        return isDarkTheme ? '#f87171' : '#c2410c';
    }

    return isDarkTheme ? '#f8fafc' : '#151515';
}

function updateTelemetry(speed: number, isDarkTheme: boolean): void {
    const altText = simState.pos.z.toFixed(2);
    const speedText = speed.toFixed(1);
    const batteryText = Math.floor(simState.battery).toString();
    const timeText = simState.current_time.toFixed(1);
    const statusColor = getStatusColor(isDarkTheme);

    if (stateAlt && lastAltText !== altText) {
        stateAlt.textContent = altText;
        lastAltText = altText;
    }

    if (stateSpd && lastSpeedText !== speedText) {
        stateSpd.textContent = speedText;
        lastSpeedText = speedText;
    }

    if (stateBat && lastBatteryText !== batteryText) {
        stateBat.textContent = batteryText;
        lastBatteryText = batteryText;
    }

    if (stateStatus && lastStatusText !== simState.status) {
        stateStatus.textContent = simState.status;
        lastStatusText = simState.status;
    }

    if (stateStatus && lastStatusColor !== statusColor) {
        stateStatus.style.color = statusColor;
        lastStatusColor = statusColor;
    }

    if (stateTime && lastTimeText !== timeText) {
        stateTime.textContent = timeText;
        lastTimeText = timeText;
    }
}

function updateFlightMode(): void {
    const shouldShowHudMode = simSettings.gamepadConnected;

    if (hudStatMode && lastHudModeVisible !== shouldShowHudMode) {
        hudStatMode.style.display = shouldShowHudMode ? 'flex' : 'none';
        lastHudModeVisible = shouldShowHudMode;
    }

    if (shouldShowHudMode && stateMode && lastFlightModeText !== simState.flightMode) {
        stateMode.textContent = simState.flightMode;
        lastFlightModeText = simState.flightMode;
    }
}

function updateCameraParamsVisibility(): void {
    const shouldShowCamParams = window.cameraMode === 'fpv';
    if (camParams && lastCamParamsVisible !== shouldShowCamParams) {
        camParams.style.display = shouldShowCamParams ? 'flex' : 'none';
        lastCamParamsVisible = shouldShowCamParams;
    }
}

function updateButtons(): void {
    const runDisabled = simState.running;
    const stopDisabled = !simState.running;

    if (runBtn && lastRunButtonDisabled !== runDisabled) {
        runBtn.disabled = runDisabled;
        runBtn.style.opacity = runDisabled ? '0.5' : '1';
        runBtn.style.cursor = runDisabled ? 'not-allowed' : 'pointer';
        lastRunButtonDisabled = runDisabled;
    }

    if (stopBtn && lastStopButtonDisabled !== stopDisabled) {
        stopBtn.disabled = stopDisabled;
        stopBtn.style.opacity = stopDisabled ? '0.5' : '1';
        stopBtn.style.cursor = stopDisabled ? 'not-allowed' : 'pointer';
        lastStopButtonDisabled = stopDisabled;
    }
}

function updateLeds(): void {
    if (!simState.leds) return;

    for (let i = 0; i < simState.leds.length; i += 1) {
        const led = simState.leds[i];
        if (!led || i >= ledElements.length) continue;

        const r = Math.round(led.r || 0);
        const g = Math.round(led.g || 0);
        const b = Math.round(led.b || 0);
        const signature = `${r},${g},${b}`;
        if (lastLedStyles[i] === signature) continue;

        const colorStr = `rgb(${r},${g},${b})`;
        const ledEl = ledElements[i];
        if (!ledEl) continue;

        ledEl.style.backgroundColor = colorStr;
        ledEl.style.boxShadow = (r + g + b > 0) ? `0 0 8px ${colorStr}` : 'none';
        ledEl.title = i < 4
            ? `Базовый светодиод ${i}\nRGB: ${r}, ${g}, ${b}`
            : `Светодиод матрицы ${i}\nRGB: ${r}, ${g}, ${b}`;
        lastLedStyles[i] = signature;
    }

    for (let i = simState.leds.length; i < ledElements.length; i += 1) {
        if (!lastLedStyles[i]) continue;
        const ledEl = ledElements[i];
        if (!ledEl) continue;

        ledEl.style.backgroundColor = 'rgb(0,0,0)';
        ledEl.style.boxShadow = 'none';
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

    const speed = Math.sqrt(simState.vel.x**2 + simState.vel.y**2 + simState.vel.z**2);
    const isDarkTheme = document.documentElement.dataset.theme === 'dark';

    updateTelemetry(speed, isDarkTheme);
    updateFlightMode();
    updateCameraParamsVisibility();
    updateButtons();
    updateLeds();
}
