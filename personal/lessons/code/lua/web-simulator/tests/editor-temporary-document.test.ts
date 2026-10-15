import { beginTemporaryDocument, getTemporaryDocumentToken, isTemporaryDocumentActive, restoreTemporaryDocument } from '../public/modules/editor/index/temporary-document.js';
import { persistEditorIndexSession } from '../public/modules/editor/index/helpers.js';

test('temporary lesson edits cannot persist over the workspace, including a changed mode and an empty document', () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const writes: string[] = [];
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        localStorage: { setItem: (_key: string, value: string) => writes.push(value) }
    } });
    const state = {
        textDraftByKey: new Map([['lua', ''], ['python', '# personal Python']]),
        blocklyWorkspaceXmlByKey: new Map([['drone', '<xml>original blocks</xml>']]),
        blocklyEnabled: true
    };
    try {
        persistEditorIndexSession(state, state);
        const baseline = writes[0];
        beginTemporaryDocument(state, { value: '', language: 'lua' });
        const firstToken = getTemporaryDocumentToken();
        beginTemporaryDocument(state, { value: 'lesson cannot replace snapshot', language: 'python' });
        expect(getTemporaryDocumentToken()).toBe(firstToken);
        state.textDraftByKey.set('lua', '# tutorial Python');
        state.blocklyWorkspaceXmlByKey.set('drone', '<xml>lesson blocks</xml>');
        state.blocklyEnabled = false;
        persistEditorIndexSession(state, state);
        expect(writes).toEqual([baseline]);
        restoreTemporaryDocument(state, document => {
            expect(isTemporaryDocumentActive()).toBe(true);
            expect(document).toMatchObject({ value: '', language: 'lua', blocklyEnabled: true });
        });
        expect(state.textDraftByKey.get('lua')).toBe('');
        expect(state.textDraftByKey.get('python')).toBe('# personal Python');
        expect(state.blocklyWorkspaceXmlByKey.get('drone')).toBe('<xml>original blocks</xml>');
        expect(state.blocklyEnabled).toBe(true);
        persistEditorIndexSession(state, state);
        expect(writes).toEqual([baseline, baseline]);
        expect(getTemporaryDocumentToken()).toBeNull();
        beginTemporaryDocument(state, { value: '', language: 'lua' });
        expect(getTemporaryDocumentToken()).not.toBe(firstToken);
    } finally {
        restoreTemporaryDocument(state, () => undefined);
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
        else Reflect.deleteProperty(globalThis, 'window');
    }
});
