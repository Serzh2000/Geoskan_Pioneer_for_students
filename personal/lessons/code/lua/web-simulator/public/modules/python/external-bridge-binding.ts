import { drones, ensureDronePythonConnectionSettings } from '../core/state.js';

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

type ResolveExternalDroneOptions = {
    allowDroneId?: (droneId: string) => boolean;
};

function sanitizeKeyPart(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'pioneer';
}

function normalizeBridgeIp(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    if (normalized === '127.0.0.1' || normalized === 'localhost' || normalized === '192.168.4.1') {
        return 'simulator-default';
    }
    return normalized;
}

function buildExternalDroneId(event: ExternalPythonBridgeEvent): string {
    return `external_${sanitizeKeyPart(event.sessionId)}_${sanitizeKeyPart(event.connectionMethod)}_${sanitizeKeyPart(event.droneIp || event.droneName || 'pioneer')}_${String(event.mavlinkPort || 8001)}`;
}

export function buildBindingKey(event: ExternalPythonBridgeEvent): string {
    return [
        sanitizeKeyPart(event.sessionId),
        sanitizeKeyPart(event.connectionMethod || 'udpout'),
        sanitizeKeyPart(normalizeBridgeIp(event.droneIp || '')),
        String(event.mavlinkPort || 8001)
    ].join('::');
}

function matchesConfiguredDrone(event: ExternalPythonBridgeEvent, droneId: string): boolean {
    const drone = drones[droneId];
    if (!drone) return false;
    const connection = ensureDronePythonConnectionSettings(droneId);
    if (normalizeBridgeIp(connection.ip || '') !== normalizeBridgeIp(event.droneIp || '')) {
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
    if (event.droneIp) {
        const eventIp = event.droneIp.trim();
        const currentIp = String(connection.ip || '').trim();
        const sameSimulatorAlias = normalizeBridgeIp(currentIp) && normalizeBridgeIp(currentIp) === normalizeBridgeIp(eventIp);
        const currentIsLoopback = currentIp === '127.0.0.1' || currentIp.toLowerCase() === 'localhost';
        if (!sameSimulatorAlias || currentIsLoopback || !currentIp) {
            connection.ip = eventIp;
        }
    }
    if (event.connectionMethod === 'camera') {
        connection.cameraPort = Number(event.mavlinkPort || connection.cameraPort || 18001);
        return;
    }
    connection.mavlinkPort = Number(event.mavlinkPort || connection.mavlinkPort || 8001);
    connection.connectionMethod = event.connectionMethod || connection.connectionMethod;
    connection.device = event.device || connection.device;
    connection.baud = Number(event.baud || connection.baud || 115200);
}

export function resolveExternalDroneId(
    state: ExternalBridgeState,
    event: ExternalPythonBridgeEvent,
    options: ResolveExternalDroneOptions = {}
): string | null {
    const bindingKey = buildBindingKey(event);
    const existingBinding = state.bindings.get(bindingKey);
    const isAllowedDroneId = typeof options.allowDroneId === 'function'
        ? options.allowDroneId
        : () => true;
    if (existingBinding && drones[existingBinding.droneId] && isAllowedDroneId(existingBinding.droneId)) {
        applyConnectionMetadata(existingBinding.droneId, event);
        return existingBinding.droneId;
    }

    if (existingBinding && !isAllowedDroneId(existingBinding.droneId)) {
        state.bindings.delete(bindingKey);
    }

    const configuredDroneId = findConfiguredDroneId(event);
    if (configuredDroneId && isAllowedDroneId(configuredDroneId)) {
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
    return null;
}
