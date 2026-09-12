import { drones } from '../core/state.js';
import { isPointReached } from '../autopilot/fsm.js';
import { installJsRuntimeAPI } from './pioneer-js-bridge.js';
import { captureDroneCameraFrameDataUrl, isDroneCameraConnected } from './pioneer-js-bridge-camera.js';
import { localOriginByDrone } from './runtime-shared.js';
import {
    type ExternalBridgeState,
    type ExternalDroneBinding,
    type ExternalPythonBridgeEvent,
    resolveExternalDroneId
} from './external-bridge-binding.js';

let runtimeInstalled = false;

function asNumber(value: unknown, fallback: number | null = null): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }

    return fallback;
}

function callPioneerApi(methodName: string, ...args: unknown[]): unknown {
    const runtime = window as unknown as Record<string, (...callArgs: unknown[]) => unknown>;
    const fn = runtime[methodName];
    if (typeof fn === 'function') {
        return fn(...args);
    }
    return null;
}

function setExternalDroneRuntimeState(droneId: string, active: boolean): void {
    const drone = drones[droneId];
    if (!drone) return;
    drone.running = active;
    if (active) {
        if (drone.status === 'ОСТАНОВЛЕН' || drone.status === 'IDLE') {
            drone.status = 'РАБОТАЕТ';
        }
        return;
    }
    if (drone.status !== 'ОШИБКА' && drone.status !== 'CRASHED' && drone.status !== 'DISARMED_FALL') {
        drone.status = 'ЗАВЕРШЕН';
    }
}

function syncExternalDroneLocalOrigin(droneId: string): void {
    const drone = drones[droneId];
    if (!drone) return;
    localOriginByDrone[droneId] = {
        x: drone.pos.x,
        y: drone.pos.y,
        z: drone.pos.z
    };
}

export function ensureExternalBridgeRuntimeInstalled(): void {
    if (runtimeInstalled) {
        return;
    }

    installJsRuntimeAPI();
    runtimeInstalled = true;
}

export function applyExternalEvent(
    state: ExternalBridgeState,
    event: ExternalPythonBridgeEvent,
    allowDroneId: (droneId: string) => boolean
): void {
    const droneId = resolveExternalDroneId(state, event, { allowDroneId });
    if (!droneId) {
        return;
    }

    const drone = drones[droneId];
    if (drone) {
        drone.name = event.droneName || drone.name;
    }

    switch (event.method) {
        case '__init__':
            syncExternalDroneLocalOrigin(droneId);
            setExternalDroneRuntimeState(droneId, true);
            return;
        case 'arm':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_arm', droneId);
            return;
        case 'disarm':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_disarm', droneId);
            return;
        case 'takeoff':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_takeoff', droneId);
            return;
        case 'land':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_land', droneId);
            return;
        case 'go_to_local_point':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_go_to_local_point', droneId, event.kwargs.x ?? event.args[0] ?? null, event.kwargs.y ?? event.args[1] ?? null, event.kwargs.z ?? event.args[2] ?? null, event.kwargs.yaw ?? event.args[3] ?? null);
            return;
        case 'go_to_local_point_body_fixed':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_go_to_local_point_body_fixed', droneId, event.kwargs.x ?? event.args[0] ?? null, event.kwargs.y ?? event.args[1] ?? null, event.kwargs.z ?? event.args[2] ?? null, event.kwargs.yaw ?? event.args[3] ?? null);
            return;
        case 'set_manual_speed':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_set_manual_speed', droneId, event.kwargs.vx ?? event.args[0] ?? 0, event.kwargs.vy ?? event.args[1] ?? 0, event.kwargs.vz ?? event.args[2] ?? 0, event.kwargs.yaw_rate ?? event.args[3] ?? 0);
            return;
        case 'set_manual_speed_body_fixed':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_set_manual_speed_body_fixed', droneId, event.kwargs.vx ?? event.args[0] ?? 0, event.kwargs.vy ?? event.args[1] ?? 0, event.kwargs.vz ?? event.args[2] ?? 0, event.kwargs.yaw_rate ?? event.args[3] ?? 0);
            return;
        case 'led_control':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_led_control', droneId, asNumber(event.kwargs.led_id ?? event.args[0], 255) ?? 255, asNumber(event.kwargs.r ?? event.args[1], 0) ?? 0, asNumber(event.kwargs.g ?? event.args[2], 0) ?? 0, asNumber(event.kwargs.b ?? event.args[3], 0) ?? 0);
            return;
        case 'send_rc_channels':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_send_rc_channels', droneId, event.kwargs.channel_1 ?? event.args[0] ?? 0xFF, event.kwargs.channel_2 ?? event.args[1] ?? 0xFF, event.kwargs.channel_3 ?? event.args[2] ?? 0xFF, event.kwargs.channel_4 ?? event.args[3] ?? 0xFF, event.kwargs.channel_5 ?? event.args[4] ?? 0xFF, event.kwargs.channel_6 ?? event.args[5] ?? 0xFF, event.kwargs.channel_7 ?? event.args[6] ?? 0xFF, event.kwargs.channel_8 ?? event.args[7] ?? 0xFF);
            return;
        case 'lua_script_control':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_lua_script_control', droneId, event.kwargs.command ?? event.args[0] ?? '');
            return;
        case 'close_connection':
            callPioneerApi('pioneer_close_connection', droneId);
            setExternalDroneRuntimeState(droneId, false);
            return;
        case 'camera_connect':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi('pioneer_camera_connect', droneId);
            return;
        case 'camera_disconnect':
            callPioneerApi('pioneer_camera_disconnect', droneId);
            return;
        default:
            return;
    }
}

export async function syncExternalBridgeStates(
    bindings: Iterable<ExternalDroneBinding>,
    allowDroneId: (droneId: string) => boolean
): Promise<void> {
    const updates = Array.from(bindings).map(async (binding) => {
        const drone = drones[binding.droneId];
        if (!drone || !allowDroneId(binding.droneId)) return;
        const cameraConnected = isDroneCameraConnected(binding.droneId);
        const cameraFrameDataUrl = cameraConnected ? captureDroneCameraFrameDataUrl(binding.droneId) : null;
        const autopilotState = String(callPioneerApi('pioneer_get_autopilot_state', binding.droneId) ?? '') || null;
        const rawLocalPosition = callPioneerApi('pioneer_get_local_position_lps', binding.droneId);
        const localPosition = Array.isArray(rawLocalPosition) && rawLocalPosition.length >= 3
            ? { x: Number(rawLocalPosition[0]), y: Number(rawLocalPosition[1]), z: Number(rawLocalPosition[2]) }
            : null;

        await fetch('/api/external-python-bridge/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: binding.sessionId,
                droneId: binding.droneId,
                droneIp: binding.droneIp,
                mavlinkPort: binding.mavlinkPort,
                connectionMethod: binding.connectionMethod,
                pointReached: isPointReached(drone),
                cameraConnected,
                cameraFrameDataUrl,
                autopilotState,
                localPosition
            })
        }).catch(() => undefined);
    });

    await Promise.all(updates);
}
