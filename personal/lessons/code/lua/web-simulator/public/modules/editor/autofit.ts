import { Blockly } from '../ui/mission-guide/blockly.js';
import { currentScriptLanguage, DEFAULT_LUA_SCRIPT, type ScriptLanguage } from '../core/state.js';

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 1000;
const LUA_EDITOR_FONT = "14px 'Fira Code', monospace";
const LUA_EDITOR_HORIZONTAL_PADDING = 64;
const BLOCKLY_CONTENT_PADDING = 96;

export type EditorAutofitContext = {
    monacoRoot: HTMLElement | null;
    blocklyRoot: HTMLElement | null;
    blocklyCanvasHost: HTMLElement | null;
    blocklyCanvas: HTMLElement | null;
    blocklyWorkspace: Blockly.WorkspaceSvg | null;
    editorInstance: any;
};

let textMeasureCanvas: HTMLCanvasElement | null = null;
let pendingSidebarAutofitTimer = 0;

function normalizeMultilineText(value: string): string {
    return value
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\s+$/u, ''))
        .join('\n')
        .trim();
}

export function isStarterLuaScript(value: string): boolean {
    return normalizeMultilineText(value) === normalizeMultilineText(DEFAULT_LUA_SCRIPT);
}

function getSidebarPanelsElement(): HTMLElement | null {
    return document.querySelector('.sidebar-panels') as HTMLElement | null;
}

function getSidebarCurrentWidth(panels: HTMLElement): number {
    return Number.parseInt(panels.style.width || '', 10) || Math.floor(panels.getBoundingClientRect().width);
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

function getRequiredLuaSidebarWidth(text: string, context: EditorAutofitContext): number {
    const panels = getSidebarPanelsElement();
    if (!panels) return MIN_SIDEBAR_WIDTH;

    const contentElement = context.monacoRoot || (document.getElementById('fallback-editor') as HTMLElement | null);
    const chromeWidth = getSidebarChromeWidth(panels, contentElement);
    const measuredTextWidth = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .reduce((maxWidth, line) => Math.max(maxWidth, measureTextWidth(line, LUA_EDITOR_FONT)), 0);
    const editorScrollWidth = typeof context.editorInstance?.getScrollWidth === 'function'
        ? Number(context.editorInstance.getScrollWidth()) || 0
        : 0;
    const requiredEditorWidth = Math.max(measuredTextWidth + LUA_EDITOR_HORIZONTAL_PADDING, editorScrollWidth);
    return requiredEditorWidth + chromeWidth;
}

function getBlocklyBlocksWidth(context: EditorAutofitContext): number {
    if (!context.blocklyWorkspace) return 0;

    const boundingBox = (context.blocklyWorkspace as Blockly.WorkspaceSvg & {
        getBlocksBoundingBox?: () => { left: number; right: number };
    }).getBlocksBoundingBox?.();
    if (boundingBox) {
        return Math.max(0, Math.ceil(boundingBox.right - boundingBox.left));
    }

    const blockCanvasElement = context.blocklyCanvas?.querySelector('.blocklyBlockCanvas') as SVGGraphicsElement | null;
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

function getRequiredBlocklySidebarWidth(context: EditorAutofitContext): number {
    const panels = getSidebarPanelsElement();
    if (!panels) return MIN_SIDEBAR_WIDTH;

    const contentElement = context.blocklyCanvasHost || context.blocklyCanvas || context.blocklyRoot;
    const chromeWidth = getSidebarChromeWidth(panels, contentElement);
    const toolboxWidth = Math.ceil(
        (context.blocklyCanvas?.querySelector('.blocklyToolboxDiv') as HTMLElement | null)?.getBoundingClientRect().width || 0
    );
    const requiredCanvasWidth = toolboxWidth + getBlocklyBlocksWidth(context) + BLOCKLY_CONTENT_PADDING;
    return requiredCanvasWidth + chromeWidth;
}

function autoExpandEditorPanelToContent(mode: 'text' | 'blockly', context: EditorAutofitContext, text = ''): void {
    const requiredWidth = mode === 'blockly'
        ? getRequiredBlocklySidebarWidth(context)
        : getRequiredLuaSidebarWidth(text, context);
    applySidebarAutofitWidth(requiredWidth);
}

export function scheduleEditorPanelAutofit(mode: 'text' | 'blockly', context: EditorAutofitContext, text = ''): void {
    if (typeof window === 'undefined') return;
    if (pendingSidebarAutofitTimer) {
        window.clearTimeout(pendingSidebarAutofitTimer);
    }
    pendingSidebarAutofitTimer = window.setTimeout(() => {
        pendingSidebarAutofitTimer = 0;
        window.requestAnimationFrame(() => {
            if (mode === 'blockly') {
                window.requestAnimationFrame(() => autoExpandEditorPanelToContent(mode, context, text));
                return;
            }
            autoExpandEditorPanelToContent(mode, context, text);
        });
    }, 0);
}

export function maybeAutoExpandTextEditorPanel(
    context: EditorAutofitContext,
    text: string,
    language: ScriptLanguage = currentScriptLanguage
): void {
    if (language !== 'lua' || !isStarterLuaScript(text)) return;
    scheduleEditorPanelAutofit('text', context, text);
}

export function expandEditorPanelForBlockly(
    context: EditorAutofitContext,
    previousSidebarWidthBeforeBlockly: string | null
): string | null {
    const panels = getSidebarPanelsElement();
    const activePanelId = document.querySelector('.sidebar-panel.active')?.id || null;
    if (!panels || activePanelId !== 'editor-panel' || panels.classList.contains('is-fullscreen')) {
        return previousSidebarWidthBeforeBlockly;
    }

    if (!previousSidebarWidthBeforeBlockly) {
        previousSidebarWidthBeforeBlockly = panels.style.width || `${getSidebarCurrentWidth(panels)}px`;
    }
    scheduleEditorPanelAutofit('blockly', context);
    return previousSidebarWidthBeforeBlockly;
}

export function restoreEditorPanelWidthAfterBlockly(previousSidebarWidthBeforeBlockly: string | null): string | null {
    const panels = getSidebarPanelsElement();
    const activePanelId = document.querySelector('.sidebar-panel.active')?.id || null;
    if (!panels || activePanelId !== 'editor-panel' || !previousSidebarWidthBeforeBlockly) {
        return previousSidebarWidthBeforeBlockly;
    }

    const currentWidth = getSidebarCurrentWidth(panels);
    const previousWidth = Number.parseInt(previousSidebarWidthBeforeBlockly, 10);
    const nextWidth = Number.isFinite(previousWidth)
        ? Math.max(currentWidth, previousWidth)
        : currentWidth;

    panels.style.width = `${nextWidth}px`;
    localStorage.setItem('sidebar-width', `${nextWidth}px`);
    window.dispatchEvent(new Event('resize'));
    return null;
}
