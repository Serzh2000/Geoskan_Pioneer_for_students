import { afterEach, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
// @ts-expect-error The project's DOM tests use jsdom without @types/jsdom.
import { JSDOM } from 'jsdom';
import { initTerminalWorkbench } from '../public/modules/ui/panels/terminal-workbench.js';
import { getLogEntries, log } from '../public/modules/shared/logging/logger.js';

const globalNames = ['document', 'window', 'HTMLElement', 'Option', 'Event'];
const originals = new Map(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
afterEach(() => originals.forEach((value, name) => {
    if (value) Object.defineProperty(globalThis, name, value);
    else Reflect.deleteProperty(globalThis, name);
}));

test('program output belongs to its launching session, while clear and panel tools preserve shared logs', () => {
    const markup = readFileSync(new URL('../public/fragments/panels/editor-terminal.html', import.meta.url), 'utf8');
    const dom = new JSDOM(`<!doctype html><body>${markup}<button id="run-btn">Run</button><button id="stop-btn">Stop</button><button id="restart-btn">Reset</button><div id="logs"></div></body>`);
    for (const name of globalNames) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
    dom.window.requestAnimationFrame = (callback: FrameRequestCallback) => { callback(0); return 0; };
    const page = dom.window.document as Document;
    const panel = page.getElementById('editor-terminal')!;
    const resized = jest.fn(), clearOutput = jest.fn();
    initTerminalWorkbench(panel, resized, clearOutput);
    const input = page.getElementById('terminal-command-input') as HTMLInputElement;
    const run = jest.fn();
    page.getElementById('run-btn')!.addEventListener('click', run);
    input.value = 'run';
    page.getElementById('terminal-command-form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(run).toHaveBeenCalledTimes(1);
    const stop = jest.fn();
    page.getElementById('stop-btn')!.addEventListener('click', stop);
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(page.getElementById('terminal-console-stream')!.textContent).toContain('^C');
    page.getElementById('terminal-new-btn')!.click();
    log('[Lua Print] Output from launched program');
    const stream = page.getElementById('terminal-console-stream')!;
    expect(stream.textContent).not.toContain('Output from launched program');
    const select = page.getElementById('terminal-session-select') as HTMLSelectElement;
    select.value = '1'; select.dispatchEvent(new dom.window.Event('change'));
    expect(stream.textContent).toContain('Output from launched program');
    page.getElementById('terminal-clear-btn')!.click();
    expect(stream.textContent).toBe('');
    expect(getLogEntries().some(record => record.message === 'Output from launched program')).toBe(true);
    page.getElementById('terminal-tab-output')!.click();
    page.getElementById('terminal-clear-btn')!.click();
    expect(clearOutput).toHaveBeenCalledTimes(1);
    page.getElementById('terminal-maximize-btn')!.click();
    expect(panel.classList.contains('is-maximized')).toBe(true);
    expect(resized).toHaveBeenCalledTimes(1);
});
