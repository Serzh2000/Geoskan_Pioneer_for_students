import type { UICallbacks } from '../index.js';
import { renderSceneManager } from './render.js';
import {
    appendIncidentEntry,
    clearIncidentEntries,
    clampFloors,
    getMapInputs,
    isBuildingType,
    isMarkerMapType,
    isSingleMarkerType,
    isValueInputType,
    readAddMarkerMapOptions,
    syncFloorLimit,
    syncIncidentValue,
    updateAddControlsState,
    updateMapSummary,
    type SceneManagerDomRefs
} from './support.js';

export function initSceneManager(callbacks: UICallbacks) {
    if (!callbacks.sceneManager) return;

    const elements: SceneManagerDomRefs = {
        listEl: document.getElementById('scene-object-list'),
        detailsEl: document.getElementById('scene-object-details'),
        addTypeEl: document.getElementById('scene-add-type') as HTMLSelectElement | null,
        addDictionaryEl: document.getElementById('scene-add-dictionary') as HTMLSelectElement | null,
        addValueEl: document.getElementById('scene-add-value') as HTMLInputElement | null,
        addFloorsWrapEl: document.getElementById('scene-add-floors-wrap') as HTMLLabelElement | null,
        addFloorsEl: document.getElementById('scene-add-floors') as HTMLInputElement | null,
        addBuildingSettingsEl: document.getElementById('scene-add-building-settings') as HTMLDivElement | null,
        addBuildingFloorEl: document.getElementById('scene-add-building-floor') as HTMLInputElement | null,
        addBuildingFaceEl: document.getElementById('scene-add-building-face') as HTMLSelectElement | null,
        addBuildingWindowEl: document.getElementById('scene-add-building-window') as HTMLSelectElement | null,
        addBuildingKindEl: document.getElementById('scene-add-building-kind') as HTMLSelectElement | null,
        addBuildingIncidentsEl: document.getElementById('scene-add-building-incidents') as HTMLTextAreaElement | null,
        addBuildingAppendBtn: document.getElementById('scene-add-building-append-btn'),
        addBuildingClearBtn: document.getElementById('scene-add-building-clear-btn'),
        addMapSettingsEl: document.getElementById('scene-add-map-settings') as HTMLDivElement | null,
        addMapSummaryEl: document.getElementById('scene-add-map-summary') as HTMLDivElement | null,
        addMapRowsEl: document.getElementById('scene-add-map-rows') as HTMLInputElement | null,
        addMapColumnsEl: document.getElementById('scene-add-map-columns') as HTMLInputElement | null,
        addMapStartIdEl: document.getElementById('scene-add-map-start-id') as HTMLInputElement | null,
        addMapIdStepEl: document.getElementById('scene-add-map-id-step') as HTMLInputElement | null,
        addMapMarkerSizeEl: document.getElementById('scene-add-map-marker-size') as HTMLInputElement | null,
        addMapRotationEl: document.getElementById('scene-add-map-rotation') as HTMLInputElement | null,
        addMapGapXEl: document.getElementById('scene-add-map-gap-x') as HTMLInputElement | null,
        addMapGapYEl: document.getElementById('scene-add-map-gap-y') as HTMLInputElement | null,
        addMapTraversalEl: document.getElementById('scene-add-map-traversal') as HTMLSelectElement | null,
        addMapStartCornerEl: document.getElementById('scene-add-map-start-corner') as HTMLSelectElement | null,
        addMapAnchorEl: document.getElementById('scene-add-map-anchor') as HTMLSelectElement | null,
        addMapSnakeEl: document.getElementById('scene-add-map-snake') as HTMLInputElement | null,
        addPathHintEl: document.getElementById('scene-add-path-hint') as HTMLDivElement | null,
        addPointsEl: document.getElementById('scene-add-points') as HTMLTextAreaElement | null,
        addBtn: document.getElementById('scene-add-btn'),
        presetTypeEl: document.getElementById('scene-preset-type') as HTMLSelectElement | null,
        presetBtn: document.getElementById('scene-preset-btn'),
        selectedDictionaryEl: document.getElementById('scene-selected-dictionary') as HTMLSelectElement | null,
        selectedValueEl: document.getElementById('scene-selected-value') as HTMLInputElement | null,
        selectedFloorsWrapEl: document.getElementById('scene-selected-floors-wrap') as HTMLLabelElement | null,
        selectedFloorsEl: document.getElementById('scene-selected-floors') as HTMLInputElement | null,
        selectedBuildingSettingsEl: document.getElementById('scene-selected-building-settings') as HTMLDivElement | null,
        selectedBuildingFloorEl: document.getElementById('scene-selected-building-floor') as HTMLInputElement | null,
        selectedBuildingFaceEl: document.getElementById('scene-selected-building-face') as HTMLSelectElement | null,
        selectedBuildingWindowEl: document.getElementById('scene-selected-building-window') as HTMLSelectElement | null,
        selectedBuildingKindEl: document.getElementById('scene-selected-building-kind') as HTMLSelectElement | null,
        selectedBuildingIncidentsEl: document.getElementById('scene-selected-building-incidents') as HTMLTextAreaElement | null,
        selectedBuildingAppendBtn: document.getElementById('scene-selected-building-append-btn'),
        selectedBuildingClearBtn: document.getElementById('scene-selected-building-clear-btn'),
        selectedPointsEl: document.getElementById('scene-selected-points') as HTMLTextAreaElement | null,
        applyMetaBtn: document.getElementById('scene-apply-meta-btn'),
        appendPointBtn: document.getElementById('scene-append-point-btn'),
        visualEditBtn: document.getElementById('scene-visual-edit-btn'),
        deleteBtn: document.getElementById('scene-delete-btn'),
        groupBtn: document.getElementById('scene-group-btn'),
        ungroupBtn: document.getElementById('scene-ungroup-btn'),
        resetDroneBtn: document.getElementById('scene-drone-origin-btn'),
        modeTranslateBtn: document.getElementById('scene-mode-translate'),
        modeRotateBtn: document.getElementById('scene-mode-rotate'),
        modeScaleBtn: document.getElementById('scene-mode-scale')
    };

    let lastSelectedId: string | null = null;
    const render = () => {
        lastSelectedId = renderSceneManager(callbacks, elements, lastSelectedId, render);
    };

    if (elements.addTypeEl) {
        elements.addTypeEl.addEventListener('change', () => updateAddControlsState(elements));
        updateAddControlsState(elements);
    }
    getMapInputs(elements).forEach((input) => {
        input.addEventListener('input', () => updateMapSummary(elements));
        input.addEventListener('change', () => updateMapSummary(elements));
    });
    elements.addFloorsEl?.addEventListener('input', () => syncFloorLimit(elements.addFloorsEl, elements.addBuildingFloorEl));
    elements.selectedFloorsEl?.addEventListener('input', () => syncFloorLimit(elements.selectedFloorsEl, elements.selectedBuildingFloorEl));
    elements.addBuildingIncidentsEl?.addEventListener('input', () => syncIncidentValue(elements.addValueEl, elements.addBuildingIncidentsEl));
    elements.selectedBuildingIncidentsEl?.addEventListener('input', () => syncIncidentValue(elements.selectedValueEl, elements.selectedBuildingIncidentsEl));

    if (elements.addBuildingAppendBtn) {
        elements.addBuildingAppendBtn.addEventListener('click', () => {
            appendIncidentEntry(
                elements.addBuildingIncidentsEl,
                elements.addFloorsEl,
                elements.addBuildingFloorEl,
                elements.addBuildingFaceEl,
                elements.addBuildingWindowEl,
                elements.addBuildingKindEl,
                elements.addValueEl
            );
        });
    }

    if (elements.addBuildingClearBtn) {
        elements.addBuildingClearBtn.addEventListener('click', () => {
            clearIncidentEntries(elements.addBuildingIncidentsEl, elements.addValueEl);
        });
    }

    if (elements.selectedBuildingAppendBtn) {
        elements.selectedBuildingAppendBtn.addEventListener('click', () => {
            appendIncidentEntry(
                elements.selectedBuildingIncidentsEl,
                elements.selectedFloorsEl,
                elements.selectedBuildingFloorEl,
                elements.selectedBuildingFaceEl,
                elements.selectedBuildingWindowEl,
                elements.selectedBuildingKindEl,
                elements.selectedValueEl
            );
        });
    }

    if (elements.selectedBuildingClearBtn) {
        elements.selectedBuildingClearBtn.addEventListener('click', () => {
            clearIncidentEntries(elements.selectedBuildingIncidentsEl, elements.selectedValueEl);
        });
    }

    if (elements.addBtn && elements.addTypeEl) {
        const addTypeEl = elements.addTypeEl;
        elements.addBtn.addEventListener('click', () => {
            const type = addTypeEl.value;
            callbacks.sceneManager && callbacks.sceneManager.add(type, {
                markerDictionary: (isSingleMarkerType(type) || isMarkerMapType(type)) ? elements.addDictionaryEl?.value || undefined : undefined,
                value: isBuildingType(type)
                    ? elements.addBuildingIncidentsEl?.value.trim() || undefined
                    : isValueInputType(type)
                        ? elements.addValueEl?.value.trim() || undefined
                        : undefined,
                pointsText: elements.addPointsEl?.value.trim() || undefined,
                floors: isBuildingType(type) ? clampFloors(elements.addFloorsEl?.value, 9) : undefined,
                markerMap: isMarkerMapType(type) ? readAddMarkerMapOptions(elements) : undefined
            });
            render();
        });
    }

    if (elements.presetBtn && elements.presetTypeEl) {
        const presetTypeEl = elements.presetTypeEl;
        elements.presetBtn.addEventListener('click', () => {
            callbacks.sceneManager && callbacks.sceneManager.add(presetTypeEl.value);
            render();
        });
    }

    if (elements.applyMetaBtn) {
        elements.applyMetaBtn.addEventListener('click', () => {
            const selectedId = callbacks.sceneManager?.getSelectedId();
            const selectedObject = callbacks.sceneManager?.list().find((item) => item.id === selectedId);
            const isBuildingSelected = selectedObject?.sceneType === 'Многоэтажка';
            callbacks.sceneManager && callbacks.sceneManager.updateSelected({
                markerDictionary: elements.selectedDictionaryEl?.value || undefined,
                value: isBuildingSelected ? elements.selectedBuildingIncidentsEl?.value.trim() : elements.selectedValueEl?.value.trim(),
                pointsText: elements.selectedPointsEl?.value.trim(),
                floors: isBuildingSelected ? clampFloors(elements.selectedFloorsEl?.value, selectedObject?.floors ?? 9) : undefined
            });
            render();
        });
    }

    if (elements.appendPointBtn) {
        elements.appendPointBtn.addEventListener('click', () => {
            callbacks.sceneManager && callbacks.sceneManager.appendPoint();
            render();
        });
    }

    if (elements.visualEditBtn) {
        elements.visualEditBtn.addEventListener('click', () => {
            const selectedId = callbacks.sceneManager?.getSelectedId();
            if (!callbacks.sceneManager || !selectedId) return;
            if (callbacks.sceneManager.isLinearEditingActive(selectedId)) {
                callbacks.sceneManager.finishLinearEditing(true);
            } else {
                callbacks.sceneManager.startLinearEditing();
            }
            render();
        });
    }

    if (elements.deleteBtn) {
        elements.deleteBtn.addEventListener('click', () => {
            const selectedId = callbacks.sceneManager && callbacks.sceneManager.getSelectedId();
            if (selectedId && callbacks.sceneManager) callbacks.sceneManager.remove(selectedId);
            render();
        });
    }

    if (elements.groupBtn) {
        elements.groupBtn.addEventListener('click', () => {
            if ((window as any).groupObjects) {
                (window as any).groupObjects();
                render();
            }
        });
    }

    if (elements.ungroupBtn) {
        elements.ungroupBtn.addEventListener('click', () => {
            if ((window as any).ungroupObject) {
                (window as any).ungroupObject();
                render();
            }
        });
    }

    (window as any).updateSceneObjectClickCoords = (point: { x: number, y: number, z: number }) => {
        const coordsEl = document.getElementById('scene-click-coords');
        if (coordsEl) {
            coordsEl.textContent = `Клик: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`;
            coordsEl.style.display = 'block';
        }
    };
    if (elements.resetDroneBtn) {
        elements.resetDroneBtn.addEventListener('click', () => {
            callbacks.sceneManager && callbacks.sceneManager.resetDroneOrigin();
            render();
        });
    }
    if (elements.modeTranslateBtn) {
        elements.modeTranslateBtn.addEventListener('click', () => {
            const selectedId = callbacks.sceneManager && callbacks.sceneManager.getSelectedId();
            callbacks.sceneManager && callbacks.sceneManager.setMode('translate', selectedId || undefined);
            render();
        });
    }
    if (elements.modeRotateBtn) {
        elements.modeRotateBtn.addEventListener('click', () => {
            const selectedId = callbacks.sceneManager && callbacks.sceneManager.getSelectedId();
            callbacks.sceneManager && callbacks.sceneManager.setMode('rotate', selectedId || undefined);
            render();
        });
    }
    if (elements.modeScaleBtn) {
        elements.modeScaleBtn.addEventListener('click', () => {
            const selectedId = callbacks.sceneManager && callbacks.sceneManager.getSelectedId();
            callbacks.sceneManager && callbacks.sceneManager.setMode('scale', selectedId || undefined);
            render();
        });
    }

    (window as any).updateSceneManager = render;
    window.setInterval(render, 250);
    render();
}
