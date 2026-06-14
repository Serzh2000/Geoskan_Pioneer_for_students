/* eslint-disable @typescript-eslint/no-explicit-any */
import { drones } from '../core/state.js';
import {
    applyGoToLocalPointRequest,
    enterLandingProcess,
    enterPreflight,
    enterTakeoffProcess,
    isDroneMovingState,
    setDroneFsmState,
    withCommandSource
} from '../autopilot/fsm.js';
import { showDronePrintBubble } from '../drone/index.js';
import { beginDisarmedFall, AIRBORNE_ALTITUDE_EPSILON } from '../physics/events.js';
import { triggerLuaCallback } from '../lua/index.js';
import { cancelledRuns, getDroneOrDefault, lastManualSpeedUpdateMs, localOriginByDrone } from './runtime-shared.js';
import {
    closeDroneCameraConnection,
    connectDroneCamera,
    disconnectDroneCamera,
    getDroneCameraCvFrame,
    getDroneCameraFrame,
    isDroneCameraConnected
} from './pioneer-js-bridge-camera.js';

export function installJsRuntimeAPI() {
    const w = window as any;

    w.py_is_cancelled = (id: string) => Boolean(cancelledRuns[id]);
    w.pioneer_print = (id: string, text: string) => {
        showDronePrintBubble(id, String(text ?? ''));
        return null;
    };

    w.pioneer_arm = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return withCommandSource(d, 'python', () => {
            const ok = enterPreflight(d);
            if (ok) {
                triggerLuaCallback(id, 11);
            }
            return ok;
        });
    };

    w.pioneer_disarm = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        if (d.pos.z > AIRBORNE_ALTITUDE_EPSILON) {
            beginDisarmedFall(d, id, 'pioneer.disarm() в воздухе');
        } else {
            setDroneFsmState(d, 'IDLE');
            d.pendingLocalPoint = false;
            d.pendingLocalPointSource = null;
            d.pointReachedFlag = false;
            d.vel = { x: 0, y: 0, z: 0 };
            d.target_pos = { ...d.pos, z: 0 };
            d.target_alt = 0;
        }
        return true;
    };

    w.pioneer_takeoff = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return withCommandSource(d, 'python', () => enterTakeoffProcess(d));
    };

    w.pioneer_land = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return withCommandSource(d, 'python', () => enterLandingProcess(d));
    };

    w.pioneer_go_to_local_point = (id: string, x: any, y: any, z: any, yaw: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const origin = localOriginByDrone[id] || { x: 0, y: 0, z: 0 };
        const tx = x == null ? d.pos.x : origin.x + Number(x);
        const ty = y == null ? d.pos.y : origin.y + Number(y);
        const tz = z == null ? d.pos.z : origin.z + Number(z);
        const yawm = yaw == null ? d.target_yaw : Number(yaw);

        return withCommandSource(d, 'python', () => applyGoToLocalPointRequest(d, { x: tx, y: ty, z: tz }, { yaw: yawm }));
    };

    w.pioneer_go_to_local_point_body_fixed = (id: string, x: any, y: any, z: any, yaw: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return w.pioneer_go_to_local_point(id, x, y, z, yaw);
    };

    w.pioneer_point_reached = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const val = Boolean(d.pointReachedFlag);
        d.pointReachedFlag = false;
        return val;
    };

    w.pioneer_set_manual_speed = (id: string, vx: any, vy: any, vz: any, yaw_rate: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const now = performance.now();
        const last = lastManualSpeedUpdateMs[id];
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.05;
        lastManualSpeedUpdateMs[id] = now;

        const vxn = Number(vx);
        const vyn = Number(vy);
        const vzn = Number(vz);
        const yrn = Number(yaw_rate);

        if (d.fsmState === 'IDLE' || d.fsmState === 'PREFLIGHT') {
            return false;
        }

        setDroneFsmState(d, isDroneMovingState(d) ? 'FLYING_MOVING' : 'FLYING_HOVER');
        d.pendingLocalPoint = false;
        d.pendingLocalPointSource = null;
        d.target_pos = {
            x: d.pos.x + vxn * dt,
            y: d.pos.y + vyn * dt,
            z: Math.max(0, d.pos.z + vzn * dt)
        };
        d.target_yaw = d.target_yaw + yrn * dt;
        d.pointReachedFlag = false;
        return true;
    };

    w.pioneer_set_manual_speed_body_fixed = (id: string, vx: any, vy: any, vz: any, yaw_rate: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return w.pioneer_set_manual_speed(id, vx, vy, vz, yaw_rate);
    };

    w.pioneer_get_local_position_lps = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return [d.pos.x, d.pos.y, d.pos.z];
    };

    w.pioneer_get_dist_sensor_data = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return d.pos.z;
    };

    w.pioneer_get_battery_status = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return d.batteryVoltage;
    };

    w.pioneer_get_autopilot_state = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        switch (d.fsmState) {
            case 'PREFLIGHT': return 'ARMED';
            case 'TAKEOFF_PROCESS': return 'TAKEOFF';
            case 'FLYING_HOVER':
            case 'FLYING_MOVING': return 'MISSION';
            case 'LANDING_PROCESS': return 'LANDING';
            case 'IDLE': return 'DISARMED';
            default: return d.status === 'CRASHED' ? 'ROOT' : d.status;
        }
    };

    w.pioneer_led_control = (id: string, r: any, g: any, b: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const rn = Number(r);
        const gn = Number(g);
        const bn = Number(b);
        for (let i = 0; i < d.leds.length; i += 1) {
            d.leds[i] = { r: rn, g: gn, b: bn, w: 0 };
        }
        return true;
    };

    w.pioneer_close_connection = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return closeDroneCameraConnection(id);
    };

    w.pioneer_camera_connect = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return connectDroneCamera(id);
    };

    w.pioneer_camera_disconnect = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return disconnectDroneCamera(id);
    };

    w.pioneer_camera_connected = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return isDroneCameraConnected(id);
    };

    w.pioneer_camera_get_frame = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return getDroneCameraFrame(id);
    };

    w.pioneer_camera_get_cv_frame = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return getDroneCameraCvFrame(id);
    };
}

