import { jest } from '@jest/globals';

let code = '';
const setLanguage = jest.fn(async (_language: string) => undefined);
jest.unstable_mockModule('../public/modules/editor/index.js', () => ({
    getEditorValue: () => code,
    setEditorValue: async (value: string) => { code = value; },
    setEditorLanguage: setLanguage,
    setBlocklyEditorEnabled: () => undefined
}));

describe('Lesson drafts', () => {
    test('returning to a lesson restores its draft, including deliberately empty code', async () => {
        const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
        const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
        const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'MutationObserver');
        const root = { parentNode: null as unknown, parentElement: null as unknown, nextSibling: null };
        const parent = { appendChild: () => { root.parentNode = parent; root.parentElement = parent; } };
        parent.appendChild();
        const host = {
            isConnected: true,
            appendChild: () => { root.parentNode = host; root.parentElement = host; },
            querySelector: () => null,
            classList: { add: () => undefined, remove: () => undefined }
        };
        let hasHost = true;
        Object.defineProperty(globalThis, 'document', { configurable: true, value: {
            documentElement: { contains: () => true },
            getElementById: (id: string) => id === 'monaco-editor-root' ? root
                : id === 'mission-guide-monaco-preview-host' ? (hasHost ? host : null) : {}
        } });
        Object.defineProperty(globalThis, 'window', { configurable: true, value: {
            requestAnimationFrame: () => 0, setTimeout: () => 0, dispatchEvent: () => true
        } });
        Object.defineProperty(globalThis, 'MutationObserver', { configurable: true, value: class { observe() {} } });
        try {
            const { mountMissionGuideMonacoPreview: mount, restoreMissionGuideMonacoPreview: restore } =
                await import('../public/modules/ui/mission-guide/support/monaco-preview.js');
            await mount('lua', 'starter A', 'lesson-a');
            code = 'my solution A';
            restore();
            await mount('python', 'starter B', 'lesson-b');
            expect(code).toBe('starter B');
            code = '';
            restore();
            await mount('lua', 'starter A', 'lesson-a');
            expect(code).toBe('my solution A');
            restore();
            await mount('python', 'starter B', 'lesson-b');
            expect(code).toBe('');
            restore();
            hasHost = false;
            setLanguage.mockClear();
            await mount('lua', 'starter C', 'lesson-c');
            expect(setLanguage).not.toHaveBeenCalled();
        } finally {
            for (const [key, descriptor] of [
                ['document', originalDocument], ['window', originalWindow], ['MutationObserver', originalObserver]
            ] as const) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
        }
    });
});
