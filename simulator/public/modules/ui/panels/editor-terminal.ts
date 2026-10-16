import { getLogEntries, onLogsChanged, setLogClock, type LogRecord } from '../../shared/logging/logger.js';
import { drones, currentDroneId } from '../../core/state.js';
import { setEditorDrawerState } from './editor-drawers.js';
import { initTerminalWorkbench } from './terminal-workbench.js';
import { matchesTerminalShortcut } from './terminal-session.js';
import { cleanJournalMessage, describeLogEntry, formatJournalTime, isDefaultJournalLine, type JournalLine } from './journal-lines.js';

/*
 * Resizable editor panel. terminal-workbench.ts owns interactive console sessions
 * and the Problems view; this module owns geometry and the read-only Output journal.
 * Output mirrors shared log entries but shows what a student needs by default:
 * program output (print), autopilot and flight events (PREFLIGHT, TAKEOFF, LAND, points)
 * and errors from any source. Browser-side diagnostics ([3D-INIT], Opening panel ...,
 * editor, camera, guide) sit behind the "Системные" switch, off by default.
 * Live regions: only the program/flight/error stream is announced (aria-live="polite").
 * With the system switch on, the stream itself goes silent and a visually hidden
 * announcer repeats just the program, flight and error lines, so diagnostics never talk.
 */
export const JOURNAL_SYSTEM_STORAGE_KEY = 'journal-show-system';
const JOURNAL_TITLE = 'Вывод программы и события полёта';
const JOURNAL_EMPTY_TEXT = 'Здесь появятся вывод программы и события полёта. Нажмите ▶ в правом нижнем углу или Ctrl+Enter';
const MAX_ANNOUNCER_LINES = 20;

function readShowSystem(): boolean {
    try {
        return localStorage.getItem(JOURNAL_SYSTEM_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeShowSystem(value: boolean): void {
    try {
        localStorage.setItem(JOURNAL_SYSTEM_STORAGE_KEY, value ? '1' : '0');
    } catch {
        // Storage can be blocked (private window): the switch still works for this session.
    }
}

function createJournalLine(record: LogRecord, line: JournalLine): HTMLElement {
    const row = document.createElement('div');
    row.className = `editor-terminal__line editor-terminal__line--${line.kind}`;
    if (record.tone === 'error' || line.kind === 'error') row.classList.add('editor-terminal__line--error');
    else if (record.tone === 'warn' || line.kind === 'warning') row.classList.add('editor-terminal__line--warn');

    const time = document.createElement('span');
    time.className = 'editor-terminal__time';
    time.textContent = formatJournalTime(record.flightTime);

    const label = document.createElement('span');
    label.className = 'editor-terminal__tag';
    label.textContent = line.label || record.tag.replace(/^\[|\]$/gu, '');

    const text = document.createElement('span');
    text.className = 'editor-terminal__text';
    text.textContent = cleanJournalMessage(record.message) || 'Без описания события';

    row.append(time, label, text);
    return row;
}

function createSystemToggle(initial: boolean): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement('label');
    label.className = 'pk-toggle editor-terminal__system-toggle';
    label.title = 'Служебные записи браузера: загрузка сцены, открытие панелей, диагностика';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'editor-terminal-system-toggle';
    input.checked = initial;

    const switchEl = document.createElement('span');
    switchEl.className = 'pk-switch';
    switchEl.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'pk-toggle__text';
    const title = document.createElement('span');
    title.className = 'pk-toggle__title';
    title.textContent = 'Системные';
    text.append(title);

    label.append(input, switchEl, text);
    return { label, input };
}

export function initEditorTerminal(onEditorResize?: () => void): void {
    const toggleBtn = document.getElementById('editor-terminal-toggle-btn');
    const closeBtn = document.getElementById('editor-terminal-close-btn');
    const panel = document.getElementById('editor-terminal');
    const stream = document.getElementById('editor-terminal-stream');
    if (!toggleBtn || !closeBtn || !panel || !stream) return;
    // Entries are stamped with the telemetry's flight time, so "00:03.2" in the journal matches "Время полёта".
    setLogClock(() => drones[currentDroneId]?.current_time ?? 0);
    const content = panel.parentElement;
    const separator = document.getElementById('editor-terminal-resizer');
    let preferredHeight = 260;
    /** Below this the terminal folds down to its header, like a docked panel pushed all the way down. */
    const COLLAPSE_BELOW = 96;
    let lastOpenHeight = 260;
    const headerHeight = () => (panel.querySelector<HTMLElement>('.editor-terminal__header')?.offsetHeight ?? 38) + 1;
    const clearedOutput = new WeakSet<LogRecord>();
    let resizePointer: number | null = null;
    let resizeStartY = 0;
    let resizeStartHeight = 0;
    const resizeBounds = () => {
        const style = content ? getComputedStyle(content) : null;
        const available = content ? content.clientHeight - Number.parseFloat(style!.paddingTop || '0') - Number.parseFloat(style!.paddingBottom || '0') : 500;
        const max = Math.max(80, Math.floor(available * (panel.classList.contains('is-maximized') ? 1 : 0.65)));
        return { min: Math.min(140, max), max };
    };
    const resize = (height: number) => {
        const consoleScroll = panel.querySelector<HTMLElement>('.terminal-console-main');
        const follow = consoleScroll && consoleScroll.scrollHeight - consoleScroll.scrollTop - consoleScroll.clientHeight < 28;
        const { min, max } = resizeBounds();
        const maximized = panel.classList.contains('is-maximized');
        const collapsed = !maximized && height < COLLAPSE_BELOW;
        const actual = maximized ? max : collapsed ? headerHeight() : Math.max(min, Math.min(max, height));
        if (!maximized) {
            preferredHeight = actual;
            if (!collapsed) lastOpenHeight = actual;
        }
        panel.classList.toggle('is-collapsed', collapsed);
        panel.style.height = `${actual}px`;
        if (consoleScroll && follow) consoleScroll.scrollTop = consoleScroll.scrollHeight;
        separator?.setAttribute('aria-valuemin', String(min));
        separator?.setAttribute('aria-valuemax', String(max));
        separator?.setAttribute('aria-valuenow', String(Math.round(actual)));
        separator?.setAttribute('aria-valuetext', `${Math.round(actual)} пикселей`);
        onEditorResize?.();
    };
    const endResize = () => {
        const pointer = resizePointer;
        resizePointer = null;
        separator?.classList.remove('is-dragging');
        if (pointer !== null && separator?.hasPointerCapture(pointer)) separator.releasePointerCapture(pointer);
    };
    separator?.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.isPrimary || resizePointer !== null) return;
        event.preventDefault();
        resizePointer = event.pointerId;
        resizeStartY = event.clientY;
        resizeStartHeight = panel.getBoundingClientRect().height;
        workbench.restore();
        separator.setPointerCapture(event.pointerId);
        separator.classList.add('is-dragging');
    });
    separator?.addEventListener('pointermove', event => {
        if (event.pointerId !== resizePointer) return;
        if (!(event.buttons & 1)) { endResize(); return; }
        resize(resizeStartHeight + resizeStartY - event.clientY);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) separator?.addEventListener(name, endResize);
    window.addEventListener('blur', endResize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) endResize(); });
    separator?.addEventListener('keydown', event => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        workbench.restore();
        const bounds = resizeBounds();
        const base = panel.classList.contains('is-collapsed') ? 0 : preferredHeight;
        resize(event.key === 'Home' ? bounds.min : event.key === 'End' ? bounds.max : base + (event.key === 'ArrowUp' ? 20 : -20));
    });
    if (content) new ResizeObserver(() => { if (!panel.hidden) resize(preferredHeight); }).observe(content);

    // The problems list is not worth scrolling when there is room: the panel grows to show all of it (never beyond what
    // fits, and it never shrinks what the student set).
    const problemsPane = document.getElementById('terminal-problems');
    const fitProblems = () => {
        if (!problemsPane || panel.hidden || panel.classList.contains('is-maximized') || problemsPane.offsetParent === null) return;
        const missing = problemsPane.scrollHeight - problemsPane.clientHeight;
        if (missing > 1) resize(panel.getBoundingClientRect().height + missing);
    };
    const fitProblemsSoon = () => window.requestAnimationFrame(fitProblems);
    if (problemsPane) new MutationObserver(fitProblemsSoon).observe(problemsPane, { childList: true });
    panel.addEventListener('click', (event) => {
        if ((event.target as HTMLElement | null)?.closest('[role="tab"]')) fitProblemsSoon();
    });
    toggleBtn.addEventListener('click', fitProblemsSoon);

    let unsubscribe: (() => void) | null = null;
    let showSystem = readShowSystem();

    const systemToggle = createSystemToggle(showSystem);
    panel.querySelector('.terminal-panel-actions')?.prepend(systemToggle.label);

    const announcer = document.createElement('div');
    announcer.id = 'editor-terminal-announcer';
    announcer.className = 'editor-terminal__announcer';
    announcer.setAttribute('role', 'log');
    announcer.setAttribute('aria-label', 'Новые события бортжурнала');
    stream.after(announcer);

    stream.setAttribute('role', 'log');
    stream.setAttribute('aria-label', JOURNAL_TITLE);

    const rows = new WeakMap<LogRecord, { row: HTMLElement; line: JournalLine }>();
    const describe = (record: LogRecord) => {
        let cached = rows.get(record);
        if (!cached) {
            const line = describeLogEntry(record);
            cached = { row: createJournalLine(record, line), line };
            rows.set(record, cached);
        }
        return cached;
    };

    // The stream is the live region only while it carries nothing but program, flight and error lines.
    const syncLiveRegions = () => {
        stream.setAttribute('aria-live', showSystem ? 'off' : 'polite');
        announcer.setAttribute('aria-live', showSystem ? 'polite' : 'off');
    };

    let lastAnnounced: LogRecord | null = null;
    const announceNew = (entries: readonly LogRecord[]) => {
        const at = lastAnnounced ? entries.lastIndexOf(lastAnnounced) : -1;
        const fresh = at >= 0 ? entries.slice(at + 1) : (lastAnnounced ? [] : entries.slice());
        lastAnnounced = entries[entries.length - 1] ?? null;
        if (!showSystem) return;
        for (const record of fresh) {
            const { line } = describe(record);
            if (!isDefaultJournalLine(line)) continue;
            const item = document.createElement('div');
            item.textContent = `${line.label}: ${cleanJournalMessage(record.message)}`;
            announcer.append(item);
        }
        while (announcer.childElementCount > MAX_ANNOUNCER_LINES) announcer.firstElementChild?.remove();
    };

    const render = (rebuild = false) => {
        const follow = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 28;
        const previousScroll = stream.scrollTop;
        const entries = getLogEntries();
        const visible = entries.filter((record) => !clearedOutput.has(record) && (showSystem || isDefaultJournalLine(describe(record).line)));
        announceNew(entries);

        const emptyEl = stream.querySelector('.editor-terminal__empty');
        if (visible.length === 0) {
            if (emptyEl && !rebuild) return;
            const empty = document.createElement('div');
            empty.className = 'editor-terminal__empty';
            empty.textContent = JOURNAL_EMPTY_TEXT;
            stream.replaceChildren(empty);
            return;
        }

        if (emptyEl) emptyEl.remove();
        const wanted = visible.map((record) => describe(record).row);
        const current = Array.from(stream.children);
        let shared = 0;
        while (shared < current.length && shared < wanted.length && current[shared] === wanted[shared]) shared += 1;

        if (!rebuild && shared === current.length) {
            // Only new lines arrived: append them, so the live region announces just those.
            stream.append(...wanted.slice(shared));
        } else {
            // Switch flipped, entries trimmed or cleared: rebuild silently, never read the whole journal out again.
            stream.setAttribute('aria-live', 'off');
            stream.replaceChildren(...wanted);
            window.setTimeout(syncLiveRegions, 0);
        }
        stream.scrollTop = follow ? stream.scrollHeight : previousScroll;
    };

    syncLiveRegions();
    systemToggle.input.addEventListener('change', () => {
        showSystem = systemToggle.input.checked;
        writeShowSystem(showSystem);
        announcer.replaceChildren();
        render(true);
        syncLiveRegions();
    });

    const workbench = initTerminalWorkbench(panel, () => resize(preferredHeight), () => {
        getLogEntries().forEach(record => clearedOutput.add(record));
        render(true);
    });

    const close = () => {
        endResize();
        setEditorDrawerState(panel, toggleBtn, false, 'терминал');
        onEditorResize?.();
        unsubscribe?.();
        unsubscribe = null;
    };

    toggleBtn.addEventListener('click', () => {
        if (!panel.hidden) {
            close();
            return;
        }
        const entries = getLogEntries();
        lastAnnounced = entries[entries.length - 1] ?? null;
        announcer.replaceChildren();
        render(true);
        setEditorDrawerState(panel, toggleBtn, true, 'терминал');
        resize(panel.classList.contains('is-collapsed') ? lastOpenHeight : preferredHeight);
        stream.scrollTop = stream.scrollHeight;
        unsubscribe = onLogsChanged(() => render());
        workbench.focus();
    });

    closeBtn.addEventListener('click', close);

    setEditorDrawerState(panel, toggleBtn, false, 'терминал');

    document.addEventListener('keydown', (event) => {
        const editorOpen = document.getElementById('editor-panel')?.classList.contains('active');
        if (event.ctrlKey && !event.altKey && !event.isComposing && editorOpen && (event.code === 'Backquote' || matchesTerminalShortcut(event, 'J'))) {
            event.preventDefault();
            if (event.code === 'Backquote' && event.shiftKey) {
                if (panel.hidden) toggleBtn.click();
                panel.querySelector<HTMLButtonElement>('#terminal-new-btn')?.click();
            } else if (event.code === 'Backquote' && !panel.hidden && !panel.contains(document.activeElement)) workbench.activateConsole();
            else toggleBtn.click();
            return;
        }
        const sideDrawerOpen = document.querySelector('.editor-docs:not([hidden]), .editor-notifications:not([hidden])');
        if (event.key === 'Escape' && !event.defaultPrevented && !panel.hidden && !sideDrawerOpen
            && document.getElementById('editor-panel')?.classList.contains('active')) {
            if (event.target instanceof HTMLSelectElement) return;
            event.preventDefault();
            close();
        }
    });
}
