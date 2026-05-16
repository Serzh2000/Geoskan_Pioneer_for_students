import { simState, simSettings } from '../../core/state.js';

const stateAlt = document.getElementById('state-alt') as HTMLElement | null;
const stateSpd = document.getElementById('state-spd') as HTMLElement | null;
const stateBat = document.getElementById('state-bat') as HTMLElement | null;
const stateStatus = document.getElementById('state-status') as HTMLElement | null;
const stateTime = document.getElementById('state-time') as HTMLElement | null;
const stateMode = document.getElementById('state-mode') as HTMLElement | null;
const hudStatMode = document.getElementById('hud-stat-mode') as HTMLElement | null;
const flightStatusBadge = document.getElementById('flight-status-badge') as HTMLElement | null;
const camParams = document.getElementById('cam-params') as HTMLElement | null;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement | null;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement | null;

export function updateStats() {
    const speed = Math.sqrt(simState.vel.x**2 + simState.vel.y**2 + simState.vel.z**2);

    // Update Telemetry Panel
    if (stateAlt) stateAlt.textContent = simState.pos.z.toFixed(2);
    if (stateSpd) stateSpd.textContent = speed.toFixed(2);
    if (stateBat) stateBat.textContent = Math.floor(simState.battery).toString();
    if (stateStatus) {
        stateStatus.textContent = simState.status;
        if (
            simState.fsmState === 'TAKEOFF_PROCESS'
            || simState.fsmState === 'FLYING_HOVER'
            || simState.fsmState === 'FLYING_MOVING'
            || simState.fsmState === 'LANDING_PROCESS'
        ) {
            flightStatusBadge?.setAttribute('data-state', 'success');
        } else if (simState.fsmState === 'PREFLIGHT') {
            flightStatusBadge?.setAttribute('data-state', 'warn');
        } else if (simState.status === 'ОШИБКА' || simState.status === 'CRASHED') {
            flightStatusBadge?.setAttribute('data-state', 'error');
        } else {
            flightStatusBadge?.setAttribute('data-state', 'neutral');
        }
    }
    if (stateTime) stateTime.textContent = simState.current_time.toFixed(1);

    // Update Flight Mode display (only when gamepad is connected)
    if (hudStatMode) {
        if (simSettings.gamepadConnected) {
            hudStatMode.style.display = 'flex';
            if (stateMode) {
                stateMode.textContent = simState.flightMode;
            }
        } else {
            hudStatMode.style.display = 'none';
        }
    }

    // Update Camera Params Visibility
    if (window.cameraMode === 'fpv') {
        if (camParams) camParams.style.display = 'flex';
    } else {
        if (camParams) camParams.style.display = 'none';
    }

    // Update Button States
    if (simState.running) {
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.style.opacity = '0.5';
            runBtn.style.cursor = 'not-allowed';
        }
        if (stopBtn) {
            stopBtn.disabled = false;
            stopBtn.style.opacity = '1';
            stopBtn.style.cursor = 'pointer';
        }
    } else {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.style.opacity = '1';
            runBtn.style.cursor = 'pointer';
        }
        if (stopBtn) {
            stopBtn.disabled = true;
            stopBtn.style.opacity = '0.5';
            stopBtn.style.cursor = 'not-allowed';
        }
    }

    // Update LED Matrix Debug UI
    if (simState.leds) {
        for (let i = 0; i < simState.leds.length; i++) {
            const led = simState.leds[i];
            if (!led) continue;
            const r = Math.round(led.r || 0);
            const g = Math.round(led.g || 0);
            const b = Math.round(led.b || 0);
            const colorStr = `rgb(${r},${g},${b})`;
            
            if (i < 4) {
                // Base LEDs
                const baseLedEl = document.getElementById(`led-base-${i}`);
                if (baseLedEl) {
                    baseLedEl.style.backgroundColor = colorStr;
                    baseLedEl.style.boxShadow = (r+g+b > 0) ? `0 0 8px ${colorStr}` : 'none';
                    baseLedEl.title = `Базовый светодиод ${i}\nRGB: ${r}, ${g}, ${b}`;
                }
            } else if (i < 29) {
                // Matrix LEDs
                const pixelEl = document.getElementById(`led-pixel-${i}`);
                if (pixelEl) {
                    pixelEl.style.backgroundColor = colorStr;
                    pixelEl.style.boxShadow = (r+g+b > 0) ? `0 0 8px ${colorStr}` : 'none';
                    pixelEl.title = `Светодиод матрицы ${i}\nRGB: ${r}, ${g}, ${b}`;
                }
            }
        }
    }
}
