import { afterEach, beforeEach, expect, test } from '@jest/globals';
// @ts-expect-error The project's DOM tests use jsdom without @types/jsdom.
import { JSDOM } from 'jsdom';
import { initEditorDocs } from '../public/modules/ui/panels/editor-docs.js';

const globals = ['document', 'window', 'HTMLElement', 'HTMLSelectElement', 'CustomEvent'];
let originals: Map<string, PropertyDescriptor | undefined>;
let page: Document;
let keyboard: typeof KeyboardEvent;

beforeEach(() => {
    originals = new Map(globals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    const dom = new JSDOM(`<!doctype html><body><div id="editor-panel" class="active">
        <button id="editor-docs-toggle-btn">API</button><textarea>draft</textarea>
        <div class="panel-content--editor"><aside id="editor-docs" hidden>
        <button id="editor-docs-close-btn">Close</button><div id="editor-docs-body"></div></aside></div>
        <div id="api-docs"><input id="api-docs-search"><select id="api-category-select"><option>Все</option></select></div>
        </div></body>`);
    for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
    page = dom.window.document;
    keyboard = dom.window.KeyboardEvent;
    initEditorDocs();
});

afterEach(() => originals.forEach((value, name) => {
    if (value) Object.defineProperty(globalThis, name, value);
    else Reflect.deleteProperty(globalThis, name);
}));

test('keyboard opening enters the reference search and closing restores its opener without editing the draft', () => {
    const opener = page.getElementById('editor-docs-toggle-btn')!;
    opener.focus();
    opener.click();
    expect(page.activeElement?.id).toBe('api-docs-search');
    page.activeElement!.dispatchEvent(new keyboard('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(page.getElementById('editor-docs')!.hidden).toBe(true);
    expect(page.activeElement).toBe(opener);
    expect(page.querySelector('textarea')!.value).toBe('draft');
});

test('Escape from a native category selector leaves the reference open', () => {
    page.getElementById('editor-docs-toggle-btn')!.click();
    const category = page.getElementById('api-category-select')!;
    category.focus();
    const escape = new keyboard('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    category.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(page.getElementById('editor-docs')!.hidden).toBe(false);
    expect(page.activeElement).toBe(category);
});
