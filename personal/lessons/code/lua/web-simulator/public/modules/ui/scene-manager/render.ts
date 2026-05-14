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
        row.textContent = `${formatSceneLabel(obj.sceneType, obj.name)}${obj.isDrone ? ' (дрон)' : ''}`;
        row.onclick = () => {
            callbacks.sceneManager && callbacks.sceneManager.select(obj.id);
            rerender();
        };
        elements.listEl.appendChild(row);
    }
}

function renderEmptyState(elements: SceneManagerDomRefs) {
    if (elements.detailsEl) elements.detailsEl.textContent = 'Объекты сцены не найдены';
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

    const detailLines = [
        `Тип: ${formatSceneLabel(selected.sceneType, selected.name)}`,
        `Имя: ${formatSceneLabel(selected.name, selected.sceneType)}`,
        `Перемещаемый: ${selected.draggable ? 'да' : 'нет'}`,
        `Позиция: ${formatSceneNumber(selected.position.x)}, ${formatSceneNumber(selected.position.y)}, ${formatSceneNumber(selected.position.z)}`,
        `Поворот: ${formatSceneNumber(selected.rotation.x)}, ${formatSceneNumber(selected.rotation.y)}, ${formatSceneNumber(selected.rotation.z)}`,
        `Масштаб: ${formatSceneNumber(selected.scale.x)}, ${formatSceneNumber(selected.scale.y)}, ${formatSceneNumber(selected.scale.z)}`
    ];
    if (selected.metaLines?.length) detailLines.push(...selected.metaLines);
    elements.detailsEl.textContent = detailLines.join('\n');
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
