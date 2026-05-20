/**
 * ˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜˜˜ Monaco Editor.
 * ˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜˜ ˜˜˜˜˜˜˜˜˜ Lua-˜˜˜˜˜˜˜˜, ˜˜˜˜˜˜˜˜˜
 * ˜˜˜˜˜˜˜˜˜˜˜˜˜˜ (IntelliSense) ˜ hover-˜˜˜˜˜˜˜˜˜ ˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜
 * API-˜˜˜˜˜˜˜ ˜˜˜˜˜ Pioneer. ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜ ˜ ˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜ ˜ ˜˜˜˜˜˜˜˜˜.
 */
import 'monaco-editor/min/vs/editor/editor.main.css';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import { setupSyntaxHighlighting } from './syntax.js';
import { setupHoverProvider } from './hover.js';
import { setupCompletionProvider } from './completion.js';
import { Blockly } from '../ui/mission-guide/blockly.js';
import { currentDroneId, currentScriptLanguage, DEFAULT_LUA_SCRIPT, ScriptLanguage } from '../core/state.js';
import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace,
    createStarterWorkspaceXml,
    ensureEditorBlocklyDefinitions
} from './blockly.js';
import {
    applyEditorLayoutState,
    resizeBlocklyCanvas,
    updateGeneratedCodePreview
} from './blockly-ui.js';

let editorInstance: any;
let pendingValue: string | null = null;
let pendingLanguage: ScriptLanguage | null = null;
let monacoRoot: HTMLElement | null = null;
let blocklyRoot: HTMLElement | null = null;
let blocklyCanvasHost: HTMLElement | null = null;
let blocklyCanvas: HTMLElement | null = null;
let blocklyPreview: HTMLElement | null = null;
let blocklyCodeOverlay: HTMLElement | null = null;
let blocklyCodeOverlayToggle: HTMLInputElement | null = null;
let blocklyWorkspace: Blockly.WorkspaceSvg | null = null;
let blocklyEnabled = false;
let blocklyGeneratedCodeVisible = false;
let blocklyResizeObserver: ResizeObserver | null = null;
let blocklyWindowResizeBound = false;
let previousSidebarWidthBeforeBlockly: string | null = null;
const blocklyWorkspaceXmlByKey = new Map<string, string>();
const textDraftByKey = new Map<string, string>();
const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 1000;
const LUA_EDITOR_FONT = "14px 'Fira Code', monospace";
const LUA_EDITOR_HORIZONTAL_PADDING = 64;
const BLOCKLY_CONTENT_PADDING = 96;
let textMeasureCanvas: HTMLCanvasElement | null = null;
let pendingSidebarAutofitTimer = 0;

const blocklyTheme = Blockly.Theme.defineTheme('pioneer-main-blockly', {
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

export function initEditor() {
    try {
        (self as typeof globalThis & {
            MonacoEnvironment?: { getWorker: () => Worker };
        }).MonacoEnvironment = {
            getWorker() {
                return new editorWorker();
            }
        };

        createEditorShell();
        createEditor();
    } catch (err) {
        console.error('Monaco Editor load error:', err);
        createEditorShell();
        fallbackEditor();
    }
}

function getEditorStateKey(language: ScriptLanguage = currentScriptLanguage): string {
    return `${currentDroneId}:${language}`;
}

function createEditorShell() {
    const editorElement = document.getElementById('editor');
    if (!editorElement) return;

    editorElement.innerHTML = `
        <div id="monaco-editor-root" class="editor-mode-root"></div>
        <div id="blockly-editor-root" class="editor-mode-root editor-mode-root--hidden">
            <div class="blockly-editor-shell">
                <div id="blockly-editor-canvas-host" class="blockly-editor-canvas-host">
                    <div id="blockly-editor-canvas" class="blockly-editor-canvas"></div>
                    <div id="blockly-code-overlay" class="blockly-code-overlay" aria-hidden="true">
                        <div class="blockly-code-overlay__header">
                            <div class="blockly-code-overlay__title">˜˜˜˜˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜</div>
                        </div>
                        <pre id="blockly-editor-code-preview" class="blockly-code-overlay__code"></pre>
                    </div>
                </div>
            </div>
        </div>
    `;

    monacoRoot = document.getElementById('monaco-editor-root');
    blocklyRoot = document.getElementById('blockly-editor-root');
    blocklyCanvasHost = document.getElementById('blockly-editor-canvas-host');
    blocklyCanvas = document.getElementById('blockly-editor-canvas');
    blocklyPreview = document.getElementById('blockly-editor-code-preview');
    blocklyCodeOverlay = document.getElementById('blockly-code-overlay');
    blocklyCodeOverlayToggle = document.getElementById('blockly-code-overlay-toggle') as HTMLInputElement | null;
    syncEditorModeVisibility();
}

function syncBlocklyEditorToggle() {
    const toggle = document.getElementById('blockly-editor-toggle') as HTMLInputElement | null;
    if (toggle) {
        toggle.checked = blocklyEnabled;
    }
}

function syncBlocklyCodeOverlayToggle() {
    if (!blocklyCodeOverlayToggle) return;
    blocklyCodeOverlayToggle.checked = blocklyEnabled && blocklyGeneratedCodeVisible;
    blocklyCodeOverlayToggle.disabled = !blocklyEnabled;
}

function fallbackEditor() {
    if (monacoRoot) {
        monacoRoot.innerHTML = `<div style="color:#d13b2e; padding:20px;">˜˜ ˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ Monaco Editor. ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜ ˜ ˜˜˜˜˜˜˜˜˜. ˜˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜.</div><textarea id="fallback-editor" style="width:100%; height:90%; background:#f4f5f7; color:#151515; font-family:monospace; padding:10px; border:1px solid rgba(9,9,11,0.1); border-radius:12px; resize:none;">${DEFAULT_LUA_SCRIPT}</textarea>`;
        (window as any).getEditorValueFallback = () => (document.getElementById('fallback-editor') as HTMLTextAreaElement).value;
        (window as any).setEditorValueFallback = (val: string) => {
            const el = document.getElementById('fallback-editor') as HTMLTextAreaElement;
            if(el) el.value = val;
        };
    }
}

function createEditor() {
    setupSyntaxHighlighting(monaco);
    setupHoverProvider(monaco);
    setupCompletionProvider(monaco);
    ensureEditorBlocklyDefinitions();

    const initialLanguage: ScriptLanguage = pendingLanguage || 'lua';
    const initialMonacoLang = initialLanguage === 'lua' ? 'lua' : 'python';
    const initialValue =
        pendingValue ||
        DEFAULT_LUA_SCRIPT;

    if (!monacoRoot) {
        fallbackEditor();
        return;
    }

    editorInstance = monaco.editor.create(monacoRoot, {
        value: initialValue,
        language: initialMonacoLang,
        theme: 'pioneer-light',
        automaticLayout: true,
        wordBasedSuggestions: 'off',
        quickSuggestions: {
            other: true,
            comments: false,
            strings: false
        },
        suggestOnTriggerCharacters: true,
        parameterHints: {
            enabled: true
        },
        hover: {
            enabled: true,
            delay: 200,
            sticky: true
        },
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        minimap: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        fixedOverflowWidgets: true,
        suggest: {
            snippetsPreventQuickSuggestions: false
        }
    });

    pendingValue = null;
    pendingLanguage = null;
    maybeAutoExpandTextEditorPanel(initialValue, initialLanguage);
}

function getTextEditorValue(): string {
    if ((window as any).getEditorValueFallback) return (window as any).getEditorValueFallback();
    return editorInstance ? editorInstance.getValue() : '';
}

function setTextEditorValue(val: string) {
    if ((window as any).setEditorValueFallback) return (window as any).setEditorValueFallback(val);
    if (editorInstance) editorInstance.setValue(val);
    else pendingValue = val;
    maybeAutoExpandTextEditorPanel(val);
}

function normalizeMultilineText(value: string): string {
    return value
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\s+$/u, ''))
        .join('\n')
        .trim();
}

function isStarterLuaScript(value: string): boolean {
    return normalizeMultilineText(value) === normalizeMultilineText(DEFAULT_LUA_SCRIPT);
}

function getSidebarCurrentWidth(panels: HTMLElement): number {
    return Number.parseInt(panels.style.width || '', 10) || Math.floor(panels.getBoundingClientRect().width);
}

function getEditorContentElement(mode: 'text' | 'blockly'): HTMLElement | null {
    if (mode === 'blockly') {
        return blocklyCanvasHost || blocklyCanvas || blocklyRoot;
    }
    return monacoRoot || (document.getElementById('fallback-editor') as HTMLElement | null);
}

function getSidebarChromeWidth(panels: HTMLElement, contentElement: HTMLElement | null): number {
    const contentWidth = Math.floor(contentElement?.getBoundingClientRect().width || 0);
    const sidebarWidth = Math.floor(panels.getBoundingClientRect().width);
    if (contentWidth <= 0 || sidebarWidth <= 0) {
        return 64;
    }
    return Math.max(40, sidebarWidth - contentWidth);
}

function clampSidebarWidth(width: number): number {
    return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.ceil(width)));
}

function applySidebarAutofitWidth(requiredWidth: number): void {
    const panels = getSidebarPanelsElement();
    const activePanelId = document.querySelector('.sidebar-panel.active')?.id || null;
    if (!panels || activePanelId !== 'editor-panel' || panels.classList.contains('is-fullscreen')) return;

    const currentWidth = getSidebarCurrentWidth(panels);
    const nextWidth = clampSidebarWidth(requiredWidth);
    if (nextWidth <= currentWidth) return;

    panels.style.width = `${nextWidth}px`;
    localStorage.setItem('sidebar-width', `${nextWidth}px`);
    window.dispatchEvent(new Event('resize'));
}

function measureTextWidth(text: string, font: string): number {
    if (typeof document === 'undefined') return 0;
    textMeasureCanvas ||= document.createElement('canvas');
    const context = textMeasureCanvas.getContext('2d');
    if (!context) return 0;
    context.font = font;
    return Math.ceil(context.measureText(text).width);
}

function getRequiredLuaSidebarWidth(text: string): number {
    const panels = getSidebarPanelsElement();
    if (!panels) return MIN_SIDEBAR_WIDTH;

    const contentElement = getEditorContentElement('text');
    const chromeWidth = getSidebarChromeWidth(panels, contentElement);
    const measuredTextWidth = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .reduce((maxWidth, line) => Math.max(maxWidth, measureTextWidth(line, LUA_EDITOR_FONT)), 0);
    const editorScrollWidth = typeof editorInstance?.getScrollWidth === 'function'
        ? Number(editorInstance.getScrollWidth()) || 0
        : 0;
    const requiredEditorWidth = Math.max(measuredTextWidth + LUA_EDITOR_HORIZONTAL_PADDING, editorScrollWidth);
    return requiredEditorWidth + chromeWidth;
}

function getBlocklyBlocksWidth(): number {
    if (!blocklyWorkspace) return 0;

    const boundingBox = (blocklyWorkspace as Blockly.WorkspaceSvg & {
        getBlocksBoundingBox?: () => { left: number; right: number };
    }).getBlocksBoundingBox?.();
    if (boundingBox) {
        return Math.max(0, Math.ceil(boundingBox.right - boundingBox.left));
    }

    const blockCanvasElement = blocklyCanvas?.querySelector('.blocklyBlockCanvas') as SVGGraphicsElement | null;
    if (blockCanvasElement?.getBBox) {
        try {
            const box = blockCanvasElement.getBBox();
            return Math.max(0, Math.ceil(box.width));
        } catch (error) {
            console.warn('[Editor] Failed to measure Blockly block canvas', error);
        }
    }

    return 0;
}

function getRequiredBlocklySidebarWidth(): number {
    const panels = getSidebarPanelsElement();
    if (!panels) return MIN_SIDEBAR_WIDTH;

    const contentElement = getEditorContentElement('blockly');
    const chromeWidth = getSidebarChromeWidth(panels, contentElement);
    const toolboxWidth = Math.ceil(
        (blocklyCanvas?.querySelector('.blocklyToolboxDiv') as HTMLElement | null)?.getBoundingClientRect().width || 0
    );
    const requiredCanvasWidth = toolboxWidth + getBlocklyBlocksWidth() + BLOCKLY_CONTENT_PADDING;
    return requiredCanvasWidth + chromeWidth;
}

function autoExpandEditorPanelToContent(mode: 'text' | 'blockly', text = ''): void {
    const requiredWidth = mode === 'blockly'
        ? getRequiredBlocklySidebarWidth()
        : getRequiredLuaSidebarWidth(text);
    applySidebarAutofitWidth(requiredWidth);
}

function scheduleEditorPanelAutofit(mode: 'text' | 'blockly', text = ''): void {
    if (typeof window === 'undefined') return;
    if (pendingSidebarAutofitTimer) {
        window.clearTimeout(pendingSidebarAutofitTimer);
    }
    pendingSidebarAutofitTimer = window.setTimeout(() => {
        pendingSidebarAutofitTimer = 0;
        window.requestAnimationFrame(() => {
            if (mode === 'blockly') {
                window.requestAnimationFrame(() => autoExpandEditorPanelToContent(mode, text));
                return;
            }
            autoExpandEditorPanelToContent(mode, text);
        });
    }, 0);
}

function maybeAutoExpandTextEditorPanel(text: string, language: ScriptLanguage = currentScriptLanguage): void {
    if (language !== 'lua' || !isStarterLuaScript(text)) return;
    scheduleEditorPanelAutofit('text', text);
}

function getStarterBlocklyWorkspaceXml(language: ScriptLanguage): string | null {
    if (language !== 'lua') return null;

    const key = getEditorStateKey(language);
    const draftText = textDraftByKey.get(key) || getTextEditorValue();
    if (draftText.trim().length > 0 && !isStarterLuaScript(draftText)) {
        return null;
    }
    return createStarterWorkspaceXml(language);
}

function saveBlocklyWorkspaceState(language: ScriptLanguage = currentScriptLanguage) {
    if (!blocklyWorkspace) return;
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(blocklyWorkspace));
    blocklyWorkspaceXmlByKey.set(getEditorStateKey(language), xml);
}

function updateBlocklyPreview(language: ScriptLanguage = currentScriptLanguage) {
    if (!blocklyPreview || !blocklyWorkspace) return;
    updateGeneratedCodePreview(blocklyPreview, compileMainEditorWorkspace(language, blocklyWorkspace));
}

function isBlocklyWorkspaceEmpty(): boolean {
    if (!blocklyWorkspace) return true;
    return blocklyWorkspace.getTopBlocks(false).filter((block) => !block.isInsertionMarker()).length === 0;
}

function getSidebarPanelsElement(): HTMLElement | null {
    return document.querySelector('.sidebar-panels') as HTMLElement | null;
}

function expandEditorPanelForBlockly(): void {
    const panels = getSidebarPanelsElement();
    const activePanelId = document.querySelector('.sidebar-panel.active')?.id || null;
    if (!panels || activePanelId !== 'editor-panel' || panels.classList.contains('is-fullscreen')) return;

    if (!previousSidebarWidthBeforeBlockly) {
        previousSidebarWidthBeforeBlockly = panels.style.width || `${getSidebarCurrentWidth(panels)}px`;
    }
    scheduleEditorPanelAutofit('blockly');
}

function restoreEditorPanelWidthAfterBlockly(): void {
    const panels = getSidebarPanelsElement();
    const activePanelId = document.querySelector('.sidebar-panel.active')?.id || null;
    if (!panels || activePanelId !== 'editor-panel' || !previousSidebarWidthBeforeBlockly) return;

    const currentWidth = getSidebarCurrentWidth(panels);
    const previousWidth = Number.parseInt(previousSidebarWidthBeforeBlockly, 10);
    const nextWidth = Number.isFinite(previousWidth)
        ? Math.max(currentWidth, previousWidth)
        : currentWidth;
    panels.style.width = `${nextWidth}px`;
    localStorage.setItem('sidebar-width', `${nextWidth}px`);
    previousSidebarWidthBeforeBlockly = null;
    window.dispatchEvent(new Event('resize'));
}

function resizeBlocklyWorkspaceViewport() {
    resizeBlocklyCanvas(blocklyCanvasHost, blocklyCanvas);
    if (blocklyWorkspace) {
        Blockly.svgResize(blocklyWorkspace);
    }
}

function ensureBlocklyResizeTracking() {
    if (typeof ResizeObserver !== 'undefined') {
        if (!blocklyResizeObserver) {
            blocklyResizeObserver = new ResizeObserver(() => {
                resizeBlocklyWorkspaceViewport();
            });
        }
        blocklyResizeObserver.disconnect();
        if (blocklyCanvasHost) {
            blocklyResizeObserver.observe(blocklyCanvasHost);
        }
        return;
    }

    if (!blocklyWindowResizeBound) {
        window.addEventListener('resize', resizeBlocklyWorkspaceViewport);
        blocklyWindowResizeBound = true;
    }
}

function loadBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage) {
    if (!blocklyWorkspace) return;

    const key = getEditorStateKey(language);
    const savedXml = blocklyWorkspaceXmlByKey.get(key);
    const starterXml = savedXml ? null : getStarterBlocklyWorkspaceXml(language);
    const workspaceXml = savedXml || starterXml;

    blocklyWorkspace.clear();

    if (workspaceXml) {
        try {
            const xml = Blockly.utils.xml.textToDom(workspaceXml);
            Blockly.Xml.domToWorkspace(xml, blocklyWorkspace);
        } catch (error) {
            console.error('[Editor] Failed to load Blockly workspace', error);
        }
    }

    if (workspaceXml) {
        saveBlocklyWorkspaceState(language);
    } else {
        blocklyWorkspaceXmlByKey.delete(key);
    }
    updateBlocklyPreview(language);
    resizeBlocklyWorkspaceViewport();
    scheduleEditorPanelAutofit('blockly');
}

function ensureBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage) {
    if (!blocklyCanvas) return;
    if (!blocklyWorkspace) {
        blocklyWorkspace = Blockly.inject(blocklyCanvas, {
            toolbox: buildMainEditorToolbox(language),
            scrollbars: true,
            trashcan: true,
            theme: blocklyTheme,
            toolboxPosition: 'start'
        });

        blocklyWorkspace.addChangeListener(() => {
            saveBlocklyWorkspaceState(currentScriptLanguage);
            textDraftByKey.set(getEditorStateKey(currentScriptLanguage), compileMainEditorWorkspace(currentScriptLanguage, blocklyWorkspace!));
            updateBlocklyPreview(currentScriptLanguage);
        });
    } else {
        blocklyWorkspace.updateToolbox(buildMainEditorToolbox(language));
    }

    ensureBlocklyResizeTracking();
    resizeBlocklyWorkspaceViewport();
}

function syncEditorModeVisibility() {
    applyEditorLayoutState({
        monacoRoot,
        blocklyRoot,
        codeOverlay: blocklyCodeOverlay,
        codeToggle: blocklyCodeOverlayToggle
    }, {
        blocklyEnabled,
        generatedCodeVisible: blocklyGeneratedCodeVisible
    });
}

export function getEditorValue(): string {
    if (blocklyEnabled && blocklyWorkspace) {
        return compileMainEditorWorkspace(currentScriptLanguage, blocklyWorkspace);
    }
    return getTextEditorValue();
}

export function setEditorValue(val: string) {
    const key = getEditorStateKey();
    textDraftByKey.set(key, val);

    if (blocklyEnabled) {
        ensureBlocklyWorkspace(currentScriptLanguage);
        loadBlocklyWorkspace(currentScriptLanguage);
        return;
    }

    setTextEditorValue(val);
}

export function setEditorLanguage(language: ScriptLanguage) {
    if (!(window as any).getEditorValueFallback) {
        if (!editorInstance) {
            pendingLanguage = language;
        } else {
            const model = editorInstance.getModel ? editorInstance.getModel() : null;
            if (model) {
                const langId = language === 'lua' ? 'lua' : 'python';
                monaco.editor.setModelLanguage(model, langId);
            }
        }
    }

    if (blocklyEnabled) {
        ensureBlocklyWorkspace(language);
        loadBlocklyWorkspace(language);
    }
}

export function setBlocklyEditorEnabled(enabled: boolean) {
    if (blocklyEnabled === enabled) return;

    if (!enabled) {
        saveBlocklyWorkspaceState(currentScriptLanguage);
        const key = getEditorStateKey(currentScriptLanguage);
        const previousText = textDraftByKey.get(key) || '';
        const generatedCode = blocklyWorkspace
            ? compileMainEditorWorkspace(currentScriptLanguage, blocklyWorkspace)
            : previousText;
        const nextText = isBlocklyWorkspaceEmpty() && !blocklyWorkspaceXmlByKey.has(key)
            ? previousText
            : generatedCode;
        textDraftByKey.set(key, nextText);
        blocklyGeneratedCodeVisible = false;
        blocklyEnabled = false;
        syncEditorModeVisibility();
        syncBlocklyEditorToggle();
        syncBlocklyCodeOverlayToggle();
        if (monacoRoot) {
            setTextEditorValue(nextText);
        }
        restoreEditorPanelWidthAfterBlockly();
        maybeAutoExpandTextEditorPanel(nextText, currentScriptLanguage);
        layoutEditor();
        return;
    }

    const currentText = getTextEditorValue();
    textDraftByKey.set(getEditorStateKey(currentScriptLanguage), currentText);
    blocklyGeneratedCodeVisible = false;
    blocklyEnabled = true;
    syncEditorModeVisibility();
    syncBlocklyEditorToggle();
    syncBlocklyCodeOverlayToggle();
    ensureBlocklyWorkspace(currentScriptLanguage);
    loadBlocklyWorkspace(currentScriptLanguage);
    expandEditorPanelForBlockly();
    layoutEditor();
}

export function isBlocklyEditorEnabled(): boolean {
    return blocklyEnabled;
}

export function initBlocklyEditorToggle() {
    const toggle = document.getElementById('blockly-editor-toggle') as HTMLInputElement | null;
    syncBlocklyEditorToggle();
    syncBlocklyCodeOverlayToggle();

    if (toggle) {
        toggle.addEventListener('change', () => {
            setBlocklyEditorEnabled(toggle.checked);
        });
    }

    if (blocklyCodeOverlayToggle) {
        blocklyCodeOverlayToggle.addEventListener('change', () => {
            if (!blocklyEnabled) {
                blocklyGeneratedCodeVisible = false;
                syncEditorModeVisibility();
                syncBlocklyCodeOverlayToggle();
                return;
            }
            blocklyGeneratedCodeVisible = Boolean(blocklyCodeOverlayToggle?.checked);
            syncEditorModeVisibility();
            syncBlocklyCodeOverlayToggle();
            resizeBlocklyWorkspaceViewport();
        });
    }
}

export function layoutEditor() {
    if (editorInstance) editorInstance.layout();
    resizeBlocklyWorkspaceViewport();
}
