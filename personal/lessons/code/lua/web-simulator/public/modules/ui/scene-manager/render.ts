import type { UICallbacks } from '../index.js';
import type { SceneManagerDomRefs } from './types.js';
import { isSceneEditorFocused } from './support.js';
import type { TransformMode } from './types.js';
import { renderEmptyState, renderSelectedDetails, syncSelectedInputs, updateSelectedControls } from './render/details.js';
import { renderObjectList } from './render/list.js';

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
    updateSelectedControls(callbacks, elements, selected, activeTransformMode);

    return selected.id;
}
