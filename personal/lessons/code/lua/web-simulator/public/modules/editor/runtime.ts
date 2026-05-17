import { Blockly } from '../ui/mission-guide/blockly.js';
import type { ScriptLanguage } from '../core/state.js';
import { createBlocklyResizeRuntime, type BlocklyResizeRuntime } from './blockly-support.js';
import type { EditorShellRefs } from './dom.js';

export type EditorRuntime = EditorShellRefs & {
    editorInstance: any;
    pendingValue: string | null;
    pendingLanguage: ScriptLanguage | null;
    blocklyWorkspace: Blockly.WorkspaceSvg | null;
    blocklyEnabled: boolean;
    blocklyGeneratedCodeVisible: boolean;
    blocklyResizeRuntime: BlocklyResizeRuntime;
    previousSidebarWidthBeforeBlockly: string | null;
    blocklyWorkspaceXmlByKey: Map<string, string>;
    textDraftByKey: Map<string, string>;
};

export const editorRuntime: EditorRuntime = {
    editorInstance: null,
    pendingValue: null,
    pendingLanguage: null,
    monacoRoot: null,
    blocklyRoot: null,
    blocklyCanvasHost: null,
    blocklyCanvas: null,
    blocklyPreview: null,
    blocklyCodeOverlay: null,
    blocklyCodeOverlayToggle: null,
    blocklyWorkspace: null,
    blocklyEnabled: false,
    blocklyGeneratedCodeVisible: false,
    blocklyResizeRuntime: createBlocklyResizeRuntime(),
    previousSidebarWidthBeforeBlockly: null,
    blocklyWorkspaceXmlByKey: new Map<string, string>(),
    textDraftByKey: new Map<string, string>()
};

export const blocklyTheme = Blockly.Theme.defineTheme('pioneer-main-blockly', {
    name: 'pioneer-main-blockly',
    base: Blockly.Themes.Classic,
    fontStyle: {
        family: 'Inter, Segoe UI, sans-serif',
        weight: '600',
        size: 12
    },
    componentStyles: {
        workspaceBackgroundColour: '#f8f9fb',
        toolboxBackgroundColour: '#ffffff',
        toolboxForegroundColour: '#151515',
        flyoutBackgroundColour: '#f4f5f7',
        flyoutForegroundColour: '#151515',
        scrollbarColour: '#cbd5e1',
        insertionMarkerColour: '#ff6b00',
        insertionMarkerOpacity: 0.32,
        markerColour: '#ff6b00',
        cursorColour: '#ff6b00'
    }
});

export function assignEditorShell(refs: EditorShellRefs): void {
    editorRuntime.monacoRoot = refs.monacoRoot;
    editorRuntime.blocklyRoot = refs.blocklyRoot;
    editorRuntime.blocklyCanvasHost = refs.blocklyCanvasHost;
    editorRuntime.blocklyCanvas = refs.blocklyCanvas;
    editorRuntime.blocklyPreview = refs.blocklyPreview;
    editorRuntime.blocklyCodeOverlay = refs.blocklyCodeOverlay;
    editorRuntime.blocklyCodeOverlayToggle = refs.blocklyCodeOverlayToggle;
}
