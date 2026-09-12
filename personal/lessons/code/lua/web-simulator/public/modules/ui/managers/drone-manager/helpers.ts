import { drones, ensureDronePythonConnectionSettings } from '../../../core/state.js';

export function reportDroneManagerDebug(hypothesisId: string, message: string, data: Record<string, unknown>): void {
    const debugUrl = (window as typeof window & { DEBUG_SERVER_URL?: string }).DEBUG_SERVER_URL;
    if (!debugUrl) {
        return;
    }

    fetch(debugUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: 'pioneer-port-manager',
            runId: 'pre-fix',
            hypothesisId,
            location: 'public/modules/ui/managers/drone-manager.ts',
            msg: message,
            data
        })
    }).catch(() => undefined);
}

function getNextAvailablePort(preferredPort: number, selector: (droneId: string) => number): number {
    const usedPorts = new Set(
        Object.keys(drones)
            .map((droneId) => Number(selector(droneId)))
            .filter((port) => Number.isFinite(port) && port > 0)
    );

    let nextPort = Math.max(1, Math.trunc(preferredPort || 8001));
    while (usedPorts.has(nextPort)) {
        nextPort += 1;
    }
    return nextPort;
}

export function getNextAvailableMavlinkPort(preferredPort: number): number {
    return getNextAvailablePort(preferredPort, (droneId) => drones[droneId]?.pythonConnection?.mavlinkPort);
}

export function getNextAvailableCameraPort(preferredPort: number): number {
    return getNextAvailablePort(preferredPort, (droneId) => drones[droneId]?.pythonConnection?.cameraPort);
}

export function getDroneTransportSummary(droneId: string): string {
    const connection = ensureDronePythonConnectionSettings(droneId);
    if (connection.connectionMethod === 'serial') {
        return `${connection.connectionMethod} ${connection.device} · camera:${connection.cameraPort}`;
    }

    return `${connection.connectionMethod} ${connection.ip}:${connection.mavlinkPort} · camera:${connection.cameraPort}`;
}
