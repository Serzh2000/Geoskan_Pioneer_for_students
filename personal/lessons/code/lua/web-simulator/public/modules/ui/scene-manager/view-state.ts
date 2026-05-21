import type { SceneManagerDomRefs, TransformMode } from './types.js';

export type SceneManagerTab = 'hierarchy' | 'inspector';

export type SceneManagerViewState = {
    lastSelectedId: string | null;
    activeTab: SceneManagerTab;
    activeTransformMode: TransformMode;
};

export function createSceneManagerViewState(): SceneManagerViewState {
    return {
        lastSelectedId: null,
        activeTab: 'hierarchy',
        activeTransformMode: 'translate'
    };
}

export function syncTabVisibility(elements: SceneManagerDomRefs, activeTab: SceneManagerTab) {
    const isInspector = activeTab === 'inspector';
    elements.hierarchyTabBtn?.classList.toggle('is-active', !isInspector);
    elements.hierarchyTabBtn?.setAttribute('aria-selected', String(!isInspector));
    elements.inspectorTabBtn?.classList.toggle('is-active', isInspector);
    elements.inspectorTabBtn?.setAttribute('aria-selected', String(isInspector));
    elements.hierarchyPanelEl?.classList.toggle('is-active', !isInspector);
    elements.inspectorPanelEl?.classList.toggle('is-active', isInspector);
    if (elements.hierarchyPanelEl) elements.hierarchyPanelEl.hidden = isInspector;
    if (elements.inspectorPanelEl) elements.inspectorPanelEl.hidden = !isInspector;
}

export function syncInspectorAvailability(elements: SceneManagerDomRefs, state: SceneManagerViewState) {
    const hasSelection = !!state.lastSelectedId;
    elements.inspectorTabBtn?.toggleAttribute('disabled', !hasSelection);
    if (!hasSelection && state.activeTab === 'inspector') {
        state.activeTab = 'hierarchy';
    }
    syncTabVisibility(elements, state.activeTab);
}

export function syncTransformModeState(elements: SceneManagerDomRefs, activeTransformMode: TransformMode) {
    elements.modeTranslateBtn?.classList.toggle('is-active', activeTransformMode === 'translate');
    elements.modeTranslateBtn?.setAttribute('aria-selected', String(activeTransformMode === 'translate'));
    elements.modeTranslateBtn?.setAttribute('aria-pressed', String(activeTransformMode === 'translate'));
    elements.modeRotateBtn?.classList.toggle('is-active', activeTransformMode === 'rotate');
    elements.modeRotateBtn?.setAttribute('aria-selected', String(activeTransformMode === 'rotate'));
    elements.modeRotateBtn?.setAttribute('aria-pressed', String(activeTransformMode === 'rotate'));
    elements.modeScaleBtn?.classList.toggle('is-active', activeTransformMode === 'scale');
    elements.modeScaleBtn?.setAttribute('aria-selected', String(activeTransformMode === 'scale'));
    elements.modeScaleBtn?.setAttribute('aria-pressed', String(activeTransformMode === 'scale'));
    if (elements.rotateControlsEl) {
        const isRotateMode = activeTransformMode === 'rotate';
        elements.rotateControlsEl.hidden = !isRotateMode;
        elements.rotateControlsEl.classList.toggle('is-visible', isRotateMode);
    }
}
