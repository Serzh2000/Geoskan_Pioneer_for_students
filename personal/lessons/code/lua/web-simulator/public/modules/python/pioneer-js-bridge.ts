import { drones, simSettings, ensureDronePythonConnectionSettings } from '../core/state.js';
import { getAutopilotRuntimeConfig } from '../autopilot/params-runtime.js';
import { measureSurfaceBelow, readOpticalFlow } from '../sensors/downward.js';
import { vehicleGetState, vehicleSetSpeed, vehicleStart, vehicleStop } from '../vehicles/api.js';
import {
    applyGoToLocalPointRequest,
    enterLandingProcess,
    enterPreflight,
    enterTakeoffProcess,
    isDroneMovingState,
    recordTickCommand,
    setDroneFsmState,
    withCommandSource
} from '../autopilot/fsm.js';
import { showDronePrintBubble } from '../drone/index.js';
import { beginDisarmedFall, AIRBORNE_ALTITUDE_EPSILON } from '../physics/events.js';
import { triggerLuaCallback } from '../lua/index.js';
import { shouldDispatchLuaEvent } from '../lua/mission-guard.js';
import { runLuaScript, stopLuaScript } from '../lua/runtime.js';
import {
    cancelledRuns,
    getDroneOrDefault,
    lastManualSpeedUpdateMs,
    localOriginByDrone,
    resolvePythonDroneId
} from './runtime-shared.js';
import {
    closeDroneCameraConnection,
    connectDroneCamera,
    disconnectDroneCamera,
    downloadDroneCameraPhoto,
    getDroneCameraCvFrame,
    getDroneCameraFrame,
    isDroneCameraConnected
} from './pioneer-js-bridge-camera.js';
import { installCvRuntimeAPI } from './pioneer-js-bridge-cv.js';

// Python scripts run synchronously between asyncio yields, same as a Lua chunk between
// coroutine resumes, so a malformed numeric argument must not become NaN and silently
// corrupt drone state/physics; fall back to a safe default instead.
function toFiniteNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function installJsRuntimeAPI() {
    const w = window as any;
    installCvRuntimeAPI(w);

    w.py_is_cancelled = (id: string) => Boolean(cancelledRuns[id]);
    w.pioneer_input = (promptText: string) => {
        if (typeof window.prompt === 'function') {
            return window.prompt(String(promptText ?? '')) ?? '';
        }
        return '';
    };
    w.pioneer_resolve_drone_id = (
        requestedName: string,
        requestedIp: string,
        requestedPort?: number | string,
        requestedConnectionMethod?: string
    ) => {
        return resolvePythonDroneId(
            String(w.SIM_DRONE_ID || ''),
            requestedName,
            requestedIp,
            requestedPort,
            requestedConnectionMethod
        );
    };
    w.pioneer_get_default_camera_port = (id: string) => {
        const droneId = String(id || w.SIM_DRONE_ID || '');
        const connection = ensureDronePythonConnectionSettings(droneId);
        return Number(connection.cameraPort || 18001);
    };
    w.pioneer_print = (id: string, text: string) => {
        showDronePrintBubble(id, String(text ?? ''));
        return null;
    };
    w.pioneer_arm = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return withCommandSource(d, 'python', () => {
            recordTickCommand(d, 'preflight');
            const ok = enterPreflight(d);
            if (ok) {
                if (shouldDispatchLuaEvent(d, 11)) triggerLuaCallback(id, 11);
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
            d.pendingLocalPointTarget = null;
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
        return withCommandSource(d, 'python', () => {
            recordTickCommand(d, 'takeoff');
            return enterTakeoffProcess(d);
        });
    };

    w.pioneer_land = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        return withCommandSource(d, 'python', () => {
            recordTickCommand(d, 'landing');
            return enterLandingProcess(d);
        });
    };

    w.pioneer_go_to_local_point = (id: string, x: any, y: any, z: any, yaw: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const origin = localOriginByDrone[id] || { x: 0, y: 0, z: 0 };
        const tx = x == null ? d.pos.x : origin.x + toFiniteNumber(x, 0);
        const ty = y == null ? d.pos.y : origin.y + toFiniteNumber(y, 0);
        const tz = z == null ? d.pos.z : origin.z + toFiniteNumber(z, 0);
        const yawm = yaw == null ? d.target_yaw : toFiniteNumber(yaw, d.target_yaw);

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

    const MANUAL_SPEED_TIMEOUT_MS = 500;
    w.pioneer_set_manual_speed = (id: string, vx: any, vy: any, vz: any, yaw_rate: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const now = performance.now();
        const last = lastManualSpeedUpdateMs[id];
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.05;
        lastManualSpeedUpdateMs[id] = now;

        const vxn = toFiniteNumber(vx, 0);
        const vyn = toFiniteNumber(vy, 0);
        const vzn = toFiniteNumber(vz, 0);
        const yrn = toFiniteNumber(yaw_rate, 0);

        if (d.fsmState === 'IDLE' || d.fsmState === 'PREFLIGHT') {
            return false;
        }

        setDroneFsmState(d, isDroneMovingState(d) ? 'FLYING_MOVING' : 'FLYING_HOVER');
        d.pendingLocalPoint = false;
        d.pendingLocalPointSource = null;
        d.pendingLocalPointTarget = null;
        // A velocity command, not a nudge of the target point: the autopilot
        // tracks this speed until commands stop arriving for 0.5 s, then holds
        // position (physics/flight-update.ts). Previously target_pos moved by
        // v*dt, which capped real speed at a fraction of what was asked.
        d.manualVelocity = { x: vxn, y: vyn, z: vzn, expiresAt: now + MANUAL_SPEED_TIMEOUT_MS };
        d.target_pos = { ...d.pos };
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
        const minHeight = getAutopilotRuntimeConfig().sensors.altMinHeight;
        // Distance to whatever is straight below - ground, a roof, a moving train.
        const range = measureSurfaceBelow(d.pos).range;
        return range >= minHeight ? range : 0;
    };

    w.pioneer_get_optical_flow = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const reading = readOpticalFlow(getDroneOrDefault(id));
        return [reading.flowX, reading.flowY, reading.quality];
    };

    // Simulator-only scenario API: cars and trains on the scene, by name.
    // Errors come back as [false, message] so Python can raise its own exception.
    const vehicleCall = <T>(run: () => T) => {
        try {
            return [true, run()];
        } catch (error) {
            return [false, error instanceof Error ? error.message : String(error)];
        }
    };
    w.pioneer_vehicle_start = (name: string) => vehicleCall(() => vehicleStart(name));
    w.pioneer_vehicle_stop = (name: string) => vehicleCall(() => vehicleStop(name));
    w.pioneer_vehicle_set_speed = (name: string, speed: number) => vehicleCall(() => vehicleSetSpeed(name, speed));
    w.pioneer_vehicle_state = (name: string) => vehicleCall(() => {
        const s = vehicleGetState(name);
        return [s.name, s.kind, s.x, s.y, s.z, s.heading, s.speed, s.moving, s.markerId];
    });

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

    w.pioneer_led_control = (id: string, led_id: any, r: any, g: any, b: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const ledId = toFiniteNumber(led_id, -1);
        const rn = toFiniteNumber(r, 0);
        const gn = toFiniteNumber(g, 0);
        const bn = toFiniteNumber(b, 0);
        if (ledId === 255) {
            for (let i = 0; i < d.leds.length; i += 1) {
                d.leds[i] = { r: rn, g: gn, b: bn, w: 0 };
            }
            return true;
        }
        if (Number.isInteger(ledId) && ledId >= 0 && ledId < Math.min(4, d.leds.length)) {
            d.leds[ledId] = { r: rn, g: gn, b: bn, w: 0 };
            return true;
        }
        return false;
    };

    w.pioneer_send_rc_channels = (
        id: string,
        channel_1: any,
        channel_2: any,
        channel_3: any,
        channel_4: any,
        channel_5: any,
        channel_6: any,
        channel_7: any,
        channel_8: any
    ) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const nextValues = [channel_1, channel_2, channel_3, channel_4, channel_5, channel_6, channel_7, channel_8];
        for (let i = 0; i < nextValues.length; i += 1) {
            const raw = Number(nextValues[i]);
            if (!Number.isFinite(raw) || raw === 0xFF) continue;
            d.rcChannels[i] = Math.max(1000, Math.min(2000, raw));
        }
        // Python RC examples should drive the same manual-flight path as a connected transmitter.
        simSettings.gamepadConnected = true;
        return true;
    };

    w.pioneer_lua_script_control = (id: string, command: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const droneId = String(id || w.SIM_DRONE_ID || '');
        const drone = getDroneOrDefault(droneId);
        const action = String(command ?? '').trim().toLowerCase();
        if (action === 'start') {
            if (!drone?.script) return false;
            drone.running = true;
            runLuaScript(drone.id, drone.script);
            return true;
        }
        if (action === 'stop') {
            stopLuaScript(drone.id);
            drone.running = false;
            return true;
        }
        return false;
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

    // Скачивание снимка (блок «Сделать снимок», Python-таргет). Отдельная
    // функция моста, а не метод класса Camera в prelude: у настоящего
    // pioneer_sdk такого метода нет, и выдумывать его — значит учить ученика
    // несуществующему API.
    w.pioneer_camera_save_photo = (id: string) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        return downloadDroneCameraPhoto(id);
    };
}

