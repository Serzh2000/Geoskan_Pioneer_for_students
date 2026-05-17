import type { UICallbacks } from '../index.js';
import type { SceneManagerDomRefs } from './support.js';
import {
    clampFloors,
    fillDictionarySelect,
    formatSceneNumber,
    getMarkerMode,
    isSceneEditorFocused,
    setBuildingControlsVisible,
    syncFloorLimit,
    syncIncidentValue
} from './support.js';

type SceneManagerEntry = ReturnType<NonNullable<UICallbacks['sceneManager']>['list']>[number];

function formatSceneLabel(value: string, objectName = ''): string {
    const normalized = String(value || '').trim();
    const name = String(objectName || '').trim();

    if (normalized === 'Ground' || name === 'Ground') return 'Земля';
    if (normalized === 'Group' || name === 'Group') return 'Группа';

    return normalized || name || 'Объект';
}

const ICONS = {
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    drone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5m0-7V2M2 12h5m7 0h8"></path><circle cx="12" cy="12" r="3"></circle><circle cx="12" cy="2" r="1"></circle><circle cx="12" cy="22" r="1"></circle><circle cx="2" cy="12" r="1"></circle><circle cx="22" cy="12" r="1"></circle></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'
};

function getObjectIcon(type: string, isDrone: boolean): string {
    if (isDrone) return ICONS.drone;
    if (type === 'Группа' || type === 'Group') return ICONS.folder;
    if (type === 'Земля' || type === 'Ground') return ICONS.grid;
    return ICONS.cube;
}

function renderObjectList(
    callbacks: UICallbacks,
    elements: SceneManagerDomRefs,
    objects: SceneManagerEntry[],
    selectedId: string | null,
    rerender: () => void
) {
    if (!elements.listEl || !callbacks.sceneManager) return;

    elements.listEl.innerHTML = '';
    for (const obj of objects) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'scene-manager-item' + (obj.id === selectedId ? ' active' : '');
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', obj.id === selectedId ? 'true' : 'false');
        
        const label = formatSceneLabel(obj.sceneType, obj.name);
        const icon = getObjectIcon(obj.sceneType, obj.isDrone);
        
        row.innerHTML = `${icon} <span>${label}${obj.isDrone ? ' (дрон)' : ''}</span>`;
        
        row.onclick = () => {
            callbacks.sceneManager && callbacks.sceneManager.select(obj.id);
            rerender();
        };
        elements.listEl.appendChild(row);
    }
}

function renderEmptyState(elements: SceneManagerDomRefs) {
    if (elements.detailsEl) elements.detailsEl.textContent = 'Объекты сцены не найдены';
    if (elements.selectedObjectChipEl) elements.selectedObjectChipEl.textContent = 'Ничего не выбрано';
    if (elements.selectedDictionaryEl) elements.selectedDictionaryEl.value = '';
    if (elements.selectedValueEl) elements.selectedValueEl.value = '';
    if (elements.selectedFloorsEl) elements.selectedFloorsEl.value = '9';
    if (elements.selectedBuildingIncidentsEl) elements.selectedBuildingIncidentsEl.value = '';
    if (elements.selectedPointsEl) elements.selectedPointsEl.value = '';
    if (elements.visualEditBtn) {
        elements.visualEditBtn.style.display = 'none';
        elements.visualEditBtn.toggleAttribute('disabled', true);
    }
}

function renderSelectedDetails(elements: SceneManagerDomRefs, selected: SceneManagerEntry) {
    if (!elements.detailsEl) return;

    const selectedLabel = formatSceneLabel(selected.sceneType, selected.name);
    if (elements.selectedObjectChipEl) {
        elements.selectedObjectChipEl.textContent = selected.isDrone ? `${selectedLabel} (дрон)` : selectedLabel;
        elements.selectedObjectChipEl.title = elements.selectedObjectChipEl.textContent;
    }

    const labels = {
        position: 'Позиция',
        rotation: 'Поворот',
        scale: 'Масштаб'
    };

    const details = [
        { label: labels.position, value: `${formatSceneNumber(selected.position.x)}, ${formatSceneNumber(selected.position.y)}, ${formatSceneNumber(selected.position.z)}` },
        { label: labels.rotation, value: `${formatSceneNumber(selected.rotation.x)}, ${formatSceneNumber(selected.rotation.y)}, ${formatSceneNumber(selected.rotation.z)}` },
        { label: labels.scale, value: `${formatSceneNumber(selected.scale.x)}, ${formatSceneNumber(selected.scale.y)}, ${formatSceneNumber(selected.scale.z)}` }
    ];

    elements.detailsEl.innerHTML = details
        .map(d => `<div class="detail-row"><span class="detail-label">${d.label}:</span> <span class="detail-value">${d.value}</span></div>`)
        .join('');
}

function syncSelectedInputs(
    elements: SceneManagerDomRefs,
    selected: SceneManagerEntry,
    selectionChanged: boolean,
    isEditorFocused: boolean
) {
    if (!selectionChanged && isEditorFocused) return;

    if (elements.selectedDictionaryEl && selected.supportsMarkerDictionary) {
        fillDictionarySelect(
            elements.selectedDictionaryEl,
            getMarkerMode(selected.markerKind || selected.sceneType),
            selected.markerDictionary
        );
    } else if (elements.selectedDictionaryEl) {
        elements.selectedDictionaryEl.innerHTML = '<option value="">Словарь маркера</option>';
        elements.selectedDictionaryEl.value = '';
    }
    if (elements.selectedValueEl) elements.selectedValueEl.value = selected.value || '';
    if (elements.selectedFloorsEl) {
        elements.selectedFloorsEl.value = String(clampFloors(String(selected.floors ?? 9), selected.floors ?? 9));
    }
    if (elements.selectedBuildingIncidentsEl) elements.selectedBuildingIncidentsEl.value = selected.value || '';
    if (elements.selectedPointsEl) elements.selectedPointsEl.value = selected.pointsText || '';
}

function updateSelectedControls(callbacks: UICallbacks, elements: SceneManagerDomRefs, selected: SceneManagerEntry) {
    const isBuildingSelected = selected.sceneType === 'Многоэтажка';
    const isVisualEditing = callbacks.sceneManager?.isLinearEditingActive(selected.id) || false;
    const isAnyLinearEditing = callbacks.sceneManager?.isLinearEditingActive() || false;

    if (elements.selectedDictionaryEl) {
        const isMarkerDictionaryEditable = !!selected.supportsMarkerDictionary;
        elements.selectedDictionaryEl.disabled = !isMarkerDictionaryEditable;
        elements.selectedDictionaryEl.style.display = isMarkerDictionaryEditable ? 'block' : 'none';
    }
    if (elements.selectedValueEl) {
        elements.selectedValueEl.disabled = !selected.supportsValue || isBuildingSelected;
        elements.selectedValueEl.placeholder = !selected.supportsValue
            ? 'У выбранного объекта нет значения'
            : selected.sceneType === 'Многоэтажка'
                ? 'Окна: 3:front:2=smoke; 5:back:1=fire'
                : 'Значение маркера';
        elements.selectedValueEl.style.display = selected.supportsValue && !isBuildingSelected ? 'block' : 'none';
    }
    setBuildingControlsVisible(
        isBuildingSelected,
        elements.selectedFloorsWrapEl,
        elements.selectedFloorsEl,
        elements.selectedBuildingSettingsEl
    );
    syncFloorLimit(elements.selectedFloorsEl, elements.selectedBuildingFloorEl);
    syncIncidentValue(elements.selectedValueEl, elements.selectedBuildingIncidentsEl);
    if (elements.selectedPointsEl) {
        elements.selectedPointsEl.disabled = !selected.supportsPoints;
        elements.selectedPointsEl.placeholder = selected.supportsPoints
            ? 'Каждая строка: X, Y, Z'
            : 'Маршрут можно редактировать только у дорог и рельс';
        elements.selectedPointsEl.style.display = selected.supportsPoints ? 'block' : 'none';
    }
    if (elements.appendPointBtn) elements.appendPointBtn.toggleAttribute('disabled', !selected.supportsPoints);
    if (elements.visualEditBtn) {
        elements.visualEditBtn.style.display = selected.supportsPoints ? 'inline-flex' : 'none';
        elements.visualEditBtn.textContent = isVisualEditing ? 'Готово' : 'Проложить';
        elements.visualEditBtn.toggleAttribute('disabled', isAnyLinearEditing && !isVisualEditing);
        elements.visualEditBtn.title = isVisualEditing
            ? 'Завершить визуальную прокладку'
            : 'Добавлять точки маршрута кликами по сцене';
    }

    // Update transform mode buttons
    if (callbacks.sceneManager) {
        const mode = callbacks.sceneManager.getMode?.() ?? null;
        elements.modeTranslateBtn?.classList.toggle('active', mode === 'translate');
        elements.modeRotateBtn?.classList.toggle('active', mode === 'rotate');
        elements.modeScaleBtn?.classList.toggle('active', mode === 'scale');
    }
}

export function renderSceneManager(
    callbacks: UICallbacks,
    elements: SceneManagerDomRefs,
    lastSelectedId: string | null,
    rerender: () => void
) {
    if (!elements.listEl || !elements.detailsEl || !callbacks.sceneManager) return lastSelectedId;

    const objects = callbacks.sceneManager.list();
    const selectedId = callbacks.sceneManager.getSelectedId();

    renderObjectList(callbacks, elements, objects, selectedId, rerender);

    const selected = objects.find((item) => item.id === selectedId) || objects[0];
    if (!selected) {
        renderEmptyState(elements);
        return null;
    }

    renderSelectedDetails(elements, selected);

    const selectionChanged = lastSelectedId !== selected.id;
    syncSelectedInputs(elements, selected, selectionChanged, isSceneEditorFocused(elements));
    updateSelectedControls(callbacks, elements, selected);

    return selected.id;
}
