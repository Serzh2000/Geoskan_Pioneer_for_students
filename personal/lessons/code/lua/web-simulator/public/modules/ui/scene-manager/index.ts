import type { UICallbacks } from '../index.js';
import { registerSceneManagerBindings } from './bindings.js';
import { getSceneManagerDomRefs } from './dom.js';
import { renderSceneManager } from './render.js';
import { initSceneTypePreview } from './type-preview.js';
import { type TransformMode } from './types.js';
import {
    createSceneManagerViewState,
    syncInspectorAvailability,
    syncTabVisibility,
    syncTransformModeState
} from './view-state.js';

export function initSceneManager(callbacks: UICallbacks) {
    if (!callbacks.sceneManager) return;

    const elements = getSceneManagerDomRefs();
    if (elements.addTypeModalEl && elements.addTypeModalEl.parentElement !== document.body) {
        document.body.appendChild(elements.addTypeModalEl);
    }
    const viewState = createSceneManagerViewState();
    const typePreview = initSceneTypePreview(elements);

    const render = () => {
        const previousSelectedId = viewState.lastSelectedId;
        viewState.lastSelectedId = renderSceneManager(
            callbacks,
            elements,
            viewState.lastSelectedId,
            render,
            viewState.activeTransformMode
        );
        if (viewState.lastSelectedId && viewState.lastSelectedId !== previousSelectedId) {
            viewState.activeTab = 'inspector';
        }
        syncInspectorAvailability(elements, viewState);
        syncTransformModeState(elements, viewState.activeTransformMode);
    };

    registerSceneManagerBindings({
        callbacks,
        elements,
        render,
        typePreview,
        setActiveTab: (tab) => {
            viewState.activeTab = tab;
            syncTabVisibility(elements, viewState.activeTab);
        },
        setActiveTransformMode: (mode: TransformMode) => {
            viewState.activeTransformMode = mode;
            syncTransformModeState(elements, viewState.activeTransformMode);
        }
    });

    (window as any).updateSceneManager = render;
    window.setInterval(render, 250);
    syncTabVisibility(elements, viewState.activeTab);
    syncTransformModeState(elements, viewState.activeTransformMode);
    render();
}
