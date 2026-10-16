import { afterEach, beforeEach, expect, test } from '@jest/globals';
// @ts-expect-error jsdom is used by the project's DOM tests without @types/jsdom.
import { JSDOM } from 'jsdom';
import { initGamepadDialog } from '../public/modules/ui/panels/gamepad-dialog.js';

const globalNames = ['document', 'window', 'HTMLElement', 'HTMLSelectElement', 'MutationObserver', 'Event'];
let originals: Map<string, PropertyDescriptor | undefined>;
let document: Document;
let keyboard: typeof KeyboardEvent;

beforeEach(() => {
    originals = new Map(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    const dom = new JSDOM(`<!doctype html><body>
        <main><button class="sidebar-tab-btn" onclick="openPanel('gamepad-panel')">Пульт</button>
        <div id="editor-panel" class="sidebar-panel active"><textarea>draft</textarea></div>
        <div id="gamepad-panel" class="sidebar-panel"><h2 id="gamepad-dialog-title">Пульт</h2>
        <button id="gamepad-dialog-close">Закрыть</button><button id="gp-btn-wizard">Мастер</button></div></main>
        <div id="gp-wizard-overlay" style="display:none"><button id="gp-wizard-close">Закрыть мастер</button></div>
    </body>`);
    for (const name of globalNames) {
        Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
    }
    document = dom.window.document;
    keyboard = dom.window.KeyboardEvent;
    // jsdom has no layout: visible controls need nonempty client rectangles.
    dom.window.HTMLElement.prototype.getClientRects = function () {
        return this.style.display === 'none' ? [] : [{ width: 100, height: 36 }];
    };
});

afterEach(() => originals.forEach((value, name) => {
    if (value) Object.defineProperty(globalThis, name, value);
    else Reflect.deleteProperty(globalThis, name);
}));

test('opening and closing the controller preserves the editor and returns keyboard focus', () => {
    const opener = document.querySelector<HTMLButtonElement>('.sidebar-tab-btn')!;
    opener.focus();
    const dialog = initGamepadDialog()!;
    dialog.open();
    expect(document.querySelector('main')!.inert).toBe(true);
    expect(document.activeElement?.id).toBe('gamepad-dialog-close');
    document.activeElement!.dispatchEvent(new keyboard('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.getElementById('gamepad-dialog')!.hidden).toBe(true);
    expect(document.activeElement).toBe(opener);
    expect(document.getElementById('editor-panel')!.classList.contains('active')).toBe(true);
    expect(document.querySelector('textarea')!.value).toBe('draft');
    expect(document.querySelector('main')!.inert).not.toBe(true);
});

test('Tab wraps inside the controller and its wizard restores the controller focus', async () => {
    const dialog = initGamepadDialog()!;
    dialog.open();
    const wizardButton = document.getElementById('gp-btn-wizard')!;
    wizardButton.focus();
    wizardButton.dispatchEvent(new keyboard('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement?.id).toBe('gamepad-dialog-close');
    wizardButton.focus();
    const wizard = document.getElementById('gp-wizard-overlay')!;
    document.getElementById('gp-wizard-close')!.addEventListener('click', () => { wizard.style.display = 'none'; });
    wizard.style.display = 'flex';
    await Promise.resolve();
    expect(wizard.inert).toBe(false);
    expect(document.getElementById('gamepad-dialog')!.inert).toBe(true);
    expect(document.activeElement?.id).toBe('gp-wizard-close');
    document.activeElement!.dispatchEvent(new keyboard('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await Promise.resolve();
    expect(document.activeElement).toBe(wizardButton);
    expect(document.getElementById('gamepad-dialog')!.hidden).toBe(false);
    expect(document.getElementById('gamepad-dialog')!.inert).not.toBe(true);
    dialog.close();
});
