import { jest } from '@jest/globals';
import { beginTemporaryDocument, restoreTemporaryDocument } from '../public/modules/editor/index/temporary-document.js';
import { persistEditorIndexSession } from '../public/modules/editor/index/helpers.js';
import type { ScriptLanguage } from '../public/modules/core/state.js';

let code = '';
let language: ScriptLanguage = 'lua';
let modelLanguage: ScriptLanguage = 'lua';
const editorState = {
    textDraftByKey: new Map<string, string>(),
    blocklyWorkspaceXmlByKey: new Map<string, string>(),
    blocklyEnabled: false
};
function edit(value: string): void {
    code = value;
    editorState.textDraftByKey.set(language, value);
    persistEditorIndexSession(editorState, editorState);
}
const setLanguage = jest.fn(async (value: ScriptLanguage) => { modelLanguage = value; });
jest.unstable_mockModule('../public/modules/editor/index.js', () => ({
    getEditorValue: () => code,
    setEditorValue: async (value: string) => { edit(value); },
    setEditorLanguage: setLanguage,
    setBlocklyEditorEnabled: () => { editorState.blocklyEnabled = false; },
    revealEditorStart: () => undefined
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
            const { mountMissionGuideMonacoPreview: mount, restoreMissionGuideMonacoPreview: restore, getMissionGuideDraft: getDraft } =
                await import('../public/modules/ui/mission-guide/support/monaco-preview.js');
            await mount('lua', 'starter A', 'lesson-a');
            code = 'my solution A';
            restore();
            code = 'unrelated workspace code';
            expect(getDraft('lua', 'lesson-a', 'starter A')).toBe('my solution A');
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

            // A main Lua document survives Python practice, a Lua lesson switch,
            // closing the course, and reopening both independent lesson drafts.
            hasHost = true;
            language = 'lua';
            modelLanguage = 'lua';
            edit('-- personal Lua A');
            const mainDrafts = editorState.textDraftByKey;
            const storedDrafts = new Map(mainDrafts);
            beginTemporaryDocument(editorState, { value: code, language });
            await mount('python', '# Python B', 'python-b');
            edit('# solution B');
            language = 'python'; // A lesson run chooses its interpreter.
            restore();
            await mount('lua', '-- Lua C', 'lua-c');
            edit('-- solution C');
            restore();
            restoreTemporaryDocument(editorState, document => {
                language = document.language;
                modelLanguage = document.language;
                code = document.value;
            });
            expect(code).toBe('-- personal Lua A');
            expect(language).toBe('lua');
            expect(modelLanguage).toBe('lua');
            expect(editorState.textDraftByKey).toBe(mainDrafts);
            expect(mainDrafts).toEqual(storedDrafts);
            beginTemporaryDocument(editorState, { value: code, language });
            await mount('python', '# Python B', 'python-b');
            expect(code).toBe('# solution B');
            restore();
            await mount('lua', '-- Lua C', 'lua-c');
            expect(code).toBe('-- solution C');
            restore();
            restoreTemporaryDocument(editorState, document => { code = document.value; language = document.language; });
        } finally {
            restoreTemporaryDocument(editorState, document => { code = document.value; language = document.language; });
            for (const [key, descriptor] of [
                ['document', originalDocument], ['window', originalWindow], ['MutationObserver', originalObserver]
            ] as const) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
        }
    });
});
