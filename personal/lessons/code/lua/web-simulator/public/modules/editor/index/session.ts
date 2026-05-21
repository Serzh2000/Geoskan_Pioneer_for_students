import type { ScriptLanguage } from '../../core/state.js';
import { getEditorStateKey } from '../dom.js';

const EDITOR_SESSION_STORAGE_KEY = 'geoskan_editor_session_v1';

export type PersistedEditorSession = {
    textDraftByKey?: Record<string, string>;
    blocklyWorkspaceXmlByKey?: Record<string, string>;
    blocklyEnabled?: boolean;
    blocklyGeneratedCodeVisible?: boolean;
};

export type EditorSessionMaps = {
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
};

export type EditorSessionState = EditorSessionMaps & {
    blocklyEnabled: boolean;
    blocklyGeneratedCodeVisible: boolean;
};

let editorSessionLoaded = false;

export function persistEditorSession(state: EditorSessionState): void {
    if (typeof window === 'undefined') return;

    try {
        const payload: PersistedEditorSession = {
            textDraftByKey: Object.fromEntries(state.textDraftByKey),
            blocklyWorkspaceXmlByKey: Object.fromEntries(state.blocklyWorkspaceXmlByKey),
            blocklyEnabled: state.blocklyEnabled,
            blocklyGeneratedCodeVisible: state.blocklyGeneratedCodeVisible
        };
        window.localStorage.setItem(EDITOR_SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore storage failures in embedded/private browsing contexts.
    }
}

export function loadPersistedEditorSession(target: EditorSessionMaps): PersistedEditorSession | null {
    if (editorSessionLoaded || typeof window === 'undefined') return null;
    editorSessionLoaded = true;

    try {
        const raw = window.localStorage.getItem(EDITOR_SESSION_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as PersistedEditorSession;
        target.textDraftByKey.clear();
        target.blocklyWorkspaceXmlByKey.clear();

        Object.entries(parsed.textDraftByKey || {}).forEach(([key, value]) => {
            if (typeof value === 'string') {
                target.textDraftByKey.set(key, value);
            }
        });

        Object.entries(parsed.blocklyWorkspaceXmlByKey || {}).forEach(([key, value]) => {
            if (typeof value === 'string') {
                target.blocklyWorkspaceXmlByKey.set(key, value);
            }
        });

        return parsed;
    } catch {
        // Ignore malformed persisted state and continue with defaults.
        return null;
    }
}

export function getSavedEditorDraft(
    textDraftByKey: Map<string, string>,
    currentDroneId: string,
    language: ScriptLanguage
): string | null {
    return textDraftByKey.get(getEditorStateKey(currentDroneId, language)) || null;
}
