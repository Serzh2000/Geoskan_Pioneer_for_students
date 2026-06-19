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
    const DEFAULT_SIDEBAR_WIDTH = 320;
    const MIN_SIDEBAR_WIDTH = 320;
    const MAX_SIDEBAR_WIDTH = 1000;
    const MOBILE_SIDEBAR_QUERY = '(max-width: 980px)';
    const fullscreenPanels = new Set(['gamepad-panel']);
    const mobileSidebarQuery = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const shouldLogPanelDebug = localStorage.getItem('sidebar-debug') === '1';
    const loggablePanelNames: Record<string, string> = {
        'settings-panel': 'Settings'
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

    const isMobileSidebar = () => mobileSidebarQuery.matches;

    const getOpenSidebarWidth = (panelId: string | null): string => {
        if (!panelId) return '0px';
        if (isMobileSidebar()) return '100%';
        if (fullscreenPanels.has(panelId)) return '100%';
        return normalizeSidebarWidth(localStorage.getItem('sidebar-width'));
    };

    const persistActivePanel = (panelId: string | null) => {
        localStorage.setItem(ACTIVE_PANEL_STORAGE_KEY, panelId || CLOSED_PANEL_SENTINEL);
    };

    const setActiveTabButton = (panelId: string | null) => {
        const buttons = document.querySelectorAll('.sidebar-tab-btn');
        buttons.forEach((btn) => {
            const isTarget = !!panelId && btn.getAttribute('onclick')?.includes(`'${panelId}'`);
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
        if (!isMobile) return;
        if (activePanelId && panels.style.width !== '0px') {
            panels.style.width = '100%';
        }
        syncSidebarCollapsedState();
        syncSidebarMode(activePanelId);
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
        setActiveTabButton(null);
        persistActivePanel(null);
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
                console.info(`[Sidebar] Closing panel: ${panelName}`);
                log(`Closing panel: ${panelName}`, 'info');
            }
            closePanelWithAnimation();
            logPanelOpenDiagnostics('after-close', panelId, panel);
            return;
        }

        panels.style.width = getOpenSidebarWidth(panelId);
        if (!isMobileSidebar() && !fullscreenPanels.has(panelId)) {
            localStorage.setItem('sidebar-width', panels.style.width);
        }
        syncSidebarCollapsedState();
        syncResponsiveSidebarState();
        syncSidebarMode(panelId);
        panel.classList.add('active');
        setActiveTabButton(panelId);
        persistActivePanel(panelId);

        if (panelName) {
            console.info(`[Sidebar] Opening panel: ${panelName}`);
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

    resizer.addEventListener('mousedown', () => {
        if (isMobileSidebar()) return;
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

    (window as any).switchTab = openPanel;
    panels.style.width = normalizeSidebarWidth(localStorage.getItem('sidebar-width'));
    localStorage.setItem('sidebar-width', panels.style.width);

    const restoreSidebarState = () => {
        const savedPanelId = localStorage.getItem(ACTIVE_PANEL_STORAGE_KEY);
        if (savedPanelId === null) {
            syncResponsiveSidebarState();
            syncSidebarCollapsedState();
            syncSidebarMode(document.querySelector('.sidebar-panel.active')?.id ?? null);
            refreshViewportLayout();
            return;
        }

        resetClosingState();
        document.querySelectorAll('.sidebar-panel').forEach((panel) => {
            panel.classList.remove('active');
            panel.classList.remove('is-closing');
        });
        setActiveTabButton(null);

        if (savedPanelId === CLOSED_PANEL_SENTINEL) {
            panels.style.width = '0px';
            syncSidebarCollapsedState();
            syncSidebarMode(null);
            refreshViewportLayout();
            return;
        }

        const panel = document.getElementById(savedPanelId);
        if (!panel) {
            persistActivePanel('editor-panel');
            (window as any).openPanel('editor-panel');
            return;
        }

        panels.style.width = getOpenSidebarWidth(savedPanelId);
        if (!isMobileSidebar() && !fullscreenPanels.has(savedPanelId)) {
            localStorage.setItem('sidebar-width', panels.style.width);
        }
        panel.classList.add('active');
        setActiveTabButton(savedPanelId);
        syncSidebarCollapsedState();
        syncResponsiveSidebarState();
        syncSidebarMode(savedPanelId);
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
