import { createDroneState, drones, ensureDronePythonConnectionSettings } from '../core/state.js';

export type ExternalPythonBridgeEvent = {
    id: number;
    sessionId: string;
    timestamp: string;
    droneName: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: 'udpin' | 'udpout' | 'serial' | 'camera';
    device: string;
    baud: number;
    method: string;
    args: unknown[];
    kwargs: Record<string, unknown>;
};

export type ExternalDroneBinding = {
    bindingKey: string;
    sessionId: string;
    droneId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: 'udpin' | 'udpout' | 'serial' | 'camera';
};

export type ExternalBridgeState = {
    nextAfterId: number;
    timerId: number | null;
    bindings: Map<string, ExternalDroneBinding>;
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

export function buildBindingKey(event: ExternalPythonBridgeEvent): string {
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
    if (sanitizeKeyPart(connection.ip || '') !== sanitizeKeyPart(event.droneIp || '')) {
        return false;
    }
    if (event.connectionMethod === 'camera') {
        return Number(connection.cameraPort || 18001) === Number(event.mavlinkPort || 18001);
    }
    return Number(connection.mavlinkPort || 8001) === Number(event.mavlinkPort || 8001)
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
    if (event.connectionMethod === 'camera') {
        connection.cameraPort = Number(event.mavlinkPort || connection.cameraPort || 18001);
        return;
    }
    connection.mavlinkPort = Number(event.mavlinkPort || connection.mavlinkPort || 8001);
    connection.connectionMethod = event.connectionMethod || connection.connectionMethod;
    connection.device = event.device || connection.device;
    connection.baud = Number(event.baud || connection.baud || 115200);
}

export function resolveExternalDroneId(state: ExternalBridgeState, event: ExternalPythonBridgeEvent): string {
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
