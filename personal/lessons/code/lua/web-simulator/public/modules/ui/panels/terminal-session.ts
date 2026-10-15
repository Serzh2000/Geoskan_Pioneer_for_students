export type TerminalLine = { text: string; kind: 'text' | 'command' | 'error' | 'warning' };
export type TerminalSession = {
    id: number; label: string; lines: TerminalLine[]; history: string[]; cursor: number; draft: string;
};
export type TerminalActions = { run(): boolean; stop(): boolean; reset(): boolean; status(): string };
export const TERMINAL_COMMANDS = ['help', 'run', 'stop', 'reset', 'status', 'clear'];

/** IDE shortcuts use physical keys so the Russian layout works too. */
export function matchesTerminalShortcut(event: Pick<KeyboardEvent, 'code' | 'key'>, key: 'C' | 'L' | 'J'): boolean {
    return event.code ? event.code === `Key${key}` : event.key.toLowerCase() === key.toLowerCase();
}

export function createTerminalSession(id: number): TerminalSession {
    return { id, label: `Pioneer ${id}`, lines: [
        { text: 'Pioneer Console — команды симулятора', kind: 'text' },
        { text: 'Введите help для списка команд. Ctrl+C — остановить программу.', kind: 'text' }
    ], history: [], cursor: 0, draft: '' };
}

export function appendTerminalLine(session: TerminalSession, text: string, kind: TerminalLine['kind'] = 'text'): void {
    session.lines.push({ text, kind });
    if (session.lines.length > 500) session.lines.splice(0, session.lines.length - 500);
}

export function executeTerminalCommand(session: TerminalSession, source: string, actions: TerminalActions): void {
    const command = source.trim();
    if (!command) return;
    appendTerminalLine(session, `pioneer › ${command}`, 'command');
    if (session.history[session.history.length - 1] !== command) session.history.push(command);
    if (session.history.length > 100) session.history.shift();
    session.cursor = session.history.length;
    session.draft = '';
    switch (command.toLowerCase()) {
        case 'help':
            appendTerminalLine(session, 'run     Запустить программу из редактора\nstop    Остановить программу\nreset   Сбросить программу и вернуть дрон на старт\nstatus  Состояние выбранного дрона\nclear   Очистить этот сеанс\nhelp    Показать команды');
            break;
        case 'clear': session.lines = []; break;
        case 'status': appendTerminalLine(session, actions.status()); break;
        case 'run': appendTerminalLine(session, actions.run() ? 'Запуск программы…' : 'Запуск сейчас недоступен.', 'text'); break;
        case 'stop': appendTerminalLine(session, actions.stop() ? 'Программа остановлена.' : 'Запущенной программы нет.'); break;
        case 'reset': appendTerminalLine(session, actions.reset() ? 'Дрон возвращён на старт.' : 'Сброс сейчас недоступен.'); break;
        default: appendTerminalLine(session, `Неизвестная команда: ${command}. Введите help.`, 'error');
    }
}

export function navigateTerminalHistory(session: TerminalSession, direction: -1 | 1, current: string): string {
    if (session.cursor === session.history.length) session.draft = current;
    session.cursor = Math.max(0, Math.min(session.history.length, session.cursor + direction));
    return session.cursor === session.history.length ? session.draft : session.history[session.cursor];
}
