import { log } from '../../../shared/logging/logger.js';
import { drones, ensureDronePythonConnectionSettings } from '../../../core/state.js';
import type { PioneerConnectionMethod, PythonExecutionTarget } from '../../../core/state.js';
import { clearExternalBridgeQueue, isExternalBridgeEnabled, setExternalBridgeEnabled } from '../../../python/external-bridge.js';
import { stopPythonScript } from '../../../python/index.js';
import type { DroneManagerDom } from './dom.js';
import { getDroneTransportSummary } from './helpers.js';

type ConnectionPanelOptions = {
    dom: DroneManagerDom;
    getActiveDroneId: () => string | null;
    emitConnectionSettingsChanged: (droneId: string) => void;
    onSceneUpdate?: () => void;
    refreshUi: () => void;
};

export function createConnectionPanel(options: ConnectionPanelOptions) {
    const { dom, getActiveDroneId, emitConnectionSettingsChanged, onSceneUpdate, refreshUi } = options;

    const focusConnectionCard = () => {
        dom.executionTargetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => dom.executionTargetEl?.focus(), 50);
    };

    const updateConnectionModeHint = (droneId: string | null) => {
        if (!dom.connectionHintEl) return;
        if (!droneId || !drones[droneId]) {
            dom.connectionHintEl.textContent = 'Выберите дрон в списке, чтобы настроить запуск Python из редактора или advanced-внешнее управление.';
            return;
        }

        const connection = ensureDronePythonConnectionSettings(droneId);
        if (connection.allowExternalBridge) {
            dom.connectionHintEl.textContent = 'Внешний bridge включён и ждёт команды от внешнего Python/IDLE. Для него не нужно переключать режим выполнения на local: local предназначен только для запуска кода кнопкой Run из редактора. Backend должен быть запущен через npm start.';
            return;
        }

        if (connection.executionTarget === 'browser') {
            dom.connectionHintEl.textContent = 'Режим browser влияет только на запуск кнопкой Run из редактора. Для внешнего IDLE/Python не нужно переключать режим выполнения на local: включите внешний bridge и запустите backend через npm start.';
            return;
        }

        dom.connectionHintEl.textContent = connection.connectionMethod === 'serial'
            ? 'Local предназначен только для запуска кода кнопкой Run из редактора: код выполняется на этом ПК и использует serial-подключение через device, baud и Python executable.'
            : 'Local предназначен только для запуска кода кнопкой Run из редактора: код выполняется на этом ПК и использует сетевое подключение через IP и MAVLink-порт.';
    };

    const renderConnectionForm = () => {
        const activeDroneId = getActiveDroneId();
        const formControls = [
            dom.executionTargetEl,
            dom.simulatorEl,
            dom.nameEl,
            dom.ipEl,
            dom.mavlinkPortEl,
            dom.cameraPortEl,
            dom.connectionMethodEl,
            dom.deviceEl,
            dom.baudEl,
            dom.loggerEl,
            dom.logConnectionEl,
            dom.pythonExecutableEl
        ];
        if (!activeDroneId || !drones[activeDroneId]) {
            formControls.forEach((element) => {
                if (element) {
                    element.disabled = true;
                }
            });
            updateConnectionModeHint(null);
            return;
        }

        const connection = ensureDronePythonConnectionSettings(activeDroneId);
        if (dom.executionTargetEl) dom.executionTargetEl.value = connection.executionTarget;
        if (dom.simulatorEl) dom.simulatorEl.checked = connection.simulator;
        if (dom.nameEl) dom.nameEl.value = connection.name;
        if (dom.ipEl) dom.ipEl.value = connection.ip;
        if (dom.mavlinkPortEl) dom.mavlinkPortEl.value = String(connection.mavlinkPort);
        if (dom.cameraPortEl) dom.cameraPortEl.value = String(connection.cameraPort);
        if (dom.connectionMethodEl) dom.connectionMethodEl.value = connection.connectionMethod;
        if (dom.deviceEl) dom.deviceEl.value = connection.device;
        if (dom.baudEl) dom.baudEl.value = String(connection.baud);
        if (dom.loggerEl) dom.loggerEl.checked = connection.logger;
        if (dom.logConnectionEl) dom.logConnectionEl.checked = connection.logConnection;
        if (dom.pythonExecutableEl) dom.pythonExecutableEl.value = connection.pythonExecutable;

        const isLocalExecution = connection.executionTarget === 'local';
        const canConfigureExternalBridge = isLocalExecution || connection.allowExternalBridge;
        const isSerial = connection.connectionMethod === 'serial';
        if (dom.simulatorEl) dom.simulatorEl.disabled = !isLocalExecution;
        if (dom.nameEl) dom.nameEl.disabled = !isLocalExecution;
        if (dom.ipEl) dom.ipEl.disabled = !canConfigureExternalBridge;
        if (dom.mavlinkPortEl) dom.mavlinkPortEl.disabled = !canConfigureExternalBridge || isSerial;
        if (dom.cameraPortEl) dom.cameraPortEl.disabled = !canConfigureExternalBridge;
        if (dom.connectionMethodEl) dom.connectionMethodEl.disabled = !canConfigureExternalBridge;
        if (dom.deviceEl) dom.deviceEl.disabled = !isLocalExecution || !isSerial;
        if (dom.baudEl) dom.baudEl.disabled = !isLocalExecution || !isSerial;
        if (dom.loggerEl) dom.loggerEl.disabled = !isLocalExecution;
        if (dom.logConnectionEl) dom.logConnectionEl.disabled = !isLocalExecution;
        if (dom.pythonExecutableEl) dom.pythonExecutableEl.disabled = !isLocalExecution;
        if (dom.executionTargetEl) dom.executionTargetEl.disabled = false;
        updateConnectionModeHint(activeDroneId);
    };

    const updateActionsState = () => {
        const activeDroneId = getActiveDroneId();
        const hasSelection = Boolean(activeDroneId);
        if (dom.stopPythonBtn) {
            dom.stopPythonBtn.disabled = !hasSelection;
        }
        if (dom.resetExternalControlBtn) {
            dom.resetExternalControlBtn.disabled = !hasSelection;
        }
        if (dom.bridgeEnableBtn && dom.bridgeDisableBtn) {
            const bridgeEnabled = activeDroneId ? isExternalBridgeEnabled(activeDroneId) : false;
            dom.bridgeEnableBtn.disabled = !activeDroneId || bridgeEnabled;
            dom.bridgeDisableBtn.disabled = !activeDroneId || !bridgeEnabled;
        }
    };

    const renderBridgeCard = () => {
        const activeDroneId = getActiveDroneId();
        if (!dom.bridgeDroneName || !dom.bridgeStatus || !dom.bridgeSummary || !dom.bridgeTransport || !dom.bridgeTarget) {
            updateActionsState();
            return;
        }

        if (!activeDroneId || !drones[activeDroneId]) {
            dom.bridgeDroneName.textContent = 'Активный дрон не выбран';
            dom.bridgeStatus.textContent = 'Выключен';
            dom.bridgeStatus.classList.remove('is-enabled');
            dom.bridgeSummary.textContent = 'Подключение выключено: выберите дрон, чтобы IDLE/Python мог подключаться через установленный IDLE bridge.';
            dom.bridgeTransport.textContent = 'Подключение: -';
            dom.bridgeTarget.textContent = 'Источник: внешние команды запрещены';
            updateActionsState();
            return;
        }

        const drone = drones[activeDroneId];
        const bridgeEnabled = isExternalBridgeEnabled(activeDroneId);
        dom.bridgeDroneName.textContent = drone.name;
        dom.bridgeStatus.textContent = bridgeEnabled ? 'Разрешён' : 'Запрещён';
        dom.bridgeStatus.classList.toggle('is-enabled', bridgeEnabled);
        dom.bridgeSummary.textContent = bridgeEnabled
            ? 'Bridge включён и ждёт команды от внешнего Python/IDLE. Режим выполнения не нужно переключать на local: local нужен только для кнопки Run в редакторе. Backend должен быть запущен через npm start.'
            : 'Внешние команды запрещены: внешний Python/IDLE не подключится, пока вы не нажмёте «Разрешить внешние команды». Для работы bridge запустите backend через npm start.';
        dom.bridgeTransport.textContent = `Подключение: ${getDroneTransportSummary(activeDroneId)}`;
        dom.bridgeTarget.textContent = `Источник: ${bridgeEnabled ? 'ожидается внешний Python/IDLE' : 'внешние команды запрещены'}`;
        updateActionsState();
    };

    const applyToCurrentDroneConnection = (updater: (droneId: string) => void) => {
        const activeDroneId = getActiveDroneId();
        if (!activeDroneId || !drones[activeDroneId]) {
            return;
        }

        ensureDronePythonConnectionSettings(activeDroneId);
        updater(activeDroneId);
        emitConnectionSettingsChanged(activeDroneId);
        renderConnectionForm();
        renderBridgeCard();
        if (onSceneUpdate) onSceneUpdate();
    };

    const resetExternalControlForDrone = async (droneId: string): Promise<void> => {
        if (drones[droneId]?.running) {
            stopPythonScript(droneId);
        }
        await setExternalBridgeEnabled(droneId, false);
        await clearExternalBridgeQueue();
        renderConnectionForm();
        renderBridgeCard();
        refreshUi();
        if (onSceneUpdate) onSceneUpdate();
    };

    const bind = () => {
        dom.bridgeEnableBtn?.addEventListener('click', () => {
            const activeDroneId = getActiveDroneId();
            if (!activeDroneId) return;
            void setExternalBridgeEnabled(activeDroneId, true)
                .then(() => {
                    log(`Внешние команды разрешены для ${drones[activeDroneId]?.name || activeDroneId}`, 'success');
                })
                .catch((error: unknown) => {
                    log(error instanceof Error ? error.message : 'Не удалось разрешить внешние команды.', 'error');
                })
                .finally(() => {
                    renderConnectionForm();
                    renderBridgeCard();
                });
        });

        dom.bridgeDisableBtn?.addEventListener('click', () => {
            const activeDroneId = getActiveDroneId();
            if (!activeDroneId) return;
            void setExternalBridgeEnabled(activeDroneId, false).then(async () => {
                await clearExternalBridgeQueue();
                log(`Внешние команды запрещены и очередь очищена для ${drones[activeDroneId]?.name || activeDroneId}`, 'info');
                renderBridgeCard();
            });
        });

        dom.stopPythonBtn?.addEventListener('click', () => {
            const activeDroneId = getActiveDroneId();
            if (!activeDroneId) return;
            if (!drones[activeDroneId]?.running) {
                log(`Для ${drones[activeDroneId]?.name || activeDroneId} сейчас нет активного Python-выполнения.`, 'info');
                return;
            }
            stopPythonScript(activeDroneId);
            renderBridgeCard();
            refreshUi();
            if (onSceneUpdate) onSceneUpdate();
            log(`Python остановлен для ${drones[activeDroneId]?.name || activeDroneId}.`, 'info');
        });

        dom.resetExternalControlBtn?.addEventListener('click', () => {
            const activeDroneId = getActiveDroneId();
            if (!activeDroneId) return;
            void resetExternalControlForDrone(activeDroneId).then(() => {
                log(`Внешнее управление сброшено для ${drones[activeDroneId]?.name || activeDroneId}: Python остановлен, внешние команды запрещены, очередь очищена.`, 'info');
            });
        });

        dom.executionTargetEl?.addEventListener('change', () => {
            const nextTarget = (dom.executionTargetEl?.value || 'browser') as PythonExecutionTarget;
            applyToCurrentDroneConnection((droneId) => {
                drones[droneId].pythonConnection.executionTarget = nextTarget;
            });
            if (nextTarget === 'browser') {
                log('Встроенный Python выбран для запуска из редактора; настройка не отключает внешний IDLE/Python bridge.', 'info');
            }
        });

        dom.simulatorEl?.addEventListener('change', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.simulator = dom.simulatorEl?.checked ?? false;
        }));
        dom.nameEl?.addEventListener('input', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.name = dom.nameEl?.value.trim() || 'pioneer';
        }));
        dom.ipEl?.addEventListener('input', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.ip = dom.ipEl?.value.trim() || '192.168.4.1';
        }));
        dom.mavlinkPortEl?.addEventListener('input', () => applyToCurrentDroneConnection((droneId) => {
            const nextValue = Number.parseInt(dom.mavlinkPortEl?.value || '8001', 10);
            drones[droneId].pythonConnection.mavlinkPort = Number.isFinite(nextValue) ? nextValue : 8001;
        }));
        dom.cameraPortEl?.addEventListener('input', () => applyToCurrentDroneConnection((droneId) => {
            const nextValue = Number.parseInt(dom.cameraPortEl?.value || '18001', 10);
            drones[droneId].pythonConnection.cameraPort = Number.isFinite(nextValue) ? nextValue : 18001;
        }));
        dom.connectionMethodEl?.addEventListener('change', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.connectionMethod = (dom.connectionMethodEl?.value || 'udpout') as PioneerConnectionMethod;
        }));
        dom.deviceEl?.addEventListener('input', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.device = dom.deviceEl?.value.trim() || '/dev/serial0';
        }));
        dom.baudEl?.addEventListener('input', () => applyToCurrentDroneConnection((droneId) => {
            const nextValue = Number.parseInt(dom.baudEl?.value || '115200', 10);
            drones[droneId].pythonConnection.baud = Number.isFinite(nextValue) ? nextValue : 115200;
        }));
        dom.loggerEl?.addEventListener('change', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.logger = dom.loggerEl?.checked ?? true;
        }));
        dom.logConnectionEl?.addEventListener('change', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.logConnection = dom.logConnectionEl?.checked ?? true;
        }));
        dom.pythonExecutableEl?.addEventListener('input', () => applyToCurrentDroneConnection((droneId) => {
            drones[droneId].pythonConnection.pythonExecutable = dom.pythonExecutableEl?.value.trim() || 'python';
        }));
    };

    return {
        bind,
        focusConnectionCard,
        renderBridgeCard,
        renderConnectionForm,
        resetExternalControlForDrone,
        updateActionsState
    };
}
