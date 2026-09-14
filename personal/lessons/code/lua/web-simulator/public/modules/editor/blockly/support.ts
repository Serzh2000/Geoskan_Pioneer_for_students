import { Blockly, type BlocklyNS } from '../blockly-mode/loader.js';
import { resizeBlocklyCanvas } from '../blockly-mode/ui.js';

export type BlocklyResizeRuntime = {
    observer: ResizeObserver | null;
    windowResizeBound: boolean;
};

export function createBlocklyResizeRuntime(): BlocklyResizeRuntime {
    return {
        observer: null,
        windowResizeBound: false
    };
}

export function resizeBlocklyWorkspaceViewport(
    host: HTMLElement | null,
    canvas: HTMLElement | null,
    workspace: BlocklyNS.WorkspaceSvg | null
) {
    resizeBlocklyCanvas(host, canvas);
    if (workspace) Blockly.svgResize(workspace);
}

export function ensureBlocklyResizeTracking(
    runtime: BlocklyResizeRuntime,
    host: HTMLElement | null,
    resize: () => void
) {
    if (typeof ResizeObserver !== 'undefined') {
        if (!runtime.observer) {
            runtime.observer = new ResizeObserver(resize);
        }
        runtime.observer.disconnect();
        if (host) runtime.observer.observe(host);
        return;
    }

    if (!runtime.windowResizeBound) {
        window.addEventListener('resize', resize);
        runtime.windowResizeBound = true;
    }
}

export function isBlocklyWorkspaceEmpty(workspace: BlocklyNS.WorkspaceSvg | null): boolean {
    if (!workspace) return true;
    return workspace.getTopBlocks(false).filter((block) => !block.isInsertionMarker()).length === 0;
}
