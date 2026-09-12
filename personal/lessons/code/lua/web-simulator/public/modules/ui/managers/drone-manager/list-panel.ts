import { log } from '../../../shared/logging/logger.js';
import {
    currentDroneId,
    currentScriptLanguage,
    createDroneState,
    drones,
    ensureDronePythonConnectionSettings,
    removeDroneState,
    setCurrentDrone
} from '../../../core/state.js';
import { getEditorValue, setEditorValue } from '../../../editor/index.js';
import { stopLuaScript } from '../../../lua/index.js';
import { disposePythonRunState, stopPythonScript } from '../../../python/index.js';
import { setExternalBridgeEnabled } from '../../../python/external-bridge.js';
import type { DroneManagerDom } from './dom.js';
import {
    getDroneTransportSummary,
    getNextAvailableCameraPort,
    getNextAvailableMavlinkPort,
    reportDroneManagerDebug
} from './helpers.js';

type DroneListPanelOptions = {
    dom: DroneManagerDom;
    getActiveDroneId: () => string | null;
    emitConnectionSettingsChanged: (droneId: string) => void;
    emitDroneSelectionChanged: (droneId: string) => void;
    focusConnectionCard: () => void;
    onSceneUpdate?: () => void;
    refreshActionsState: () => void;
    renderConnectionDetails: () => void;
};

export function createDroneListPanel(options: DroneListPanelOptions) {
    const {
        dom,
        getActiveDroneId,
        emitConnectionSettingsChanged,
        emitDroneSelectionChanged,
        focusConnectionCard,
        onSceneUpdate,
        refreshActionsState,
        renderConnectionDetails
    } = options;

    const listEl = dom.list;

    function switchDrone(nextDroneId: string) {
        if (!drones[nextDroneId] || nextDroneId === currentDroneId) return;

        const previousDroneId = getActiveDroneId();
        if (previousDroneId && drones[previousDroneId]) {
            const currentCode = getEditorValue();
            if (currentScriptLanguage === 'lua') {
                drones[previousDroneId].script = currentCode;
            } else {
                drones[previousDroneId].pythonScript = currentCode;
            }
        }

        setCurrentDrone(nextDroneId);
        emitDroneSelectionChanged(nextDroneId);
        const nextCode = currentScriptLanguage === 'lua'
            ? drones[nextDroneId].script
            : drones[nextDroneId].pythonScript;
        setEditorValue(nextCode);

        renderConnectionDetails();
        if (onSceneUpdate) onSceneUpdate();
    }

    function updateList() {
        if (!listEl) {
            return;
        }

        const droneIds = Object.keys(drones);
        listEl.innerHTML = '';
        reportDroneManagerDebug('H1', 'Rendering drone manager list', {
            currentDroneId,
            drones: droneIds.map((id) => ({
                id,
                name: drones[id]?.name,
                ip: drones[id]?.pythonConnection?.ip,
                mavlinkPort: drones[id]?.pythonConnection?.mavlinkPort,
                cameraPort: drones[id]?.pythonConnection?.cameraPort,
                connectionMethod: drones[id]?.pythonConnection?.connectionMethod
            }))
        });

        if (dom.listCount) {
            dom.listCount.textContent = `${droneIds.length} ${droneIds.length === 1 ? 'дрон' : droneIds.length < 5 ? 'дрона' : 'дронов'}`;
        }

        if (dom.delBtn) {
            dom.delBtn.disabled = droneIds.length <= 1 || !getActiveDroneId();
        }

        if (droneIds.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'swarm-list__empty';
            emptyState.textContent = 'Список роя пуст. Добавьте первый дрон, чтобы начать работу.';
            listEl.appendChild(emptyState);
            listEl.removeAttribute('aria-activedescendant');
            renderConnectionDetails();
            refreshActionsState();
            return;
        }

        droneIds.forEach((id, index) => {
            const connection = ensureDronePythonConnectionSettings(id);
            const item = document.createElement('button');
            item.type = 'button';
            item.id = `drone-list-item-${id}`;
            item.className = `swarm-list__item${id === currentDroneId ? ' is-active' : ''}`;
            item.dataset.droneId = id;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', id === currentDroneId ? 'true' : 'false');

            const main = document.createElement('span');
            main.className = 'swarm-list__item-main';

            const icon = document.createElement('span');
            icon.className = 'swarm-list__item-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="2.05"></circle><circle cx="17" cy="7" r="2.05"></circle><circle cx="7" cy="17" r="2.05"></circle><circle cx="17" cy="17" r="2.05"></circle><rect x="9.5" y="9.5" width="5" height="5" rx="1.5"></rect><path d="M8.6 8.6 10 10"></path><path d="M15.4 8.6 14 10"></path><path d="M8.6 15.4 10 14"></path><path d="M15.4 15.4 14 14"></path></svg>';

            const name = document.createElement('span');
            name.className = 'swarm-list__item-name';
            name.textContent = drones[id].name;

            const text = document.createElement('span');
            text.className = 'swarm-list__item-text';

            const meta = document.createElement('span');
            meta.className = 'swarm-list__item-meta';
            meta.textContent = getDroneTransportSummary(id);

            const badge = document.createElement('span');
            badge.className = 'swarm-list__item-badge';
            badge.textContent = String(connection.mavlinkPort || index + 1);

            text.appendChild(name);
            text.appendChild(meta);
            main.appendChild(icon);
            main.appendChild(text);
            item.appendChild(main);
            item.appendChild(badge);
            item.title = `${drones[id].name} · ${getDroneTransportSummary(id)}`;
            listEl.appendChild(item);
        });

        const activeDroneId = getActiveDroneId();
        if (activeDroneId) {
            listEl.setAttribute('aria-activedescendant', `drone-list-item-${activeDroneId}`);
        } else {
            listEl.removeAttribute('aria-activedescendant');
        }
        renderConnectionDetails();
        refreshActionsState();
    }

    const bind = () => {
        listEl?.addEventListener('click', (event) => {
            const target = event.target as HTMLElement | null;
            const item = target?.closest('.swarm-list__item') as HTMLButtonElement | null;
            const nextDroneId = item?.dataset.droneId;
            if (!nextDroneId) return;
            switchDrone(nextDroneId);
            updateList();
        });

        listEl?.addEventListener('dblclick', (event) => {
            const target = event.target as HTMLElement | null;
            const item = target?.closest('.swarm-list__item') as HTMLButtonElement | null;
            const nextDroneId = item?.dataset.droneId;
            if (!nextDroneId) return;
            switchDrone(nextDroneId);
            updateList();
            focusConnectionCard();
        });

        listEl?.addEventListener('keydown', (event) => {
            const droneIds = Object.keys(drones);
            if (droneIds.length === 0) return;

            const currentIndex = Math.max(0, droneIds.indexOf(currentDroneId));
            const nextIndex = event.key === 'ArrowDown'
                ? Math.min(droneIds.length - 1, currentIndex + 1)
                : event.key === 'ArrowUp'
                    ? Math.max(0, currentIndex - 1)
                    : -1;
            if (nextIndex < 0) return;

            event.preventDefault();
            const nextDroneId = droneIds[nextIndex];
            switchDrone(nextDroneId);
            updateList();

            const nextItem = listEl?.querySelector(`[data-drone-id="${nextDroneId}"]`) as HTMLButtonElement | null;
            nextItem?.focus();
        });

        dom.addBtn?.addEventListener('click', () => {
            const num = Object.keys(drones).length + 1;
            const id = `drone_${num}_${Date.now()}`;
            const name = `Pioneer ${num}`;
            const sourceDroneId = getActiveDroneId() || currentDroneId;
            const sourceConnection = ensureDronePythonConnectionSettings(sourceDroneId);
            const nextPort = getNextAvailableMavlinkPort(sourceConnection.mavlinkPort || 8001);
            const preferredCameraPort = sourceConnection.cameraPort || ((sourceConnection.mavlinkPort || 8001) + 10000);
            const nextCameraPort = getNextAvailableCameraPort(preferredCameraPort);
            const x = (Math.random() - 0.5) * 4;
            const y = (Math.random() - 0.5) * 4;

            createDroneState(id, name, x, y, 0);
            const createdConnection = ensureDronePythonConnectionSettings(id);
            createdConnection.executionTarget = sourceConnection.executionTarget;
            createdConnection.simulator = sourceConnection.simulator;
            createdConnection.allowExternalBridge = false;
            createdConnection.name = name;
            createdConnection.ip = sourceConnection.ip;
            createdConnection.mavlinkPort = nextPort;
            createdConnection.cameraPort = nextCameraPort;
            createdConnection.connectionMethod = sourceConnection.connectionMethod;
            createdConnection.device = sourceConnection.device;
            createdConnection.baud = sourceConnection.baud;
            createdConnection.logger = sourceConnection.logger;
            createdConnection.logConnection = sourceConnection.logConnection;
            createdConnection.pythonExecutable = sourceConnection.pythonExecutable;

            emitConnectionSettingsChanged(id);
            reportDroneManagerDebug('H5', 'Created drone from manager', { id, name });
            switchDrone(id);
            updateList();
            log(`Добавлен новый дрон: ${name} (${createdConnection.ip}:${createdConnection.mavlinkPort}, camera:${createdConnection.cameraPort}, ${createdConnection.connectionMethod})`, 'success');
        });

        dom.delBtn?.addEventListener('click', () => {
            if (Object.keys(drones).length <= 1) {
                log('Нельзя удалить последний дрон.', 'error');
                return;
            }

            const id = getActiveDroneId();
            if (!id) {
                return;
            }

            stopLuaScript(id);
            stopPythonScript(id);
            disposePythonRunState(id);
            void setExternalBridgeEnabled(id, false);
            removeDroneState(id);

            const nextDroneId = Object.keys(drones)[0] || null;
            if (!nextDroneId) {
                setEditorValue('');
                updateList();
                if (onSceneUpdate) onSceneUpdate();
                return;
            }

            setCurrentDrone(nextDroneId);
            emitDroneSelectionChanged(nextDroneId);
            const nextCode = currentScriptLanguage === 'lua'
                ? drones[nextDroneId].script
                : drones[nextDroneId].pythonScript;
            setEditorValue(nextCode);
            updateList();
            if (onSceneUpdate) onSceneUpdate();
            log(`Удалён дрон: ${id}`, 'info');
        });
    };

    return {
        bind,
        switchDrone,
        updateList
    };
}
