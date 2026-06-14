import { isDroneAirborneState, shouldSpinRotors } from '../autopilot/fsm.js';
import type { DroneState } from '../core/state.js';
import { triggerLuaCallback } from '../lua/index.js';
import { log } from '../shared/logging/logger.js';

const BATTERY_CAPACITY_MAH = 1800;
const BATTERY_FULL_VOLTAGE = 8.4;
const BATTERY_EMPTY_VOLTAGE = 6.6;
const BATTERY_WARNING1_VOLTAGE = 7.2;
const BATTERY_WARNING2_VOLTAGE = 6.9;

const BATTERY_IDLE_DRAW_A = 0.02;
const BATTERY_ARMED_GROUND_DRAW_A = 1.1;
const BATTERY_PREFLIGHT_DRAW_A = 0.8;
const BATTERY_HOVER_DRAW_A = 7.2;

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, t: number) {
    return start + (end - start) * clamp(t, 0, 1);
}

function getChargeRatio(simState: DroneState) {
    return clamp(simState.batteryChargeMah / BATTERY_CAPACITY_MAH, 0, 1);
}

function getRestingVoltage(chargeRatio: number) {
    if (chargeRatio >= 0.95) {
        return lerp(8.2, BATTERY_FULL_VOLTAGE, (chargeRatio - 0.95) / 0.05);
    }
    if (chargeRatio >= 0.6) {
        return lerp(7.6, 8.2, (chargeRatio - 0.6) / 0.35);
    }
    if (chargeRatio >= 0.25) {
        return lerp(7.1, 7.6, (chargeRatio - 0.25) / 0.35);
    }
    return lerp(BATTERY_EMPTY_VOLTAGE, 7.1, chargeRatio / 0.25);
}

function getCurrentDrawAmps(simState: DroneState) {
    const planarSpeed = Math.hypot(simState.vel.x, simState.vel.y);
    const verticalSpeed = Math.abs(simState.vel.z);
    const maxTilt = Math.max(Math.abs(simState.orientation.roll), Math.abs(simState.orientation.pitch));

    let currentDraw = BATTERY_IDLE_DRAW_A;

    if (simState.fsmState === 'PREFLIGHT') {
        currentDraw = BATTERY_PREFLIGHT_DRAW_A;
    } else if (shouldSpinRotors(simState)) {
        currentDraw = BATTERY_ARMED_GROUND_DRAW_A;
        if (isDroneAirborneState(simState)) {
            currentDraw = BATTERY_HOVER_DRAW_A
                + Math.min(2.2, planarSpeed * 0.35)
                + Math.min(1.4, verticalSpeed * 0.4)
                + Math.min(1.0, maxTilt * 1.6);
        }
    }

    if (simState.magnetGripper.active) {
        currentDraw += 0.25;
    }

    if (simState.running) {
        currentDraw += 0.08;
    }

    return currentDraw;
}

function getLoadedVoltage(chargeRatio: number, currentDrawAmps: number) {
    const restingVoltage = getRestingVoltage(chargeRatio);
    const internalResistance = lerp(0.055, 0.085, 1 - chargeRatio);
    const loadedVoltage = restingVoltage - currentDrawAmps * internalResistance;
    return clamp(loadedVoltage, BATTERY_EMPTY_VOLTAGE, BATTERY_FULL_VOLTAGE);
}

function showBatteryNotice(title: string, message: string, level: 'warn' | 'error') {
    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title,
        message,
        level
    });
}

function notifyLowVoltage(simState: DroneState, id: string, level: 1 | 2) {
    const percent = Math.max(0, Math.round(simState.battery));
    const voltage = simState.batteryVoltage.toFixed(2);

    if (level === 1) {
        simState.batteryLowVoltage1Notified = true;
        triggerLuaCallback(id, 13);
        log(`[Battery] ${id}: низкий заряд АКБ (${percent}%, ${voltage} V).`, 'warn');
        showBatteryNotice(
            'АКБ разряжается',
            `Заряд дрона снижается: ${percent}% (${voltage} V). Планируйте посадку.`,
            'warn'
        );
        return;
    }

    simState.batteryLowVoltage2Notified = true;
    triggerLuaCallback(id, 14);
    log(`[Battery] ${id}: критический заряд АКБ (${percent}%, ${voltage} V).`, 'warn');
    showBatteryNotice(
        'Критический разряд АКБ',
        `У дрона почти пустая батарея: ${percent}% (${voltage} V). Завершите миссию и посадите дрон.`,
        'error'
    );
}

export function updateBatteryState(simState: DroneState, id: string, dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;

    const currentDrawAmps = getCurrentDrawAmps(simState);
    const drainedMah = currentDrawAmps * dt * (1000 / 3600);
    simState.batteryChargeMah = clamp(simState.batteryChargeMah - drainedMah, 0, BATTERY_CAPACITY_MAH);

    const chargeRatio = getChargeRatio(simState);
    simState.battery = chargeRatio * 100;
    simState.batteryVoltage = getLoadedVoltage(chargeRatio, currentDrawAmps);

    if (!simState.batteryLowVoltage1Notified && simState.batteryVoltage <= BATTERY_WARNING1_VOLTAGE) {
        notifyLowVoltage(simState, id, 1);
    }

    if (!simState.batteryLowVoltage2Notified && simState.batteryVoltage <= BATTERY_WARNING2_VOLTAGE) {
        notifyLowVoltage(simState, id, 2);
    }

    if (!simState.batteryDepletedNotified && chargeRatio <= 0) {
        simState.batteryDepletedNotified = true;
        log(`[Battery] ${id}: АКБ полностью разряжена.`, 'warn');
        showBatteryNotice(
            'АКБ разряжена',
            'Батарея дрона полностью разряжена. Сбросьте симуляцию перед следующим вылетом.',
            'error'
        );
    }
}
