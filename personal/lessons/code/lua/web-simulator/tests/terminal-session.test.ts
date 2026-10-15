import { expect, test, jest } from '@jest/globals';
import { appendTerminalLine, createTerminalSession, executeTerminalCommand, matchesTerminalShortcut, navigateTerminalHistory } from '../public/modules/ui/panels/terminal-session.js';

const actions = () => ({ run: jest.fn(() => true), stop: jest.fn(() => true), reset: jest.fn(() => true), status: jest.fn(() => 'Pioneer · На земле') });

test('terminal shortcuts retain their physical keys with a Russian keyboard layout', () => {
    expect(matchesTerminalShortcut({ code: 'KeyC', key: 'с' }, 'C')).toBe(true);
    expect(matchesTerminalShortcut({ code: 'KeyL', key: 'д' }, 'L')).toBe(true);
    expect(matchesTerminalShortcut({ code: 'KeyJ', key: 'о' }, 'J')).toBe(true);
    expect(matchesTerminalShortcut({ code: 'KeyS', key: 's' }, 'C')).toBe(false);
});

test('commands invoke simulator actions; unrecognized commands are reported without execution', () => {
    const session = createTerminalSession(1), callbacks = actions();
    for (const command of ['run', 'stop', 'reset', 'status']) executeTerminalCommand(session, command, callbacks);
    expect(callbacks.run).toHaveBeenCalledTimes(1);
    expect(callbacks.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.reset).toHaveBeenCalledTimes(1);
    expect(session.lines.some(line => line.text === 'Pioneer · На земле')).toBe(true);
    executeTerminalCommand(session, 'rm -rf /', callbacks);
    expect(callbacks.run).toHaveBeenCalledTimes(1);
    expect(session.lines[session.lines.length - 1].kind).toBe('error');
});

test('history restores the unfinished command and stays within its boundaries', () => {
    const session = createTerminalSession(1), callbacks = actions();
    executeTerminalCommand(session, 'help', callbacks);
    executeTerminalCommand(session, 'status', callbacks);
    expect(navigateTerminalHistory(session, -1, 'unfinished')).toBe('status');
    expect(navigateTerminalHistory(session, -1, 'status')).toBe('help');
    expect(navigateTerminalHistory(session, -1, 'help')).toBe('help');
    expect(navigateTerminalHistory(session, 1, 'help')).toBe('status');
    expect(navigateTerminalHistory(session, 1, 'status')).toBe('unfinished');
});

test('clear is local to a session and preserves command history', () => {
    const first = createTerminalSession(1), second = createTerminalSession(2);
    appendTerminalLine(second, 'Output from session 2');
    executeTerminalCommand(first, 'help', actions());
    executeTerminalCommand(first, 'clear', actions());
    expect(first.lines).toEqual([]);
    expect(first.history).toEqual(['help', 'clear']);
    expect(second.lines[second.lines.length - 1].text).toBe('Output from session 2');
});

test('scrollback remains bounded during a long-running program', () => {
    const session = createTerminalSession(1);
    for (let index = 0; index < 1000; index++) appendTerminalLine(session, `line ${index}`);
    expect(session.lines).toHaveLength(500);
    expect(session.lines[0].text).toBe('line 500');
    expect(session.lines[499].text).toBe('line 999');
});
