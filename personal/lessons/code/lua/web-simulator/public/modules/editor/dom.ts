import type { ScriptLanguage } from '../core/state.js';
import { applyEditorLayoutState } from './blockly-mode/ui.js';

const COMPACT_VIEWPORT_BREAKPOINT = 1500;
const MAX_SIDEBAR_RATIO_COMPACT = 0.42;
const MIN_EXPANDED_SIDEBAR_WIDTH = 336;
const MIN_MAIN_SCENE_WIDTH_WIDE = 980;

export type EditorShellRefs = {
    monacoRoot: HTMLElement | null;
    blocklyRoot: HTMLElement | null;
    blocklyCanvasHost: HTMLElement | null;
    blocklyCanvas: HTMLElement | null;
    blocklyPreview: HTMLElement | null;
    blocklyCodeOverlay: HTMLElement | null;
    blocklyCodeOverlayToggle: HTMLInputElement | null;
};

export function getEditorStateKey(currentDroneId: string, language: ScriptLanguage): string {
    return `${currentDroneId}:${language}`;
}

export function createEditorShell(): EditorShellRefs {
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        return {
            monacoRoot: null,
            blocklyRoot: null,
            blocklyCanvasHost: null,
            blocklyCanvas: null,
            blocklyPreview: null,
            blocklyCodeOverlay: null,
            blocklyCodeOverlayToggle: null
        };
    }

    editorElement.innerHTML = `
        <div id="monaco-editor-root" class="editor-mode-root"></div>
        <div id="blockly-editor-root" class="editor-mode-root editor-mode-root--hidden">
            <div class="blockly-editor-shell">
                <div id="blockly-editor-canvas-host" class="blockly-editor-canvas-host">
                    <div id="blockly-editor-canvas" class="blockly-editor-canvas"></div>
                    <div id="blockly-code-overlay" class="blockly-code-overlay" aria-hidden="true">
                        <div class="blockly-code-overlay__header">
                            <div class="blockly-code-overlay__title">Сгенерированный код</div>
                        </div>
                        <pre id="blockly-editor-code-preview" class="blockly-code-overlay__code"></pre>
                    </div>
                </div>
            </div>
        </div>
    `;

    return {
        monacoRoot: document.getElementById('monaco-editor-root'),
        blocklyRoot: document.getElementById('blockly-editor-root'),
        blocklyCanvasHost: document.getElementById('blockly-editor-canvas-host'),
        blocklyCanvas: document.getElementById('blockly-editor-canvas'),
        blocklyPreview: document.getElementById('blockly-editor-code-preview'),
        blocklyCodeOverlay: document.getElementById('blockly-code-overlay'),
        blocklyCodeOverlayToggle: document.getElementById('blockly-code-overlay-toggle') as HTMLInputElement | null
    };
}

export function syncEditorModeVisibility(
    refs: Pick<EditorShellRefs, 'monacoRoot' | 'blocklyRoot' | 'blocklyCodeOverlay' | 'blocklyCodeOverlayToggle'>,
    blocklyEnabled: boolean,
    blocklyGeneratedCodeVisible: boolean
) {
    applyEditorLayoutState({
        monacoRoot: refs.monacoRoot,
        blocklyRoot: refs.blocklyRoot,
        codeOverlay: refs.blocklyCodeOverlay,
        codeToggle: refs.blocklyCodeOverlayToggle
    }, {
        blocklyEnabled,
        generatedCodeVisible: blocklyGeneratedCodeVisible
    });
}

export function syncBlocklyEditorToggle(blocklyEnabled: boolean) {
    const toggle = document.getElementById('blockly-editor-toggle') as HTMLInputElement | null;
    if (toggle) toggle.checked = blocklyEnabled;
}

export function syncBlocklyCodeOverlayToggle(toggle: HTMLInputElement | null, blocklyEnabled: boolean, blocklyGeneratedCodeVisible: boolean) {
    if (!toggle) return;
    toggle.checked = blocklyEnabled && blocklyGeneratedCodeVisible;
    toggle.disabled = !blocklyEnabled;
}

export function fallbackEditor(monacoRoot: HTMLElement | null) {
    if (!monacoRoot) return;
    monacoRoot.innerHTML = '<div style="color:#d13b2e; padding:20px;">Не удалось загрузить Monaco Editor. Проверьте подключение к интернету. Используется резервный текстовый редактор.</div><textarea id="fallback-editor" style="width:100%; height:90%; background:#f4f5f7; color:#151515; font-family:monospace; padding:10px; border:1px solid rgba(9,9,11,0.1); border-radius:12px; resize:none;">-- Скрипт Pioneer Lua\n\nap.push(Ev.MCE_TAKEOFF)</textarea>';
    (window as any).getEditorValueFallback = () => (document.getElementById('fallback-editor') as HTMLTextAreaElement).value;
    (window as any).setEditorValueFallback = (val: string) => {
        const el = document.getElementById('fallback-editor') as HTMLTextAreaElement;
        if (el) el.value = val;
    };
}

function getSidebarPanelsElement(): HTMLElement | null {
    return document.querySelector('.sidebar-panels') as HTMLElement | null;
}

function computeExpandedSidebarWidth(viewportWidth: number, currentWidth: number): number {
    const safeViewportWidth = Math.max(0, Math.floor(viewportWidth));
    const preferredWidth = Math.round(safeViewportWidth * 0.4);
    const maximumWidth = safeViewportWidth >= COMPACT_VIEWPORT_BREAKPOINT
        ? Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, safeViewportWidth - MIN_MAIN_SCENE_WIDTH_WIDE)
        : Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, Math.floor(safeViewportWidth * MAX_SIDEBAR_RATIO_COMPACT));
    const minimumWidth = Math.min(Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, preferredWidth), maximumWidth);
    return Math.max(minimumWidth, Math.min(maximumWidth, Math.max(currentWidth, preferredWidth)));
}

export function expandEditorPanelForBlockly(previousSidebarWidthBeforeBlockly: string | null): string | null {
    const panels = getSidebarPanelsElement();
    const activePanelId = document.querySelector('.sidebar-panel.active')?.id || null;
    if (!panels || activePanelId !== 'editor-panel' || panels.classList.contains('is-fullscreen')) {
        return previousSidebarWidthBeforeBlockly;
    }

    const currentWidth = Number.parseInt(panels.style.width || '', 10) || Math.floor(panels.getBoundingClientRect().width);
    const nextWidth = computeExpandedSidebarWidth(window.innerWidth || currentWidth, currentWidth);
    const previousWidth = previousSidebarWidthBeforeBlockly || panels.style.width || `${currentWidth}px`;

    panels.style.width = `${nextWidth}px`;
    localStorage.setItem('sidebar-width', `${nextWidth}px`);
    window.dispatchEvent(new Event('resize'));
    return previousWidth;
}

export function restoreEditorPanelWidthAfterBlockly(previousSidebarWidthBeforeBlockly: string | null): string | null {
    const panels = getSidebarPanelsElement();
    const activePanelId = document.querySelector('.sidebar-panel.active')?.id || null;
    if (!panels || activePanelId !== 'editor-panel' || !previousSidebarWidthBeforeBlockly) {
        return previousSidebarWidthBeforeBlockly;
    }

    panels.style.width = previousSidebarWidthBeforeBlockly;
    localStorage.setItem('sidebar-width', previousSidebarWidthBeforeBlockly);
    window.dispatchEvent(new Event('resize'));
    return null;
}
