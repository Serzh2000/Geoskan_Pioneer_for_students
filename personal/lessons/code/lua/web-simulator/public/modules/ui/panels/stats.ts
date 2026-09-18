import { drones, currentDroneId, simSettings } from '../../core/state.js';
import { getCameraMode } from '../../scene/core/camera-mode-state.js';

const STATS_UPDATE_INTERVAL_MS = 50;

const stateAlt = document.getElementById('state-alt') as HTMLElement | null;
const stateSpd = document.getElementById('state-spd') as HTMLElement | null;
const stateBat = document.getElementById('state-bat') as HTMLElement | null;
const stateStatus = document.getElementById('state-status') as HTMLElement | null;
const stateBatBar = document.getElementById('state-bat-bar') as HTMLElement | null;
const statusRow = document.querySelector('.telemetry-status') as HTMLElement | null;
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
let lastStatusTone = '';
let lastTimeText = '';
let lastFlightModeText = '';
let lastHudModeVisible: boolean | null = null;
let lastCamParamsVisible: boolean | null = null;
let lastRunButtonDisabled: boolean | null = null;
let lastStopButtonDisabled: boolean | null = null;
const lastLedStyles = Array.from({ length: 29 }, () => '');
let lastStatsUpdateAt = 0;

// Оттенок состояния держим классом: тему разбирает CSS, а не JS.
function getStatusTone(): string {
    if (
        drones[currentDroneId].fsmState === 'TAKEOFF_PROCESS'
        || drones[currentDroneId].fsmState === 'FLYING_HOVER'
        || drones[currentDroneId].fsmState === 'FLYING_MOVING'
        || drones[currentDroneId].fsmState === 'LANDING_PROCESS'
    ) {
        return 'flying';
    }

    if (drones[currentDroneId].fsmState === 'PREFLIGHT') return 'preflight';

    if (drones[currentDroneId].status === 'ОШИБКА' || drones[currentDroneId].status === 'CRASHED') {
        return 'error';
    }

    return 'idle';
}

function updateBatteryBar(battery: number): void {
    if (!stateBatBar) return;

    const percent = Math.max(0, Math.min(100, battery));
    stateBatBar.style.width = `${percent}%`;
    stateBatBar.classList.toggle('is-low', percent <= 30 && percent > 15);
    stateBatBar.classList.toggle('is-critical', percent <= 15);
}

function updateTelemetry(speed: number): void {
    const altText = drones[currentDroneId].pos.z.toFixed(2);
    const speedText = speed.toFixed(1);
    const battery = Math.floor(drones[currentDroneId].battery);
    const batteryText = battery.toString();
    const timeText = drones[currentDroneId].current_time.toFixed(1);
    const statusTone = getStatusTone();

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

    if (stateStatus && lastStatusText !== drones[currentDroneId].status) {
        stateStatus.textContent = drones[currentDroneId].status;
        lastStatusText = drones[currentDroneId].status;
    }

    if (statusRow && lastStatusTone !== statusTone) {
        statusRow.dataset.tone = statusTone;
        lastStatusTone = statusTone;
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

    if (shouldShowHudMode && stateMode && lastFlightModeText !== drones[currentDroneId].flightMode) {
        stateMode.textContent = drones[currentDroneId].flightMode;
        lastFlightModeText = drones[currentDroneId].flightMode;
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
    if (!drones[currentDroneId].leds) return;

    for (let i = 0; i < drones[currentDroneId].leds.length; i += 1) {
        const led = drones[currentDroneId].leds[i];
        if (!led || i >= ledElements.length) continue;

        const r = Math.round(led.r || 0);
        const g = Math.round(led.g || 0);
        const b = Math.round(led.b || 0);
        const signature = `${r},${g},${b}`;
        if (lastLedStyles[i] === signature) continue;

        const colorStr = `rgb(${r},${g},${b})`;
        const ledEl = ledElements[i];
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

    for (let i = drones[currentDroneId].leds.length; i < ledElements.length; i += 1) {
        if (!lastLedStyles[i]) continue;
        const ledEl = ledElements[i];
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
    updateFlightMode();
    updateCameraParamsVisibility();
    updateButtons();
    updateLeds();
}
