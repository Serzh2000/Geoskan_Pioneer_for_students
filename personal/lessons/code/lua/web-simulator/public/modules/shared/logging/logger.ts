type LogType = 'info' | 'error' | 'warn' | 'success';
type LogFilter = 'all' | 'click' | 'zoom' | 'guide' | 'system';

type ParsedLog = {
    badgeLabel: string;
    badgeClass: string;
    categories: LogFilter[];
    message: string;
    details: string;
};

const FILTER_BUTTON_SELECTOR = '[data-log-filter]';
let activeFilter: LogFilter = 'all';
let filterControlsInitialized = false;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeMessage(message: string): string {
    return message
        .replace(/^AP:\s*/, '')
        .replace(/^\[3D\]\s*/, '')
        .replace(/^\[3DDBG\]\s*/, '')
        .replace(/^\[Lua AP\]\s*/, '')
        .replace(/^\[Lua Timer\]\s*/, '')
        .replace(/^\[Lua\]\s*/, '')
        .replace(/^\[Physics\]\s*/, '')
        .trim();
}

function splitMessageParts(message: string): { main: string; details: string } {
    const parts = message.split('|').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 1) {
        return { main: message.trim(), details: '' };
    }

    return {
        main: parts[0],
        details: parts.slice(1).join(' | ')
    };
}

function parseLogMessage(rawMessage: string): ParsedLog {
    let message = normalizeMessage(rawMessage);
    const upper = message.toUpperCase();

    let badgeLabel = 'СИСТЕМА';
    let badgeClass = 'log-badge-system';
    let categories: LogFilter[] = ['system'];

    if (upper.startsWith('[3D-CLICK]')) {
        badgeLabel = '3D-CLICK';
        badgeClass = 'log-badge-3d-click';
        categories = ['click'];
        message = message.replace(/^\[3D-CLICK\]\s*/i, '').trim();
    } else if (upper.startsWith('[GUIDE-ZOOM]')) {
        badgeLabel = 'GUIDE-ZOOM';
        badgeClass = 'log-badge-zoom';
        categories = ['zoom', 'guide'];
        message = message.replace(/^\[GUIDE-ZOOM\]\s*/i, '').trim();
    } else if (upper.startsWith('[ZOOM]')) {
        badgeLabel = 'ZOOM';
        badgeClass = 'log-badge-zoom';
        categories = ['zoom'];
        message = message.replace(/^\[ZOOM\]\s*/i, '').trim();
    } else if (upper.startsWith('[GUIDE]')) {
        badgeLabel = 'GUIDE';
        badgeClass = 'log-badge-guide';
        categories = ['guide'];
        message = message.replace(/^\[GUIDE\]\s*/i, '').trim();
    }

    const { main, details } = splitMessageParts(message);
    return {
        badgeLabel,
        badgeClass,
        categories,
        message: main || message || rawMessage,
        details
    };
}

function applyFilterToLine(line: HTMLElement) {
    const rawCategories = line.dataset.categories || 'system';
    const categories = rawCategories.split(',').map((item) => item.trim()).filter(Boolean);
    line.hidden = activeFilter !== 'all' && !categories.includes(activeFilter);
}

function applyActiveFilter() {
    const logs = document.getElementById('logs');
    if (!logs) return;
    logs.querySelectorAll<HTMLElement>('.log-line').forEach((line) => applyFilterToLine(line));
}

function setActiveFilter(nextFilter: LogFilter) {
    activeFilter = nextFilter;
    document.querySelectorAll<HTMLElement>(FILTER_BUTTON_SELECTOR).forEach((button) => {
        const isActive = button.dataset.logFilter === nextFilter;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
    applyActiveFilter();
}

function ensureFilterControls() {
    if (typeof document === 'undefined' || filterControlsInitialized) return;

    const buttons = Array.from(document.querySelectorAll<HTMLElement>(FILTER_BUTTON_SELECTOR));
    if (!buttons.length) return;

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const nextFilter = (button.dataset.logFilter as LogFilter | undefined) || 'all';
            setActiveFilter(nextFilter);
        });
    });

    filterControlsInitialized = true;
    setActiveFilter(activeFilter);
}

function renderLogLine(time: string, parsed: ParsedLog, type: LogType): string {
    const badge = `<span class="log-badge ${parsed.badgeClass}">[${escapeHtml(parsed.badgeLabel)}]</span>`;
    const details = parsed.details
        ? `<div class="log-details">${escapeHtml(parsed.details)}</div>`
        : '';

    return [
        `<span class="log-time">[${escapeHtml(time)}]</span>`,
        '<div class="log-body">',
        `<div class="log-main">${badge}<span class="log-message">${escapeHtml(parsed.message)}</span></div>`,
        details,
        '</div>'
    ].join('');
}

function initLogUIWhenReady() {
    if (typeof document === 'undefined') return;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ensureFilterControls(), { once: true });
        return;
    }

    ensureFilterControls();
}

export function log(msg: string, type: LogType = 'info') {
    if (typeof document === 'undefined') return;

    ensureFilterControls();

    const logs = document.getElementById('logs');
    if (!logs) return;

    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const parsed = parseLogMessage(msg);
    const line = document.createElement('div');

    line.className = `log-line log-${type}`;
    line.dataset.categories = parsed.categories.join(',');
    line.innerHTML = renderLogLine(time, parsed, type);

    logs.appendChild(line);
    applyFilterToLine(line);
    logs.scrollTop = logs.scrollHeight;
}

initLogUIWhenReady();
