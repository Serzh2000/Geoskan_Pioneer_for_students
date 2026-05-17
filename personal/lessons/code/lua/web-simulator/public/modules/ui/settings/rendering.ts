import { buildRenderKey, updateLiveValues } from './rendering-live.js';
import { renderRcSetupPanel } from './rendering-sections.js';
import { bindRcSetupPanelEvents } from './rendering-events.js';
import { initRcSetupRuntime, subscribeRcRuntime, updateRcInputRuntime } from './runtime.js';

export function initRcSetupPanel(root: HTMLElement | null): void {
    if (!root) return;
    initRcSetupRuntime();
    bindRcSetupPanelEvents(root);

    let lastRenderKey = '';
    subscribeRcRuntime((snapshot) => {
        const renderKey = buildRenderKey(snapshot);
        if (renderKey !== lastRenderKey) {
            root.innerHTML = renderRcSetupPanel(snapshot);
            lastRenderKey = renderKey;
        }
        updateLiveValues(snapshot);
    });
    updateRcInputRuntime();
}
