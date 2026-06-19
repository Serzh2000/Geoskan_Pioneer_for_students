import {
    DEFAULT_LUA_SCRIPT,
    DEFAULT_PYTHON_SCRIPT
} from './state-types.js';
import type {
    DroneState,
    LuaDiagnosticsState
} from './state-types.js';

const DISARMED_STATUSES = new Set([
    'IDLE',
    'ОШИБКА',
    'CRASHED',
    'DISARMED_FALL'
]);

const BATTERY_CAPACITY_MAH = 1800;
const BATTERY_FULL_VOLTAGE = 8.4;

export function createEmptyLuaDiagnosticsState(): LuaDiagnosticsState {
    return {
        currentPhase: null,
        recentLogs: [],
        recentApiCalls: [],
        fsmTransitions: [],
        lastErrorStack: null,
        lastFailureReason: null,
        lastFailureDetails: []
    };
}

export function createDroneRecord(
    id: string,
    name: string,
    x: number = 0,
    y: number = 0,
    z: number = 0
): DroneState {
    return {
        id,
        name,
        running: false,
        luaHasEventCallback: false,
        luaMissionCommandsAcceptedWithoutCallback: 0,
        luaMissingCallbackNoticeShown: false,
        current_time: 0,
        pos: { x, y, z },
        vel: { x: 0, y: 0, z: 0 },
        accel: { x: 0, y: 0, z: 9.81 },
        gyro: { x: 0, y: 0, z: 0 },
        orientation: { roll: 0, pitch: 0, yaw: 0 },
        battery: 100,
        batteryVoltage: BATTERY_FULL_VOLTAGE,
        batteryChargeMah: BATTERY_CAPACITY_MAH,
        batteryLowVoltage1Notified: false,
        batteryLowVoltage2Notified: false,
        batteryDepletedNotified: false,
        missionRcOverrideNoticeShown: false,
        status: 'IDLE',
        fsmState: 'IDLE',
        flightMode: 'AUTO',
        rcChannels: [1500, 1500, 1000, 1500, 1000, 1000, 1000, 1000],
        magnetGripper: {
            active: false,
            attachedObjectId: null
        },
        target_alt: z,
        target_pos: { x, y, z },
        target_yaw: 0,
        pendingLocalPoint: false,
        pendingLocalPointSource: null,
        pointReachedFlag: false,
        traceSampleAccumulator: 0,
        command_queue: [],
        preflightDeadlineMs: null,
        currentCommandSource: null,
        lastAcceptedGoToTickMs: null,
        tickCommandSignature: null,
        timers: [],
        leds: Array.from({ length: 29 }, () => ({ r: 0, g: 0, b: 0, w: 0 })),
        script: DEFAULT_LUA_SCRIPT,
        pythonScript: DEFAULT_PYTHON_SCRIPT,
        printBubbleText: '',
        printBubbleUntil: 0,
        luaState: null,
        luaDiagnostics: createEmptyLuaDiagnosticsState()
    };
}

export function resetDroneRuntimeState(drone: DroneState) {
    drone.running = false;
    drone.luaHasEventCallback = false;
    drone.luaMissionCommandsAcceptedWithoutCallback = 0;
    drone.luaMissingCallbackNoticeShown = false;
    drone.current_time = 0;
    drone.vel = { x: 0, y: 0, z: 0 };
    drone.accel = { x: 0, y: 0, z: 9.81 };
    drone.gyro = { x: 0, y: 0, z: 0 };
    drone.battery = 100;
    drone.batteryVoltage = BATTERY_FULL_VOLTAGE;
    drone.batteryChargeMah = BATTERY_CAPACITY_MAH;
    drone.batteryLowVoltage1Notified = false;
    drone.batteryLowVoltage2Notified = false;
    drone.batteryDepletedNotified = false;
    drone.missionRcOverrideNoticeShown = false;
    drone.status = 'IDLE';
    drone.fsmState = 'IDLE';
    drone.command_queue = [];
    drone.preflightDeadlineMs = null;
    drone.currentCommandSource = null;
    drone.lastAcceptedGoToTickMs = null;
    drone.tickCommandSignature = null;
    drone.timers = [];
    drone.leds = Array.from({ length: 29 }, () => ({ r: 0, g: 0, b: 0, w: 0 }));
    drone.rcChannels = [1500, 1500, 1000, 1500, 1000, 1000, 1000, 1000];
    drone.magnetGripper.active = false;
    drone.magnetGripper.attachedObjectId = null;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pointReachedFlag = false;
    drone.traceSampleAccumulator = 0;
    drone.printBubbleText = '';
    drone.printBubbleUntil = 0;
    drone.luaDiagnostics = createEmptyLuaDiagnosticsState();
}

export function isDroneArmed(drone: DroneState): boolean {
    return !DISARMED_STATUSES.has(drone.status);
}
