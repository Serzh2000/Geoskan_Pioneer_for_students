import { currentDroneId, drones } from '../core/state.js';

export const cancelledRuns: Record<string, boolean> = {};
export const localOriginByDrone: Record<string, { x: number; y: number; z: number }> = {};
export const lastManualSpeedUpdateMs: Record<string, number> = {};
const pythonDroneBindings = new Map<string, string>();

export function getDroneOrDefault(id: string) {
    return drones[id] || drones[currentDroneId];
}

function makeBindingKey(name?: string, ip?: string, mavlinkPort?: number | string, connectionMethod?: string) {
    return [
        String(name || '').trim().toLowerCase(),
        String(ip || '').trim().toLowerCase(),
        String(mavlinkPort ?? '').trim().toLowerCase(),
        String(connectionMethod || '').trim().toLowerCase()
    ].join('::');
}

export function resetPythonDroneBindings(rootDroneId: string) {
    pythonDroneBindings.clear();
    pythonDroneBindings.set(makeBindingKey(rootDroneId, rootDroneId), rootDroneId);
    const rootDrone = drones[rootDroneId];
    if (rootDrone) {
        const connection = rootDrone.pythonConnection;
        pythonDroneBindings.set(makeBindingKey(rootDrone.name, '', connection?.mavlinkPort, connection?.connectionMethod), rootDroneId);
        pythonDroneBindings.set(makeBindingKey(rootDrone.name, rootDroneId, connection?.mavlinkPort, connection?.connectionMethod), rootDroneId);
        pythonDroneBindings.set(makeBindingKey('camera', connection?.ip, connection?.cameraPort, 'camera'), rootDroneId);
    }
}

export function resolvePythonDroneId(
    rootDroneId: string,
    requestedName?: string,
    requestedIp?: string,
    requestedPort?: number | string,
    requestedConnectionMethod?: string
) {
    const normalizedName = String(requestedName || '').trim();
    const normalizedIp = String(requestedIp || '').trim();
    const normalizedPort = String(requestedPort ?? '').trim();
    const normalizedConnectionMethod = String(requestedConnectionMethod || '').trim();
    const bindingKey = makeBindingKey(normalizedName, normalizedIp, normalizedPort, normalizedConnectionMethod);
    const boundId = pythonDroneBindings.get(bindingKey);
    if (boundId && drones[boundId]) {
        return boundId;
    }

    const candidates = Object.keys(drones);
    const exactMatch = candidates.find((id) => {
        const drone = drones[id];
        const connection = drone?.pythonConnection;
        const isCameraBinding = normalizedConnectionMethod === 'camera';
        return id === normalizedIp
            || id === normalizedName
            || drone?.name === normalizedName
            || (
                String(connection?.ip || '').trim() === normalizedIp
                && String(isCameraBinding ? connection?.cameraPort ?? '' : connection?.mavlinkPort ?? '') === normalizedPort
                && (
                    isCameraBinding
                        ? normalizedConnectionMethod === 'camera'
                        : String(connection?.connectionMethod || '').trim() === normalizedConnectionMethod
                )
            );
    });

    if (exactMatch) {
        pythonDroneBindings.set(bindingKey, exactMatch);
        return exactMatch;
    }

    const reservedIds = new Set(pythonDroneBindings.values());
    const nextFreeDroneId = candidates.find((id) => !reservedIds.has(id));
    const resolvedId = nextFreeDroneId || rootDroneId || currentDroneId;
    pythonDroneBindings.set(bindingKey, resolvedId);
    return resolvedId;
}

export function cleanupPythonRuntimeState(droneId: string) {
    delete cancelledRuns[droneId];
    delete localOriginByDrone[droneId];
    delete lastManualSpeedUpdateMs[droneId];
    resetPythonDroneBindings(droneId);
}
