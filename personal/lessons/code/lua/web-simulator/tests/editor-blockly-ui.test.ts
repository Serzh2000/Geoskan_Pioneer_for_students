import {
    applyEditorLayoutState,
    computeExpandedSidebarWidth,
    computeBlocklyViewportDimensions,
    resizeBlocklyCanvas,
    updateGeneratedCodePreview
} from '../public/modules/editor/blockly-ui.js';

function createMockClassList() {
    const classes = new Set<string>();
    return {
        toggle(className: string, force?: boolean) {
            const shouldAdd = force ?? !classes.has(className);
            if (shouldAdd) classes.add(className);
            else classes.delete(className);
        },
        contains(className: string) {
            return classes.has(className);
        }
    };
}

function createMockElement() {
    const attributes = new Map<string, string>();
    return {
        classList: createMockClassList(),
        style: {} as Record<string, string>,
        textContent: '',
        setAttribute(name: string, value: string) {
            attributes.set(name, value);
        },
        getAttribute(name: string) {
            return attributes.get(name) ?? null;
        }
    } as unknown as HTMLElement;
}

function createMockInput() {
    const element = createMockElement() as HTMLInputElement & {
        checked: boolean;
        disabled: boolean;
        type: string;
    };
    element.checked = false;
    element.disabled = false;
    element.type = 'checkbox';
    return element;
}

describe('Editor Blockly UI', () => {
    test('переключает видимость текстового редактора и Blockly-режима', () => {
        const monacoRoot = createMockElement();
        const blocklyRoot = createMockElement();
        const codeOverlay = createMockElement();
        const codeToggle = createMockInput();

        applyEditorLayoutState({
            monacoRoot,
            blocklyRoot,
            codeOverlay,
            codeToggle
        }, {
            blocklyEnabled: true,
            generatedCodeVisible: false
        });

        expect(monacoRoot.classList.contains('editor-mode-root--hidden')).toBe(true);
        expect(blocklyRoot.classList.contains('editor-mode-root--hidden')).toBe(false);
        expect(codeOverlay.classList.contains('blockly-code-overlay--visible')).toBe(false);
        expect(codeToggle.disabled).toBe(false);
        expect(codeToggle.checked).toBe(false);
        expect(codeOverlay.getAttribute('aria-hidden')).toBe('true');
    });

    test('показывает overlay с кодом только в Blockly-режиме', () => {
        const monacoRoot = createMockElement();
        const blocklyRoot = createMockElement();
        const codeOverlay = createMockElement();
        const codeToggle = createMockInput();

        applyEditorLayoutState({
            monacoRoot,
            blocklyRoot,
            codeOverlay,
            codeToggle
        }, {
            blocklyEnabled: true,
            generatedCodeVisible: true
        });

        expect(codeOverlay.classList.contains('blockly-code-overlay--visible')).toBe(true);
        expect(codeOverlay.getAttribute('aria-hidden')).toBe('false');
        expect(codeToggle.checked).toBe(true);

        applyEditorLayoutState({
            monacoRoot,
            blocklyRoot,
            codeOverlay,
            codeToggle
        }, {
            blocklyEnabled: false,
            generatedCodeVisible: true
        });

        expect(codeOverlay.classList.contains('blockly-code-overlay--visible')).toBe(false);
        expect(codeToggle.disabled).toBe(true);
        expect(codeToggle.checked).toBe(false);
    });

    test('корректно вычисляет размеры Blockly-области для разных разрешений', () => {
        expect(computeBlocklyViewportDimensions(1280.7, 720.3)).toEqual({ width: 1280, height: 720 });
        expect(computeBlocklyViewportDimensions(375, 667)).toEqual({ width: 375, height: 667 });
        expect(computeBlocklyViewportDimensions(-10, 0)).toEqual({ width: 0, height: 0 });
    });

    test('вычисляет ширину распахивания панели Blockly в разумных пределах', () => {
        expect(computeExpandedSidebarWidth(1600, 450)).toBe(620);
        expect(computeExpandedSidebarWidth(1100, 700)).toBe(462);
        expect(computeExpandedSidebarWidth(800, 300)).toBe(336);
    });

    test('подгоняет canvas Blockly под размеры родительского контейнера', () => {
        const host = createMockElement();
        const canvas = createMockElement();

        host.getBoundingClientRect = () => ({
            width: 1439.8,
            height: 812.4,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            x: 0,
            y: 0,
            toJSON: () => ({})
        } as DOMRect);

        const dimensions = resizeBlocklyCanvas(host, canvas);

        expect(dimensions).toEqual({ width: 1439, height: 812 });
        expect(canvas.style.width).toBe('1439px');
        expect(canvas.style.height).toBe('812px');
    });

    test('обновляет отображаемый код при изменении workspace', () => {
        const preview = createMockElement();

        updateGeneratedCodePreview(preview, 'print("one")');
        expect(preview.textContent).toBe('print("one")');

        updateGeneratedCodePreview(preview, 'print("two")\nprint("three")');
        expect(preview.textContent).toBe('print("two")\nprint("three")');
    });
});
