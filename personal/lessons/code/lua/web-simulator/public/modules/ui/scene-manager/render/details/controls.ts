import type { UICallbacks } from '../../../index.js';
import {
    clampFloors,
    fillDictionarySelect,
    getMarkerMode,
    setBuildingControlsVisible,
    syncFloorLimit,
    syncIncidentValue
} from '../../support.js';
import type { SceneManagerDomRefs, SceneManagerEntry, TransformMode } from '../../types.js';

function setFieldVisibility(fieldEl: HTMLElement | null, visible: boolean) {
    if (!fieldEl) return;
    fieldEl.style.display = visible ? '' : 'none';
}

function setBuildingEditorDisabled(elements: SceneManagerDomRefs, disabled: boolean) {
    elements.selectedBuildingFloorEl?.toggleAttribute('disabled', disabled);
    elements.selectedBuildingFaceEl?.toggleAttribute('disabled', disabled);
    elements.selectedBuildingWindowEl?.toggleAttribute('disabled', disabled);
    elements.selectedBuildingKindEl?.toggleAttribute('disabled', disabled);
    elements.selectedBuildingIncidentsEl?.toggleAttribute('disabled', disabled);
    elements.selectedBuildingAppendBtn?.toggleAttribute('disabled', disabled);
    elements.selectedBuildingClearBtn?.toggleAttribute('disabled', disabled);
}

export function resetSelectedControls(elements: SceneManagerDomRefs) {
    if (elements.selectedDictionaryEl) {
        elements.selectedDictionaryEl.innerHTML = '<option value="">Словарь маркера</option>';
        elements.selectedDictionaryEl.value = '';
        elements.selectedDictionaryEl.disabled = true;
    }
    if (elements.selectedValueEl) {
        elements.selectedValueEl.value = '';
        elements.selectedValueEl.disabled = true;
    }
    if (elements.selectedFloorsEl) {
        elements.selectedFloorsEl.value = '9';
        elements.selectedFloorsEl.disabled = true;
    }
    if (elements.selectedBuildingIncidentsEl) {
        elements.selectedBuildingIncidentsEl.value = '';
        elements.selectedBuildingIncidentsEl.disabled = true;
    }
    if (elements.selectedPointsEl) {
        elements.selectedPointsEl.value = '';
        elements.selectedPointsEl.disabled = true;
    }

    setFieldVisibility(elements.selectedDictionaryWrapEl, false);
    setFieldVisibility(elements.selectedValueWrapEl, false);
    setFieldVisibility(elements.selectedPointsWrapEl, false);
    setBuildingControlsVisible(
        false,
        elements.selectedFloorsWrapEl,
        elements.selectedFloorsEl,
        elements.selectedBuildingSettingsEl
    );
    setBuildingEditorDisabled(elements, true);

    if (elements.visualEditBtn) {
        elements.visualEditBtn.style.display = 'none';
        elements.visualEditBtn.toggleAttribute('disabled', true);
    }

    elements.rotateControlsEl?.classList.remove('is-visible');
    elements.applyMetaBtn?.toggleAttribute('disabled', true);
    elements.appendPointBtn?.toggleAttribute('disabled', true);
    elements.deleteBtn?.toggleAttribute('disabled', true);
    elements.groupBtn?.toggleAttribute('disabled', true);
    elements.ungroupBtn?.toggleAttribute('disabled', true);
    elements.resetDroneBtn?.toggleAttribute('disabled', true);
    elements.clearSelectionBtn?.toggleAttribute('disabled', true);
    elements.modeTranslateBtn?.toggleAttribute('disabled', true);
    elements.modeRotateBtn?.toggleAttribute('disabled', true);
    elements.modeScaleBtn?.toggleAttribute('disabled', true);
}

export function syncSelectedInputs(
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

export function updateSelectedControls(
    callbacks: UICallbacks,
    elements: SceneManagerDomRefs,
    selected: SceneManagerEntry,
    mode: TransformMode
) {
    const isBuildingSelected = selected.sceneType === 'Многоэтажка';
    const isVisualEditing = callbacks.sceneManager?.isLinearEditingActive(selected.id) || false;
    const isAnyLinearEditing = callbacks.sceneManager?.isLinearEditingActive() || false;
    const isGroup = selected.sceneType.toLowerCase() === 'group' || selected.name.toLowerCase() === 'group';
    const isMarkerDictionaryEditable = !!selected.supportsMarkerDictionary;
    const hasValueField = selected.supportsValue && !isBuildingSelected;
    const hasPointsField = !!selected.supportsPoints;
    const showRotateControls = selected.draggable && mode === 'rotate';

    elements.applyMetaBtn?.toggleAttribute('disabled', false);
    elements.deleteBtn?.toggleAttribute('disabled', false);
    elements.groupBtn?.toggleAttribute('disabled', false);
    elements.ungroupBtn?.toggleAttribute('disabled', !isGroup);
    elements.resetDroneBtn?.toggleAttribute('disabled', !selected.isDrone);
    elements.clearSelectionBtn?.toggleAttribute('disabled', false);
    elements.modeTranslateBtn?.toggleAttribute('disabled', !selected.draggable);
    elements.modeRotateBtn?.toggleAttribute('disabled', !selected.draggable);
    elements.modeScaleBtn?.toggleAttribute('disabled', !selected.draggable);
    elements.rotateControlsEl?.classList.toggle('is-visible', showRotateControls);

    if (elements.selectedDictionaryEl) {
        elements.selectedDictionaryEl.disabled = !isMarkerDictionaryEditable;
    }
    setFieldVisibility(elements.selectedDictionaryWrapEl, isMarkerDictionaryEditable);

    if (elements.selectedValueEl) {
        elements.selectedValueEl.disabled = !selected.supportsValue || isBuildingSelected;
        elements.selectedValueEl.placeholder = !selected.supportsValue
            ? 'У выбранного объекта нет значения'
            : selected.sceneType === 'Многоэтажка'
                ? 'Окна: 3:front:2=smoke; 5:back:1=fire'
                : 'Значение маркера';
    }
    setFieldVisibility(elements.selectedValueWrapEl, !!hasValueField);

    setBuildingControlsVisible(
        isBuildingSelected,
        elements.selectedFloorsWrapEl,
        elements.selectedFloorsEl,
        elements.selectedBuildingSettingsEl
    );
    setBuildingEditorDisabled(elements, !isBuildingSelected);
    syncFloorLimit(elements.selectedFloorsEl, elements.selectedBuildingFloorEl);
    syncIncidentValue(elements.selectedValueEl, elements.selectedBuildingIncidentsEl);

    if (elements.selectedPointsEl) {
        elements.selectedPointsEl.disabled = !selected.supportsPoints;
        elements.selectedPointsEl.placeholder = selected.supportsPoints
            ? 'Каждая строка: X, Y, Z'
            : 'Маршрут можно редактировать только у дорог и рельс';
    }
    setFieldVisibility(elements.selectedPointsWrapEl, hasPointsField);
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
