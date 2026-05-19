type LogLevel = 'info' | 'error' | 'warn' | 'success';
type LogTone = 'info' | 'action' | 'warn' | 'error' | 'success';

function extractTagAndMessage(rawMessage: string): { tag: string; message: string } {
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

function createLogEntry(time: string, tag: string, message: string, tone: LogTone): HTMLElement {
    const entry = document.createElement('article');
    entry.className = `log-entry log-entry--${tone}`;

    const meta = document.createElement('div');
    meta.className = 'log-entry__meta';

    const timeElement = document.createElement('span');
    timeElement.className = 'log-entry__time';
    timeElement.textContent = `[${time}]`;

    const tagElement = document.createElement('span');
    tagElement.className = 'log-entry__tag';
    tagElement.textContent = tag;

    const messageElement = document.createElement('div');
    messageElement.className = 'log-entry__message';
    messageElement.textContent = message || 'Без описания события';

    meta.append(timeElement, tagElement);
    entry.append(meta, messageElement);
    return entry;
}

export function log(msg: string, type: LogLevel = 'info') {
    if (typeof document === 'undefined') return;

    const logs = document.getElementById('logs');
    if (!logs) return;

    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const { tag, message } = extractTagAndMessage(msg);
    const tone = classifyLogTone(type, tag);
    const emptyState = logs.querySelector('.logs-console__empty');
    if (emptyState) {
        emptyState.remove();
    }

    logs.appendChild(createLogEntry(time, tag, message, tone));
    logs.scrollTop = logs.scrollHeight;
}
