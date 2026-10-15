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
    getDroneAddress,
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
    // Inline confirmation: the row whose delete action was pressed once.
    let pendingDeleteId: string | null = null;

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

        if (pendingDeleteId && !drones[pendingDeleteId]) {
            pendingDeleteId = null;
        }
        const canDelete = droneIds.length > 1;

        droneIds.forEach((id, index) => {
            const connection = ensureDronePythonConnectionSettings(id);
            const isSelected = id === currentDroneId;
            const isConfirming = canDelete && id === pendingDeleteId;
            const item = document.createElement('div');
            item.id = `drone-list-item-${id}`;
            item.className = `pk-row${isSelected ? ' is-selected' : ''}`;
            item.dataset.droneId = id;
            item.tabIndex = 0;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', isSelected ? 'true' : 'false');

            const icon = document.createElement('span');
            icon.className = 'pk-row__icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="2.05"></circle><circle cx="17" cy="7" r="2.05"></circle><circle cx="7" cy="17" r="2.05"></circle><circle cx="17" cy="17" r="2.05"></circle><rect x="9.5" y="9.5" width="5" height="5" rx="1.5"></rect><path d="M8.6 8.6 10 10"></path><path d="M15.4 8.6 14 10"></path><path d="M8.6 15.4 10 14"></path><path d="M15.4 15.4 14 14"></path></svg>';

            const text = document.createElement('span');
            text.className = 'pk-row__text';

            const name = document.createElement('span');
            name.className = 'pk-row__name';
            name.textContent = drones[id].name;

            const meta = document.createElement('span');
            meta.className = 'pk-row__meta';
            meta.textContent = isConfirming ? 'Удалить этого дрона?' : getDroneAddress(id);

            text.appendChild(name);
            text.appendChild(meta);
            item.appendChild(icon);
            item.appendChild(text);
            item.title = `${drones[id].name} · ${getDroneTransportSummary(id)}`;

            if (isConfirming) {
                const confirm = document.createElement('span');
                confirm.className = 'swarm-list__confirm';
                const yes = document.createElement('button');
                yes.type = 'button';
                yes.className = 'btn-secondary btn--sm btn--danger';
                yes.dataset.action = 'delete-confirm';
                yes.textContent = 'Удалить';
                const no = document.createElement('button');
                no.type = 'button';
                no.className = 'btn-secondary btn--sm';
                no.dataset.action = 'delete-cancel';
                no.textContent = 'Отмена';
                confirm.appendChild(yes);
                confirm.appendChild(no);
                item.appendChild(confirm);
            } else {
                const port = document.createElement('span');
                port.className = 'pk-row__end swarm-list__port';
                port.textContent = `порт ${connection.mavlinkPort || index + 1}`;
                item.appendChild(port);

                if (canDelete) {
                    const action = document.createElement('button');
                    action.type = 'button';
                    action.className = 'pk-row__action';
                    action.dataset.action = 'delete';
                    action.setAttribute('aria-label', `Удалить дрон ${drones[id].name}`);
                    action.title = 'Удалить';
                    action.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14"></path><path d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7"></path><path d="M6.2 7 7 18a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L17.8 7"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';
                    item.appendChild(action);
                } else {
                    const spacer = document.createElement('span');
                    spacer.className = 'pk-row__spacer';
                    spacer.setAttribute('aria-hidden', 'true');
                    item.appendChild(spacer);
                }
            }
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
        const itemFromEvent = (event: Event) => {
            const target = event.target as HTMLElement | null;
            return target?.closest('.pk-row[data-drone-id]') as HTMLElement | null;
        };

        const focusRow = (droneId: string, selector = '') => {
            const row = listEl?.querySelector(`[data-drone-id="${droneId}"]`) as HTMLElement | null;
            const control = selector ? row?.querySelector(selector) as HTMLElement | null : null;
            (control || row)?.focus();
        };

        listEl?.addEventListener('click', (event) => {
            const item = itemFromEvent(event);
            const droneId = item?.dataset.droneId;
            if (!droneId) return;

            const actionEl = (event.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
            const action = actionEl?.dataset.action;
            if (action === 'delete') {
                pendingDeleteId = droneId;
                updateList();
                focusRow(droneId, '[data-action="delete-cancel"]');
                return;
            }
            if (action === 'delete-cancel') {
                pendingDeleteId = null;
                updateList();
                focusRow(droneId);
                return;
            }
            if (action === 'delete-confirm') {
                pendingDeleteId = null;
                deleteDrone(droneId);
                return;
            }

            pendingDeleteId = null;
            switchDrone(droneId);
            updateList();
        });

        listEl?.addEventListener('dblclick', (event) => {
            if ((event.target as HTMLElement).closest('[data-action]')) return;
            const droneId = itemFromEvent(event)?.dataset.droneId;
            if (!droneId) return;
            switchDrone(droneId);
            updateList();
            focusConnectionCard();
        });

        listEl?.addEventListener('keydown', (event) => {
            const keyTarget = event.target as HTMLElement | null;
            if (event.key === 'Escape' && pendingDeleteId) {
                const cancelledId = pendingDeleteId;
                pendingDeleteId = null;
                updateList();
                focusRow(cancelledId);
                return;
            }

            // Enter/Space on a focused row selects it: rows are options, not buttons.
            if ((event.key === 'Enter' || event.key === ' ') && keyTarget?.classList.contains('pk-row')) {
                const droneId = keyTarget.dataset.droneId;
                if (!droneId) return;
                event.preventDefault();
                pendingDeleteId = null;
                switchDrone(droneId);
                updateList();
                focusRow(droneId);
                return;
            }

            if (keyTarget?.closest('[data-action]')) return;
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
            pendingDeleteId = null;
            const nextDroneId = droneIds[nextIndex];
            switchDrone(nextDroneId);
            updateList();
            focusRow(nextDroneId);
        });

        dom.addBtn?.addEventListener('click', () => {
            const num = Object.keys(drones).length + 1;
            const id = `drone_${num}_${Date.now()}`;
            const name = `Пионер Базовый ${num}`;
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
            const id = getActiveDroneId();
            if (id) deleteDrone(id);
        });
    };

    function deleteDrone(id: string) {
        if (Object.keys(drones).length <= 1) {
            log('Нельзя удалить последний дрон.', 'error');
            return;
        }
        if (!drones[id]) {
            return;
        }

        const wasCurrent = id === currentDroneId;
        stopLuaScript(id);
        const droneBeingDeleted = drones[id];
        droneBeingDeleted.running = false;
        droneBeingDeleted.status = 'ОСТАНОВЛЕН';
        droneBeingDeleted.pendingLocalPoint = false;
        droneBeingDeleted.pendingLocalPointSource = null;
        droneBeingDeleted.pendingLocalPointTarget = null;
        droneBeingDeleted.pointReachedFlag = false;
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

        if (wasCurrent) {
            setCurrentDrone(nextDroneId);
            emitDroneSelectionChanged(nextDroneId);
            const nextCode = currentScriptLanguage === 'lua'
                ? drones[nextDroneId].script
                : drones[nextDroneId].pythonScript;
            setEditorValue(nextCode);
        }
        updateList();
        if (onSceneUpdate) onSceneUpdate();
        log(`Удалён дрон: ${id}`, 'info');
    }

    return {
        bind,
        switchDrone,
        updateList
    };
}
