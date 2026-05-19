import { log } from '../../shared/logging/logger.js';
import type { UICallbacks } from '../index.js';

export function initSidebar(callbacks: UICallbacks) {
    const panels = document.querySelector('.sidebar-panels') as HTMLElement | null;
    const resizer = document.getElementById('sidebar-resizer') as HTMLElement | null;
    if (!panels || !resizer) return;

    const DEFAULT_SIDEBAR_WIDTH = 320;
    const MIN_SIDEBAR_WIDTH = 320;
    const MAX_SIDEBAR_WIDTH = 1000;
    const fullscreenPanels = new Set(['gamepad-panel']);
    const shouldLogPanelDebug = localStorage.getItem('sidebar-debug') === '1';
    let isResizing = false;
    let viewportRefreshFrame = 0;

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
        panels.classList.toggle('is-collapsed', panels.style.width === '0px');
    };

    const syncSidebarMode = (panelId: string | null) => {
        panels.classList.toggle('is-fullscreen', !!panelId && fullscreenPanels.has(panelId) && panels.style.width !== '0px');
    };
    const loggablePanelNames: Record<string, string> = {
        'settings-panel': 'Настройки'
    };
    const debugPanelIds = new Set(['settings-panel']);

    const describeElementBriefly = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) {
            return element?.tagName?.toLowerCase() ?? null;
        }

        const classSuffix = element.className
            ? `.${String(element.className).trim().replace(/\s+/g, '.')}`
            : '';
        return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classSuffix}`;
    };

    const captureCenterHitStack = (element: HTMLElement | null) => {
        if (!element) return [];

        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return [];

        const centerX = Math.max(0, Math.min(window.innerWidth - 1, Math.round(rect.left + rect.width / 2)));
        const centerY = Math.max(0, Math.min(window.innerHeight - 1, Math.round(rect.top + rect.height / 2)));
        return document.elementsFromPoint(centerX, centerY)
            .slice(0, 6)
            .map((hit) => describeElementBriefly(hit));
    };

    const captureAncestorChain = (element: HTMLElement | null) => {
        const ancestors: string[] = [];
        let current = element?.parentElement ?? null;

        while (current && ancestors.length < 5) {
            ancestors.push(describeElementBriefly(current) ?? '(unknown)');
            current = current.parentElement;
        }

        return ancestors;
    };

    const captureChildPreview = (element: HTMLElement | null) => {
        if (!element) return [];

        return Array.from(element.children)
            .slice(0, 6)
            .map((child) => describeElementBriefly(child));
    };

    const captureContainmentSnapshot = (element: HTMLElement | null) => {
        const closestPanels = element?.closest('.sidebar-panels') as HTMLElement | null;
        const parentElement = element?.parentElement ?? null;

        return {
            isConnected: element?.isConnected ?? false,
            inDocumentBody: !!element && document.body.contains(element),
            parentElement: describeElementBriefly(parentElement),
            offsetParent: describeElementBriefly(element?.offsetParent as HTMLElement | null),
            closestSidebarPanels: describeElementBriefly(closestPanels),
            insideTrackedPanels: !!element && panels.contains(element),
            clientRectsCount: element?.getClientRects().length ?? 0,
            parentRect: parentElement
                ? {
                    width: Math.round(parentElement.getBoundingClientRect().width),
                    height: Math.round(parentElement.getBoundingClientRect().height)
                }
                : null,
            closestPanelsRect: closestPanels
                ? {
                    width: Math.round(closestPanels.getBoundingClientRect().width),
                    height: Math.round(closestPanels.getBoundingClientRect().height)
                }
                : null
        };
    };

    const captureElementSnapshot = (element: HTMLElement | null) => {
        if (!element) {
            return { present: false };
        }

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
            present: true,
            id: element.id || null,
            className: element.className || null,
            dataset: Object.keys(element.dataset).length > 0 ? { ...element.dataset } : null,
            childElementCount: element.childElementCount,
            textLength: element.textContent?.trim().length ?? 0,
            innerHTMLLength: element.innerHTML.length,
            childPreview: captureChildPreview(element),
            ancestorChain: captureAncestorChain(element),
            rect: {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                top: Math.round(rect.top),
                left: Math.round(rect.left)
            },
            box: {
                clientWidth: element.clientWidth,
                clientHeight: element.clientHeight,
                scrollWidth: element.scrollWidth,
                scrollHeight: element.scrollHeight,
                offsetWidth: element.offsetWidth,
                offsetHeight: element.offsetHeight,
                scrollTop: Math.round(element.scrollTop),
                scrollLeft: Math.round(element.scrollLeft)
            },
            style: {
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                overflowX: style.overflowX,
                overflowY: style.overflowY,
                position: style.position,
                zIndex: style.zIndex,
                pointerEvents: style.pointerEvents,
                backgroundColor: style.backgroundColor,
                color: style.color
            },
            centerHitStack: captureCenterHitStack(element),
            containment: captureContainmentSnapshot(element)
        };
    };

    const logPanelOpenDiagnostics = (phase: string, panelId: string, panel: HTMLElement | null) => {
        if (!shouldLogPanelDebug || !debugPanelIds.has(panelId)) return;

        const panelContent = panel?.querySelector('.panel-content') as HTMLElement | null;
        const settingsStack = panel?.querySelector('.settings-stack') as HTMLElement | null;
        const activePanels = Array.from(document.querySelectorAll('.sidebar-panel.active'))
            .map((activePanel) => (activePanel as HTMLElement).id);
        const activeTabs = Array.from(document.querySelectorAll('.sidebar-tab-btn.active'))
            .map((activeTab) => (activeTab as HTMLElement).id || activeTab.textContent?.trim() || '(без текста)');
        const snapshot = {
            phase,
            panelId,
            timestamp: new Date().toISOString(),
            location: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            documentState: {
                readyState: document.readyState,
                bodyClassName: document.body.className || null
            },
            panelsWidth: panels.style.width || '(inline width not set)',
            activePanels,
            activeTabs,
            panels: captureElementSnapshot(panels),
            panel: captureElementSnapshot(panel),
            panelContent: captureElementSnapshot(panelContent),
            settingsStack: captureElementSnapshot(settingsStack)
        };
        const warnings: string[] = [];

        const pushHiddenWarnings = (name: string, node: ReturnType<typeof captureElementSnapshot>) => {
            if (!node.present) {
                warnings.push(`${name}:missing`);
                return;
            }
            if (node.rect.width === 0 || node.rect.height === 0) {
                warnings.push(`${name}:zero-rect`);
            }
            if (node.box.clientHeight === 0 || node.box.clientWidth === 0) {
                warnings.push(`${name}:zero-client`);
            }
            if (node.style.display === 'none') {
                warnings.push(`${name}:display-none`);
            }
            if (node.style.visibility === 'hidden') {
                warnings.push(`${name}:visibility-hidden`);
            }
            if (node.style.opacity === '0') {
                warnings.push(`${name}:opacity-0`);
            }
        };

        pushHiddenWarnings('panels', snapshot.panels);
        pushHiddenWarnings('panel', snapshot.panel);
        pushHiddenWarnings('panelContent', snapshot.panelContent);
        pushHiddenWarnings('settingsStack', snapshot.settingsStack);

        const centerTop = snapshot.panel.centerHitStack[0] ?? null;
        if (centerTop && centerTop !== describeElementBriefly(panel) && !centerTop.startsWith('div.panel-content')) {
            warnings.push(`panel:center-covered-by:${centerTop}`);
        }
        if (snapshot.panelContent.present && snapshot.settingsStack.present) {
            if (snapshot.settingsStack.box.scrollHeight > snapshot.panelContent.box.scrollHeight + 4) {
                warnings.push('stack:taller-than-content-scroll');
            }
            if (snapshot.settingsStack.box.clientHeight === 0 && snapshot.settingsStack.textLength > 0) {
                warnings.push('stack:has-text-but-zero-client-height');
            }
        }

        const flatSummary = {
            phase,
            panelId,
            warnings,
            activePanels,
            activeTabs,
            panelsWidth: snapshot.panelsWidth,
            panelsRect: snapshot.panels.present ? snapshot.panels.rect : null,
            panelRect: snapshot.panel.present ? snapshot.panel.rect : null,
            panelBox: snapshot.panel.present ? snapshot.panel.box : null,
            panelStyle: snapshot.panel.present ? snapshot.panel.style : null,
            panelContainment: snapshot.panel.present ? snapshot.panel.containment : null,
            panelCenterHitStack: snapshot.panel.present ? snapshot.panel.centerHitStack : [],
            panelContentRect: snapshot.panelContent.present ? snapshot.panelContent.rect : null,
            panelContentBox: snapshot.panelContent.present ? snapshot.panelContent.box : null,
            panelContentStyle: snapshot.panelContent.present ? snapshot.panelContent.style : null,
            panelContentContainment: snapshot.panelContent.present ? snapshot.panelContent.containment : null,
            settingsStackRect: snapshot.settingsStack.present ? snapshot.settingsStack.rect : null,
            settingsStackBox: snapshot.settingsStack.present ? snapshot.settingsStack.box : null,
            settingsStackStyle: snapshot.settingsStack.present ? snapshot.settingsStack.style : null,
            settingsStackContainment: snapshot.settingsStack.present ? snapshot.settingsStack.containment : null,
            settingsStackChildren: snapshot.settingsStack.present ? snapshot.settingsStack.childPreview : []
        };

        console.info(`[Sidebar][Debug] ${panelId} ${phase}`, snapshot);
        console.info(`[Sidebar][DebugFlat] ${panelId} ${phase} ${JSON.stringify(flatSummary)}`);
        log(
            `[Sidebar][Debug] ${panelId} ${phase}: warnings=${warnings.join('|') || 'none'}, panel=${snapshot.panel.present ? `${snapshot.panel.rect.width}x${snapshot.panel.rect.height}` : 'missing'}, content=${snapshot.panelContent.present ? `${snapshot.panelContent.rect.width}x${snapshot.panelContent.rect.height}` : 'missing'}, stack=${snapshot.settingsStack.present ? `${snapshot.settingsStack.rect.width}x${snapshot.settingsStack.rect.height}` : 'missing'}`,
            'info'
        );
    };

    (window as any).openPanel = function(panelId: string) {
        const panel = document.getElementById(panelId);
        if (!panel) {
            console.warn('[Sidebar][Debug] openPanel target not found', { panelId });
            log(`[Sidebar][Debug] ${panelId}: DOM панели не найден`, 'warn');
            return;
        }

        const isAlreadyActive = panel.classList.contains('active');
        const panelName = loggablePanelNames[panelId];
        logPanelOpenDiagnostics('before-reset', panelId, panel);

        document.querySelectorAll('.sidebar-panel').forEach((p) => p.classList.remove('active'));
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));

        if (isAlreadyActive && panels.style.width !== '0px') {
            if (panelName) {
                console.info(`[Sidebar] Закрыта вкладка: ${panelName}`);
                log(`Закрыта вкладка: ${panelName}`, 'info');
            }
            panels.style.width = '0px';
            syncSidebarCollapsedState();
            syncSidebarMode(null);
            logPanelOpenDiagnostics('after-close', panelId, panel);
            refreshViewportLayout();
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
            console.info(`[Sidebar] Открыта вкладка: ${panelName}`);
            log(`Открыта вкладка: ${panelName}`, 'info');
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
        panels.style.width = '0px';
        syncSidebarCollapsedState();
        syncSidebarMode(null);
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));
        refreshViewportLayout();
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
