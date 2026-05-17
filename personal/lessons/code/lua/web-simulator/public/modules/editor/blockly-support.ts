import type { ScriptLanguage } from '../core/state.js';
import { Blockly } from '../ui/mission-guide/blockly.js';
import { compileMainEditorWorkspace } from './blockly-mode/index.js';
import { resizeBlocklyCanvas, updateGeneratedCodePreview } from './blockly-mode/ui.js';

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
    workspace: Blockly.WorkspaceSvg | null
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

export function updateBlocklyPreview(
    preview: HTMLElement | null,
    workspace: Blockly.WorkspaceSvg | null,
    language: ScriptLanguage
) {
    if (!preview || !workspace) return;
    updateGeneratedCodePreview(preview, compileMainEditorWorkspace(language, workspace));
}

export function isBlocklyWorkspaceEmpty(workspace: Blockly.WorkspaceSvg | null): boolean {
    if (!workspace) return true;
    return workspace.getTopBlocks(false).filter((block) => !block.isInsertionMarker()).length === 0;
}
