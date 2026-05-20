import { log } from '../../shared/logging/logger.js';
import type { UICallbacks } from '../index.js';
import { createSidebarDiagnosticsLogger } from './sidebar-debug.js';

export function initSidebar(callbacks: UICallbacks) {
    const panels = document.querySelector('.sidebar-panels') as HTMLElement | null;
    const workspaceSidebar = panels?.closest('.workspace-sidebar') as HTMLElement | null;
    const resizer = document.getElementById('sidebar-resizer') as HTMLElement | null;
    if (!panels || !resizer) return;

    const DEFAULT_SIDEBAR_WIDTH = 320;
    const MIN_SIDEBAR_WIDTH = 320;
    const MAX_SIDEBAR_WIDTH = 1000;
    const fullscreenPanels = new Set(['gamepad-panel']);
    const shouldLogPanelDebug = localStorage.getItem('sidebar-debug') === '1';
    const loggablePanelNames: Record<string, string> = {
        'settings-panel': '˜˜˜˜˜˜˜˜˜'
    };
    const debugPanelIds = new Set(['settings-panel']);
    const logPanelOpenDiagnostics = createSidebarDiagnosticsLogger(panels, shouldLogPanelDebug, debugPanelIds);
    let isResizing = false;
    let viewportRefreshFrame = 0;
    let closeAnimationTimer = 0;

    const normalizeSidebarWidth = (value: string | null): string => {
        const parsed = Number.parseInt(value || '', 10);
        if (!Number.isFinite(parsed)) return `${DEFAULT_SIDEBAR_WIDTH}px`;
        return `${Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsed))}px`;
    };

    const refreshViewportLayout = () => {
        window.cancelAnimationFrame(viewportRefreshFrame);
        viewportRefreshFrame = window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 180);
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 360);
        });
    };

    const syncSidebarCollapsedState = () => {
        const isCollapsed = panels.style.width === '0px';
        panels.classList.toggle('is-collapsed', isCollapsed);
        workspaceSidebar?.classList.toggle('is-collapsed', isCollapsed);
    };

    const syncSidebarMode = (panelId: string | null) => {
        panels.classList.toggle('is-fullscreen', !!panelId && fullscreenPanels.has(panelId) && panels.style.width !== '0px');
    };

    const resetClosingState = () => {
        if (closeAnimationTimer) {
            window.clearTimeout(closeAnimationTimer);
            closeAnimationTimer = 0;
        }
        panels.classList.remove('is-closing');
        document.querySelectorAll('.sidebar-panel').forEach((panel) => panel.classList.remove('is-closing'));
    };

    const finishClosePanel = () => {
        panels.style.width = '0px';
        document.querySelectorAll('.sidebar-panel').forEach((panel) => {
            panel.classList.remove('active');
            panel.classList.remove('is-closing');
        });
        syncSidebarCollapsedState();
        syncSidebarMode(null);
        panels.classList.remove('is-closing');
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));
        refreshViewportLayout();
    };

    const closePanelWithAnimation = () => {
        const activePanel = document.querySelector('.sidebar-panel.active') as HTMLElement | null;
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));
        if (!activePanel) {
            finishClosePanel();
            return;
        }
        resetClosingState();
        panels.classList.add('is-closing');
        activePanel.classList.add('is-closing');
        closeAnimationTimer = window.setTimeout(() => {
            closeAnimationTimer = 0;
            finishClosePanel();
        }, 220);
    };

    (window as any).openPanel = function(panelId: string) {
        const panel = document.getElementById(panelId);
        if (!panel) {
            console.warn('[Sidebar][Debug] openPanel target not found', { panelId });
            log(`[Sidebar][Debug] ${panelId}: DOM ˜˜˜˜˜˜ ˜˜ ˜˜˜˜˜˜`, 'warn');
            return;
        }

        const isAlreadyActive = panel.classList.contains('active');
        const panelName = loggablePanelNames[panelId];
        logPanelOpenDiagnostics('before-reset', panelId, panel);
        resetClosingState();

        document.querySelectorAll('.sidebar-panel').forEach((p) => p.classList.remove('active'));
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));

        if (isAlreadyActive && panels.style.width !== '0px') {
            if (panelName) {
                console.info(`[Sidebar] ˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜: ${panelName}`);
                log(`˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜: ${panelName}`, 'info');
            }
            closePanelWithAnimation();
            logPanelOpenDiagnostics('after-close', panelId, panel);
            return;
        }

        panels.style.width = fullscreenPanels.has(panelId) ? '100%' : normalizeSidebarWidth(localStorage.getItem('sidebar-width'));
        if (!fullscreenPanels.has(panelId)) {
            localStorage.setItem('sidebar-width', panels.style.width);
        }
        syncSidebarCollapsedState();
        syncSidebarMode(panelId);
        panel.classList.add('active');

        const buttons = document.querySelectorAll('.sidebar-tab-btn');
        buttons.forEach((btn) => {
            if (btn.getAttribute('onclick')?.includes(`'${panelId}'`)) {
                btn.classList.add('active');
            }
        });

        if (panelName) {
            console.info(`[Sidebar] ˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜: ${panelName}`);
            log(`˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜: ${panelName}`, 'info');
        }

        logPanelOpenDiagnostics('after-activate', panelId, panel);
        window.requestAnimationFrame(() => {
            logPanelOpenDiagnostics('raf-1', panelId, panel);
            window.requestAnimationFrame(() => logPanelOpenDiagnostics('raf-2', panelId, panel));
        });
        window.setTimeout(() => logPanelOpenDiagnostics('timeout-250ms', panelId, panel), 250);

        if (panelId === 'editor-panel' && callbacks.onEditorResize) {
            setTimeout(callbacks.onEditorResize, 350);
        }
        refreshViewportLayout();
    };

    (window as any).closePanel = function() {
        closePanelWithAnimation();
    };

    resizer.addEventListener('mousedown', () => {
        isResizing = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX - 50));
        panels.style.width = `${newWidth}px`;
        localStorage.setItem('sidebar-width', `${newWidth}px`);
        syncSidebarCollapsedState();
        syncSidebarMode(document.querySelector('.sidebar-panel.active')?.id ?? null);
        if (callbacks.onEditorResize) callbacks.onEditorResize();
        refreshViewportLayout();
    });

    window.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
    });

    (window as any).switchTab = (window as any).openPanel;
    panels.style.width = normalizeSidebarWidth(localStorage.getItem('sidebar-width'));
    localStorage.setItem('sidebar-width', panels.style.width);
    syncSidebarCollapsedState();
    syncSidebarMode(document.querySelector('.sidebar-panel.active')?.id ?? null);
    refreshViewportLayout();
}
