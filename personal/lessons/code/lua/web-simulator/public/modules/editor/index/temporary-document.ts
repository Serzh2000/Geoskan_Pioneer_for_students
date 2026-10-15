import type { ScriptLanguage } from '../../core/state.js';

type DraftCollections = {
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
    blocklyEnabled: boolean;
};

export type EditorDocument = { value: string; language: ScriptLanguage; blocklyEnabled: boolean };
let original: (EditorDocument & DraftCollections) | null = null;

// A lesson borrows the editor widget, never the user's persisted document.
export function beginTemporaryDocument(state: DraftCollections, document: Omit<EditorDocument, 'blocklyEnabled'>): void {
    if (original) return;
    original = {
        ...document,
        blocklyEnabled: state.blocklyEnabled,
        textDraftByKey: new Map(state.textDraftByKey),
        blocklyWorkspaceXmlByKey: new Map(state.blocklyWorkspaceXmlByKey)
    };
}

export function isTemporaryDocumentActive(): boolean {
    return original !== null;
}

export function getTemporaryDocumentToken(): object | null {
    return original;
}

export function restoreTemporaryDocument(state: DraftCollections, restore: (document: EditorDocument) => void): void {
    if (!original) return;
    const document = original;
    // Blockly's long-lived change listener retains these maps: preserve identity.
    state.textDraftByKey.clear();
    document.textDraftByKey.forEach((value, key) => state.textDraftByKey.set(key, value));
    state.blocklyWorkspaceXmlByKey.clear();
    document.blocklyWorkspaceXmlByKey.forEach((value, key) => state.blocklyWorkspaceXmlByKey.set(key, value));
    state.blocklyEnabled = document.blocklyEnabled;
    // Restoration also changes the model; keep persistence suspended until it is done.
    try {
        restore(document);
    } finally {
        original = null;
    }
}
