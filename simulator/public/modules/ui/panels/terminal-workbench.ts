import { drones, currentDroneId } from '../../core/state.js';
import { getLogEntries, onLogsChanged, type LogRecord } from '../../shared/logging/logger.js';
import { cleanJournalMessage, describeLogEntry } from './journal-lines.js';
import { appendTerminalLine, createTerminalSession, executeTerminalCommand, matchesTerminalShortcut, navigateTerminalHistory, type TerminalActions, type TerminalLine } from './terminal-session.js';

type TerminalView = 'console' | 'output' | 'problems';

/** VS Code panel geometry, with browser-native simulator console sessions. */
export function initTerminalWorkbench(panel: HTMLElement, resize: () => void, clearOutput: () => void) {
    const input = panel.querySelector<HTMLInputElement>('#terminal-command-input')!;
    const consoleStream = panel.querySelector<HTMLElement>('#terminal-console-stream')!;
    const consoleScroll = consoleStream.parentElement!;
    const selector = panel.querySelector<HTMLSelectElement>('#terminal-session-select')!;
    const sessionList = panel.querySelector<HTMLElement>('#terminal-session-list')!;
    const problems = panel.querySelector<HTMLElement>('#terminal-problems')!;
    const maximize = panel.querySelector<HTMLButtonElement>('#terminal-maximize-btn')!;
    const sessions = [createTerminalSession(1)];
    let sequence = 1;
    let active = sessions[0];
    let outputOwner = active;
    let view: TerminalView = 'console';
    let previousProblemCount = -1;
    let lastProblem: LogRecord | undefined;
    const rows = new WeakMap<TerminalLine, HTMLElement>();
    const seen = new WeakSet<LogRecord>();
    getLogEntries().forEach(record => seen.add(record));
    const clickAction = (id: string) => {
        const button = document.getElementById(id) as HTMLButtonElement | null;
        if (!button || button.disabled) return false;
        button.click(); return true;
    };
    const actions: TerminalActions = {
        run: () => { outputOwner = active; return clickAction('run-btn'); },
        stop: () => clickAction('stop-btn'), reset: () => clickAction('restart-btn'),
        status: () => {
            const drone = drones[currentDroneId];
            return drone ? `${drone.name} · ${drone.status}\nВремя полёта: ${drone.current_time.toFixed(1)} с` : 'Дрон не выбран.';
        }
    };
    const renderConsole = () => {
        const follow = consoleScroll.scrollHeight - consoleScroll.scrollTop - consoleScroll.clientHeight < 28;
        const top = consoleScroll.scrollTop;
        const wanted = active.lines.map(line => {
            const cached = rows.get(line);
            if (cached) return cached;
            const row = document.createElement('div');
            row.className = `terminal-console-line terminal-console-line--${line.kind}`;
            row.textContent = line.text; rows.set(line, row); return row;
        });
        const current = [...consoleStream.children];
        if (current.every((row, index) => row === wanted[index])) consoleStream.append(...wanted.slice(current.length));
        else {
            consoleStream.setAttribute('aria-live', 'off');
            consoleStream.replaceChildren(...wanted);
            window.setTimeout(() => consoleStream.setAttribute('aria-live', 'polite'), 0);
        }
        consoleScroll.scrollTop = follow ? consoleScroll.scrollHeight : top;
    };
    const renderSessions = () => {
        selector.replaceChildren(...sessions.map(session => new Option(session.label, String(session.id), false, session === active)));
        sessionList.hidden = sessions.length < 2;
        sessionList.replaceChildren(...sessions.map(session => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'terminal-session'; button.textContent = session.label;
            button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(session === active));
            button.setAttribute('aria-controls', 'terminal-console-pane');
            button.addEventListener('click', () => selectSession(session.id));
            button.addEventListener('keydown', event => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const index = sessions.indexOf(session);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? sessions.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + sessions.length) % sessions.length;
                selectSession(sessions[next].id);
                sessionList.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
            }); return button;
        }));
    };
    const selectSession = (id: number) => {
        active.draft = input.value;
        active = sessions.find(session => session.id === id) ?? sessions[0];
        input.value = active.draft; renderConsole(); renderSessions(); input.focus({ preventScroll: true });
    };
    const selectView = (next: TerminalView) => {
        view = next;
        panel.querySelectorAll<HTMLButtonElement>('[data-terminal-view]').forEach(button => {
            const selected = button.dataset.terminalView === view;
            button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
        });
        panel.querySelectorAll<HTMLElement>('[data-terminal-pane]').forEach(pane => { pane.hidden = pane.dataset.terminalPane !== view; });
        panel.querySelectorAll<HTMLElement>('[data-console-action]').forEach(button => { button.hidden = view !== 'console'; });
        const system = panel.querySelector<HTMLElement>('.editor-terminal__system-toggle');
        if (system) system.hidden = view !== 'output';
        const clear = panel.querySelector<HTMLButtonElement>('#terminal-clear-btn');
        if (clear) { clear.disabled = view === 'problems'; clear.title = view === 'output' ? 'Очистить вывод' : 'Очистить сеанс'; clear.setAttribute('aria-label', clear.title); }
    };
    panel.querySelectorAll<HTMLButtonElement>('[data-terminal-view]').forEach(button => {
        button.addEventListener('click', () => selectView(button.dataset.terminalView as TerminalView));
        button.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[data-terminal-view]')];
            const index = tabs.indexOf(button);
            const target = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
            target.click(); target.focus();
        });
    });
    panel.querySelector('#terminal-new-btn')?.addEventListener('click', () => {
        sessions.push(createTerminalSession(++sequence)); selectView('console'); selectSession(sequence);
    });
    panel.querySelector('#terminal-kill-btn')?.addEventListener('click', () => {
        const closeLast = sessions.length === 1;
        const index = sessions.indexOf(active);
        const ownsOutput = outputOwner === active;
        if (ownsOutput) actions.stop();
        sessions.splice(index, 1);
        if (!sessions.length) sessions.push(createTerminalSession(++sequence));
        active = sessions[Math.min(index, sessions.length - 1)];
        if (ownsOutput) outputOwner = active;
        input.value = active.draft; renderSessions(); renderConsole();
        if (closeLast) panel.querySelector<HTMLButtonElement>('#editor-terminal-close-btn')?.click();
        else input.focus();
    });
    selector.addEventListener('change', () => selectSession(Number(selector.value)));
    panel.querySelector('#terminal-clear-btn')?.addEventListener('click', () => {
        if (view === 'console') { active.lines = []; renderConsole(); input.focus(); }
        else if (view === 'output') clearOutput();
    });
    maximize.addEventListener('click', () => {
        const expanded = panel.classList.toggle('is-maximized');
        maximize.setAttribute('aria-pressed', String(expanded));
        maximize.setAttribute('aria-label', expanded ? 'Восстановить высоту панели' : 'Развернуть панель');
        maximize.title = expanded ? 'Восстановить высоту панели' : 'Развернуть панель';
        resize();
    });
    panel.querySelector('#terminal-command-form')?.addEventListener('submit', event => {
        event.preventDefault(); executeTerminalCommand(active, input.value, actions); input.value = ''; renderConsole();
        consoleScroll.scrollTop = consoleScroll.scrollHeight;
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault(); input.value = navigateTerminalHistory(active, event.key === 'ArrowUp' ? -1 : 1, input.value);
            input.setSelectionRange(input.value.length, input.value.length);
        } else if ((event.ctrlKey || event.metaKey) && matchesTerminalShortcut(event, 'L')) {
            event.preventDefault(); active.lines = []; renderConsole();
        } else if (event.ctrlKey && matchesTerminalShortcut(event, 'C') && !(window.getSelection()?.toString() && consoleScroll.contains(window.getSelection()?.anchorNode ?? null)) && input.selectionStart === input.selectionEnd) {
            event.preventDefault(); actions.stop(); appendTerminalLine(active, '^C', 'command'); input.value = ''; renderConsole();
        }
    });
    document.getElementById('run-btn')?.addEventListener('click', () => { outputOwner = active; });
    const updateLogs = () => {
        const entries = getLogEntries();
        let consoleChanged = false;
        for (const record of entries) {
            if (seen.has(record)) continue;
            seen.add(record);
            const line = describeLogEntry(record);
            if (line.kind === 'program' || (record.category === 'script' && ['error', 'warning'].includes(line.kind))) {
                appendTerminalLine(outputOwner, cleanJournalMessage(record.message), line.kind === 'error' ? 'error' : line.kind === 'warning' ? 'warning' : 'text');
                consoleChanged ||= outputOwner === active;
            }
        }
        const errors = entries.filter(record => record.tone === 'error' || record.tone === 'warn');
        if (consoleChanged) renderConsole();
        if (previousProblemCount === errors.length && lastProblem === errors[errors.length - 1]) return;
        previousProblemCount = errors.length; lastProblem = errors[errors.length - 1];
        const count = panel.querySelector('#terminal-problem-count');
        if (count) { count.textContent = String(errors.length); (count as HTMLElement).hidden = !errors.length; }
        problems.replaceChildren(...(errors.length ? errors.map(record => {
            const row = document.createElement('div'); row.className = `terminal-problem terminal-problem--${record.tone}`;
            const label = document.createElement('strong'); label.textContent = record.tone === 'error' ? 'Ошибка' : 'Предупреждение';
            const text = document.createElement('span'); text.textContent = cleanJournalMessage(record.message);
            row.append(label, text); return row;
        }) : [Object.assign(document.createElement('p'), { className: 'terminal-no-problems', textContent: 'Ошибок и предупреждений нет.' })]));
    };
    onLogsChanged(updateLogs);
    renderSessions(); renderConsole(); selectView('console'); updateLogs();
    return {
        focus() {
            if (view === 'console') input.focus({ preventScroll: true });
            else panel.querySelector<HTMLButtonElement>('[data-terminal-view][aria-selected="true"]')?.focus();
        },
        activateConsole() { selectView('console'); input.focus({ preventScroll: true }); },
        restore() {
            panel.classList.remove('is-maximized'); maximize.setAttribute('aria-pressed', 'false');
            maximize.title = 'Развернуть панель'; maximize.setAttribute('aria-label', maximize.title);
        }
    };
}
