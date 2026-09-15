import { drones, ensureDronePythonConnectionSettings } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import {
    type ExternalBridgeState,
    type ExternalDroneBinding,
    type ExternalPythonBridgeEvent,
    resolveExternalDroneId
} from './external-bridge-binding.js';
import {
    applyExternalEvent,
    ensureExternalBridgeRuntimeInstalled,
    syncExternalBridgeStates
} from './external-bridge-runtime.js';
import { isDroneCameraConnected } from './pioneer-js-bridge-camera.js';

const state: ExternalBridgeState = {
    nextAfterId: 0,
    timerId: null,
    bindings: new Map<string, ExternalDroneBinding>()
};
let bridgeConnectionSyncTimerId: number | null = null;

function buildConfiguredConnectionKey(parts: Array<string | number>): string {
    return parts.map((value) => String(value ?? '').trim().toLowerCase()).join('::');
}

function hasEnabledExternalBridgeDrones(): boolean {
    return Object.keys(drones).some((droneId) => isExternalBridgeEnabled(droneId));
}

function isBridgeAllowedForDrone(droneId: string): boolean {
    return Boolean(drones[droneId] && ensureDronePythonConnectionSettings(droneId).allowExternalBridge);
}

function clearBindingsForDrone(droneId: string): void {
    for (const [bindingKey, binding] of state.bindings.entries()) {
        if (binding.droneId === droneId) {
            state.bindings.delete(bindingKey);
        }
    }
}

function clearDisabledBindings(): void {
    for (const [bindingKey, binding] of state.bindings.entries()) {
        if (!isBridgeAllowedForDrone(binding.droneId) || !drones[binding.droneId]) {
            state.bindings.delete(bindingKey);
        }
    }
}

function emitExternalBridgeStateChanged(droneId: string): void {
    window.dispatchEvent(new CustomEvent('external-drone-state-changed', {
        detail: {
            droneId
        }
    }));
}

function emitExternalBridgeQueueCleared(): void {
    window.dispatchEvent(new CustomEvent('external-bridge-queue-cleared'));
}

async function syncExternalBridgeCursorToLatest(): Promise<void> {
    try {
        const response = await fetch('/api/external-python-bridge/events');
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
            return;
        }

        const latestId = Number(payload.latestId);
        state.nextAfterId = Number.isFinite(latestId) ? latestId : 0;
    } catch {
        // Безопасный режим: если сервер недоступен, просто не обновляем курсор.
    }
}

async function syncConfiguredBridgeConnections(): Promise<void> {
    const uniqueConnections = new Map<string, Record<string, unknown>>();
    for (const [droneId, drone] of Object.entries(drones)) {
        const connection = ensureDronePythonConnectionSettings(droneId);
        if (!connection.allowExternalBridge) {
            continue;
        }

        const connectionMethod = connection.connectionMethod === 'serial' || connection.connectionMethod === 'udpin'
            ? connection.connectionMethod
            : 'udpout';
        const droneIp = String(connection.ip || '127.0.0.1').trim() || '127.0.0.1';
        const mavlinkPort = Number(connection.mavlinkPort || 8001);
        const cameraPort = Number(connection.cameraPort || (mavlinkPort + 10000));
        const key = buildConfiguredConnectionKey([connectionMethod, droneIp, mavlinkPort, cameraPort]);
        uniqueConnections.set(key, {
            droneId,
            droneName: drone.name || 'pioneer',
            droneIp,
            mavlinkPort,
            cameraPort,
            connectionMethod,
            device: connection.device || '/dev/serial0',
            baud: Number(connection.baud || 115200)
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
    if (!hasEnabledExternalBridgeDrones()) {
        await syncConfiguredBridgeConnections();
        bridgeConnectionSyncTimerId = null;
        return;
    }

    await syncConfiguredBridgeConnections();
    bridgeConnectionSyncTimerId = window.setTimeout(() => {
        void pollConfiguredBridgeConnections();
    }, 1500);
}

async function pollExternalBridge(): Promise<void> {
    clearDisabledBindings();
    if (!hasEnabledExternalBridgeDrones()) {
        state.timerId = null;
        return;
    }

    const cycleStartedAt = performance.now();
    try {
        const response = await fetch(`/api/external-python-bridge/events?afterId=${state.nextAfterId}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error || 'Не удалось получить события внешнего Python bridge.');
        }

        const events = Array.isArray(payload.events) ? payload.events as ExternalPythonBridgeEvent[] : [];
        for (const event of events) {
            // Ошибку одной команды нельзя ни глушить, ни давать ей уронить весь цикл:
            // без локального catch исключение из applyExternalEvent (например FSM-ошибка)
            // улетало во внешний "тихий" catch, курсор nextAfterId не сдвигался, и то же
            // самое событие применялось снова и снова, каждый раз падая молча. Теперь
            // сбойная команда логируется, курсор двигается, остальные события выполняются.
            try {
                applyExternalEvent(state, event, isBridgeAllowedForDrone);
            } catch (error) {
                log(
                    `Внешний Python bridge: команда ${event.method} отклонена симулятором — ${error instanceof Error ? error.message : String(error)}`,
                    'error'
                );
            }
            state.nextAfterId = Math.max(state.nextAfterId, event.id);
        }
        await syncExternalBridgeStates(state.bindings.values(), isBridgeAllowedForDrone);
    } catch {
        // Поллинг должен быть тихим: bridge может временно отсутствовать.
    }

    // Целевой ПЕРИОД цикла (не пауза после него): раньше setTimeout(..., 100) ставился
    // ПОСЛЕ захвата кадра (JPEG-рендер + кодирование, до ~45мс, см. syncExternalBridgeStates
    // -> captureDroneCameraFrameDataUrl) и запроса состояния, так что реальный период
    // получался 100мс + время самой работы — то есть заведомо меньше 10 кадров/с даже при
    // целевых 100мс, а при захвате камеры и вовсе около 5.7 кадра/с. Вычитаем время, которое
    // уже потратил этот цикл, чтобы период держался у цели независимо от того, насколько
    // тяжёлым был кадр.
    const targetCycleMs = Array.from(state.bindings.values()).some((binding) => isDroneCameraConnected(binding.droneId))
        ? 33
        : state.bindings.size > 0
            ? 100
            : 250;
    const elapsedMs = performance.now() - cycleStartedAt;
    const pollDelayMs = Math.max(0, targetCycleMs - elapsedMs);
    state.timerId = window.setTimeout(() => {
        void pollExternalBridge();
    }, pollDelayMs);
}

export function isExternalBridgeEnabled(droneId: string): boolean {
    return isBridgeAllowedForDrone(droneId);
}

export async function setExternalBridgeEnabled(droneId: string, enabled: boolean): Promise<void> {
    const drone = drones[droneId];
    if (!drone) {
        return;
    }

    const connection = ensureDronePythonConnectionSettings(droneId);
    const wasAnyEnabled = hasEnabledExternalBridgeDrones();
    connection.allowExternalBridge = enabled;

    if (!enabled) {
        clearBindingsForDrone(droneId);
        emitExternalBridgeStateChanged(droneId);

        if (hasEnabledExternalBridgeDrones()) {
            await syncConfiguredBridgeConnections();
        } else {
            state.bindings.clear();
            await syncConfiguredBridgeConnections();
            if (state.timerId !== null) {
                window.clearTimeout(state.timerId);
                state.timerId = null;
            }
            if (bridgeConnectionSyncTimerId !== null) {
                window.clearTimeout(bridgeConnectionSyncTimerId);
                bridgeConnectionSyncTimerId = null;
            }
        }
        return;
    }

    ensureExternalBridgeRuntimeInstalled();
    if (!wasAnyEnabled) {
        await syncExternalBridgeCursorToLatest();
    }
    await syncConfiguredBridgeConnections();
    if (bridgeConnectionSyncTimerId === null) {
        void pollConfiguredBridgeConnections();
    }
    if (state.timerId === null) {
        void pollExternalBridge();
    }
    emitExternalBridgeStateChanged(droneId);
}

export async function clearExternalBridgeQueue(): Promise<void> {
    await fetch('/api/external-python-bridge/clear', {
        method: 'POST'
    }).catch(() => undefined);
    state.bindings.clear();
    state.nextAfterId = 0;
    if (hasEnabledExternalBridgeDrones()) {
        await syncExternalBridgeCursorToLatest();
    }
    emitExternalBridgeQueueCleared();
}
