import { initGamepadDialog } from './gamepad-dialog.js';
import { log } from '../../shared/logging/logger.js';
import type { UICallbacks } from '../index.js';
import { createSidebarDiagnosticsLogger } from './sidebar-debug.js';

export function initSidebar(callbacks: UICallbacks) {
    const panels = document.querySelector('.sidebar-panels') as HTMLElement | null;
    const workspaceSidebar = panels?.closest('.workspace-sidebar') as HTMLElement | null;
    const resizer = document.getElementById('sidebar-resizer') as HTMLElement | null;
    if (!panels || !resizer) return;

    const ACTIVE_PANEL_STORAGE_KEY = 'geoskan_sidebar_active_panel_v1';
    const CLOSED_PANEL_SENTINEL = '__closed__';
    const DEFAULT_SIDEBAR_WIDTH = 360;
    const MIN_SIDEBAR_WIDTH = 320;
    const MAX_SIDEBAR_WIDTH = 1000;
    // Keep in sync with --scene-min-width in styles/layout/container.css: on desktop
    // the scene beside an open panel never gets narrower than this.
    const SCENE_MIN_WIDTH = 360;
    const MOBILE_SIDEBAR_QUERY = '(max-width: 980px)';
    // Column width a panel opens with until the user drags it to another one.
    const PANEL_DEFAULT_WIDTHS: Record<string, number> = {
        'editor-panel': 520,
        'telemetry-panel': 320,
        'drone-link-panel': 360,
        'manager-panel': 420,
        'gamepad-panel': 440
    };
    const PANEL_MIN_WIDTHS: Record<string, number> = {
        'editor-panel': 360
    };
    const mobileSidebarQuery = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const shouldLogPanelDebug = localStorage.getItem('sidebar-debug') === '1';
    const loggablePanelNames: Record<string, string> = {
        'settings-panel': 'Settings'
    };
    const debugPanelIds = new Set(['settings-panel']);
    const logPanelOpenDiagnostics = createSidebarDiagnosticsLogger(panels, shouldLogPanelDebug, debugPanelIds);
    const gamepadDialog = initGamepadDialog();
    let isResizing = false;
    let viewportRefreshFrame = 0;
    let closeAnimationTimer = 0;

    const minWidthFor = (panelId: string | null): number =>
        (panelId && PANEL_MIN_WIDTHS[panelId]) || MIN_SIDEBAR_WIDTH;

    const normalizeSidebarWidth = (value: string | null, panelId: string | null = null): string => {
        const parsed = Number.parseInt(value || '', 10);
        if (!Number.isFinite(parsed)) return `${(panelId && PANEL_DEFAULT_WIDTHS[panelId]) || DEFAULT_SIDEBAR_WIDTH}px`;
        return `${Math.min(MAX_SIDEBAR_WIDTH, Math.max(minWidthFor(panelId), parsed))}px`;
    };

    const isMobileSidebar = () => mobileSidebarQuery.matches;

    /*
     * The widest the column can be while the scene beside it keeps its minimum.
     * The CSS (flex-shrink on the sidebar) enforces the same limit when the window
     * is narrower than a saved width; this keeps a drag from storing more than fits.
     */
    const getMaxPanelWidth = (panelId: string | null): number => {
        const track = panels.closest('.mobile-workspace-track') as HTMLElement | null;
        if (!track || !workspaceSidebar || isMobileSidebar() || panels.classList.contains('is-fullscreen')) return MAX_SIDEBAR_WIDTH;
        const railWidth = Math.max(0, workspaceSidebar.getBoundingClientRect().width - panels.getBoundingClientRect().width);
        const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
        const room = Math.floor(track.clientWidth - railWidth - gap - SCENE_MIN_WIDTH);
        return Math.min(MAX_SIDEBAR_WIDTH, Math.max(minWidthFor(panelId), room));
    };

    // Every panel persists its own width under its id (an in-memory fallback covers denied storage).
    const widthKey = (panelId: string) => `sidebar-width:${panelId}`;
    const readWidth = (panelId: string): string | null => {
        try { return localStorage.getItem(widthKey(panelId)); } catch { return null; }
    };
    const saveWidth = (panelId: string, width: string) => {
        try { localStorage.setItem(widthKey(panelId), width); } catch { /* The width then lasts for this session only. */ }
    };

    const getOpenSidebarWidth = (panelId: string | null): string => {
        if (!panelId) return '0px';
        if (isMobileSidebar()) return '100%';
        return normalizeSidebarWidth(readWidth(panelId), panelId);
    };

    const persistActivePanel = (panelId: string | null) => {
        localStorage.setItem(ACTIVE_PANEL_STORAGE_KEY, panelId || CLOSED_PANEL_SENTINEL);
    };

    const setActiveTabButton = (panelId: string | null) => {
        // Actions that share the rail's look (the theme switch) are not panel tabs.
        const buttons = document.querySelectorAll('.sidebar-tab-btn:not(.sidebar-tab-btn--action):not(.sidebar-tab-btn--docs)');
        buttons.forEach((btn) => {
            const isTarget = !!panelId && !!btn.getAttribute('onclick')?.includes(`'${panelId}'`);
            btn.classList.toggle('active', isTarget);
        });
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

    const syncResponsiveSidebarState = () => {
        const activePanelId = document.querySelector('.sidebar-panel.active')?.id ?? null;
        const isMobile = isMobileSidebar();
        panels.classList.toggle('is-mobile', isMobile);
        workspaceSidebar?.classList.toggle('is-mobile', isMobile);
        if (!isMobile) {
            // Leaving the narrow layout: the stacked 100% column becomes the panel's own width again.
            if (activePanelId && panels.style.width === '100%') panels.style.width = getOpenSidebarWidth(activePanelId);
            return;
        }
        if (activePanelId && panels.style.width !== '0px') {
            panels.style.width = '100%';
        }
        syncSidebarCollapsedState();
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
        panels.classList.remove('is-closing');
        setActiveTabButton(null);
        persistActivePanel(null);
        window.dispatchEvent(new CustomEvent('sidebar-panel-change', { detail: { panelId: null } }));
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

    const openPanel = function(panelId: string) {
        if (panelId === 'gamepad-panel') { gamepadDialog?.open(); return; }
        const panel = document.getElementById(panelId);
        if (!panel) {
            console.warn('[Sidebar][Debug] openPanel target not found', { panelId });
            log(`[Sidebar][Debug] ${panelId}: DOM element not found`, 'warn');
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
                log(`Closing panel: ${panelName}`, 'info');
            }
            closePanelWithAnimation();
            logPanelOpenDiagnostics('after-close', panelId, panel);
            return;
        }

        // Only a width the user dragged to is stored (see the resizer below), so a
        // changed default reaches everyone who never resized that panel.
        panels.style.width = getOpenSidebarWidth(panelId);
        syncSidebarCollapsedState();
        syncResponsiveSidebarState();
        panel.classList.add('active');
        setActiveTabButton(panelId);
        persistActivePanel(panelId);
        window.dispatchEvent(new CustomEvent('sidebar-panel-change', { detail: { panelId } }));

        if (panelName) {
            log(`Opening panel: ${panelName}`, 'info');
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

    (window as any).openPanel = openPanel;
    (globalThis as any).openPanel = openPanel;

    (window as any).closePanel = function() {
        closePanelWithAnimation();
    };
    // Public aliases are deliberately narrow: the header control needs the same
    // closing path as a panel's own close button, including the animation.
    (window as any).closeSidebarPanel = closePanelWithAnimation;

    resizer.addEventListener('mousedown', () => {
        if (isMobileSidebar() || panels.classList.contains('is-fullscreen')) return;
        isResizing = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        // The column starts where the rail ends: measure from its own left edge.
        const activePanelId = document.querySelector('.sidebar-panel.active')?.id ?? null;
        const newWidth = Math.min(getMaxPanelWidth(activePanelId), Math.max(minWidthFor(activePanelId), Math.round(e.clientX - panels.getBoundingClientRect().left)));
        panels.style.width = `${newWidth}px`;
        if (activePanelId) saveWidth(activePanelId, `${newWidth}px`);
        syncSidebarCollapsedState();
        if (callbacks.onEditorResize) callbacks.onEditorResize();
        refreshViewportLayout();
    });

    const endResize = () => {
        if (!isResizing) return;
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
    };
    window.addEventListener('mouseup', endResize);
    window.addEventListener('blur', endResize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) endResize(); });

    // Storage is written only when the user drags (or the editor autofit widens) a column,
    // so a changed default reaches everyone who never resized that panel.
    panels.style.width = getOpenSidebarWidth('editor-panel');

    const restoreSidebarState = () => {
        const savedPanelId = localStorage.getItem(ACTIVE_PANEL_STORAGE_KEY);

        resetClosingState();
        document.querySelectorAll('.sidebar-panel').forEach((panel) => {
            panel.classList.remove('active');
            panel.classList.remove('is-closing');
        });
        setActiveTabButton(null);

        // savedPanelId === null — приложение открыто впервые: показываем чистую
        // сцену, а не панель редактора из разметки.
        if (savedPanelId === null || savedPanelId === CLOSED_PANEL_SENTINEL) {
            panels.style.width = '0px';
            syncSidebarCollapsedState();
            refreshViewportLayout();
            return;
        }

        if (savedPanelId === 'gamepad-panel') {
            panels.style.width = '0px';
            syncSidebarCollapsedState();
            persistActivePanel(null);
            return;
        }
        const panel = document.getElementById(savedPanelId);
        if (!panel) {
            persistActivePanel('editor-panel');
            (window as any).openPanel('editor-panel');
            return;
        }

        panels.style.width = getOpenSidebarWidth(savedPanelId);
        panel.classList.add('active');
        setActiveTabButton(savedPanelId);
        syncSidebarCollapsedState();
        syncResponsiveSidebarState();
        if (savedPanelId === 'editor-panel' && callbacks.onEditorResize) {
            setTimeout(callbacks.onEditorResize, 350);
        }
        refreshViewportLayout();
    };

    if (typeof mobileSidebarQuery.addEventListener === 'function') {
        mobileSidebarQuery.addEventListener('change', syncResponsiveSidebarState);
    } else {
        mobileSidebarQuery.addListener(syncResponsiveSidebarState);
    }

    restoreSidebarState();
}
