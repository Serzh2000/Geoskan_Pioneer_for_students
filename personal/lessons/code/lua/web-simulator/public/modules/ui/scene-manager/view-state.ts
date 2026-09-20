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

/** Below this the two panes stack and the tab bar takes over. */
export const SPLIT_LAYOUT_MIN_WIDTH = 880;

export function isSplitLayout(elements: SceneManagerDomRefs): boolean {
    const root = elements.rootEl;
    return !!root && root.clientWidth >= SPLIT_LAYOUT_MIN_WIDTH;
}

export function syncTabVisibility(elements: SceneManagerDomRefs, activeTab: SceneManagerTab, hasSelection: boolean) {
    const split = isSplitLayout(elements);
    const isInspector = activeTab === 'inspector';
    const solo = split && !hasSelection;

    elements.rootEl?.classList.toggle('is-split', split);
    elements.rootEl?.classList.toggle('is-split-solo', solo);
    if (elements.tabsEl) elements.tabsEl.hidden = split;

    elements.hierarchyTabBtn?.classList.toggle('is-active', !isInspector);
    elements.hierarchyTabBtn?.setAttribute('aria-selected', String(!isInspector));
    elements.inspectorTabBtn?.classList.toggle('is-active', isInspector);
    elements.inspectorTabBtn?.setAttribute('aria-selected', String(isInspector));

    if (elements.hierarchyTabBtn) elements.hierarchyTabBtn.tabIndex = isInspector ? -1 : 0;
    if (elements.inspectorTabBtn) elements.inspectorTabBtn.tabIndex = isInspector ? 0 : -1;

    // Solo (split, nothing selected): the hierarchy is the only pane worth
    // showing, regardless of which tab was last active - an unselected
    // inspector column has nothing to show but its own empty state.
    // Split with a selection: both panes show side by side.
    // Not split: exactly one shows, per activeTab.
    const hierarchyVisible = solo || split || !isInspector;
    const inspectorVisible = !solo && (split || isInspector);
    elements.hierarchyPanelEl?.classList.toggle('is-active', hierarchyVisible);
    elements.inspectorPanelEl?.classList.toggle('is-active', inspectorVisible);
    if (elements.hierarchyPanelEl) elements.hierarchyPanelEl.hidden = !hierarchyVisible;
    if (elements.inspectorPanelEl) elements.inspectorPanelEl.hidden = !inspectorVisible;
}

export function syncInspectorAvailability(elements: SceneManagerDomRefs, state: SceneManagerViewState) {
    const hasSelection = !!state.lastSelectedId;
    // Nothing to inspect yet - keep the tab reachable in the (non-split) tabbed
    // layout, but there is no point opening it: it can only show the empty state.
    if (!hasSelection && state.activeTab === 'inspector' && !isSplitLayout(elements)) {
        state.activeTab = 'hierarchy';
    }
    elements.inspectorTabBtn?.toggleAttribute('disabled', !hasSelection);
    document.getElementById('scene-open-properties')?.toggleAttribute('disabled', !hasSelection);
    elements.inspectorTabBtn?.classList.toggle('has-selection', hasSelection);
    elements.inspectorPanelEl?.classList.toggle('is-empty', !hasSelection);
    syncTabVisibility(elements, state.activeTab, hasSelection);
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
