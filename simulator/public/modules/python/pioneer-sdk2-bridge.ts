import { droneMeshes } from '../drone/index.js';
import { setDroneCameraTilt } from '../drone-model/index.js';
import { droneModelProfile } from '../core/drone-models.js';
import { recordLearningEvent } from '../core/learning-journal.js';
import { activateAutopilotRtl } from '../autopilot/params-runtime.js';
import { applyGoToLocalPointRequest, isDroneMovingState, setDroneFsmState } from '../autopilot/fsm.js';
import { beginEventCallbackPhase } from '../autopilot/fsm-runtime.js';
import { withCommandSource } from '../autopilot/fsm.js';
import { bodyPlanarToWorld } from '../physics/frames.js';
import { readRanger } from '../sensors/ranger.js';
import { log } from '../shared/logging/logger.js';
import { cancelledRuns, getDroneOrDefault, lastManualSpeedUpdateMs } from './runtime-shared.js';

/*
 * JS-сторона pioneer_sdk2 (pioneer-sdk2-module.ts). Команды, общие с
 * pioneer_sdk (arm, land, точки, светодиоды, камера), идут через мост
 * pioneer-js-bridge.ts; здесь - только то, чего у SDK 2 нет в первом SDK:
 * снимок состояния для потока событий, скорость с interval, Ranger,
 * захват и наклон камеры Мини 2.
 */

function finite(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function checkCancelled(id: string) {
    if (cancelledRuns[id]) throw new Error('PYTHON_CANCELLED');
}

export function installSdk2RuntimeAPI(w: Record<string, unknown>) {
    w.pioneer2_drone_model = (id: string) => getDroneOrDefault(id).model;

    // Сообщения logger=True библиотеки - в журнал симулятора, как вывод SDK в терминале дрона.
    w.pioneer2_log = (text: string) => {
        log(`[SDK2] ${String(text ?? '')}`, 'info');
        return null;
    };

    // [fsm, status, low1, low2, reached, distance to target, x, y, z, yaw]
    // reached снимается при чтении: точку засчитывает один поток событий SDK.
    w.pioneer2_snapshot = (id: string) => {
        checkCancelled(id);
        const d = getDroneOrDefault(id);
        const reached = Boolean(d.pointReachedFlag);
        d.pointReachedFlag = false;
        const target = d.pendingLocalPointTarget ?? d.target_pos;
        const distance = Math.hypot(target.x - d.pos.x, target.y - d.pos.y, target.z - d.pos.z);
        return [d.fsmState, d.status, d.batteryLowVoltage1Notified, d.batteryLowVoltage2Notified,
            reached, distance, d.pos.x, d.pos.y, d.pos.z, d.orientation.yaw];
    };

    w.pioneer2_go_to = (id: string, x: unknown, y: unknown, z: unknown, yaw: unknown, time: unknown) => {
        checkCancelled(id);
        const d = getDroneOrDefault(id);
        const target = { x: finite(x, d.pos.x), y: finite(y, d.pos.y), z: finite(z, d.pos.z) };
        const yawRad = yaw == null ? d.target_yaw : finite(yaw, d.target_yaw);
        beginEventCallbackPhase(d);
        const accepted = withCommandSource(d, 'python', () => applyGoToLocalPointRequest(d, target, { yaw: yawRad }));
        const seconds = finite(time, 0);
        if (accepted) {
            d.timedGoTo = seconds > 0 ? { to: { ...target }, duration: seconds, from: null, startTime: null } : null;
        }
        return accepted;
    };

    // set_manual_speed SDK 2: одна команда держит скорость interval секунд.
    w.pioneer2_set_manual_speed = (id: string, vx: unknown, vy: unknown, vz: unknown, yawRate: unknown, interval: unknown, bodyFixed: unknown) => {
        checkCancelled(id);
        const d = getDroneOrDefault(id);
        if (d.fsmState === 'IDLE' || d.fsmState === 'PREFLIGHT') return false;
        let x = finite(vx, 0);
        let y = finite(vy, 0);
        if (bodyFixed) {
            const world = bodyPlanarToWorld(x, y, d.orientation.yaw);
            x = world.x;
            y = world.y;
        }
        const z = finite(vz, 0);
        const now = performance.now();
        lastManualSpeedUpdateMs[id] = now;
        setDroneFsmState(d, isDroneMovingState(d) ? 'FLYING_MOVING' : 'FLYING_HOVER');
        d.pendingLocalPoint = false;
        d.pendingLocalPointSource = null;
        d.pendingLocalPointTarget = null;
        d.timedGoTo = null;
        d.manualVelocity = {
            x, y, z,
            yawRate: finite(yawRate, 0),
            expiresAt: now + Math.max(0, finite(interval, 1)) * 1000
        };
        d.target_pos = { ...d.pos };
        d.pointReachedFlag = false;
        recordLearningEvent(id, { kind: 'velocity', time: d.current_time, velocity: { x, y, z }, pos: { ...d.pos }, yaw: d.orientation.yaw });
        return true;
    };

    w.pioneer2_rtl = (id: string) => {
        checkCancelled(id);
        const d = getDroneOrDefault(id);
        if (d.fsmState === 'IDLE' || d.fsmState === 'PREFLIGHT') return false;
        activateAutopilotRtl(d.id, 'pioneer.rtl()');
        return true;
    };

    // (vx, vy, vz) м/с, (ax, ay, az) м/с², (gx, gy, gz) рад/с, (roll, pitch, yaw) рад
    w.pioneer2_motion = (id: string) => {
        checkCancelled(id);
        const d = getDroneOrDefault(id);
        return [d.vel.x, d.vel.y, d.vel.z, d.accel.x, d.accel.y, d.accel.z,
            d.gyro.x, d.gyro.y, d.gyro.z, d.orientation.roll, d.orientation.pitch, d.orientation.yaw,
            d.current_time, d.batteryVoltage];
    };

    w.pioneer2_ranger = (id: string) => {
        checkCancelled(id);
        const reading = readRanger(getDroneOrDefault(id));
        return [reading.right, reading.left, reading.front, reading.back, reading.below];
    };

    // Захват Мини 2. В симуляторе он подхватывает груз так же, как магнит Базового.
    w.pioneer2_grab = (id: string, closed: unknown) => {
        checkCancelled(id);
        const d = getDroneOrDefault(id);
        if (!droneModelProfile(d.model).grab) return false;
        d.magnetGripper.active = Boolean(closed);
        return true;
    };

    w.pioneer2_camera_tilt = (id: string, degrees: unknown) => {
        checkCancelled(id);
        const d = getDroneOrDefault(id);
        const servo = droneModelProfile(d.model).servoCamera;
        if (!servo) return false;
        const angle = Math.max(servo.min, Math.min(servo.max, finite(degrees, 0)));
        const mesh = droneMeshes[d.id];
        if (mesh) setDroneCameraTilt(mesh, angle, { smooth: true });
        return true;
    };
}
