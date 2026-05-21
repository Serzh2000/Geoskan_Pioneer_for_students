import type { UICallbacks } from '../../index.js';
import type { SceneManagerDomRefs, SceneManagerEntry, TransformMode } from '../types.js';
import { renderEmptyStateMarkup, renderSelectedDetailsMarkup } from './details/markup.js';
import { resetSelectedControls, syncSelectedInputs, updateSelectedControls } from './details/controls.js';
import { getTransformValues, setTransformFields } from './details/transform.js';

export function renderEmptyState(elements: SceneManagerDomRefs) {
    if (elements.detailsEl) {
        elements.detailsEl.innerHTML = renderEmptyStateMarkup();
    }
    setTransformFields(elements);
    resetSelectedControls(elements);
}

export function renderSelectedDetails(elements: SceneManagerDomRefs, selected: SceneManagerEntry, mode: TransformMode) {
    if (!elements.detailsEl) return;
    elements.detailsEl.innerHTML = renderSelectedDetailsMarkup(selected);
    setTransformFields(elements, getTransformValues(selected, mode));
}

export { syncSelectedInputs, updateSelectedControls };
