import type { ScriptLanguage } from '../../core/state.js';
import { createBlocklyResizeRuntime } from '../blockly/support.js';
import type { EditorShellRefs } from '../dom.js';
import type { EditorIndexCollections, EditorIndexShellState } from './helpers.js';

export type EditorIndexRuntimeState = EditorIndexShellState & {
    blocklyResizeRuntime: ReturnType<typeof createBlocklyResizeRuntime>;
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
};

export const editorIndexState: EditorIndexRuntimeState = {
    editorInstance: null,
    pendingValue: null,
    pendingLanguage: null,
    monacoRoot: null,
    blocklyRoot: null,
    blocklyCanvasHost: null,
    blocklyCanvas: null,
    blocklyWorkspace: null,
    blocklyEnabled: false,
    blocklyResizeRuntime: createBlocklyResizeRuntime(),
    previousSidebarWidthBeforeBlockly: null,
    textDraftByKey: new Map<string, string>(),
    blocklyWorkspaceXmlByKey: new Map<string, string>()
};

export function getEditorIndexShellState(): EditorIndexShellState {
    return {
        editorInstance: editorIndexState.editorInstance,
        pendingValue: editorIndexState.pendingValue,
        pendingLanguage: editorIndexState.pendingLanguage,
        monacoRoot: editorIndexState.monacoRoot,
        blocklyRoot: editorIndexState.blocklyRoot,
        blocklyCanvasHost: editorIndexState.blocklyCanvasHost,
        blocklyCanvas: editorIndexState.blocklyCanvas,
        blocklyWorkspace: editorIndexState.blocklyWorkspace,
        blocklyEnabled: editorIndexState.blocklyEnabled,
        previousSidebarWidthBeforeBlockly: editorIndexState.previousSidebarWidthBeforeBlockly
    };
}

export function getEditorIndexCollections(): EditorIndexCollections {
    return {
        textDraftByKey: editorIndexState.textDraftByKey,
        blocklyWorkspaceXmlByKey: editorIndexState.blocklyWorkspaceXmlByKey
    };
}

export function assignEditorIndexShell(refs: EditorShellRefs): void {
    editorIndexState.monacoRoot = refs.monacoRoot;
    editorIndexState.blocklyRoot = refs.blocklyRoot;
    editorIndexState.blocklyCanvasHost = refs.blocklyCanvasHost;
    editorIndexState.blocklyCanvas = refs.blocklyCanvas;
}

export function setPendingEditorLanguage(language: ScriptLanguage | null): void {
    editorIndexState.pendingLanguage = language;
}

export function setPendingEditorValue(value: string | null): void {
    editorIndexState.pendingValue = value;
}
