import { drones, simSettings } from '../core/state.js';
import { getAutopilotRuntimeConfig } from '../autopilot/params-runtime.js';
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
    getDroneCameraCvFrame,
    getDroneCameraFrame,
    isDroneCameraConnected
} from './pioneer-js-bridge-camera.js';

type CvWindowState = {
    root: HTMLDivElement;
    title: HTMLDivElement;
    body: HTMLDivElement;
};

const cvWindows = new Map<string, CvWindowState>();
let cvKeyboardInstalled = false;
let lastCvKeyCode = -1;

function installCvKeyboardBridge() {
    if (cvKeyboardInstalled || typeof window === 'undefined') return;
    cvKeyboardInstalled = true;
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            lastCvKeyCode = 27;
            return;
        }
        if (event.key && event.key.length === 1) {
            lastCvKeyCode = event.key.charCodeAt(0);
        }
    });
}

function ensureCvWindow(windowName: string) {
    const existing = cvWindows.get(windowName);
    if (existing) {
        existing.root.style.display = 'flex';
        existing.title.textContent = windowName || 'OpenCV Preview';
        return existing;
    }

    const host = document.body;
    if (!host) return null;

    const root = document.createElement('div');
    root.className = 'python-cv-modal modal-overlay';
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.display = 'flex';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.padding = '24px';
    root.style.background = 'rgba(2, 6, 23, 0.7)';
    root.style.backdropFilter = 'blur(4px)';
    root.style.zIndex = '1200';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '14px 16px';
    header.style.background = 'rgba(30, 41, 59, 0.95)';
    header.style.borderBottom = '1px solid rgba(148, 163, 184, 0.18)';

    const title = document.createElement('div');
    title.textContent = windowName || 'OpenCV Preview';
    title.style.fontSize = '16px';
    title.style.fontWeight = '600';

    const hint = document.createElement('div');
    hint.textContent = '`q` or `Esc`';
    hint.style.fontSize = '12px';
    hint.style.opacity = '0.75';
    hint.style.marginLeft = '8px';

    const titleWrap = document.createElement('div');
    titleWrap.style.display = 'flex';
    titleWrap.style.alignItems = 'center';
    titleWrap.append(title, hint);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Закрыть';
    closeBtn.style.border = '1px solid rgba(148, 163, 184, 0.28)';
    closeBtn.style.background = 'rgba(15, 23, 42, 0.65)';
    closeBtn.style.color = '#e2e8f0';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '13px';
    closeBtn.style.padding = '6px 10px';
    closeBtn.style.borderRadius = '8px';
    closeBtn.addEventListener('click', () => {
        root.style.display = 'none';
        lastCvKeyCode = 27;
    });

    root.addEventListener('click', (event) => {
        if (event.target === root) {
            root.style.display = 'none';
            lastCvKeyCode = 27;
        }
    });

    header.append(titleWrap, closeBtn);

    const content = document.createElement('div');
    content.className = 'python-cv-modal__content';
    content.style.width = 'min(820px, calc(100vw - 48px))';
    content.style.maxHeight = 'min(88vh, 920px)';
    content.style.background = 'rgba(10, 14, 24, 0.98)';
    content.style.border = '1px solid rgba(96, 165, 250, 0.45)';
    content.style.borderRadius = '16px';
    content.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.45)';
    content.style.color = '#e5eefc';
    content.style.overflow = 'hidden';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    const body = document.createElement('div');
    body.style.padding = '16px';
    body.style.fontFamily = 'ui-monospace, SFMono-Regular, Consolas, monospace';
    body.style.fontSize = '13px';
    body.style.lineHeight = '1.45';
    body.style.whiteSpace = 'pre-wrap';
    body.style.minHeight = '320px';
    body.style.maxHeight = 'calc(88vh - 64px)';
    body.style.overflow = 'auto';
    body.textContent = 'Ожидание кадра...';

    content.append(header, body);
    root.appendChild(content);
    host.appendChild(root);

    const state = { root, title, body };
    cvWindows.set(windowName, state);
    return state;
}

function renderCvFrameSummary(frame: unknown) {
    if (!frame) {
        return 'Кадр не получен.\nПроверьте, находится ли дрон в зоне видеомачты.';
    }

    if (typeof frame === 'object') {
        const payload = frame as Record<string, unknown>;
        if (payload.connected === false) {
            const details = typeof payload.message === 'string'
                ? payload.message
                : 'Камера не подключена.';
            return `Камера не подключена.\n${details}\n\nЧто сделать:\n1. Добавьте в сцену видеомачту.\n2. Подлетите дроном ближе к ней.\n3. Запустите пример снова или дождитесь следующего кадра.`;
        }
        if (payload.source === 'video-tower') {
            const lines = [
                'Источник: видеомачта',
                `Tower: ${String(payload.towerName || payload.towerId || 'unknown')}`,
                `Connected: ${String(payload.connected ?? true)}`,
                `Distance: ${String(payload.distance ?? '?')} m`,
                `Drone: ${JSON.stringify(payload.drone_position ?? payload.dronePosition ?? [])}`,
                `Tower: ${JSON.stringify(payload.tower_position ?? [])}`,
                `Delta: ${JSON.stringify(payload.delta ?? [])}`
            ];
            return lines.join('\n');
        }
        return JSON.stringify(payload, null, 2);
    }

    return String(frame);
}

export function installJsRuntimeAPI() {
    const w = window as any;
    installCvKeyboardBridge();

    w.py_is_cancelled = (id: string) => Boolean(cancelledRuns[id]);
    w.pioneer_input = (promptText: string) => {
        if (typeof window.prompt === 'function') {
            return window.prompt(String(promptText ?? '')) ?? '';
        }
        return '';
    };
    w.pioneer_resolve_drone_id = (requestedName: string, requestedIp: string) => {
        return resolvePythonDroneId(String(w.SIM_DRONE_ID || ''), requestedName, requestedIp);
    };
    w.pioneer_print = (id: string, text: string) => {
        showDronePrintBubble(id, String(text ?? ''));
        return null;
    };
    w.pioneer_cv_imshow = (windowName: string, frame: unknown) => {
        const cvWindow = ensureCvWindow(String(windowName || 'OpenCV Preview'));
        if (!cvWindow) return null;
        cvWindow.root.style.display = 'flex';
        cvWindow.body.textContent = renderCvFrameSummary(frame);
        return null;
    };
    w.pioneer_cv_wait_key = (_delayMs: number) => {
        const keyCode = lastCvKeyCode;
        lastCvKeyCode = -1;
        return keyCode;
    };
    w.pioneer_cv_destroy_all_windows = () => {
        for (const state of cvWindows.values()) {
            state.root.remove();
        }
        cvWindows.clear();
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
        d.pendingLocalPointTarget = null;
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
        const minHeight = getAutopilotRuntimeConfig().sensors.altMinHeight;
        return d.pos.z >= minHeight ? d.pos.z : 0;
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

    w.pioneer_led_control = (id: string, led_id: any, r: any, g: any, b: any) => {
        if (w.py_is_cancelled(id)) throw new Error('PYTHON_CANCELLED');
        const d = getDroneOrDefault(id);
        const ledId = Number(led_id);
        const rn = Number(r);
        const gn = Number(g);
        const bn = Number(b);
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
}

