import { Blockly, extractMissionGuideSequence, initBlocklyDefinitions } from '../blockly.js';
import { buildGuideToolbox } from '../blockly-core/toolbox.js';
import { logGuideEvent } from '../support/logging.js';
import { buildGuideEventContext, type GuideInteractionContext } from './context.js';
import {
    renderUncheckedDiagnostics,
    renderUncheckedSummary,
    updateGeneratedCodePreview
} from './launch.js';
import {
    getLessonSequence,
    getLessonWorkspaceState,
    setLessonBanner,
    setLessonChecked,
    setLessonSequence,
    setLessonWorkspaceState
} from '../state.js';
import { buildTargetWorkspaceXml } from '../support/workspace-xml.js';

let workspace: Blockly.WorkspaceSvg | null = null;
let blocklyInitialized = false;
let pendingBlocklyInitTimeout: number | null = null;
let activeBlocklyInitToken = 0;
let workspaceResizeHandler: (() => void) | null = null;
let blocklyThemeListenerAttached = false;

type BlocklyAppTheme = 'light' | 'dark';

function getBlocklyAppTheme(): BlocklyAppTheme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

const lightBlocklyTheme = Blockly.Theme.defineTheme('pioneer-light-blockly', {
    name: 'pioneer-light-blockly',
    base: Blockly.Themes.Classic,
    componentStyles: {
        workspaceBackgroundColour: 'transparent',
        toolboxBackgroundColour: '#ffffff',
        toolboxForegroundColour: '#1a1a1a',
        flyoutBackgroundColour: '#f8f9fa',
        flyoutForegroundColour: '#1a1a1a',
        scrollbarColour: '#cbd5df',
        insertionMarkerColour: '#ff6b00',
        insertionMarkerOpacity: 0.28,
        markerColour: '#ff6b00',
        cursorColour: '#ff6b00'
    }
});

const darkBlocklyTheme = Blockly.Theme.defineTheme('pioneer-dark-blockly', {
    name: 'pioneer-dark-blockly',
    base: Blockly.Themes.Classic,
    componentStyles: {
        workspaceBackgroundColour: 'transparent',
        toolboxBackgroundColour: '#0f172a',
        toolboxForegroundColour: '#e2e8f0',
        flyoutBackgroundColour: '#111827',
        flyoutForegroundColour: '#e2e8f0',
        scrollbarColour: '#475569',
        insertionMarkerColour: '#ff6b00',
        insertionMarkerOpacity: 0.34,
        markerColour: '#ff9a4d',
        cursorColour: '#ff9a4d'
    }
});

function getGuideBlocklyTheme(): Blockly.Theme {
    return getBlocklyAppTheme() === 'dark' ? darkBlocklyTheme : lightBlocklyTheme;
}

function getGuideBlocklyGridColour(): string {
    return getBlocklyAppTheme() === 'dark' ? '#334155' : '#d7dde5';
}

function syncGuideWorkspaceTheme(activeWorkspace: Blockly.WorkspaceSvg | null = workspace): void {
    if (!activeWorkspace) {
        return;
    }

    activeWorkspace.setTheme(getGuideBlocklyTheme());
    const gridColour = getGuideBlocklyGridColour();
    document.querySelectorAll<SVGLineElement>('#blocklyDiv pattern[id^="blocklyGridPattern"] line').forEach((line) => line.setAttribute('stroke', gridColour));
    Blockly.svgResize(activeWorkspace);
}

function ensureGuideBlocklyThemeListener(): void {
    if (blocklyThemeListenerAttached || typeof window === 'undefined') {
        return;
    }

    window.addEventListener('app-theme-change', () => {
        syncGuideWorkspaceTheme();
    });
    blocklyThemeListenerAttached = true;
}

function hasSequenceChanged(previous: string[], next: string[]): boolean {
    if (previous.length !== next.length) {
        return true;
    }

    return previous.some((blockId, index) => blockId !== next[index]);
}

function shouldHandleWorkspaceMutation(event: Blockly.Events.Abstract | undefined): boolean {
    if (!event) {
        return true;
    }

    if (event.isUiEvent) {
        return false;
    }

    return event.type !== Blockly.Events.FINISHED_LOADING;
}

function disposeWorkspace(): void {
    if (workspaceResizeHandler) {
        window.removeEventListener('resize', workspaceResizeHandler);
        workspaceResizeHandler = null;
    }

    if (!workspace) {
        return;
    }

    try {
        workspace.dispose();
    } catch (error) {
        console.warn('Failed to dispose workspace', error);
    }

    workspace = null;
}

function restoreWorkspaceState(context: GuideInteractionContext, activeWorkspace: Blockly.WorkspaceSvg): void {
    const savedWorkspaceXml = getLessonWorkspaceState(context.language, context.lesson.id);
    const savedSequence = getLessonSequence(context.language, context.lesson.id);

    if (savedWorkspaceXml) {
        try {
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(savedWorkspaceXml), activeWorkspace);
        } catch (error) {}
    } else if (savedSequence.length > 0) {
        const xml = buildTargetWorkspaceXml(context.lesson.id, savedSequence);
        try {
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), activeWorkspace);
        } catch (error) {}
    }

    logGuideEvent('workspace_ready', {
        ...buildGuideEventContext(context),
        restoredFromXml: Boolean(savedWorkspaceXml),
        restoredFromSequence: !savedWorkspaceXml && savedSequence.length > 0,
        sequenceLength: savedSequence.length
    });
}

function attachWorkspaceChangeListener(context: GuideInteractionContext, activeWorkspace: Blockly.WorkspaceSvg): void {
    activeWorkspace.addChangeListener((event: Blockly.Events.Abstract) => {
        if (!shouldHandleWorkspaceMutation(event)) {
            return;
        }

        updateGeneratedCodePreview(context.language, activeWorkspace);

        const sequenceIds = extractMissionGuideSequence(activeWorkspace);
        const workspaceXml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(activeWorkspace));
        const previousSequence = getLessonSequence(context.language, context.lesson.id);
        const previousWorkspaceXml = getLessonWorkspaceState(context.language, context.lesson.id);
        const contentChanged =
            hasSequenceChanged(previousSequence, sequenceIds) ||
            previousWorkspaceXml !== workspaceXml;

        setLessonSequence(context.language, context.lesson.id, sequenceIds);
        setLessonWorkspaceState(context.language, context.lesson.id, workspaceXml);

        if (!contentChanged) {
            return;
        }

        logGuideEvent('workspace_changed', {
            ...buildGuideEventContext(context),
            eventType: event.type,
            sequenceLength: sequenceIds.length,
            sequence: sequenceIds,
            xmlLength: workspaceXml.length
        });

        setLessonChecked(context.language, context.lesson.id, false);
        setLessonBanner(context.language, context.lesson.id, null);

        const checkSummary = document.getElementById('guide-check-summary');
        if (checkSummary) {
            checkSummary.innerHTML = renderUncheckedSummary();
        }

        const diagnosticsContainer = document.getElementById('diagnostics-container');
        if (diagnosticsContainer) {
            diagnosticsContainer.innerHTML = renderUncheckedDiagnostics();
        }

        context.container
            .querySelectorAll<HTMLButtonElement>('[data-guide-toggle-solution]')
            .forEach((button) => {
                button.disabled = true;
            });
    });
}

function initializeWorkspace(context: GuideInteractionContext, blocklyDiv: HTMLElement): void {
    const toolboxXml = buildGuideToolbox(context.language, context.lesson.id);
    const initToken = ++activeBlocklyInitToken;

    pendingBlocklyInitTimeout = window.setTimeout(() => {
        pendingBlocklyInitTimeout = null;
        if (initToken !== activeBlocklyInitToken) {
            return;
        }

        const currentBlocklyDiv = document.getElementById('blocklyDiv');
        if (!(currentBlocklyDiv instanceof HTMLElement) || !currentBlocklyDiv.isConnected) {
            return;
        }

        disposeWorkspace();

        const activeWorkspace = Blockly.inject(blocklyDiv, {
            toolbox: toolboxXml,
            scrollbars: true,
            trashcan: true,
            theme: getGuideBlocklyTheme(),
            toolboxPosition: 'start',
            grid: {
                spacing: 24,
                length: 1,
                colour: getGuideBlocklyGridColour(),
                snap: false
            }
        });

        workspace = activeWorkspace;
        ensureGuideBlocklyThemeListener();
        workspaceResizeHandler = () => Blockly.svgResize(activeWorkspace);
        window.addEventListener('resize', workspaceResizeHandler, false);
        Blockly.svgResize(activeWorkspace);

        restoreWorkspaceState(context, activeWorkspace);
        updateGeneratedCodePreview(context.language, activeWorkspace);
        attachWorkspaceChangeListener(context, activeWorkspace);
    }, 10);
}

export function attachGuideWorkspace(context: GuideInteractionContext): void {
    if (!blocklyInitialized) {
        initBlocklyDefinitions();
        blocklyInitialized = true;
    }

    if (pendingBlocklyInitTimeout !== null) {
        window.clearTimeout(pendingBlocklyInitTimeout);
        pendingBlocklyInitTimeout = null;
    }

    const blocklyDiv = document.getElementById('blocklyDiv');
    if (!(blocklyDiv instanceof HTMLElement)) {
        activeBlocklyInitToken += 1;
        disposeWorkspace();
        return;
    }

    initializeWorkspace(context, blocklyDiv);
}

export function getGuideWorkspace(): Blockly.WorkspaceSvg | null {
    return workspace;
}

export function clearGuideWorkspace(): void {
    if (workspace) {
        workspace.clear();
    }
}

export function fillGuideWorkspace(xml: string): void {
    if (!workspace) {
        return;
    }

    workspace.clear();
    try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
    } catch (error) {
        console.error('Failed to load target workspace', error);
    }
}

export { buildTargetWorkspaceXml } from '../support/workspace-xml.js';
