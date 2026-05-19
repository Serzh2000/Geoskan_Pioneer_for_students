
export interface Vector3 { x: number; y: number; z: number; }
export interface Orientation { roll: number; pitch: number; yaw: number; }
export interface LedColor { r: number; g: number; b: number; w: number; }
export type DroneFsmState =
    | 'IDLE'
    | 'PREFLIGHT'
    | 'TAKEOFF_PROCESS'
    | 'FLYING_HOVER'
    | 'FLYING_MOVING'
    | 'LANDING_PROCESS';

export type CommandSource = 'direct' | 'timer' | 'python';

export interface TickCommandSignature {
    tickMs: number;
    takeoff: boolean;
    goToLocalPoint: boolean;
    landing: boolean;
}

export interface QueuedMceCommand {
    commandId: number;
    issuedAtMs: number;
    source: CommandSource;
}

export interface TimerTask {
    trigger_time: number;
    callback_ref: number;
    one_shot: boolean;
    running: boolean;
    period?: number;
    next_trigger?: number;
    sourceState?: DroneFsmState;
}

export type GamepadInputRef = `a${number}` | `b${number}`;
export interface AuxChannelRange {
    min: number;
    max: number;
    center?: number;
}

export interface GamepadModeRanges {
    loiter: AuxChannelRange;
    althold: AuxChannelRange;
    stabilize: AuxChannelRange;
}

/**
 * Модуль глобального состояния симулятора.
 * Хранит данные обо всех дронах (позиции, скорости, логика автопилота),
 * настройках симуляции (скорость, трассеры), общем состоянии среды (работает/остановлено),
 * а также точки траектории для отрисовки шлейфа (pathPoints).
 */
export type FlightMode = 'AUTO' | 'LOITER' | 'ALTHOLD' | 'STABILIZE';

export interface DroneState {
    id: string;
    name: string;
    running: boolean;
    current_time: number;
    pos: Vector3;
    vel: Vector3;
    accel: Vector3;
    gyro: Vector3;
    orientation: Orientation;
    battery: number;
    status: string;
    fsmState: DroneFsmState;
    flightMode: FlightMode;
    rcChannels: number[]; // 0: Roll, 1: Pitch, 2: Throttle, 3: Yaw, 4..7: Switches
    magnetGripper: {
        active: boolean;
        attachedObjectId: string | null;
    };
    target_alt: number;
    target_pos: Vector3;
    target_yaw: number;
    // Для команд вроде goToLocalPoint: разрешаем выставить target,
    // но статус "полёт к точке" включаем только после взлёта.
    pendingLocalPoint?: boolean;
    pendingLocalPointSource?: CommandSource | null;
    // Python-совместимый latched flag: true один раз после прибытия.
    pointReachedFlag?: boolean;
    traceSampleAccumulator: number;
    command_queue: QueuedMceCommand[];
    preflightDeadlineMs: number | null;
    currentCommandSource: CommandSource | null;
    lastAcceptedGoToTickMs: number | null;
    tickCommandSignature: TickCommandSignature | null;
    timers: TimerTask[];
    leds: LedColor[];
    script: string;
    pythonScript: string;
    printBubbleText: string;
    printBubbleUntil: number;
    luaState: any; // fengari state
}

export const drones: Record<string, DroneState> = {};
export let currentDroneId: string = 'drone_1';

export type ScriptLanguage = 'lua' | 'python';
export let currentScriptLanguage: ScriptLanguage = 'lua';

export const DEFAULT_LUA_SCRIPT = [
    '-- Pioneer Lua Script',
    '',
    'ap.push(Ev.MCE_PREFLIGHT)',
    'Timer.callLater(0.5, function()',
    '    ap.push(Ev.MCE_TAKEOFF)',
    'end)'
].join('\n');

export const DEFAULT_PYTHON_SCRIPT = [
    '# Pioneer Python Script',
    'from pioneer_sdk import Pioneer',
    'import time',
    '',
    'pioneer = Pioneer(simulator=True)',
    '',
    'pioneer.arm()',
    'pioneer.takeoff()',
    '',
    'time.sleep(3)',
    '',
    'pioneer.go_to_local_point(x=1, y=1, z=1)',
    'while not pioneer.point_reached():',
    '    time.sleep(0.05)',
    '',
    'time.sleep(2)',
    '',
    'pioneer.land()',
    'pioneer.close_connection()'
].join('\n');

export function setCurrentScriptLanguage(language: ScriptLanguage) {
    currentScriptLanguage = language;
}

export const simSettings = {
    showTracer: true,
    tracerColor: '#38bdf8',
    tracerWidth: 2,
    tracerShape: 'line', // 'line', 'points', 'both'
    showGizmo: true,
    simSpeed: 1.0,
    gamepadConnected: false,
    gamepadStickMode: 2 as 1 | 2 | 3 | 4,
    gamepadMapping: {
        roll: 'a2' as GamepadInputRef,
        pitch: 'a1' as GamepadInputRef,
        throttle: 'a3' as GamepadInputRef,
        yaw: 'a0' as GamepadInputRef,
        modeSwitch: 'b4' as GamepadInputRef,
        armSwitch: 'b5' as GamepadInputRef,
        magnetBtn: 'b6' as GamepadInputRef
    },
    gamepadCalibration: {
        min: Array.from({ length: 16 }, () => -1),
        max: Array.from({ length: 16 }, () => 1),
        center: Array.from({ length: 16 }, () => 0),
        isCalibrated: false
    },
    gamepadInversion: [false, false, false, true, false, false, false, false], // R, P, T, Y, Mode, Arm, Magnet
    gamepadAuxRanges: {
        arm: { min: 1800, max: 2100, center: 2000 } as AuxChannelRange,
        magnet: { min: 1800, max: 2100, center: 2000 } as AuxChannelRange
    },
    gamepadModeRanges: {
        // Standard 3-position switch values for RadioMaster TX12/TX15/TX16 (1000, 1500, 2000)
        loiter: { min: 900, max: 1250, center: 1000 } as AuxChannelRange,
        althold: { min: 1251, max: 1750, center: 1500 } as AuxChannelRange,
        stabilize: { min: 1751, max: 2100, center: 2000 } as AuxChannelRange
    }
};

const STORAGE_KEY = 'geoskan_sim_gamepad_settings';

export function saveGamepadSettings() {
    if (typeof localStorage === 'undefined') return;
    const data = {
        mapping: simSettings.gamepadMapping,
        inversion: simSettings.gamepadInversion,
        auxRanges: simSettings.gamepadAuxRanges,
        modeRanges: simSettings.gamepadModeRanges,
        stickMode: simSettings.gamepadStickMode
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadGamepadSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (data.mapping) Object.assign(simSettings.gamepadMapping, data.mapping);
            if (data.inversion) simSettings.gamepadInversion = data.inversion;
            if (data.auxRanges) Object.assign(simSettings.gamepadAuxRanges, data.auxRanges);
            if (data.modeRanges) Object.assign(simSettings.gamepadModeRanges, data.modeRanges);
            if (data.stickMode) simSettings.gamepadStickMode = data.stickMode;
        }
    } catch (e) {
        console.warn('[State] Failed to load gamepad settings:', e);
    }
}

// Load on init
loadGamepadSettings();

export function matchesAuxRange(value: number, range: AuxChannelRange): boolean {
    const min = Math.max(1000, Math.min(range.min, range.max));
    const max = Math.min(2000, Math.max(range.min, range.max));
    return value >= min && value <= max;
}

export function createDroneState(id: string, name: string, x: number = 0, y: number = 0, z: number = 0): DroneState {
    const drone: DroneState = {
        id, name,
        running: false,
        current_time: 0,
        pos: { x, y, z },
        vel: { x: 0, y: 0, z: 0 },
        accel: { x: 0, y: 0, z: 9.81 },
        gyro: { x: 0, y: 0, z: 0 },
        orientation: { roll: 0, pitch: 0, yaw: 0 },
        battery: 100,
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
        luaState: null
    };
    drones[id] = drone;
    return drone;
}

// Initialize the first default drone
createDroneState('drone_1', 'Pioneer 1');

// Backward compatibility alias: simState points to the currently selected drone
export const simState = new Proxy({} as DroneState, {
    get: (target, prop) => {
        if (!drones[currentDroneId]) return undefined;
        return (drones[currentDroneId] as any)[prop];
    },
    set: (target, prop, value) => {
        if (!drones[currentDroneId]) return false;
        (drones[currentDroneId] as any)[prop] = value;
        return true;
    }
});

export function setCurrentDrone(id: string) {
    if (drones[id]) currentDroneId = id;
}

export const MAX_PATH_POINTS = 2000;
export const pathPoints: Record<string, Vector3[]> = { 'drone_1': [] };

const DISARMED_STATUSES = new Set([
    'IDLE',
    'ОШИБКА',
    'CRASHED',
    'DISARMED_FALL'
]);

export function isDroneArmed(drone: DroneState): boolean {
    return !DISARMED_STATUSES.has(drone.status);
}

export function resetRuntimeStatePreservePose(id: string = currentDroneId) {
    const drone = drones[id];
    if (!drone) return;
    const posePos = { x: drone.pos.x, y: drone.pos.y, z: drone.pos.z };
    const poseOrientation = {
        roll: drone.orientation.roll,
        pitch: drone.orientation.pitch,
        yaw: drone.orientation.yaw
    };

    resetState(id);

    drone.pos = posePos;
    drone.orientation = poseOrientation;
    drone.target_alt = posePos.z;
    drone.target_pos = { x: posePos.x, y: posePos.y, z: posePos.z };
    drone.target_yaw = poseOrientation.yaw;
}

export function getDroneFromLua(L: any): DroneState {
    window.fengari.lua.lua_getglobal(L, window.fengari.to_luastring("__DRONE_ID__"));
    const idStr = window.fengari.lua.lua_tostring(L, -1);
    const id = idStr ? window.fengari.to_jsstring(idStr) : currentDroneId;
    window.fengari.lua.lua_pop(L, 1);
    return drones[id] || drones[currentDroneId];
}

export function resetState(id: string = currentDroneId) {
    const drone = drones[id];
    if (!drone) return;
    drone.running = false;
    drone.current_time = 0;
    drone.vel = { x: 0, y: 0, z: 0 };
    drone.accel = { x: 0, y: 0, z: 9.81 };
    drone.gyro = { x: 0, y: 0, z: 0 };
    drone.battery = 100;
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
    pathPoints[id] = [];
}
