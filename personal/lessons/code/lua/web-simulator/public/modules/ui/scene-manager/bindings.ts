import type { UICallbacks } from '../index.js';
import type { SceneManagerDomRefs } from './support.js';
import {
    appendIncidentEntry,
    clampFloors,
    clearIncidentEntries,
    getMapInputs,
    isBuildingType,
    isMarkerMapType,
    isSingleMarkerType,
    isValueInputType,
    readAddMarkerMapOptions,
    syncFloorLimit,
    syncIncidentValue,
    updateAddControlsState,
    updateMapSummary
} from './support.js';
import type { TransformMode } from './types.js';
import type { SceneManagerTab } from './view-state.js';

type BindingOptions = {
    callbacks: UICallbacks;
    elements: SceneManagerDomRefs;
    render: () => void;
    setActiveTab: (tab: SceneManagerTab) => void;
    setActiveTransformMode: (mode: TransformMode) => void;
};

function registerTabBindings({ callbacks, elements, setActiveTab }: BindingOptions) {
    elements.hierarchyTabBtn?.addEventListener('click', () => {
        setActiveTab('hierarchy');
    });
    elements.inspectorTabBtn?.addEventListener('click', () => {
        if (!callbacks.sceneManager?.getSelectedId()) return;
        setActiveTab('inspector');
    });
}

function registerAddFormBindings({ elements }: BindingOptions) {
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
}

function registerIncidentBindings({ elements }: BindingOptions) {
    elements.addBuildingAppendBtn?.addEventListener('click', () => {
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
    elements.addBuildingClearBtn?.addEventListener('click', () => {
        clearIncidentEntries(elements.addBuildingIncidentsEl, elements.addValueEl);
    });
    elements.selectedBuildingAppendBtn?.addEventListener('click', () => {
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
    elements.selectedBuildingClearBtn?.addEventListener('click', () => {
        clearIncidentEntries(elements.selectedBuildingIncidentsEl, elements.selectedValueEl);
    });
}

function registerCreationBindings({ callbacks, elements, render }: BindingOptions) {
    if (elements.addBtn && elements.addTypeEl) {
        elements.addBtn.addEventListener('click', () => {
            const type = elements.addTypeEl?.value || '';
            callbacks.sceneManager?.add(type, {
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
        elements.presetBtn.addEventListener('click', () => {
            callbacks.sceneManager?.add(elements.presetTypeEl?.value || '');
            render();
        });
    }
}

function registerSelectionBindings({ callbacks, elements, render }: BindingOptions) {
    elements.applyMetaBtn?.addEventListener('click', () => {
        const selectedId = callbacks.sceneManager?.getSelectedId();
        const selectedObject = callbacks.sceneManager?.list().find((item) => item.id === selectedId);
        const isBuildingSelected = selectedObject?.sceneType === 'Многоэтажка';
        callbacks.sceneManager?.updateSelected({
            markerDictionary: elements.selectedDictionaryEl?.value || undefined,
            value: isBuildingSelected ? elements.selectedBuildingIncidentsEl?.value.trim() : elements.selectedValueEl?.value.trim(),
            pointsText: elements.selectedPointsEl?.value.trim(),
            floors: isBuildingSelected ? clampFloors(elements.selectedFloorsEl?.value, selectedObject?.floors ?? 9) : undefined
        });
        render();
    });

    elements.appendPointBtn?.addEventListener('click', () => {
        callbacks.sceneManager?.appendPoint();
        render();
    });

    elements.visualEditBtn?.addEventListener('click', () => {
        const selectedId = callbacks.sceneManager?.getSelectedId();
        if (!callbacks.sceneManager || !selectedId) return;
        if (callbacks.sceneManager.isLinearEditingActive(selectedId)) {
            callbacks.sceneManager.finishLinearEditing(true);
        } else {
            callbacks.sceneManager.startLinearEditing();
        }
        render();
    });

    elements.deleteBtn?.addEventListener('click', () => {
        const selectedId = callbacks.sceneManager?.getSelectedId();
        if (selectedId) callbacks.sceneManager?.remove(selectedId);
        render();
    });

    elements.resetDroneBtn?.addEventListener('click', () => {
        callbacks.sceneManager?.resetDroneOrigin();
        render();
    });

    elements.clearSelectionBtn?.addEventListener('click', () => {
        callbacks.sceneManager?.clearSelection();
        render();
    });
}

function registerGlobalActionBindings({ elements, render }: BindingOptions) {
    elements.groupBtn?.addEventListener('click', () => {
        if ((window as any).groupObjects) {
            (window as any).groupObjects();
            render();
        }
    });
    elements.ungroupBtn?.addEventListener('click', () => {
        if ((window as any).ungroupObject) {
            (window as any).ungroupObject();
            render();
        }
    });
    (window as any).updateSceneObjectClickCoords = (point: { x: number; y: number; z: number }) => {
        const coordsEl = document.getElementById('scene-click-coords');
        if (coordsEl) {
            coordsEl.textContent = `Клик: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`;
            coordsEl.style.display = 'block';
        }
    };
}

function registerTransformBindings({ callbacks, elements, render, setActiveTransformMode }: BindingOptions) {
    const bindTransformMode = (button: HTMLElement | null, mode: TransformMode) => {
        button?.addEventListener('click', () => {
            const selectedId = callbacks.sceneManager?.getSelectedId();
            setActiveTransformMode(mode);
            callbacks.sceneManager?.setMode(mode, selectedId || undefined);
            render();
        });
    };

    bindTransformMode(elements.modeTranslateBtn, 'translate');
    bindTransformMode(elements.modeRotateBtn, 'rotate');
    bindTransformMode(elements.modeScaleBtn, 'scale');

    elements.rotateControlsEl?.addEventListener('click', (event) => {
        const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.scene-rotate-preset-btn');
        if (!button || !callbacks.sceneManager) return;
        const axis = button.dataset.axis;
        const angle = Number(button.dataset.angle);
        if ((axis !== 'x' && axis !== 'y' && axis !== 'z') || !Number.isFinite(angle)) return;
        callbacks.sceneManager.rotateByDegrees(axis, angle);
        render();
    });

    elements.rotateResetBtn?.addEventListener('click', () => {
        callbacks.sceneManager?.resetRotation();
        render();
    });
}

export function registerSceneManagerBindings(options: BindingOptions) {
    registerTabBindings(options);
    registerAddFormBindings(options);
    registerIncidentBindings(options);
    registerCreationBindings(options);
    registerSelectionBindings(options);
    registerGlobalActionBindings(options);
    registerTransformBindings(options);
}
