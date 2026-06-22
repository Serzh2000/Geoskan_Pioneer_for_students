import { currentDroneId, drones, ensureDronePythonConnectionSettings } from '../../core/state.js';
import type { PioneerConnectionMethod, PythonExecutionTarget } from '../../core/state.js';

type HardwarePythonDom = {
    scopeEl: HTMLElement | null;
    executionTargetEl: HTMLSelectElement | null;
    simulatorEl: HTMLInputElement | null;
    nameEl: HTMLInputElement | null;
    ipEl: HTMLInputElement | null;
    mavlinkPortEl: HTMLInputElement | null;
    connectionMethodEl: HTMLSelectElement | null;
    deviceEl: HTMLInputElement | null;
    baudEl: HTMLInputElement | null;
    loggerEl: HTMLInputElement | null;
    logConnectionEl: HTMLInputElement | null;
    pythonExecutableEl: HTMLInputElement | null;
    hintEl: HTMLElement | null;
};

function collectDom(): HardwarePythonDom {
    return {
        scopeEl: document.getElementById('python-connection-scope'),
        executionTargetEl: document.getElementById('python-execution-target') as HTMLSelectElement | null,
        simulatorEl: document.getElementById('python-connection-simulator') as HTMLInputElement | null,
        nameEl: document.getElementById('python-connection-name') as HTMLInputElement | null,
        ipEl: document.getElementById('python-connection-ip') as HTMLInputElement | null,
        mavlinkPortEl: document.getElementById('python-connection-mavlink-port') as HTMLInputElement | null,
        connectionMethodEl: document.getElementById('python-connection-method') as HTMLSelectElement | null,
        deviceEl: document.getElementById('python-connection-device') as HTMLInputElement | null,
        baudEl: document.getElementById('python-connection-baud') as HTMLInputElement | null,
        loggerEl: document.getElementById('python-connection-logger') as HTMLInputElement | null,
        logConnectionEl: document.getElementById('python-connection-log-connection') as HTMLInputElement | null,
        pythonExecutableEl: document.getElementById('python-executable') as HTMLInputElement | null,
        hintEl: document.getElementById('python-connection-hint')
    };
}

function updateModeHint(dom: HardwarePythonDom, mode: PythonExecutionTarget): void {
    if (!dom.hintEl) return;

    dom.hintEl.textContent = mode === 'local'
        ? 'Код запускается локальным Python-процессом на вашем компьютере и может открыть real serial/UDP подключение к Pioneer.'
        : 'Код исполняется в браузере через Pyodide и управляет только симулятором.';
}

function syncDisabledState(dom: HardwarePythonDom, mode: PythonExecutionTarget): void {
    const disabled = mode !== 'local';
    [
        dom.simulatorEl,
        dom.nameEl,
        dom.ipEl,
        dom.mavlinkPortEl,
        dom.connectionMethodEl,
        dom.deviceEl,
        dom.baudEl,
        dom.loggerEl,
        dom.logConnectionEl,
        dom.pythonExecutableEl
    ].forEach((element) => {
        if (element) {
            element.disabled = disabled;
        }
    });

    updateModeHint(dom, mode);
}

function render(dom: HardwarePythonDom): void {
    const drone = drones[currentDroneId];
    if (!drone) return;

    const connection = ensureDronePythonConnectionSettings(currentDroneId);
    if (dom.scopeEl) {
        dom.scopeEl.textContent = `Активный дрон: ${drone.name}`;
    }
    if (dom.executionTargetEl) {
        dom.executionTargetEl.value = connection.executionTarget;
    }
    if (dom.simulatorEl) {
        dom.simulatorEl.checked = connection.simulator;
    }
    if (dom.nameEl) {
        dom.nameEl.value = connection.name;
    }
    if (dom.ipEl) {
        dom.ipEl.value = connection.ip;
    }
    if (dom.mavlinkPortEl) {
        dom.mavlinkPortEl.value = String(connection.mavlinkPort);
    }
    if (dom.connectionMethodEl) {
        dom.connectionMethodEl.value = connection.connectionMethod;
    }
    if (dom.deviceEl) {
        dom.deviceEl.value = connection.device;
    }
    if (dom.baudEl) {
        dom.baudEl.value = String(connection.baud);
    }
    if (dom.loggerEl) {
        dom.loggerEl.checked = connection.logger;
    }
    if (dom.logConnectionEl) {
        dom.logConnectionEl.checked = connection.logConnection;
    }
    if (dom.pythonExecutableEl) {
        dom.pythonExecutableEl.value = connection.pythonExecutable;
    }

    syncDisabledState(dom, connection.executionTarget);
}

export function initHardwarePythonSettingsUI(): void {
    const dom = collectDom();
    if (!dom.executionTargetEl) return;

    const applyToCurrentDrone = (updater: () => void): void => {
        const drone = drones[currentDroneId];
        if (!drone) return;
        ensureDronePythonConnectionSettings(currentDroneId);
        updater();
        render(dom);
    };

    dom.executionTargetEl.addEventListener('change', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.executionTarget = (dom.executionTargetEl?.value ?? 'browser') as PythonExecutionTarget;
        });
    });

    dom.simulatorEl?.addEventListener('change', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.simulator = dom.simulatorEl?.checked ?? false;
        });
    });

    dom.nameEl?.addEventListener('input', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.name = dom.nameEl?.value.trim() || 'pioneer';
        });
    });

    dom.ipEl?.addEventListener('input', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.ip = dom.ipEl?.value.trim() || '192.168.4.1';
        });
    });

    dom.mavlinkPortEl?.addEventListener('input', () => {
        applyToCurrentDrone(() => {
            const nextValue = Number.parseInt(dom.mavlinkPortEl?.value ?? '8001', 10);
            drones[currentDroneId].pythonConnection.mavlinkPort = Number.isFinite(nextValue) ? nextValue : 8001;
        });
    });

    dom.connectionMethodEl?.addEventListener('change', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.connectionMethod =
                (dom.connectionMethodEl?.value ?? 'udpout') as PioneerConnectionMethod;
        });
    });

    dom.deviceEl?.addEventListener('input', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.device = dom.deviceEl?.value.trim() || '/dev/serial0';
        });
    });

    dom.baudEl?.addEventListener('input', () => {
        applyToCurrentDrone(() => {
            const nextValue = Number.parseInt(dom.baudEl?.value ?? '115200', 10);
            drones[currentDroneId].pythonConnection.baud = Number.isFinite(nextValue) ? nextValue : 115200;
        });
    });

    dom.loggerEl?.addEventListener('change', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.logger = dom.loggerEl?.checked ?? true;
        });
    });

    dom.logConnectionEl?.addEventListener('change', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.logConnection = dom.logConnectionEl?.checked ?? true;
        });
    });

    dom.pythonExecutableEl?.addEventListener('input', () => {
        applyToCurrentDrone(() => {
            drones[currentDroneId].pythonConnection.pythonExecutable = dom.pythonExecutableEl?.value.trim() || 'python';
        });
    });

    window.addEventListener('drone-selection-changed', () => render(dom));
    render(dom);
}
