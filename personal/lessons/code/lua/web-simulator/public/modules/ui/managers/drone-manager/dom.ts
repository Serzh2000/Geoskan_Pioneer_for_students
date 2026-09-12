export type DroneManagerDom = {
    list: HTMLDivElement | null;
    listCount: HTMLElement | null;
    addBtn: HTMLButtonElement | null;
    delBtn: HTMLButtonElement | null;
    bridgeDroneName: HTMLElement | null;
    bridgeStatus: HTMLElement | null;
    bridgeSummary: HTMLElement | null;
    bridgeTransport: HTMLElement | null;
    bridgeTarget: HTMLElement | null;
    bridgeEnableBtn: HTMLButtonElement | null;
    bridgeDisableBtn: HTMLButtonElement | null;
    stopPythonBtn: HTMLButtonElement | null;
    resetExternalControlBtn: HTMLButtonElement | null;
    executionTargetEl: HTMLSelectElement | null;
    simulatorEl: HTMLInputElement | null;
    nameEl: HTMLInputElement | null;
    ipEl: HTMLInputElement | null;
    mavlinkPortEl: HTMLInputElement | null;
    cameraPortEl: HTMLInputElement | null;
    connectionMethodEl: HTMLSelectElement | null;
    deviceEl: HTMLInputElement | null;
    baudEl: HTMLInputElement | null;
    loggerEl: HTMLInputElement | null;
    logConnectionEl: HTMLInputElement | null;
    pythonExecutableEl: HTMLInputElement | null;
    connectionHintEl: HTMLElement | null;
};

export function collectDroneManagerDom(): DroneManagerDom {
    return {
        list: document.getElementById('drone-list') as HTMLDivElement | null,
        listCount: document.getElementById('drone-list-count'),
        addBtn: document.getElementById('add-drone-btn') as HTMLButtonElement | null,
        delBtn: document.getElementById('del-drone-btn') as HTMLButtonElement | null,
        bridgeDroneName: document.getElementById('swarm-bridge-drone-name'),
        bridgeStatus: document.getElementById('swarm-bridge-status'),
        bridgeSummary: document.getElementById('swarm-bridge-summary'),
        bridgeTransport: document.getElementById('swarm-bridge-transport'),
        bridgeTarget: document.getElementById('swarm-bridge-target'),
        bridgeEnableBtn: document.getElementById('enable-external-bridge-btn') as HTMLButtonElement | null,
        bridgeDisableBtn: document.getElementById('disable-external-bridge-btn') as HTMLButtonElement | null,
        stopPythonBtn: document.getElementById('swarm-stop-python-btn') as HTMLButtonElement | null,
        resetExternalControlBtn: document.getElementById('swarm-reset-external-control-btn') as HTMLButtonElement | null,
        executionTargetEl: document.getElementById('swarm-python-execution-target') as HTMLSelectElement | null,
        simulatorEl: document.getElementById('swarm-python-connection-simulator') as HTMLInputElement | null,
        nameEl: document.getElementById('swarm-python-connection-name') as HTMLInputElement | null,
        ipEl: document.getElementById('swarm-python-connection-ip') as HTMLInputElement | null,
        mavlinkPortEl: document.getElementById('swarm-python-connection-mavlink-port') as HTMLInputElement | null,
        cameraPortEl: document.getElementById('swarm-python-connection-camera-port') as HTMLInputElement | null,
        connectionMethodEl: document.getElementById('swarm-python-connection-method') as HTMLSelectElement | null,
        deviceEl: document.getElementById('swarm-python-connection-device') as HTMLInputElement | null,
        baudEl: document.getElementById('swarm-python-connection-baud') as HTMLInputElement | null,
        loggerEl: document.getElementById('swarm-python-connection-logger') as HTMLInputElement | null,
        logConnectionEl: document.getElementById('swarm-python-connection-log-connection') as HTMLInputElement | null,
        pythonExecutableEl: document.getElementById('swarm-python-executable') as HTMLInputElement | null,
        connectionHintEl: document.getElementById('swarm-python-connection-hint')
    };
}
