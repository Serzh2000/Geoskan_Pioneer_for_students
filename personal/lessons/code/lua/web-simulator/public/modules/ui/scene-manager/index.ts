import type { UICallbacks } from '../index.js';
import { registerSceneManagerBindings } from './bindings.js';
import { getSceneManagerDomRefs } from './dom.js';
import { renderSceneManager } from './render.js';
import { createSceneManagerViewState, syncInspectorAvailability, syncTabVisibility, syncTransformModeState } from './view-state.js';

export function initSceneManager(callbacks: UICallbacks) {
    if (!callbacks.sceneManager) return;

    const elements = getSceneManagerDomRefs();
    const state = createSceneManagerViewState();

    const render = () => {
        const previousSelectedId = state.lastSelectedId;
        state.activeTransformMode = callbacks.sceneManager?.getMode?.() || state.activeTransformMode;
        state.lastSelectedId = renderSceneManager(callbacks, elements, state.lastSelectedId, render, state.activeTransformMode);
        if (state.lastSelectedId && state.lastSelectedId !== previousSelectedId) {
            state.activeTab = 'inspector';
        }
        syncInspectorAvailability(elements, state);
        syncTransformModeState(elements, state.activeTransformMode);
    };

    registerSceneManagerBindings({
        callbacks,
        elements,
        render,
        setActiveTab: (tab) => {
            state.activeTab = tab;
            syncTabVisibility(elements, state.activeTab);
        },
        setActiveTransformMode: (mode) => {
            state.activeTransformMode = mode;
        }
    });

    (window as any).updateSceneManager = render;
    window.setInterval(render, 250);
    syncTabVisibility(elements, state.activeTab);
    syncTransformModeState(elements, state.activeTransformMode);
    render();
}
