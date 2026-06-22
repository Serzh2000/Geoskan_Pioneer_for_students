import { drones } from '../core/state.js';
import { installJsRuntimeAPI } from './pioneer-js-bridge.js';
import { captureDroneCameraFrameDataUrl, isDroneCameraConnected } from './pioneer-js-bridge-camera.js';
import { localOriginByDrone } from './runtime-shared.js';
import {
    type ExternalBridgeState,
    type ExternalDroneBinding,
    type ExternalPythonBridgeEvent,
    resolveExternalDroneId
} from './external-bridge-binding.js';

const state: ExternalBridgeState = {
    nextAfterId: 0,
    timerId: null,
    bindings: new Map<string, ExternalDroneBinding>()
};
let bridgeConnectionSyncTimerId: number | null = null;

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

function buildConfiguredConnectionKey(parts: Array<string | number>): string {
    return parts.map((value) => String(value ?? '').trim().toLowerCase()).join('::');
}

async function syncConfiguredBridgeConnections(): Promise<void> {
    const uniqueConnections = new Map<string, Record<string, unknown>>();
    for (const [droneId, drone] of Object.entries(drones)) {
        const connectionMethod = drone.pythonConnection?.connectionMethod === 'serial' || drone.pythonConnection?.connectionMethod === 'udpin'
            ? drone.pythonConnection.connectionMethod
            : 'udpout';
        const droneIp = String(drone.pythonConnection?.ip || '127.0.0.1').trim() || '127.0.0.1';
        const mavlinkPort = Number(drone.pythonConnection?.mavlinkPort || 8001);
        const cameraPort = Number(drone.pythonConnection?.cameraPort || (mavlinkPort + 10000));
        const key = buildConfiguredConnectionKey([connectionMethod, droneIp, mavlinkPort, cameraPort]);
        uniqueConnections.set(key, {
            droneId,
            droneName: drone.name || 'pioneer',
            droneIp,
            mavlinkPort,
            cameraPort,
            connectionMethod,
            device: drone.pythonConnection?.device || '/dev/serial0',
            baud: Number(drone.pythonConnection?.baud || 115200)
        });
    }

    await fetch('/api/mavlink-bridge/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            connections: Array.from(uniqueConnections.values())
        })
    }).catch(() => undefined);
}

async function pollConfiguredBridgeConnections(): Promise<void> {
    await syncConfiguredBridgeConnections();
    bridgeConnectionSyncTimerId = window.setTimeout(() => {
        void pollConfiguredBridgeConnections();
    }, 1500);
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

function applyExternalEvent(event: ExternalPythonBridgeEvent): void {
    const droneId = resolveExternalDroneId(state, event);
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
            callPioneerApi(
                'pioneer_go_to_local_point',
                droneId,
                event.kwargs.x ?? event.args[0] ?? null,
                event.kwargs.y ?? event.args[1] ?? null,
                event.kwargs.z ?? event.args[2] ?? null,
                event.kwargs.yaw ?? event.args[3] ?? null
            );
            return;
        case 'go_to_local_point_body_fixed':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi(
                'pioneer_go_to_local_point_body_fixed',
                droneId,
                event.kwargs.x ?? event.args[0] ?? null,
                event.kwargs.y ?? event.args[1] ?? null,
                event.kwargs.z ?? event.args[2] ?? null,
                event.kwargs.yaw ?? event.args[3] ?? null
            );
            return;
        case 'set_manual_speed':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi(
                'pioneer_set_manual_speed',
                droneId,
                event.kwargs.vx ?? event.args[0] ?? 0,
                event.kwargs.vy ?? event.args[1] ?? 0,
                event.kwargs.vz ?? event.args[2] ?? 0,
                event.kwargs.yaw_rate ?? event.args[3] ?? 0
            );
            return;
        case 'set_manual_speed_body_fixed':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi(
                'pioneer_set_manual_speed_body_fixed',
                droneId,
                event.kwargs.vx ?? event.args[0] ?? 0,
                event.kwargs.vy ?? event.args[1] ?? 0,
                event.kwargs.vz ?? event.args[2] ?? 0,
                event.kwargs.yaw_rate ?? event.args[3] ?? 0
            );
            return;
        case 'led_control':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi(
                'pioneer_led_control',
                droneId,
                asNumber(event.kwargs.led_id ?? event.args[0], 255) ?? 255,
                asNumber(event.kwargs.r ?? event.args[1], 0) ?? 0,
                asNumber(event.kwargs.g ?? event.args[2], 0) ?? 0,
                asNumber(event.kwargs.b ?? event.args[3], 0) ?? 0
            );
            return;
        case 'send_rc_channels':
            setExternalDroneRuntimeState(droneId, true);
            callPioneerApi(
                'pioneer_send_rc_channels',
                droneId,
                event.kwargs.channel_1 ?? event.args[0] ?? 0xFF,
                event.kwargs.channel_2 ?? event.args[1] ?? 0xFF,
                event.kwargs.channel_3 ?? event.args[2] ?? 0xFF,
                event.kwargs.channel_4 ?? event.args[3] ?? 0xFF,
                event.kwargs.channel_5 ?? event.args[4] ?? 0xFF,
                event.kwargs.channel_6 ?? event.args[5] ?? 0xFF,
                event.kwargs.channel_7 ?? event.args[6] ?? 0xFF,
                event.kwargs.channel_8 ?? event.args[7] ?? 0xFF
            );
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

async function syncExternalBridgeStates(): Promise<void> {
    const updates = Array.from(state.bindings.values()).map(async (binding) => {
        const drone = drones[binding.droneId];
        if (!drone) return;
        const cameraConnected = isDroneCameraConnected(binding.droneId);
        const cameraFrameDataUrl = cameraConnected ? captureDroneCameraFrameDataUrl(binding.droneId) : null;
        const autopilotState = String(callPioneerApi('pioneer_get_autopilot_state', binding.droneId) ?? '') || null;
        const rawLocalPosition = callPioneerApi('pioneer_get_local_position_lps', binding.droneId);
        const localPosition = Array.isArray(rawLocalPosition) && rawLocalPosition.length >= 3
            ? {
                x: Number(rawLocalPosition[0]),
                y: Number(rawLocalPosition[1]),
                z: Number(rawLocalPosition[2])
            }
            : null;
        // #region debug-point B:browser-camera-state-sync
        fetch('http://127.0.0.1:7778/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'camera-udp-timeout', runId: 'pre-fix', hypothesisId: 'B', location: 'public/modules/python/external-bridge.ts:syncExternalBridgeStates', msg: '[DEBUG] Browser external bridge state sync', data: { sessionId: binding.sessionId, droneId: binding.droneId, droneIp: binding.droneIp, mavlinkPort: binding.mavlinkPort, connectionMethod: binding.connectionMethod, cameraConnected, hasCameraFrameDataUrl: Boolean(cameraFrameDataUrl), cameraFrameDataUrlLength: cameraFrameDataUrl?.length ?? 0, autopilotState }, ts: Date.now() }) }).catch(() => undefined);
        // #endregion

        await fetch('/api/external-python-bridge/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: binding.sessionId,
                droneId: binding.droneId,
                droneIp: binding.droneIp,
                mavlinkPort: binding.mavlinkPort,
                connectionMethod: binding.connectionMethod,
                pointReached: Boolean(drone.pointReachedFlag),
                cameraConnected,
                cameraFrameDataUrl,
                autopilotState,
                localPosition
            })
        }).catch(() => undefined);
    });

    await Promise.all(updates);
}

async function pollExternalBridge(): Promise<void> {
    try {
        const response = await fetch(`/api/external-python-bridge/events?afterId=${state.nextAfterId}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error || 'Не удалось получить события внешнего Python bridge.');
        }

        const events = Array.isArray(payload.events) ? payload.events as ExternalPythonBridgeEvent[] : [];
        for (const event of events) {
            applyExternalEvent(event);
            state.nextAfterId = Math.max(state.nextAfterId, event.id);
        }
        await syncExternalBridgeStates();
    } catch {
        // Поллинг должен быть тихим: bridge может временно отсутствовать.
    }

    state.timerId = window.setTimeout(() => {
        void pollExternalBridge();
    }, 250);
}

export function initExternalPythonBridge(): void {
    installJsRuntimeAPI();
    if (state.timerId !== null) {
        return;
    }

    if (bridgeConnectionSyncTimerId === null) {
        void pollConfiguredBridgeConnections();
    }
    void pollExternalBridge();
}
