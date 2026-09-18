import type { UICallbacks } from '../index.js';
import type { SceneManagerDomRefs, SceneManagerEntry, TransformMode } from './types.js';
import { isSceneEditorFocused } from './support.js';
import { renderEmptyState, renderSelectedDetails, syncSelectedInputs, updateSelectedControls } from './render/details.js';
import { renderObjectList } from './render/list.js';
import type { SceneTreeState } from './view-state.js';

export function renderSceneManager(
    callbacks: UICallbacks,
    elements: SceneManagerDomRefs,
    objects: SceneManagerEntry[],
    selectedId: string | null,
    lastSelectedId: string | null,
    rerender: () => void,
    activeTransformMode: TransformMode,
    tree: SceneTreeState
) {
    if (!elements.listEl || !elements.detailsEl || !callbacks.sceneManager) return lastSelectedId;

    renderObjectList(callbacks, elements, objects, selectedId, rerender, tree);

    const selected = objects.find((item) => item.id === selectedId) || null;
    if (!selected) {
        renderEmptyState(elements);
        return null;
    }

    renderSelectedDetails(elements, selected, activeTransformMode);

    const selectionChanged = lastSelectedId !== selected.id;
    syncSelectedInputs(elements, selected, selectionChanged, isSceneEditorFocused(elements));
    updateSelectedControls(callbacks, elements, selected, activeTransformMode);

    return selected.id;
}
