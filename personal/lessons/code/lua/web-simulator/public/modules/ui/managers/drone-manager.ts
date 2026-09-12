import { currentDroneId, drones } from '../../core/state.js';
import { createConnectionPanel } from './drone-manager/connection-panel.js';
import { collectDroneManagerDom } from './drone-manager/dom.js';
import { createDroneListPanel } from './drone-manager/list-panel.js';

export function initDroneManager(onSceneUpdate?: () => void) {
    const dom = collectDroneManagerDom();
    if (!dom.list || !dom.addBtn || !dom.delBtn) {
        return;
    }

    const getActiveDroneId = () => {
        if (currentDroneId && drones[currentDroneId]) {
            return currentDroneId;
        }
        return Object.keys(drones)[0] || null;
    };

    const emitConnectionSettingsChanged = (droneId: string) => {
        window.dispatchEvent(new CustomEvent('drone-connection-settings-changed', {
            detail: { droneId }
        }));
    };

    const emitDroneSelectionChanged = (droneId: string) => {
        window.dispatchEvent(new CustomEvent('drone-selection-changed', {
            detail: { droneId }
        }));
    };

    // droneListPanel and connectionPanel wire each other up: connectionPanel's refreshUi closes over
    // droneListPanel before it exists, so this forward reference can't be collapsed into one const.
    // eslint-disable-next-line prefer-const
    let droneListPanel: ReturnType<typeof createDroneListPanel>;
    const connectionPanel = createConnectionPanel({
        dom,
        getActiveDroneId,
        emitConnectionSettingsChanged,
        onSceneUpdate,
        refreshUi: () => droneListPanel.updateList()
    });

    droneListPanel = createDroneListPanel({
        dom,
        getActiveDroneId,
        emitConnectionSettingsChanged,
        emitDroneSelectionChanged,
        focusConnectionCard: connectionPanel.focusConnectionCard,
        onSceneUpdate,
        refreshActionsState: connectionPanel.updateActionsState,
        renderConnectionDetails: () => {
            connectionPanel.renderConnectionForm();
            connectionPanel.renderBridgeCard();
        }
    });

    connectionPanel.bind();
    droneListPanel.bind();

    window.addEventListener('external-drone-state-changed', () => {
        droneListPanel.updateList();
        if (onSceneUpdate) onSceneUpdate();
    });

    window.addEventListener('drone-connection-settings-changed', () => {
        droneListPanel.updateList();
    });

    window.addEventListener('external-bridge-queue-cleared', () => {
        droneListPanel.updateList();
    });

    droneListPanel.updateList();
}
