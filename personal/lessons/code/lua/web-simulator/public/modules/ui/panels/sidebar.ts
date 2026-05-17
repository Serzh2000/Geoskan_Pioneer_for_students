import type { UICallbacks } from '../index.js';

const COMPACT_VIEWPORT_BREAKPOINT = 1500;
const MAX_SIDEBAR_RATIO_COMPACT = 0.42;
const DEFAULT_SIDEBAR_WIDTH = 400;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 1000;
const SIDEBAR_TABS_WIDTH = 56;
const MIN_MAIN_SCENE_WIDTH_WIDE = 980;
const FULLSCREEN_PANEL_IDS = new Set(['settings-panel', 'gamepad-panel']);

export function initSidebar(callbacks: UICallbacks) {
    const container = document.querySelector('.container') as HTMLElement | null;
    const workspaceSidebar = document.querySelector('.workspace-sidebar') as HTMLElement | null;
    const panels = document.querySelector('.sidebar-panels') as HTMLElement | null;
    const resizer = document.getElementById('sidebar-resizer') as HTMLElement | null;
    if (!container || !workspaceSidebar || !panels || !resizer) return;

    let isResizing = false;
    let viewportRefreshFrame = 0;

    const applySidebarWidth = (nextWidth: number, persist = true, allowCollapsed = false) => {
        const maxSidebarWidth = getMaxSidebarWidth();
        const minAllowedWidth = allowCollapsed ? SIDEBAR_TABS_WIDTH : MIN_SIDEBAR_WIDTH;
        const clampedWidth = Math.max(minAllowedWidth, Math.min(maxSidebarWidth, nextWidth));
        const panelsWidth = Math.max(0, clampedWidth - SIDEBAR_TABS_WIDTH);

        container.style.setProperty('--sidebar-width', `${clampedWidth}px`);
        container.style.setProperty('--sidebar-current-min-width', `${minAllowedWidth}px`);
        workspaceSidebar.style.width = `${clampedWidth}px`;
        panels.style.width = `${panelsWidth}px`;

        if (persist) {
            localStorage.setItem('sidebar-width', `${clampedWidth}px`);
        }

        syncSidebarCollapsedState();
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
        const isCollapsed = panels.getBoundingClientRect().width <= 1;
        panels.classList.toggle('is-collapsed', isCollapsed);
    };

    const syncSidebarMode = (panelId: string | null) => {
        panels.classList.toggle('is-fullscreen', Boolean(panelId && FULLSCREEN_PANEL_IDS.has(panelId) && panels.getBoundingClientRect().width > 1));
    };

    const getMaxSidebarWidth = () => {
        if (window.innerWidth >= COMPACT_VIEWPORT_BREAKPOINT) {
            return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - MIN_MAIN_SCENE_WIDTH_WIDE));
        }
        return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.floor(window.innerWidth * MAX_SIDEBAR_RATIO_COMPACT)));
    };

    const normalizeSidebarWidth = (rawWidth: string | null | undefined) => {
        const parsed = Number.parseInt(rawWidth || '', 10);
        const maxSidebarWidth = getMaxSidebarWidth();
        const nextWidth = Number.isFinite(parsed) ? parsed : DEFAULT_SIDEBAR_WIDTH;
        return Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxSidebarWidth, nextWidth));
    };

    (window as any).openPanel = function(panelId: string) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const isAlreadyActive = panel.classList.contains('active');

        document.querySelectorAll('.sidebar-panel').forEach((p) => p.classList.remove('active'));
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));

        if (isAlreadyActive && panels.getBoundingClientRect().width > 1) {
            applySidebarWidth(SIDEBAR_TABS_WIDTH, false, true);
            syncSidebarCollapsedState();
            syncSidebarMode(null);
            refreshViewportLayout();
            return;
        }

        if (FULLSCREEN_PANEL_IDS.has(panelId)) {
            applySidebarWidth(normalizeSidebarWidth(localStorage.getItem('sidebar-width')), false);
            panels.style.width = '100%';
        } else {
            applySidebarWidth(normalizeSidebarWidth(localStorage.getItem('sidebar-width')));
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

        if (panelId === 'editor-panel' && callbacks.onEditorResize) {
            setTimeout(callbacks.onEditorResize, 350);
        }
        refreshViewportLayout();
    };

    (window as any).closePanel = function() {
        applySidebarWidth(SIDEBAR_TABS_WIDTH, false, true);
        syncSidebarCollapsedState();
        syncSidebarMode(null);
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));
        refreshViewportLayout();
    };

    resizer.addEventListener('mousedown', (event) => {
        event.preventDefault();
        isResizing = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const sidebarLeft = workspaceSidebar.getBoundingClientRect().left;
        const newWidth = e.clientX - sidebarLeft;
        const maxSidebarWidth = getMaxSidebarWidth();
        if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= maxSidebarWidth) {
            applySidebarWidth(newWidth);
            syncSidebarMode(document.querySelector('.sidebar-panel.active')?.id ?? null);
            if (callbacks.onEditorResize) callbacks.onEditorResize();
            refreshViewportLayout();
        }
    });

    window.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });

    (window as any).switchTab = (window as any).openPanel;
    applySidebarWidth(normalizeSidebarWidth(localStorage.getItem('sidebar-width')), false);
    syncSidebarCollapsedState();
    syncSidebarMode(document.querySelector('.sidebar-panel.active')?.id ?? null);
}
