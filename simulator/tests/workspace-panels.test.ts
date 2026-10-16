import { beforeEach, afterEach, expect, test, jest } from '@jest/globals';
import { initRailVisibility } from '../public/modules/ui/panels/rail-visibility.js';
import { setEditorDrawerState } from '../public/modules/ui/panels/editor-drawers.js';

class ElementStub extends EventTarget {
    hidden = false;
    title = '';
    attributes = new Map<string, string>();
    classes = new Set<string>();
    classList = {
        toggle: (name: string, enabled: boolean) => enabled ? this.classes.add(name) : this.classes.delete(name),
        remove: (name: string) => this.classes.delete(name)
    };
    constructor(public id: string) { super(); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    focus = jest.fn();
    contains = jest.fn(() => false);
}

const globalsToRestore = ['document', 'window', 'localStorage', 'MutationObserver'];
let original: Map<string, PropertyDescriptor | undefined>;
let button: ElementStub;
let body: ElementStub;
let open: boolean;
let closing: boolean;
let events: EventTarget;

beforeEach(() => {
    original = new Map(globalsToRestore.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    button = new ElementStub('rail-toggle-btn');
    body = new ElementStub('body');
    open = true;
    closing = false;
    events = new EventTarget();
    const host = { querySelector: () => open && !closing ? {} : null };
    const documentStub = {
        body, activeElement: null,
        querySelector: (selector: string) => selector === '.sidebar-panels' ? host : {},
        getElementById: () => button
    };
    Object.defineProperties(globalThis, {
        document: { configurable: true, value: documentStub },
        window: { configurable: true, value: {
            matchMedia: () => ({ matches: false, addEventListener: () => undefined }),
            addEventListener: events.addEventListener.bind(events),
            closeSidebarPanel: () => { closing = true; }
        } },
        // A denied storage API must not prevent the user from closing tools.
        localStorage: { configurable: true, value: {
            getItem: () => { throw new Error('Storage denied'); },
            setItem: () => { throw new Error('Storage denied'); }
        } },
        MutationObserver: { configurable: true, value: class { observe() {} } }
    });
});

afterEach(() => {
    original.forEach((descriptor, name) => {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
    });
});

test('a second disclosure click during close reveals only the rail; late close keeps it pinned', () => {
    initRailVisibility();
    button.dispatchEvent(new Event('click'));
    expect(button.attributes.get('aria-expanded')).toBe('false');
    expect(body.classes.has('is-rail-docked')).toBe(false);
    button.dispatchEvent(new Event('click'));
    expect(button.attributes.get('aria-expanded')).toBe('true');
    open = false;
    closing = false;
    events.dispatchEvent(new Event('sidebar-panel-change'));
    expect(body.classes.has('is-rail-docked')).toBe(true);
    button.dispatchEvent(new Event('click'));
    expect(button.attributes.get('aria-expanded')).toBe('false');
});

test('closing an editor utility restores its opener only when focus is inside it', () => {
    const panel = new ElementStub('editor-terminal');
    const opener = new ElementStub('terminal-toggle');
    panel.contains.mockReturnValue(true);
    setEditorDrawerState(panel as unknown as HTMLElement, opener as unknown as HTMLElement, false, 'терминал');
    expect(panel.hidden).toBe(true);
    expect(opener.attributes.get('aria-expanded')).toBe('false');
    expect(opener.attributes.get('aria-label')).toBe('Открыть терминал');
    expect(opener.focus).toHaveBeenCalledTimes(1);
    panel.contains.mockReturnValue(false);
    setEditorDrawerState(panel as unknown as HTMLElement, opener as unknown as HTMLElement, true, 'терминал');
    expect(panel.hidden).toBe(false);
    expect(opener.attributes.get('aria-controls')).toBe('editor-terminal');
    expect(opener.focus).toHaveBeenCalledTimes(1);
});
