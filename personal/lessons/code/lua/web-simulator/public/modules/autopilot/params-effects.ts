import type { DroneState } from '../core/state.js';
import {
    activateAutopilotRtl,
    clearAutopilotRtl,
    clearEmergencyLandingTriggered,
    getAutonomousFlightDurationS,
    getAutopilotHomePosition,
    getAutopilotRtlState,
    getAutopilotRuntimeConfig,
    hasEmergencyLandingTriggered,
    markAutonomousFlightActivity,
    markEmergencyLandingTriggered,
    resetAutonomousFlightActivity
} from './params-runtime.js';
import { enterLandingProcess, isDroneAirborneState, setDroneFsmState } from './fsm.js';
import { log } from '../shared/logging/logger.js';

const HOME_REACHED_EPSILON = 0.35;
const ALTITUDE_REACHED_EPSILON = 0.12;

function shouldStartRtlForVoltage(simState: DroneState) {
    const config = getAutopilotRuntimeConfig();
    return config.failsafe.rtlVoltage >= 0 && simState.batteryVoltage <= config.failsafe.rtlVoltage;
}

function shouldStartRtlForTimeout(simState: DroneState) {
    const config = getAutopilotRuntimeConfig();
    return config.failsafe.autoFlightT > 0 && simState.running && getAutonomousFlightDurationS(simState) >= config.failsafe.autoFlightT;
}

function startRtlIfNeeded(simState: DroneState, id: string) {
    const rtlState = getAutopilotRtlState(id);
    if (rtlState.active) return;

    if (shouldStartRtlForVoltage(simState)) {
        activateAutopilotRtl(id, `АКБ достигла порога RTL ${getAutopilotRuntimeConfig().failsafe.rtlVoltage.toFixed(2)} V`);
        log(`[AP Params] ${id}: активирован возврат домой по порогу RTL-напряжения.`, 'warn');
        return;
    }

    if (shouldStartRtlForTimeout(simState)) {
        activateAutopilotRtl(id, `Автополёт превысил лимит ${getAutopilotRuntimeConfig().failsafe.autoFlightT.toFixed(0)} c`);
        log(`[AP Params] ${id}: активирован возврат домой по ограничению Flight_com_autoFlightT.`, 'warn');
    }
}

export function updateAutopilotParameterEffects(simState: DroneState, id: string) {
    const config = getAutopilotRuntimeConfig();

    if (!isDroneAirborneState(simState)) {
        clearAutopilotRtl(id);
        clearEmergencyLandingTriggered(id);
        resetAutonomousFlightActivity(id);
        return;
    }

    markAutonomousFlightActivity(simState);

    if (
        config.failsafe.landingVol > 0
        && simState.batteryVoltage <= config.failsafe.landingVol
        && simState.fsmState !== 'LANDING_PROCESS'
        && !hasEmergencyLandingTriggered(id)
    ) {
        markEmergencyLandingTriggered(id);
        clearAutopilotRtl(id);
        enterLandingProcess(simState);
        log(`[AP Params] ${id}: активирована аварийная посадка по Flight_com_landingVol.`, 'warn');
        return;
    }

    startRtlIfNeeded(simState, id);

    const rtlState = getAutopilotRtlState(id);
    if (!rtlState.active || simState.fsmState === 'LANDING_PROCESS') {
        return;
    }

    const home = getAutopilotHomePosition(id);
    if (!home) {
        return;
    }

    if (config.mission.navSystem === 0) {
        enterLandingProcess(simState);
        log(`[AP Params] ${id}: RTL заменен на посадку, потому что Flight_com_navSystem=0.`, 'warn');
        return;
    }

    const homeHoverAlt = Math.max(config.failsafe.homeAlt, 0);
    const cruiseAlt = config.failsafe.rtlAltMode === 0
        ? Math.max(simState.pos.z, config.failsafe.returnAlt, homeHoverAlt)
        : Math.max(homeHoverAlt, Math.min(simState.pos.z, Math.max(config.failsafe.returnAlt, homeHoverAlt)));

    simState.target_pos = {
        x: home.x,
        y: home.y,
        z: cruiseAlt
    };
    simState.target_alt = cruiseAlt;

    if (simState.fsmState === 'FLYING_HOVER') {
        setDroneFsmState(simState, 'FLYING_MOVING');
    }

    const planarDistanceToHome = Math.hypot(simState.pos.x - home.x, simState.pos.y - home.y);
    if (planarDistanceToHome > HOME_REACHED_EPSILON) {
        return;
    }

    if (config.failsafe.landAtHome === 1) {
        enterLandingProcess(simState);
        log(`[AP Params] ${id}: возврат домой завершен, начата посадка по Flight_com_landAtHome.`, 'info');
        return;
    }

    simState.target_pos = {
        x: home.x,
        y: home.y,
        z: homeHoverAlt
    };
    simState.target_alt = homeHoverAlt;

    if (Math.abs(simState.pos.z - homeHoverAlt) <= ALTITUDE_REACHED_EPSILON) {
        setDroneFsmState(simState, 'FLYING_HOVER');
    }
}
