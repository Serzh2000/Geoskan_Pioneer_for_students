import { Blockly, isBlocklyLoaded, type BlocklyNS } from './blockly-mode/loader.js';
import type { ScriptLanguage } from '../core/state.js';
import type { AppTheme } from '../app/theme-toggle.js';
import { createBlocklyResizeRuntime, type BlocklyResizeRuntime } from './blockly/support.js';
import type { EditorShellRefs } from './dom.js';

export type EditorRuntime = EditorShellRefs & {
    editorInstance: any;
    pendingValue: string | null;
    pendingLanguage: ScriptLanguage | null;
    blocklyWorkspace: BlocklyNS.WorkspaceSvg | null;
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

let blocklyTheme: BlocklyNS.Theme | undefined;
let blocklyThemeDark: BlocklyNS.Theme | undefined;

// Темы зависят от класса Blockly.Theme, поэтому строятся лениво, при первом
// обращении уже после того, как пакет `blockly` фактически загружен
// (см. ensureBlocklyLoaded() в blockly-mode/loader.ts) — иначе этот модуль,
// импортируемый при каждой загрузке страницы, тянул бы весь Blockly за собой.
function ensureBlocklyThemesBuilt(): boolean {
    if (!isBlocklyLoaded()) return false;
    if (blocklyTheme && blocklyThemeDark) return true;

    blocklyTheme = Blockly.Theme.defineTheme('pioneer-main-blockly', {
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

    blocklyThemeDark = Blockly.Theme.defineTheme('pioneer-main-blockly-dark', {
        name: 'pioneer-main-blockly-dark',
        base: Blockly.Themes.Classic,
        fontStyle: {
            family: 'Inter, Segoe UI, sans-serif',
            weight: '600',
            size: 12
        },
        componentStyles: {
            workspaceBackgroundColour: '#0f172a',
            toolboxBackgroundColour: '#0f172a',
            toolboxForegroundColour: '#e2e8f0',
            flyoutBackgroundColour: '#0f172a',
            flyoutForegroundColour: '#e2e8f0',
            scrollbarColour: '#334155',
            insertionMarkerColour: '#7dd3fc',
            insertionMarkerOpacity: 0.32,
            markerColour: '#7dd3fc',
            cursorColour: '#7dd3fc'
        }
    });

    return true;
}

export function getBlocklyTheme(): BlocklyNS.Theme | undefined {
    if (!ensureBlocklyThemesBuilt()) return undefined;
    return document.documentElement.dataset.theme === 'dark' ? blocklyThemeDark : blocklyTheme;
}

export function getBlocklyThemeByName(themeName: AppTheme): BlocklyNS.Theme | undefined {
    if (!ensureBlocklyThemesBuilt()) return undefined;
    return themeName === 'dark' ? blocklyThemeDark : blocklyTheme;
}

export function applyBlocklyWorkspaceTheme(theme: AppTheme): void {
    const resolvedTheme = getBlocklyThemeByName(theme);
    if (!resolvedTheme) return;
    editorRuntime.blocklyWorkspace?.setTheme(resolvedTheme);
}

export function assignEditorShell(refs: EditorShellRefs): void {
    editorRuntime.monacoRoot = refs.monacoRoot;
    editorRuntime.blocklyRoot = refs.blocklyRoot;
    editorRuntime.blocklyCanvasHost = refs.blocklyCanvasHost;
    editorRuntime.blocklyCanvas = refs.blocklyCanvas;
    editorRuntime.blocklyPreview = refs.blocklyPreview;
    editorRuntime.blocklyCodeOverlay = refs.blocklyCodeOverlay;
    editorRuntime.blocklyCodeOverlayToggle = refs.blocklyCodeOverlayToggle;
}
