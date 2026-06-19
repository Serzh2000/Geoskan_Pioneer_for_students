import type { DroneState, Vector3 } from '../core/state.js';

export type AutopilotRuntimeConfig = {
    manual: {
        attScale: number;
        velScale: number;
        vzScale: number;
        yawScale: number;
        throttleMode: 0 | 1;
    };
    mission: {
        aMax: number;
        vMax: number;
        vUp: number;
        vDown: number;
        vTakeoff: number;
        vLanding: number;
        landingAlt: number;
        takeoffAlt: number;
        navSystem: 0 | 1 | 2;
    };
    failsafe: {
        landingVol: number;
        rtlVoltage: number;
        autoFlightT: number;
        flyWithoutRc: 0 | 1;
        landAtHome: 0 | 1;
        homeAlt: number;
        rtlAltMode: 0 | 1;
        returnAlt: number;
    };
    tuning: {
        xyRateKi: number;
        xyRateKp: number;
    };
    motors: {
        motorCheckTime: number;
        startRpmMax: number;
        startRpmMin: number;
        startRpmSigma: number;
        stallRpm: number;
    };
    sensors: {
        altMinHeight: number;
    };
    safety: {
        shockAccel: number;
    };
};

type DroneAutopilotContext = {
    homePosition: Vector3 | null;
    rtlActive: boolean;
    rtlReason: string | null;
    autoFlightStartS: number | null;
    emergencyLandingTriggered: boolean;
};

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function readNumber(values: Record<string, number>, key: string, fallback: number) {
    const value = values[key];
    return Number.isFinite(value) ? value : fallback;
}

const DEFAULT_CONFIG: AutopilotRuntimeConfig = {
    manual: {
        attScale: 0.25,
        velScale: 0.5,
        vzScale: 0.5,
        yawScale: 3,
        throttleMode: 1
    },
    mission: {
        aMax: 1,
        vMax: 0.4,
        vUp: 0.5,
        vDown: 0.5,
        vTakeoff: 0.3,
        vLanding: 0.3,
        landingAlt: 0.3,
        takeoffAlt: 0.4,
        navSystem: 2
    },
    failsafe: {
        landingVol: 6.8,
        rtlVoltage: -1,
        autoFlightT: 3600,
        flyWithoutRc: 0,
        landAtHome: 0,
        homeAlt: 0.5,
        rtlAltMode: 0,
        returnAlt: 0
    },
    tuning: {
        xyRateKi: 20,
        xyRateKp: 0.07
    },
    motors: {
        motorCheckTime: 10,
        startRpmMax: 3500,
        startRpmMin: 2000,
        startRpmSigma: 100,
        stallRpm: 20000
    },
    sensors: {
        altMinHeight: 0
    },
    safety: {
        shockAccel: 2
    }
};

let runtimeConfig: AutopilotRuntimeConfig = structuredClone(DEFAULT_CONFIG);
const droneContexts = new Map<string, DroneAutopilotContext>();

function getDroneContext(droneId: string): DroneAutopilotContext {
    const existing = droneContexts.get(droneId);
    if (existing) return existing;

    const created: DroneAutopilotContext = {
        homePosition: null,
        rtlActive: false,
        rtlReason: null,
        autoFlightStartS: null,
        emergencyLandingTriggered: false
    };
    droneContexts.set(droneId, created);
    return created;
}

export function syncAutopilotRuntimeFromValues(values: Record<string, number>) {
    runtimeConfig = {
        manual: {
            attScale: clamp(readNumber(values, 'Copter_man_attScale', DEFAULT_CONFIG.manual.attScale), 0.05, 4),
            velScale: clamp(readNumber(values, 'Copter_man_velScale', DEFAULT_CONFIG.manual.velScale), 0.1, 5),
            vzScale: clamp(readNumber(values, 'Copter_man_vzScale', DEFAULT_CONFIG.manual.vzScale), 0.1, 5),
            yawScale: clamp(readNumber(values, 'Copter_man_yawScale', DEFAULT_CONFIG.manual.yawScale), 0.1, 10),
            throttleMode: readNumber(values, 'Copter_throttleMode', DEFAULT_CONFIG.manual.throttleMode) === 0 ? 0 : 1
        },
        mission: {
            aMax: clamp(readNumber(values, 'Copter_pos_aMax', DEFAULT_CONFIG.mission.aMax), 0.1, 10),
            vMax: clamp(readNumber(values, 'Copter_pos_vMax', DEFAULT_CONFIG.mission.vMax), 0.05, 10),
            vUp: clamp(readNumber(values, 'Copter_pos_vUp', DEFAULT_CONFIG.mission.vUp), 0.05, 10),
            vDown: clamp(readNumber(values, 'Copter_pos_vDown', DEFAULT_CONFIG.mission.vDown), 0.05, 10),
            vTakeoff: clamp(readNumber(values, 'Copter_pos_vTakeoff', DEFAULT_CONFIG.mission.vTakeoff), 0.05, 10),
            vLanding: clamp(readNumber(values, 'Copter_pos_vLanding', DEFAULT_CONFIG.mission.vLanding), 0.05, 10),
            landingAlt: clamp(readNumber(values, 'Flight_com_landingAlt', DEFAULT_CONFIG.mission.landingAlt), 0, 20),
            takeoffAlt: clamp(readNumber(values, 'Flight_com_takeoffAlt', DEFAULT_CONFIG.mission.takeoffAlt), 0.1, 20),
            navSystem: clamp(readNumber(values, 'Flight_com_navSystem', DEFAULT_CONFIG.mission.navSystem), 0, 2) as 0 | 1 | 2
        },
        failsafe: {
            landingVol: clamp(readNumber(values, 'Flight_com_landingVol', DEFAULT_CONFIG.failsafe.landingVol), 0, 12),
            rtlVoltage: clamp(readNumber(values, 'Flight_com_rtlVoltage', DEFAULT_CONFIG.failsafe.rtlVoltage), -1, 12),
            autoFlightT: clamp(readNumber(values, 'Flight_com_autoFlightT', DEFAULT_CONFIG.failsafe.autoFlightT), 0, 86400),
            flyWithoutRc: readNumber(values, 'Copter_flyWithoutRc', DEFAULT_CONFIG.failsafe.flyWithoutRc) === 0 ? 0 : 1,
            landAtHome: readNumber(values, 'Flight_com_landAtHome', DEFAULT_CONFIG.failsafe.landAtHome) === 0 ? 0 : 1,
            homeAlt: clamp(readNumber(values, 'Flight_com_homeAlt', DEFAULT_CONFIG.failsafe.homeAlt), 0, 20),
            rtlAltMode: readNumber(values, 'Flight_com_rtlAltMode', DEFAULT_CONFIG.failsafe.rtlAltMode) === 0 ? 0 : 1,
            returnAlt: clamp(readNumber(values, 'Flight_com_returnAlt', DEFAULT_CONFIG.failsafe.returnAlt), 0, 50)
        },
        tuning: {
            xyRateKi: clamp(readNumber(values, 'Copter_xyRate_ki', DEFAULT_CONFIG.tuning.xyRateKi), 0, 1000),
            xyRateKp: clamp(readNumber(values, 'Copter_xyRate_kp', DEFAULT_CONFIG.tuning.xyRateKp), 0, 10)
        },
        motors: {
            motorCheckTime: clamp(readNumber(values, 'Copter_motorCheckTime', DEFAULT_CONFIG.motors.motorCheckTime), 0, 60),
            startRpmMax: clamp(readNumber(values, 'Copter_startRpmMax', DEFAULT_CONFIG.motors.startRpmMax), 0, 100000),
            startRpmMin: clamp(readNumber(values, 'Copter_startRpmMin', DEFAULT_CONFIG.motors.startRpmMin), 0, 100000),
            startRpmSigma: clamp(readNumber(values, 'Copter_startRpmSigma', DEFAULT_CONFIG.motors.startRpmSigma), 0, 100000),
            stallRpm: clamp(readNumber(values, 'Copter_stallRpm', DEFAULT_CONFIG.motors.stallRpm), 0, 100000)
        },
        sensors: {
            altMinHeight: clamp(readNumber(values, 'Copter_alt_minHeight', DEFAULT_CONFIG.sensors.altMinHeight), 0, 100)
        },
        safety: {
            shockAccel: clamp(readNumber(values, 'Copter_shockAccel', DEFAULT_CONFIG.safety.shockAccel), 0.1, 20)
        }
    };
}

export function getAutopilotRuntimeConfig() {
    return runtimeConfig;
}

export function clearAutopilotRuntimeForDrone(droneId: string) {
    droneContexts.delete(droneId);
}

export function rememberAutopilotHomePosition(drone: DroneState) {
    const context = getDroneContext(drone.id);
    context.homePosition = { ...drone.pos };
}

export function getAutopilotHomePosition(droneId: string) {
    return getDroneContext(droneId).homePosition;
}

export function markAutonomousFlightActivity(drone: DroneState) {
    const context = getDroneContext(drone.id);
    if (context.autoFlightStartS === null) {
        context.autoFlightStartS = drone.current_time;
    }
}

export function resetAutonomousFlightActivity(droneId: string) {
    const context = getDroneContext(droneId);
    context.autoFlightStartS = null;
}

export function getAutonomousFlightDurationS(drone: DroneState) {
    const context = getDroneContext(drone.id);
    if (context.autoFlightStartS === null) return 0;
    return Math.max(0, drone.current_time - context.autoFlightStartS);
}

export function activateAutopilotRtl(droneId: string, reason: string) {
    const context = getDroneContext(droneId);
    context.rtlActive = true;
    context.rtlReason = reason;
}

export function clearAutopilotRtl(droneId: string) {
    const context = getDroneContext(droneId);
    context.rtlActive = false;
    context.rtlReason = null;
}

export function getAutopilotRtlState(droneId: string) {
    const context = getDroneContext(droneId);
    return {
        active: context.rtlActive,
        reason: context.rtlReason
    };
}

export function markEmergencyLandingTriggered(droneId: string) {
    getDroneContext(droneId).emergencyLandingTriggered = true;
}

export function hasEmergencyLandingTriggered(droneId: string) {
    return getDroneContext(droneId).emergencyLandingTriggered;
}

export function clearEmergencyLandingTriggered(droneId: string) {
    getDroneContext(droneId).emergencyLandingTriggered = false;
}
