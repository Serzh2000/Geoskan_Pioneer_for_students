import { createScriptFailureError, showScriptFailureNotice } from '../app/script-execution-notice.js';
import { drones, ensureDronePythonConnectionSettings } from '../core/state.js';
import { log } from '../shared/logging/logger.js';

type RuntimeOutputEntry = {
    seq: number;
    stream: 'stdout' | 'stderr' | 'system';
    text: string;
};

type RuntimeStatusResponse = {
    ok: boolean;
    running: boolean;
    exitCode: number | null;
    signal: string | null;
    startedAt: string;
    finishedAt: string | null;
    output: RuntimeOutputEntry[];
};

type PollState = {
    nextSeq: number;
    timerId: number | null;
    manualStopRequested: boolean;
};

const pollStateByDrone: Record<string, PollState> = {};

function getPollState(droneId: string): PollState {
    if (!pollStateByDrone[droneId]) {
        pollStateByDrone[droneId] = {
            nextSeq: 0,
            timerId: null,
            manualStopRequested: false
        };
    }

    return pollStateByDrone[droneId];
}

function clearPollTimer(droneId: string): void {
    const state = pollStateByDrone[droneId];
    if (!state?.timerId) return;
    window.clearTimeout(state.timerId);
    state.timerId = null;
}

function normalizeRuntimeError(error: unknown, fallback = 'Не удалось выполнить Python-код через локальный backend.'): Error {
    if (error instanceof Error) return error;
    const message = typeof error === 'string' && error.trim() ? error : fallback;
    return createScriptFailureError('runtime', message);
}

function logRuntimeOutput(droneId: string, entries: RuntimeOutputEntry[]): void {
    if (!entries.length) return;

    entries.forEach((entry) => {
        const text = entry.text.trim();
        if (!text) return;

        const prefix = `[Python local][${droneId}] ${text}`;
        if (entry.stream === 'stderr') {
            log(prefix, 'error');
            return;
        }

        if (entry.stream === 'system') {
            log(prefix, 'info');
            return;
        }

        log(prefix, 'info');
    });
}

async function fetchRuntimeStatus(droneId: string, afterSeq: number): Promise<RuntimeStatusResponse> {
    const response = await fetch(`/api/python-runtime/status?droneId=${encodeURIComponent(droneId)}&afterSeq=${afterSeq}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Не удалось получить статус локального Python runtime.');
    }

    return payload as RuntimeStatusResponse;
}

async function pollRuntimeStatus(droneId: string): Promise<void> {
    const state = getPollState(droneId);

    try {
        const status = await fetchRuntimeStatus(droneId, state.nextSeq);
        logRuntimeOutput(droneId, status.output);

        const lastSeq = status.output.at(-1)?.seq;
        if (typeof lastSeq === 'number') {
            state.nextSeq = lastSeq;
        }

        const drone = drones[droneId];
        if (!status.running) {
            clearPollTimer(droneId);
            if (drone) {
                drone.running = false;
            }

            if (status.exitCode === 0 || state.manualStopRequested) {
                if (drone && drone.status !== 'ОСТАНОВЛЕН') {
                    drone.status = 'ЗАВЕРШЕН';
                }
                if (!state.manualStopRequested) {
                    log(`[Python local] Выполнение для ${droneId} завершено`, 'success');
                }
                state.manualStopRequested = false;
                return;
            }

            if (drone) {
                drone.status = 'ОШИБКА';
            }
            const message = `Локальный Python runtime завершился с кодом ${status.exitCode ?? 'unknown'}.`;
            showScriptFailureNotice('python', createScriptFailureError('runtime', message));
            return;
        }
    } catch (error) {
        clearPollTimer(droneId);
        const drone = drones[droneId];
        if (drone) {
            drone.running = false;
            drone.status = 'ОШИБКА';
        }
        showScriptFailureNotice('python', normalizeRuntimeError(error));
        return;
    }

    state.timerId = window.setTimeout(() => {
        void pollRuntimeStatus(droneId);
    }, 700);
}

export async function runLocalPythonScript(droneId: string, code: string): Promise<void> {
    const connection = ensureDronePythonConnectionSettings(droneId);
    const response = await fetch('/api/python-runtime/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            droneId,
            code,
            config: connection
        })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
        throw createScriptFailureError('runtime', payload?.error || 'Локальный backend не смог запустить Python-код.');
    }

    const state = getPollState(droneId);
    state.nextSeq = 0;
    state.manualStopRequested = false;
    clearPollTimer(droneId);
    void pollRuntimeStatus(droneId);
}

export function stopLocalPythonScript(droneId: string): void {
    const state = getPollState(droneId);
    state.manualStopRequested = true;
    clearPollTimer(droneId);

    void fetch('/api/python-runtime/stop', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ droneId })
    }).catch((error) => {
        const drone = drones[droneId];
        if (drone) {
            drone.status = 'ОШИБКА';
        }
        log(`[Python local] Не удалось остановить процесс ${droneId}: ${normalizeRuntimeError(error).message}`, 'error');
    });
}

export function disposeLocalPythonRunState(droneId: string): void {
    clearPollTimer(droneId);
    delete pollStateByDrone[droneId];
}
