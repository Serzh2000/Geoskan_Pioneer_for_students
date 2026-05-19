/**
 * Модуль управления роем (Менеджер дронов) в UI.
 * Позволяет переключаться между различными дронами в симуляции,
 * добавлять новые дроны на сцену со случайным смещением, а также
 * удалять дроны из симуляции (если их больше одного).
 * Сохраняет и восстанавливает скрипты в редакторе при переключении.
 */
import { log } from '../../shared/logging/logger.js';
import { currentDroneId, currentScriptLanguage, drones, createDroneState, setCurrentDrone } from '../../core/state.js';
import { getEditorValue, setEditorValue } from '../../editor/index.js';

export function initDroneManager(onSceneUpdate?: () => void) {
    const list = document.getElementById('drone-list') as HTMLDivElement | null;
    const listCount = document.getElementById('drone-list-count') as HTMLElement | null;
    const addBtn = document.getElementById('add-drone-btn') as HTMLButtonElement;
    const delBtn = document.getElementById('del-drone-btn') as HTMLButtonElement;

    if (!list || !addBtn || !delBtn) {
        return;
    }

    const getActiveDroneId = () => {
        if (currentDroneId && drones[currentDroneId]) return currentDroneId;
        return Object.keys(drones)[0] || null;
    };

    function updateActionsState() {
        const droneIds = Object.keys(drones);
        const hasSelection = !!getActiveDroneId();
        delBtn.disabled = droneIds.length <= 1 || !hasSelection;
    }

    function switchDrone(nextDroneId: string) {
        if (!drones[nextDroneId] || nextDroneId === currentDroneId) return;

        // Save current script before switching
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
        const nextCode = currentScriptLanguage === 'lua'
            ? drones[nextDroneId].script
            : drones[nextDroneId].pythonScript;
        setEditorValue(nextCode);

        if (onSceneUpdate) onSceneUpdate();
    }

    function updateList() {
        const droneIds = Object.keys(drones);
        list.innerHTML = '';

        if (listCount) {
            listCount.textContent = `${droneIds.length} ${droneIds.length === 1 ? 'дрон' : droneIds.length < 5 ? 'дрона' : 'дронов'}`;
        }

        if (droneIds.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'swarm-list__empty';
            emptyState.textContent = 'Список роя пуст. Добавьте первый дрон, чтобы начать работу.';
            list.appendChild(emptyState);
            updateActionsState();
            return;
        }

        droneIds.forEach((id, index) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.id = `drone-list-item-${id}`;
            item.className = `swarm-list__item${id === currentDroneId ? ' is-active' : ''}`;
            item.dataset.droneId = id;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', id === currentDroneId ? 'true' : 'false');

            const name = document.createElement('span');
            name.className = 'swarm-list__item-name';
            name.textContent = drones[id].name;

            const badge = document.createElement('span');
            badge.className = 'swarm-list__item-badge';
            badge.textContent = String(index + 1);

            item.appendChild(name);
            item.appendChild(badge);
            list.appendChild(item);
        });

        const activeDroneId = getActiveDroneId();
        if (activeDroneId) {
            list.setAttribute('aria-activedescendant', `drone-list-item-${activeDroneId}`);
        } else {
            list.removeAttribute('aria-activedescendant');
        }
        updateActionsState();
    }

    list.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const item = target?.closest('.swarm-list__item') as HTMLButtonElement | null;
        const nextDroneId = item?.dataset.droneId;
        if (!nextDroneId) return;
        switchDrone(nextDroneId);
        updateList();
    });

    list.addEventListener('keydown', (event) => {
        const droneIds = Object.keys(drones);
        if (droneIds.length === 0) return;

        const currentIndex = Math.max(0, droneIds.indexOf(currentDroneId));
        let nextIndex = currentIndex;

        if (event.key === 'ArrowDown') {
            nextIndex = Math.min(droneIds.length - 1, currentIndex + 1);
        } else if (event.key === 'ArrowUp') {
            nextIndex = Math.max(0, currentIndex - 1);
        } else {
            return;
        }

        event.preventDefault();
        const nextDroneId = droneIds[nextIndex];
        switchDrone(nextDroneId);
        updateList();

        const nextItem = list.querySelector(`[data-drone-id="${nextDroneId}"]`) as HTMLButtonElement | null;
        nextItem?.focus();
    });

    addBtn.addEventListener('click', () => {
        const num = Object.keys(drones).length + 1;
        const id = `drone_${num}_${Date.now()}`;
        const name = `Pioneer ${num}`;
        // Random offset for new drones
        const x = (Math.random() - 0.5) * 4;
        const y = (Math.random() - 0.5) * 4;
        createDroneState(id, name, x, y, 0);
        switchDrone(id);
        updateList();
        log(`Добавлен новый дрон: ${name}`, 'success');
    });

    delBtn.addEventListener('click', () => {
        if (Object.keys(drones).length <= 1) {
            log('Нельзя удалить последний дрон.', 'error');
            return;
        }
        const id = getActiveDroneId();
        if (id) {
            delete drones[id];
            const nextDroneId = Object.keys(drones)[0] || null;
            if (!nextDroneId) {
                setEditorValue('');
                updateList();
                if (onSceneUpdate) onSceneUpdate();
                return;
            }
            setCurrentDrone(nextDroneId);
            const nextCode = currentScriptLanguage === 'lua'
                ? drones[nextDroneId].script
                : drones[nextDroneId].pythonScript;
            setEditorValue(nextCode);
            updateList();
            if (onSceneUpdate) onSceneUpdate();
            log(`Удалён дрон: ${id}`, 'info');
        }
    });

    updateList();
}
