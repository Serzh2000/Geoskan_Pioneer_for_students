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
    syncTransformModeState,
    type SceneTreeState
} from './view-state.js';
import type { SceneManagerEntry } from './types.js';

const SCENE_MANAGER_POLL_INTERVAL_MS = 500;

function buildSceneManagerRenderSignature(
    objects: SceneManagerEntry[],
    selectedId: string | null,
    activeTransformMode: TransformMode,
    isLinearEditingActive: boolean,
    isAnyLinearEditing: boolean,
    tree: SceneTreeState
): string {
    const selected = objects.find((item) => item.id === selectedId) || null;

    return JSON.stringify({
        activeTransformMode,
        selectedId,
        isLinearEditingActive,
        isAnyLinearEditing,
        query: tree.query,
        expanded: [...tree.expandedIds].sort(),
        objects: objects.map((item) => ({
            id: item.id,
            name: item.name,
            sceneType: item.sceneType,
            isDrone: item.isDrone,
            draggable: item.draggable
        })),
        selected: selected ? {
            id: selected.id,
            name: selected.name,
            sceneType: selected.sceneType,
            draggable: selected.draggable,
            isDrone: selected.isDrone,
            supportsValue: selected.supportsValue,
            supportsPoints: selected.supportsPoints,
            value: selected.value || '',
            pointsText: selected.pointsText || '',
            position: selected.position,
            rotation: selected.rotation,
            scale: selected.scale
        } : null
    });
}

export function initSceneManager(callbacks: UICallbacks) {
    if (!callbacks.sceneManager) return;

    const elements = getSceneManagerDomRefs();
    const managerPanel = document.getElementById('manager-panel');
    if (elements.addTypeModalEl && elements.addTypeModalEl.parentElement !== document.body) {
        document.body.appendChild(elements.addTypeModalEl);
    }
    const viewState = createSceneManagerViewState();
    const typePreview = initSceneTypePreview(elements);
    let lastRenderSignature = '';
    let scheduledRenderFrame = 0;
    let pollTimerId = 0;
    let panelIsIntersecting = true;

    const getRenderState = () => {
        const objects = callbacks.sceneManager?.list() || [];
        const selectedId = callbacks.sceneManager?.getSelectedId() || null;
        const isLinearEditingActive = selectedId ? !!callbacks.sceneManager?.isLinearEditingActive(selectedId) : false;
        const isAnyLinearEditing = !!callbacks.sceneManager?.isLinearEditingActive();

        return {
            objects,
            selectedId,
            signature: buildSceneManagerRenderSignature(
                objects,
                selectedId,
                viewState.activeTransformMode,
                isLinearEditingActive,
                isAnyLinearEditing,
                viewState.tree
            )
        };
    };

    const render = (force = false) => {
        const renderState = getRenderState();
        if (!force && renderState.signature === lastRenderSignature) {
            return;
        }

        lastRenderSignature = renderState.signature;
        const previousSelectedId = viewState.lastSelectedId;
        const pickedInTree = viewState.tree.suppressInspectorJump;
        viewState.tree.suppressInspectorJump = false;
        viewState.lastSelectedId = renderSceneManager(
            callbacks,
            elements,
            renderState.objects,
            renderState.selectedId,
            viewState.lastSelectedId,
            () => render(true),
            viewState.activeTransformMode,
            viewState.tree
        );
        const selectionChanged = viewState.lastSelectedId && viewState.lastSelectedId !== previousSelectedId;
        if (selectionChanged && !pickedInTree) {
            viewState.activeTab = 'inspector';
        }
        syncInspectorAvailability(elements, viewState);
        syncTransformModeState(elements, viewState.activeTransformMode);
    };

    const scheduleRender = (force = true) => {
        if (scheduledRenderFrame) {
            window.cancelAnimationFrame(scheduledRenderFrame);
        }
        scheduledRenderFrame = window.requestAnimationFrame(() => {
            scheduledRenderFrame = 0;
            render(force);
        });
    };

    const isManagerVisible = (): boolean => !!managerPanel
        && document.visibilityState !== 'hidden'
        && managerPanel.isConnected
        && managerPanel.getClientRects().length > 0
        && panelIsIntersecting;
    const stopPolling = (): void => {
        if (pollTimerId !== 0) {
            window.clearInterval(pollTimerId);
            pollTimerId = 0;
        }
    };
    const ensurePolling = (renderNow = false): void => {
        if (!isManagerVisible()) {
            stopPolling();
            return;
        }

        if (renderNow) {
            scheduleRender(true);
        }

        if (pollTimerId === 0) {
            pollTimerId = window.setInterval(() => {
                if (!isManagerVisible()) {
                    stopPolling();
                    return;
                }
                render(false);
            }, SCENE_MANAGER_POLL_INTERVAL_MS);
        }
    };

    registerSceneManagerBindings({
        callbacks,
        elements,
        tree: viewState.tree,
        render: () => scheduleRender(true),
        typePreview,
        setActiveTab: (tab) => {
            viewState.activeTab = tab;
            syncTabVisibility(elements, viewState.activeTab, !!viewState.lastSelectedId);
        },
        setActiveTransformMode: (mode: TransformMode) => {
            viewState.activeTransformMode = mode;
            syncTransformModeState(elements, viewState.activeTransformMode);
            scheduleRender(true);
        }
    });

    (window as any).updateSceneManager = () => scheduleRender(true);
    if (managerPanel && typeof IntersectionObserver === 'function') {
        const visibilityObserver = new IntersectionObserver((entries) => {
            const entry = entries.find((candidate) => candidate.target === managerPanel);
            if (!entry) return;
            panelIsIntersecting = entry.isIntersecting && entry.intersectionRatio > 0;
            ensurePolling(panelIsIntersecting);
        }, {
            threshold: 0.01
        });
        visibilityObserver.observe(managerPanel);
    }
    document.addEventListener('visibilitychange', () => ensurePolling(true));
    if (elements.rootEl && typeof ResizeObserver === 'function') {
        const layoutObserver = new ResizeObserver(() => syncTabVisibility(elements, viewState.activeTab, !!viewState.lastSelectedId));
        layoutObserver.observe(elements.rootEl);
    }
    syncTabVisibility(elements, viewState.activeTab, !!viewState.lastSelectedId);
    syncTransformModeState(elements, viewState.activeTransformMode);
    render(true);
    ensurePolling(false);
}
