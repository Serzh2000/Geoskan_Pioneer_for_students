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
    const list = document.getElementById('drone-list') as HTMLUListElement;
    const addBtn = document.getElementById('add-drone-btn') as HTMLButtonElement;
    const delBtn = document.getElementById('del-drone-btn') as HTMLButtonElement;

    function selectDrone(id: string) {
        if (!drones[id] || id === currentDroneId) return;
        // Save current script before switching
        if (drones[currentDroneId]) {
            const currentCode = getEditorValue();
            if (currentScriptLanguage === 'lua') {
                drones[currentDroneId].script = currentCode;
            } else {
                drones[currentDroneId].pythonScript = currentCode;
            }
        }
        setCurrentDrone(id);
        const nextCode = currentScriptLanguage === 'lua'
            ? drones[currentDroneId].script
            : drones[currentDroneId].pythonScript;
        setEditorValue(nextCode);
        if (onSceneUpdate) onSceneUpdate();
        updateList();
    }

    function updateList() {
        list.innerHTML = '';
        for (const id in drones) {
            const item = document.createElement('li');
            item.className = 'drone-list-item';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(id === currentDroneId));

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'drone-list-button';
            if (id === currentDroneId) button.classList.add('is-selected');
            button.dataset.droneId = id;
            button.textContent = drones[id].name;
            button.addEventListener('click', () => selectDrone(id));

            item.appendChild(button);
            list.appendChild(item);
        }
    }

    addBtn.addEventListener('click', () => {
        const num = Object.keys(drones).length + 1;
        const id = `drone_${num}_${Date.now()}`;
        const name = `Pioneer ${num}`;
        // Random offset for new drones
        const x = (Math.random() - 0.5) * 4;
        const y = (Math.random() - 0.5) * 4;
        createDroneState(id, name, x, y, 0);
        updateList();
        if (onSceneUpdate) onSceneUpdate();
        log(`Added new drone: ${name}`);
    });

    delBtn.addEventListener('click', () => {
        if (Object.keys(drones).length <= 1) {
            log('Cannot delete the last drone.', 'error');
            return;
        }
        const id = currentDroneId;
        if (id) {
            delete drones[id];
            setCurrentDrone(Object.keys(drones)[0]);
            const nextCode = currentScriptLanguage === 'lua'
                ? drones[currentDroneId].script
                : drones[currentDroneId].pythonScript;
            setEditorValue(nextCode);
            updateList();
            if (onSceneUpdate) onSceneUpdate();
            log(`Deleted drone: ${id}`);
        }
    });

    updateList();
}
