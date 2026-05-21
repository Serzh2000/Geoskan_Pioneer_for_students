import type { ScriptLanguage } from '../../api-docs/sections.js';
import type { GuidePortalPageId, GuideTabId } from '../types.js';

const GUIDE_PROGRESS_STORAGE_KEY = 'pioneer:mission-guide:progress:v1';
const GUIDE_SESSION_STORAGE_KEY = 'pioneer:mission-guide:session:v1';

export type GuidePersistedSessionState = {
    activeLessonByLanguage?: Partial<Record<ScriptLanguage, string>>;
    activeChapterByLanguage?: Partial<Record<ScriptLanguage, string>>;
    activeTabByLanguage?: Partial<Record<ScriptLanguage, GuideTabId>>;
    activePortalPageByLanguage?: Partial<Record<ScriptLanguage, GuidePortalPageId>>;
    lessonSequences?: Record<string, string[]>;
    lessonWorkspaceXml?: Record<string, string>;
};

export type GuideLoadedSessionState = {
    activeLessonByLanguage: Record<ScriptLanguage, string>;
    activeChapterByLanguage: Record<ScriptLanguage, string>;
    activeTabByLanguage: Record<ScriptLanguage, GuideTabId>;
    activePortalPageByLanguage: Record<ScriptLanguage, GuidePortalPageId>;
    lessonSequences: Map<string, string[]>;
    lessonWorkspaceXml: Map<string, string>;
};

export function createDefaultSessionState(): GuideLoadedSessionState {
    return {
        activeLessonByLanguage: {
            lua: '',
            python: ''
        },
        activeChapterByLanguage: {
            lua: '',
            python: ''
        },
        activeTabByLanguage: {
            lua: 'tutorial',
            python: 'tutorial'
        },
        activePortalPageByLanguage: {
            lua: 'intro',
            python: 'intro'
        },
        lessonSequences: new Map<string, string[]>(),
        lessonWorkspaceXml: new Map<string, string>()
    };
}

export function loadGuideSessionState(): GuideLoadedSessionState {
    const defaultState = createDefaultSessionState();

    try {
        const raw = window.localStorage.getItem(GUIDE_SESSION_STORAGE_KEY);
        if (!raw) return defaultState;

        const parsed = JSON.parse(raw) as GuidePersistedSessionState;
        return {
            activeLessonByLanguage: {
                lua: parsed.activeLessonByLanguage?.lua || '',
                python: parsed.activeLessonByLanguage?.python || ''
            },
            activeChapterByLanguage: {
                lua: parsed.activeChapterByLanguage?.lua || '',
                python: parsed.activeChapterByLanguage?.python || ''
            },
            activeTabByLanguage: {
                lua: parsed.activeTabByLanguage?.lua === 'trainer' ? 'trainer' : 'tutorial',
                python: parsed.activeTabByLanguage?.python === 'trainer' ? 'trainer' : 'tutorial'
            },
            activePortalPageByLanguage: {
                lua: parsed.activePortalPageByLanguage?.lua === 'lesson' ? 'lesson' : 'intro',
                python: parsed.activePortalPageByLanguage?.python === 'lesson' ? 'lesson' : 'intro'
            },
            lessonSequences: new Map<string, string[]>(
                Object.entries(parsed.lessonSequences || {})
                    .filter(([, sequence]) => Array.isArray(sequence))
                    .map(([key, sequence]) => [key, [...sequence]])
            ),
            lessonWorkspaceXml: new Map<string, string>(
                Object.entries(parsed.lessonWorkspaceXml || {})
                    .filter(([, xml]) => typeof xml === 'string' && xml.length > 0)
                    .map(([key, xml]) => [key, xml])
            )
        };
    } catch {
        return defaultState;
    }
}

export function loadGuideProgress(): Record<ScriptLanguage, Set<string>> {
    const emptyState: Record<ScriptLanguage, Set<string>> = {
        lua: new Set<string>(),
        python: new Set<string>()
    };

    try {
        const raw = window.localStorage.getItem(GUIDE_PROGRESS_STORAGE_KEY);
        if (!raw) return emptyState;
        const parsed = JSON.parse(raw) as Partial<Record<ScriptLanguage, string[]>>;
        return {
            lua: new Set(Array.isArray(parsed.lua) ? parsed.lua : []),
            python: new Set(Array.isArray(parsed.python) ? parsed.python : [])
        };
    } catch {
        return emptyState;
    }
}

export function persistGuideProgress(completedLessonsByLanguage: Record<ScriptLanguage, Set<string>>): void {
    try {
        window.localStorage.setItem(GUIDE_PROGRESS_STORAGE_KEY, JSON.stringify({
            lua: [...completedLessonsByLanguage.lua],
            python: [...completedLessonsByLanguage.python]
        }));
    } catch {
        // Ignore storage failures in embedded/private browsing contexts.
    }
}

export function persistGuideSessionState(params: {
    activeLessonByLanguage: Record<ScriptLanguage, string>;
    activeChapterByLanguage: Record<ScriptLanguage, string>;
    activeTabByLanguage: Record<ScriptLanguage, GuideTabId>;
    activePortalPageByLanguage: Record<ScriptLanguage, GuidePortalPageId>;
    lessonSequences: Map<string, string[]>;
    lessonWorkspaceXml: Map<string, string>;
}): void {
    try {
        window.localStorage.setItem(GUIDE_SESSION_STORAGE_KEY, JSON.stringify({
            activeLessonByLanguage: params.activeLessonByLanguage,
            activeChapterByLanguage: params.activeChapterByLanguage,
            activeTabByLanguage: params.activeTabByLanguage,
            activePortalPageByLanguage: params.activePortalPageByLanguage,
            lessonSequences: Object.fromEntries(params.lessonSequences.entries()),
            lessonWorkspaceXml: Object.fromEntries(params.lessonWorkspaceXml.entries())
        } satisfies GuidePersistedSessionState));
    } catch {
        // Ignore storage failures in embedded/private browsing contexts.
    }
}
