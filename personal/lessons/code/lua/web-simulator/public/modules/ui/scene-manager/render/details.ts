import type { UICallbacks } from '../../index.js';
import type { SceneManagerDomRefs } from '../types.js';
import {
    clampFloors,
    fillDictionarySelect,
    formatSceneAngleRadians,
    formatSceneNumber,
    getMarkerMode,
    setBuildingControlsVisible,
    syncFloorLimit,
    syncIncidentValue
} from '../support.js';
import type { SceneManagerEntry, TransformMode } from '../types.js';
import { escapeHtml, formatSceneLabel } from './format.js';

function getTransformValues(selected: SceneManagerEntry, mode: TransformMode) {
    if (mode === 'rotate') return selected.rotation;
    if (mode === 'scale') return selected.scale;
    return selected.position;
}

function setTransformFields(
    elements: SceneManagerDomRefs,
    mode: TransformMode,
    values?: { x: number; y: number; z: number }
) {
    const formatter = mode === 'rotate' ? formatSceneAngleRadians : formatSceneNumber;
    const x = values ? formatter(values.x) : '--';
    const y = values ? formatter(values.y) : '--';
    const z = values ? formatter(values.z) : '--';
    if (elements.transformXEl) elements.transformXEl.value = x;
    if (elements.transformYEl) elements.transformYEl.value = y;
    if (elements.transformZEl) elements.transformZEl.value = z;
}

export function renderEmptyState(elements: SceneManagerDomRefs) {
    if (elements.detailsEl) {
        elements.detailsEl.innerHTML = `
            <div class="scene-details-empty">
                <div class="scene-details-empty__title">Объект не выбран</div>
                <div class="scene-details-empty__text">Выберите элемент в иерархии, чтобы открыть его параметры в инспекторе.</div>
            </div>
        `;
    }
    setTransformFields(elements, 'translate');
    if (elements.selectedDictionaryEl) {
        elements.selectedDictionaryEl.innerHTML = '<option value="">Словарь маркера</option>';
        elements.selectedDictionaryEl.value = '';
        elements.selectedDictionaryEl.disabled = true;
        elements.selectedDictionaryEl.style.display = 'none';
    }
    if (elements.selectedValueEl) {
        elements.selectedValueEl.value = '';
        elements.selectedValueEl.disabled = true;
        elements.selectedValueEl.style.display = 'none';
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
        elements.selectedPointsEl.style.display = 'none';
    }
    setBuildingControlsVisible(false, elements.selectedFloorsWrapEl, elements.selectedFloorsEl, elements.selectedBuildingSettingsEl);
    if (elements.visualEditBtn) {
        elements.visualEditBtn.style.display = 'none';
        elements.visualEditBtn.toggleAttribute('disabled', true);
    }
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
    elements.rotateResetBtn?.toggleAttribute('disabled', true);
    elements.rotateControlsEl?.querySelectorAll<HTMLButtonElement>('.scene-rotate-preset-btn').forEach((button) => {
        button.toggleAttribute('disabled', true);
    });
}

export function renderSelectedDetails(elements: SceneManagerDomRefs, selected: SceneManagerEntry, mode: TransformMode) {
    if (!elements.detailsEl) return;

    const metaMarkup = (selected.metaLines?.length ?? 0) > 0
        ? `
            <div class="scene-details-meta">
                ${selected.metaLines.map((line) => `<div class="scene-details-meta__item">${escapeHtml(line)}</div>`).join('')}
            </div>
        `
        : '';
    elements.detailsEl.innerHTML = `
        <div class="scene-details-card">
            <div class="scene-details-grid">
                <div class="scene-details-row">
                    <span class="scene-details-row__label">Тип</span>
                    <span class="scene-details-row__value">${escapeHtml(formatSceneLabel(selected.sceneType, selected.name))}</span>
                </div>
                <div class="scene-details-row">
                    <span class="scene-details-row__label">Имя</span>
                    <span class="scene-details-row__value">${escapeHtml(selected.name || formatSceneLabel(selected.sceneType, selected.name))}</span>
                </div>
                <div class="scene-details-row">
                    <span class="scene-details-row__label">Статус</span>
                    <span class="scene-details-row__value">${selected.draggable ? 'Редактируемый' : 'Зафиксирован'}</span>
                </div>
            </div>
            ${metaMarkup}
        </div>
    `;
    setTransformFields(elements, mode, getTransformValues(selected, mode));
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

export function updateSelectedControls(callbacks: UICallbacks, elements: SceneManagerDomRefs, selected: SceneManagerEntry) {
    const isBuildingSelected = selected.sceneType === 'Многоэтажка';
    const isVisualEditing = callbacks.sceneManager?.isLinearEditingActive(selected.id) || false;
    const isAnyLinearEditing = callbacks.sceneManager?.isLinearEditingActive() || false;
    const isGroup = selected.sceneType.toLowerCase() === 'group' || selected.name.toLowerCase() === 'group';

    elements.applyMetaBtn?.toggleAttribute('disabled', false);
    elements.deleteBtn?.toggleAttribute('disabled', false);
    elements.groupBtn?.toggleAttribute('disabled', false);
    elements.ungroupBtn?.toggleAttribute('disabled', !isGroup);
    elements.resetDroneBtn?.toggleAttribute('disabled', !selected.isDrone);
    elements.clearSelectionBtn?.toggleAttribute('disabled', false);
    elements.modeTranslateBtn?.toggleAttribute('disabled', !selected.draggable);
    elements.modeRotateBtn?.toggleAttribute('disabled', !selected.draggable);
    elements.modeScaleBtn?.toggleAttribute('disabled', !selected.draggable);
    elements.rotateResetBtn?.toggleAttribute('disabled', !selected.draggable);
    elements.rotateControlsEl?.querySelectorAll<HTMLButtonElement>('.scene-rotate-preset-btn').forEach((button) => {
        button.toggleAttribute('disabled', !selected.draggable);
    });

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
