import type { SceneManagerDomRefs, TransformMode } from './types.js';

export type SceneManagerTab = 'hierarchy' | 'inspector';

export type SceneTreeState = {
    query: string;
    expandedIds: Set<string>;
    /**
     * Set by the tree when the user picks a row. Selecting from the tree must not yank the panel
     * over to the inspector - the user is reading the list and would lose their place. A selection
     * made in the 3D viewport has no such context to protect, so that one does open the inspector.
     */
    suppressInspectorJump: boolean;
};

export type SceneManagerViewState = {
    lastSelectedId: string | null;
    activeTab: SceneManagerTab;
    activeTransformMode: TransformMode;
    tree: SceneTreeState;
};

export function createSceneManagerViewState(): SceneManagerViewState {
    return {
        lastSelectedId: null,
        activeTab: 'hierarchy',
        activeTransformMode: 'translate',
        tree: { query: '', expandedIds: new Set<string>(), suppressInspectorJump: false }
    };
}

/*
 * One pane at a time, at any panel width: "Объекты" or "Свойства" behind the
 * tab bar. (A wide panel used to pull the properties out into a second
 * column; a tab reads calmer and the panel does not change shape.)
 */
export function syncTabVisibility(elements: SceneManagerDomRefs, activeTab: SceneManagerTab) {
    const isInspector = activeTab === 'inspector';
    if (elements.tabsEl) elements.tabsEl.hidden = false;

    elements.hierarchyTabBtn?.classList.toggle('is-active', !isInspector);
    elements.hierarchyTabBtn?.setAttribute('aria-selected', String(!isInspector));
    elements.inspectorTabBtn?.classList.toggle('is-active', isInspector);
    elements.inspectorTabBtn?.setAttribute('aria-selected', String(isInspector));

    if (elements.hierarchyTabBtn) elements.hierarchyTabBtn.tabIndex = isInspector ? -1 : 0;
    if (elements.inspectorTabBtn) elements.inspectorTabBtn.tabIndex = isInspector ? 0 : -1;

    elements.hierarchyPanelEl?.classList.toggle('is-active', !isInspector);
    elements.inspectorPanelEl?.classList.toggle('is-active', isInspector);
    if (elements.hierarchyPanelEl) elements.hierarchyPanelEl.hidden = isInspector;
    if (elements.inspectorPanelEl) elements.inspectorPanelEl.hidden = !isInspector;
}

export function syncInspectorAvailability(elements: SceneManagerDomRefs, state: SceneManagerViewState) {
    const hasSelection = !!state.lastSelectedId;
    // Nothing to inspect yet - the tab stays visible, but there is no point
    // opening it: it could only show the empty state.
    if (!hasSelection && state.activeTab === 'inspector') {
        state.activeTab = 'hierarchy';
    }
    // aria-disabled rather than the native attribute: the tab stays hoverable
    // and focusable, so its tooltip can explain *why* it can't open yet.
    if (elements.inspectorTabBtn) {
        elements.inspectorTabBtn.setAttribute('aria-disabled', String(!hasSelection));
        elements.inspectorTabBtn.title = hasSelection ? '' : 'Выберите объект в списке или на сцене, чтобы открыть его свойства';
    }
    document.getElementById('scene-open-properties')?.toggleAttribute('disabled', !hasSelection);
    elements.inspectorTabBtn?.classList.toggle('has-selection', hasSelection);
    elements.inspectorPanelEl?.classList.toggle('is-empty', !hasSelection);
    syncTabVisibility(elements, state.activeTab);
}

export function syncTransformModeState(elements: SceneManagerDomRefs, activeTransformMode: TransformMode) {
    elements.modeTranslateBtn?.classList.toggle('is-active', activeTransformMode === 'translate');

    elements.modeTranslateBtn?.setAttribute('aria-pressed', String(activeTransformMode === 'translate'));
    elements.modeRotateBtn?.classList.toggle('is-active', activeTransformMode === 'rotate');

    elements.modeRotateBtn?.setAttribute('aria-pressed', String(activeTransformMode === 'rotate'));
    elements.modeScaleBtn?.classList.toggle('is-active', activeTransformMode === 'scale');

    elements.modeScaleBtn?.setAttribute('aria-pressed', String(activeTransformMode === 'scale'));
    const unit = document.getElementById('scene-transform-unit');
    if (unit) unit.textContent = activeTransformMode === 'rotate' ? 'Углы, °' : activeTransformMode === 'scale' ? 'Масштаб по осям, ×' : 'Координаты, м';
    if (elements.rotateControlsEl) {
        const isRotateMode = activeTransformMode === 'rotate';
        elements.rotateControlsEl.hidden = !isRotateMode;
        elements.rotateControlsEl.classList.toggle('is-visible', isRotateMode);
    }
}
