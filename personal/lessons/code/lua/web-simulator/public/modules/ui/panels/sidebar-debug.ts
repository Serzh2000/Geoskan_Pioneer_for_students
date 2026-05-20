import { log } from '../../shared/logging/logger.js';

type ElementSnapshot = ReturnType<typeof captureElementSnapshot>;

function describeElementBriefly(element: Element | null) {
    if (!(element instanceof HTMLElement)) {
        return element?.tagName?.toLowerCase() ?? null;
    }

    const classSuffix = element.className
        ? `.${String(element.className).trim().replace(/\s+/g, '.')}`
        : '';
    return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classSuffix}`;
}

function captureCenterHitStack(element: HTMLElement | null) {
    if (!element) return [];

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return [];

    const centerX = Math.max(0, Math.min(window.innerWidth - 1, Math.round(rect.left + rect.width / 2)));
    const centerY = Math.max(0, Math.min(window.innerHeight - 1, Math.round(rect.top + rect.height / 2)));
    return document.elementsFromPoint(centerX, centerY)
        .slice(0, 6)
        .map((hit) => describeElementBriefly(hit));
}

function captureAncestorChain(element: HTMLElement | null) {
    const ancestors: string[] = [];
    let current = element?.parentElement ?? null;

    while (current && ancestors.length < 5) {
        ancestors.push(describeElementBriefly(current) ?? '(unknown)');
        current = current.parentElement;
    }

    return ancestors;
}

function captureChildPreview(element: HTMLElement | null) {
    if (!element) return [];

    return Array.from(element.children)
        .slice(0, 6)
        .map((child) => describeElementBriefly(child));
}

function captureContainmentSnapshot(element: HTMLElement | null, panels: HTMLElement) {
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
}

function captureElementSnapshot(element: HTMLElement | null, panels?: HTMLElement) {
    if (!element) {
        return { present: false as const };
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
        present: true as const,
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
        containment: panels ? captureContainmentSnapshot(element, panels) : null
    };
}

function pushHiddenWarnings(name: string, node: ElementSnapshot, warnings: string[]) {
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
}

export function createSidebarDiagnosticsLogger(
    panels: HTMLElement,
    shouldLogPanelDebug: boolean,
    debugPanelIds: ReadonlySet<string>
) {
    return (phase: string, panelId: string, panel: HTMLElement | null) => {
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
            panels: captureElementSnapshot(panels, panels),
            panel: captureElementSnapshot(panel, panels),
            panelContent: captureElementSnapshot(panelContent, panels),
            settingsStack: captureElementSnapshot(settingsStack, panels)
        };
        const warnings: string[] = [];

        pushHiddenWarnings('panels', snapshot.panels, warnings);
        pushHiddenWarnings('panel', snapshot.panel, warnings);
        pushHiddenWarnings('panelContent', snapshot.panelContent, warnings);
        pushHiddenWarnings('settingsStack', snapshot.settingsStack, warnings);

        const centerTop = snapshot.panel.present ? snapshot.panel.centerHitStack[0] ?? null : null;
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
}
