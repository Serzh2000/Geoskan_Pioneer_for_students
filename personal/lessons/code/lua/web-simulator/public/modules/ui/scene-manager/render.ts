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
type TransformMode = 'translate' | 'rotate' | 'scale';

function escapeHtml(value: string) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatSceneLabel(value: string, objectName = ''): string {
    const normalized = String(value || '').trim();
    const name = String(objectName || '').trim();

    if (normalized.toLowerCase() === 'ground' || name.toLowerCase() === 'ground') return 'Земля';
    if (normalized.toLowerCase() === 'group' || name.toLowerCase() === 'group') return 'Группа';

    return normalized || name || 'Объект';
}

function getSceneObjectIcon(entry: SceneManagerEntry): string {
    if (entry.isDrone) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 9l-4-4m14 0l-4 4m-6 6l-4 4m14 0l-4-4"/><circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>';
    }
    if (entry.sceneType.toLowerCase() === 'ground' || entry.name.toLowerCase() === 'ground') {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 17h18"/><path d="M5 17l2-6 3 3 4-8 5 11"/></svg>';
    }
    if (entry.sceneType.toLowerCase() === 'group' || entry.name.toLowerCase() === 'group') {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/></svg>';
}

function getTransformValues(selected: SceneManagerEntry, mode: TransformMode) {
    if (mode === 'rotate') return selected.rotation;
    if (mode === 'scale') return selected.scale;
    return selected.position;
}

function setTransformFields(elements: SceneManagerDomRefs, values?: { x: number; y: number; z: number }) {
    const x = values ? formatSceneNumber(values.x) : '--';
    const y = values ? formatSceneNumber(values.y) : '--';
    const z = values ? formatSceneNumber(values.z) : '--';
    if (elements.transformXEl) elements.transformXEl.value = x;
    if (elements.transformYEl) elements.transformYEl.value = y;
    if (elements.transformZEl) elements.transformZEl.value = z;
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
    if (elements.listCountEl) {
        const total = objects.length;
        elements.listCountEl.textContent = `${total} ${total === 1 ? 'объект' : total < 5 ? 'объекта' : 'объектов'}`;
    }
    for (const obj of objects) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'scene-manager-item' + (obj.id === selectedId ? ' active' : '');
        row.setAttribute('role', 'treeitem');
        row.setAttribute('aria-selected', String(obj.id === selectedId));
        row.innerHTML = `
            <span class="scene-manager-item__icon">${getSceneObjectIcon(obj)}</span>
            <span class="scene-manager-item__content">
                <span class="scene-manager-item__title">${escapeHtml(formatSceneLabel(obj.sceneType, obj.name))}</span>
                <span class="scene-manager-item__meta">${escapeHtml(obj.isDrone ? 'Дрон' : formatSceneLabel(obj.sceneType))}</span>
            </span>
        `;
        row.onclick = () => {
            callbacks.sceneManager && callbacks.sceneManager.select(obj.id);
            rerender();
        };
        elements.listEl.appendChild(row);
    }
}

function renderEmptyState(elements: SceneManagerDomRefs) {
    if (elements.detailsEl) {
        elements.detailsEl.innerHTML = `
            <div class="scene-details-empty">
                <div class="scene-details-empty__title">Объект не выбран</div>
                <div class="scene-details-empty__text">Выберите элемент в иерархии, чтобы открыть его параметры в инспекторе.</div>
            </div>
        `;
    }
    setTransformFields(elements);
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
}

function renderSelectedDetails(elements: SceneManagerDomRefs, selected: SceneManagerEntry, mode: TransformMode) {
    if (!elements.detailsEl) return;

    const metaMarkup = (selected.metaLines?.length ?? 0) > 0
        ? `
            <div class="scene-details-meta">
                ${selected.metaLines!.map((line) => `<div class="scene-details-meta__item">${escapeHtml(line)}</div>`).join('')}
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
    setTransformFields(elements, getTransformValues(selected, mode));
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
    rerender: () => void,
    activeTransformMode: TransformMode
) {
    if (!elements.listEl || !elements.detailsEl || !callbacks.sceneManager) return lastSelectedId;

    const objects = callbacks.sceneManager.list();
    const selectedId = callbacks.sceneManager.getSelectedId();

    renderObjectList(callbacks, elements, objects, selectedId, rerender);

    const selected = objects.find((item) => item.id === selectedId) || null;
    if (!selected) {
        renderEmptyState(elements);
        return null;
    }

    renderSelectedDetails(elements, selected, activeTransformMode);

    const selectionChanged = lastSelectedId !== selected.id;
    syncSelectedInputs(elements, selected, selectionChanged, isSceneEditorFocused(elements));
    updateSelectedControls(callbacks, elements, selected);

    return selected.id;
}
