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

export type TickFlightCommand = 'preflight' | 'takeoff' | 'goToLocalPoint' | 'landing';

export interface TickCommandSignature {
    tickMs: number;
    commands: TickFlightCommand[];
}

export interface QueuedMceCommand {
    commandId: number;
    issuedAtMs: number;
    source: CommandSource;
}

export interface TimerTask {
    trigger_time: number;
    one_shot: boolean;
    running: boolean;
    callback_ref?: number;
    resume_thread?: any;
    kind?: 'callback' | 'sleep';
    period?: number;
    next_trigger?: number;
    sourceState?: DroneFsmState;
}

export type LuaDiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LuaRuntimeLogEntry {
    timeMs: number;
    level: LuaDiagnosticLevel;
    scope: string;
    message: string;
    location?: string | null;
}

export interface LuaApiCallRecord {
    timeMs: number;
    api: string;
    location: string;
    argumentsText: string;
    fsmState: DroneFsmState;
    commandSource: CommandSource | 'system';
}

export interface LuaFsmTransitionRecord {
    timeMs: number;
    from: DroneFsmState;
    to: DroneFsmState;
    reason: string;
    source: CommandSource | 'system';
}

export interface LuaDiagnosticsState {
    currentPhase: string | null;
    recentLogs: LuaRuntimeLogEntry[];
    recentApiCalls: LuaApiCallRecord[];
    fsmTransitions: LuaFsmTransitionRecord[];
    lastErrorStack: string | null;
    lastFailureReason: string | null;
    lastFailureDetails: string[];
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
    rcChannels: number[];
    magnetGripper: {
        active: boolean;
        attachedObjectId: string | null;
    };
    target_alt: number;
    target_pos: Vector3;
    target_yaw: number;
    pendingLocalPoint?: boolean;
    pendingLocalPointSource?: CommandSource | null;
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
    luaState: any;
    luaDiagnostics: LuaDiagnosticsState;
}

export type ScriptLanguage = 'lua' | 'python';

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
