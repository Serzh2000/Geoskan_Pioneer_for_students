import { drones } from '../core/state.js';
import { disposeLocalPythonRunState, runLocalPythonScript, stopLocalPythonScript } from './local-runtime.js';
import { ensureDronePythonConnectionSettings } from '../core/state.js';
import {
    cancelBrowserPythonRun,
    disposeBrowserPythonRunState,
    hasActiveBrowserPythonRun,
    runBrowserPythonScript
} from './browser-runtime.js';
import { ensurePyodide } from './pyodide-loader.js';

export function disposePythonRunState(droneId: string): void {
    disposeLocalPythonRunState(droneId);
    disposeBrowserPythonRunState(droneId);
}

export async function initPythonRuntime(): Promise<void> {
    await ensurePyodide();
}

export async function runPythonScript(droneId: string, code: string): Promise<void> {
    const connection = ensureDronePythonConnectionSettings(droneId);
    if (connection.executionTarget === 'local') {
        await runLocalPythonScript(droneId, code);
        return;
    }

    if (!drones[droneId]) return;
    await runBrowserPythonScript(droneId, code);
}

export function stopPythonScript(droneId: string): void {
    const connection = ensureDronePythonConnectionSettings(droneId);
    if (connection.executionTarget === 'local') {
        stopLocalPythonScript(droneId);
        const drone = drones[droneId];
        if (drone) {
            drone.running = false;
            drone.status = 'ОСТАНОВЛЕН';
            drone.pendingLocalPoint = false;
            drone.pendingLocalPointSource = null;
            drone.pendingLocalPointTarget = null;
            drone.pointReachedFlag = false;
        }
        return;
    }

    const hasActiveRun = hasActiveBrowserPythonRun(droneId);
    cancelBrowserPythonRun(droneId);
    const d = drones[droneId];
    if (d) {
        d.running = false;
        d.status = 'ОСТАНОВЛЕН';
        d.pendingLocalPoint = false;
        d.pendingLocalPointSource = null;
        d.pendingLocalPointTarget = null;
        d.pointReachedFlag = false;
    }
    if (!hasActiveRun) {
        disposePythonRunState(droneId);
    }
}

