import { renderJournal } from './journal.js';
type LogLevel = 'info' | 'error' | 'warn' | 'success';
type LogTone = 'info' | 'action' | 'warn' | 'error' | 'success';
export type LogCategoryKey = 'all' | 'system' | 'guide' | 'camera' | 'editor' | 'scene' | 'script';

type ParsedLogMessage = {
    tag: string;
    message: string;
};

export type LogRecord = {
    time: string;
    tag: string;
    message: string;
    tone: LogTone;
    category: Exclude<LogCategoryKey, 'all'>;
    /** Simulation flight time in seconds when the entry was written (see setLogClock). */
    flightTime?: number;
};

type LogCategoryDefinition = {
    key: Exclude<LogCategoryKey, 'all'>;
    label: string;
};

const LOG_CATEGORY_DEFINITIONS: LogCategoryDefinition[] = [
    { key: 'system', label: '[SYSTEM]' },
    { key: 'guide', label: '[GUIDE]' },
    { key: 'camera', label: 'Режим камеры' },
    { key: 'editor', label: '[EDITOR]' },
    { key: 'scene', label: '[SCENE]' },
    { key: 'script', label: '[SCRIPT]' }
];

const ALL_LOGS_LABEL = 'Все';
const MAX_LOG_ENTRIES = 400;

const logEntries: LogRecord[] = [];
let activeCategory: LogCategoryKey = 'all';
let renderScheduled = false;
const logListeners = new Set<() => void>();

let logClock: (() => number) | null = null;

/** Registers the source of the flight time stamped on each entry (the journal prints it as 00:03.2). */
export function setLogClock(source: (() => number) | null): void {
    logClock = source;
}

function readLogClock(): number | undefined {
    if (!logClock) return undefined;
    try {
        const value = logClock();
        return Number.isFinite(value) && value >= 0 ? value : undefined;
    } catch {
        return undefined;
    }
}

export function getLogEntries(): readonly LogRecord[] {
    return logEntries;
}

export function onLogsChanged(callback: () => void): () => void {
    logListeners.add(callback);
    return () => logListeners.delete(callback);
}

export function extractTagAndMessage(rawMessage: string): ParsedLogMessage {
    const trimmedMessage = rawMessage.trim();
    const bracketTagMatch = trimmedMessage.match(/^(\[[^\]]+\])\s*(.*)$/u);
    if (bracketTagMatch) {
        return {
            tag: bracketTagMatch[1],
            message: bracketTagMatch[2] || ''
        };
    }

    const plainTagMatch = trimmedMessage.match(/^([A-Za-zА-Яа-я0-9 _-]+:)\s*(.*)$/u);
    if (plainTagMatch) {
        return {
            tag: plainTagMatch[1].replace(/:$/u, ''),
            message: plainTagMatch[2] || ''
        };
    }

    return {
        tag: '[SYSTEM]',
        message: trimmedMessage
    };
}

function classifyLogTone(level: LogLevel, tag: string): LogTone {
    if (level === 'error') return 'error';
    if (level === 'warn') return 'warn';
    if (level === 'success') return 'success';

    const normalizedTag = tag.toUpperCase();
    if (/(CLICK|DRAG|SELECT|OPEN|CLOSE|HOVER|INPUT|KEY|POINTER|TOGGLE)/u.test(normalizedTag)) {
        return 'action';
    }

    return 'info';
}

export function createLogEntryElement(record: LogRecord): HTMLElement {
    const entry = document.createElement('article');
    entry.className = `log-entry log-entry--${record.tone}`;
    entry.dataset.category = record.category;

    const meta = document.createElement('div');
    meta.className = 'log-entry__meta';

    const timeElement = document.createElement('span');
    timeElement.className = 'log-entry__time';
    timeElement.textContent = `[${record.time}]`;

    const tagElement = document.createElement('span');
    tagElement.className = 'log-entry__tag';
    tagElement.textContent = record.tag;

    const messageElement = document.createElement('div');
    messageElement.className = 'log-entry__message';
    messageElement.textContent = record.message || 'Без описания события';

    meta.append(timeElement, tagElement);
    entry.append(meta, messageElement);
    return entry;
}

function countEntriesByCategory(): Map<Exclude<LogCategoryKey, 'all'>, number> {
    const counts = new Map<Exclude<LogCategoryKey, 'all'>, number>();

    LOG_CATEGORY_DEFINITIONS.forEach(({ key }) => counts.set(key, 0));
    logEntries.forEach(({ category }) => counts.set(category, (counts.get(category) ?? 0) + 1));

    return counts;
}

function renderTabs(tabs: HTMLElement, counts: Map<Exclude<LogCategoryKey, 'all'>, number>) {
    const fragment = document.createDocumentFragment();
    const createTabButton = (key: LogCategoryKey, label: string, count: number) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'logs-tab-btn';
        button.dataset.category = key;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(activeCategory === key));
        button.classList.toggle('is-active', activeCategory === key);
        button.textContent = `${label} ${count}`;
        button.addEventListener('click', () => {
            if (activeCategory === key) return;
            activeCategory = key;
            renderLogsUI();
        });
        fragment.appendChild(button);
    };

    createTabButton('all', ALL_LOGS_LABEL, logEntries.length);
    LOG_CATEGORY_DEFINITIONS.forEach(({ key, label }) => createTabButton(key, label, counts.get(key) ?? 0));
    tabs.replaceChildren(fragment);
}

function renderLogsUI() {
    renderScheduled = false;

    const logs = document.getElementById('logs');
    if (!logs) return;

    const tabs = document.getElementById('logs-tabs');
    const counts = countEntriesByCategory();

    if (tabs) {
        renderTabs(tabs, counts);
    }

    renderJournal(logs, logEntries);
    logListeners.forEach((callback) => callback());
}

function scheduleLogsRender() {
    if (renderScheduled) return;
    renderScheduled = true;

    if (typeof document === 'undefined' || typeof document.getElementById !== 'function' || typeof document.createDocumentFragment !== 'function') {
        renderScheduled = false;
        return;
    }

    const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => cb(performance.now());

    schedule(() => renderLogsUI());
}

export function resolveLogCategory(rawMessage: string, parsedMessage: ParsedLogMessage): Exclude<LogCategoryKey, 'all'> {
    const haystack = `${parsedMessage.tag} ${parsedMessage.message} ${rawMessage}`;

    if (/режим камеры|camera mode|\[camera\]/iu.test(haystack)) return 'camera';
    if (/\[guide(?:-[^\]]+)?\]|руководств/iu.test(haystack)) return 'guide';
    if (/\[editor\]|\bblockly\b|\bmonaco\b|редактор/iu.test(haystack)) return 'editor';
    if (/\[(?:3d|scene|scene-preview|visuals?|3ddbg|3d-click|3d-init)\]/iu.test(haystack) || /3d-сцен|сцен/u.test(haystack)) return 'scene';
    if (/\[(?:lua|lua timer|lua ap|lua print|lua error|python|script)\]/iu.test(haystack) || /python|lua|скрипт|runtime error/iu.test(haystack)) return 'script';
    return 'system';
}

export function log(msg: string, type: LogLevel = 'info') {
    if (typeof document === 'undefined') return;

    const logs = document.getElementById('logs');
    if (!logs) return;

    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const parsedMessage = extractTagAndMessage(msg);
    const { tag, message } = parsedMessage;
    const tone = classifyLogTone(type, tag);
    const category = resolveLogCategory(msg, parsedMessage);

    logEntries.push({
        time,
        tag,
        message,
        tone,
        category,
        flightTime: readLogClock()
    });

    if (logEntries.length > MAX_LOG_ENTRIES) {
        logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
    }

    scheduleLogsRender();
}
