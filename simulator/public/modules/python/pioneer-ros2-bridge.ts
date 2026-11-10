import { log } from '../shared/logging/logger.js';
import { droneModelProfile, droneSdk } from '../core/drone-models.js';
import { getAutopilotRuntimeConfig } from '../autopilot/params-runtime.js';
import { measureSurfaceBelow, readOpticalFlow } from '../sensors/downward.js';
import { readRanger } from '../sensors/ranger.js';
import { cancelledRuns, getDroneOrDefault } from './runtime-shared.js';
import { drones } from '../core/state.js';
import { simClock } from '../physics/sim-clock.js';

/*
 * JS-сторона эмуляции ROS 2 (ros2/prelude-*.ts). Команды идут через те же функции моста, что у pioneer_sdk2
 * (pioneer_arm, pioneer2_go_to, ...): полёт, светодиоды, захват и датчики ведут себя так же.
 * Отличие: ros_pioneer_node живёт дольше программы ученика и работает от консоли, поэтому эти функции
 * не бросают PYTHON_CANCELLED после «Стоп» (флаг отмены на время вызова снимается).
 */

function finite(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

// Функции окна (window.pioneer_*) принимают значения из Python как есть.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bridge = Record<string, (...args: any[]) => any>;

/** Состояние для Python: см. _PioneerNode и Clock в ros2/prelude-*.ts. null - дрона больше нет. */
export function ros2StateOf(id: string) {
    const d = drones[id];
    if (!d) return null;
    const profile = droneModelProfile(d.model);
    const target = d.pendingLocalPointTarget ?? d.target_pos;
    const below = measureSurfaceBelow(d.pos).range;
    const minHeight = getAutopilotRuntimeConfig().sensors.altMinHeight;
    const flow = readOpticalFlow(d);
    const ranger = readRanger(d);
    return {
        fsm: String(d.fsmState),
        status: String(d.status),
        time: simClock(),
        pos: [d.pos.x, d.pos.y, d.pos.z],
        vel: [d.vel.x, d.vel.y, d.vel.z],
        accel: [d.accel.x, d.accel.y, d.accel.z],
        gyro: [d.gyro.x, d.gyro.y, d.gyro.z],
        rpy: [d.orientation.roll, d.orientation.pitch, d.orientation.yaw],
        battery: d.batteryVoltage,
        low1: Boolean(d.batteryLowVoltage1Notified),
        low2: Boolean(d.batteryLowVoltage2Notified),
        dist: below >= minHeight ? below : 0,
        flow: [flow.flowX, flow.flowY],
        ranger: [ranger.right, ranger.left, ranger.front, ranger.back, ranger.below],
        ranger_hw: profile.ranger,
        rc8: finite(d.rcChannels?.[7], 0),
        model: String(d.model),
        distance: Math.hypot(target.x - d.pos.x, target.y - d.pos.y, target.z - d.pos.z),
        led_count: profile.ledCount
    };
}

export function installRos2RuntimeAPI(w: Record<string, unknown> & Bridge) {
    // Вызов функции моста без проверки отмены программы.
    const direct = <T>(id: string, run: () => T): T => {
        const previous = cancelledRuns[id];
        cancelledRuns[id] = false;
        try {
            return run();
        } finally {
            cancelledRuns[id] = previous;
        }
    };

    w.ros2_state = (id: string) => ros2StateOf(id);
    // Часы симуляции, а не drone.current_time: у дрона без программы (консоль ros2 работает без неё) current_time стоит.
    w.ros2_time = (id: string) => (drones[id] ? simClock() : null);
    w.ros2_enabled = (id: string) => droneSdk(getDroneOrDefault(id)) === 'pioneer_sdk2';
    w.ros2_log = (level: string, text: string) => {
        log(`[ROS 2] ${String(text ?? '')}`, level === 'ERROR' || level === 'FATAL' ? 'error' : level === 'WARN' ? 'warn' : 'info');
        return null;
    };
    // reached снимается при чтении: точку засчитывает один читатель - ros_pioneer_node.
    w.ros2_reached = (id: string) => {
        const d = drones[id];
        if (!d) return false;
        const reached = Boolean(d.pointReachedFlag);
        d.pointReachedFlag = false;
        return reached;
    };
    w.ros2_arm = (id: string) => direct(id, () => w.pioneer_arm(id));
    w.ros2_disarm = (id: string) => direct(id, () => w.pioneer_disarm(id));
    w.ros2_takeoff = (id: string) => direct(id, () => w.pioneer_takeoff(id));
    w.ros2_land = (id: string) => direct(id, () => w.pioneer_land(id));
    w.ros2_rtl = (id: string) => direct(id, () => w.pioneer2_rtl(id));
    w.ros2_go_to = (id: string, x: number, y: number, z: number, yawRad: number | null, time: number) =>
        direct(id, () => w.pioneer2_go_to(id, x, y, z, yawRad, time));
    w.ros2_speed = (id: string, vx: number, vy: number, vz: number, yawRate: number, interval: number, bodyFixed: boolean) =>
        direct(id, () => w.pioneer2_set_manual_speed(id, vx, vy, vz, yawRate, interval, bodyFixed));
    w.ros2_led = (id: string, ledId: number, r: number, g: number, b: number) => direct(id, () => w.pioneer_led_control(id, ledId, r, g, b));
    w.ros2_grab = (id: string, closed: boolean) => direct(id, () => w.pioneer2_grab(id, closed));
    w.ros2_cargo = (id: string, grab: boolean) => direct(id, () => w.pioneer2_cargo(id, grab));
    w.ros2_rc = (id: string, ...channels: number[]) => direct(id, () => w.pioneer_send_rc_channels(id, ...channels));
}
