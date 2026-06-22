import { createDroneState, drones, ensureDronePythonConnectionSettings } from '../core/state.js';
import { installJsRuntimeAPI } from './pioneer-js-bridge.js';
import { captureDroneCameraFrameDataUrl, isDroneCameraConnected } from './pioneer-js-bridge-camera.js';
import { localOriginByDrone } from './runtime-shared.js';

type ExternalPythonBridgeEvent = {
    id: number;
    sessionId: string;
    timestamp: string;
    droneName: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: 'udpin' | 'udpout' | 'serial';
    device: string;
    baud: number;
    method: string;
    args: unknown[];
    kwargs: Record<string, unknown>;
};

type ExternalDroneBinding = {
    bindingKey: string;
    sessionId: string;
    droneId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: 'udpin' | 'udpout' | 'serial';
};

type ExternalBridgeState = {
    nextAfterId: number;
    timerId: number | null;
    bindings: Map<string, ExternalDroneBinding>;
};

const state: ExternalBridgeState = {
    nextAfterId: 0,
    timerId: null,
    bindings: new Map<string, ExternalDroneBinding>()
};

function sanitizeKeyPart(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'pioneer';
}

function buildExternalDroneId(event: ExternalPythonBridgeEvent): string {
    return `external_${sanitizeKeyPart(event.sessionId)}_${sanitizeKeyPart(event.connectionMethod)}_${sanitizeKeyPart(event.droneIp || event.droneName || 'pioneer')}_${String(event.mavlinkPort || 8001)}`;
}

function buildBindingKey(event: ExternalPythonBridgeEvent): string {
    return [
        sanitizeKeyPart(event.sessionId),
        sanitizeKeyPart(event.connectionMethod || 'udpout'),
        sanitizeKeyPart(event.droneIp || ''),
        String(event.mavlinkPort || 8001)
    ].join('::');
}

function matchesConfiguredDrone(event: ExternalPythonBridgeEvent, droneId: string): boolean {
    const drone = drones[droneId];
    if (!drone) return false;
    const connection = ensureDronePythonConnectionSettings(droneId);
    return sanitizeKeyPart(connection.ip || '') === sanitizeKeyPart(event.droneIp || '')
        && Number(connection.mavlinkPort || 8001) === Number(event.mavlinkPort || 8001)
        && sanitizeKeyPart(connection.connectionMethod || 'udpout') === sanitizeKeyPart(event.connectionMethod || 'udpout');
}

function findConfiguredDroneId(event: ExternalPythonBridgeEvent): string | null {
    for (const droneId of Object.keys(drones)) {
        if (matchesConfiguredDrone(event, droneId)) {
            return droneId;
        }
    }
    return null;
}

function applyConnectionMetadata(droneId: string, event: ExternalPythonBridgeEvent): void {
    const drone = drones[droneId];
    if (!drone) return;
    const connection = ensureDronePythonConnectionSettings(droneId);
    drone.name = event.droneName || drone.name;
    connection.name = event.droneName || connection.name;
    connection.ip = event.droneIp || connection.ip;
    connection.mavlinkPort = Number(event.mavlinkPort || connection.mavlinkPort || 8001);
    connection.connectionMethod = event.connectionMethod || connection.connectionMethod;
    connection.device = event.device || connection.device;
    connection.baud = Number(event.baud || connection.baud || 115200);
}

function resolveExternalDroneId(event: ExternalPythonBridgeEvent): string {
    const bindingKey = buildBindingKey(event);
    const existingBinding = state.bindings.get(bindingKey);
    if (existingBinding && drones[existingBinding.droneId]) {
        applyConnectionMetadata(existingBinding.droneId, event);
        return existingBinding.droneId;
    }

    const configuredDroneId = findConfiguredDroneId(event);
    if (configuredDroneId) {
        applyConnectionMetadata(configuredDroneId, event);
        state.bindings.set(bindingKey, {
            bindingKey,
            sessionId: event.sessionId,
            droneId: configuredDroneId,
            droneIp: event.droneIp,
            mavlinkPort: Number(event.mavlinkPort || 8001),
            connectionMethod: event.connectionMethod || 'udpout'
        });
        return configuredDroneId;
    }

    const nextId = buildExternalDroneId(event);
    if (!drones[nextId]) {
        createDroneState(nextId, event.droneName || `External ${event.droneIp || 'Pioneer'}`);
        window.dispatchEvent(new CustomEvent('external-drone-state-changed', {
            detail: {
                droneId: nextId,
                sessionId: event.sessionId
            }
        }));
    }

    applyConnectionMetadata(nextId, event);
    state.bindings.set(bindingKey, {
        bindingKey,
        sessionId: event.sessionId,
        droneId: nextId,
        droneIp: event.droneIp,
        mavlinkPort: Number(event.mavlinkPort || 8001),
        connectionMethod: event.connectionMethod || 'udpout'
    });
    return nextId;
}

function asNumber(value: unknown, fallback: number | null = null): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }

    return fallback;
}

function callPioneerApi(methodName: string, ...args: unknown[]): void {
    const runtime = window as unknown as Record<string, (...callArgs: unknown[]) => unknown>;
    const fn = runtime[methodName];
    if (typeof fn === 'function') {
        fn(...args);
    }
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
    const droneId = resolveExternalDroneId(event);
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
                cameraFrameDataUrl
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

    void pollExternalBridge();
}
