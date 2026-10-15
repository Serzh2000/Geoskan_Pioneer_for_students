import type { ScriptLanguage } from '../api-docs/sections.js';
import type {
    GuideChapter,
    GuideLesson,
    GuideLessonState,
    GuideLessonStepId,
    GuidePortalPageId,
    GuidePracticeTrack,
    GuideTabId,
    GuideTextLesson,
    GuideTextLessonState,
    RuntimeBanner
} from './types.js';
import {
    loadGuideProgress,
    loadGuideSessionState,
    persistGuideProgress,
    persistGuideSessionState
} from './state/storage.js';

const loadedSessionState = loadGuideSessionState();

const activeLessonByLanguage: Record<ScriptLanguage, string> = loadedSessionState.activeLessonByLanguage;
const activeChapterByLanguage: Record<ScriptLanguage, string> = loadedSessionState.activeChapterByLanguage;
const activeTabByLanguage: Record<ScriptLanguage, GuideTabId> = loadedSessionState.activeTabByLanguage;
const activePortalPageByLanguage: Record<ScriptLanguage, GuidePortalPageId> = loadedSessionState.activePortalPageByLanguage;
const activeStepByLessonKey: Record<string, GuideLessonStepId> = loadedSessionState.activeStepByLessonKey;
let activePracticeTrack: GuidePracticeTrack = loadedSessionState.activePracticeTrack;

const lessonBanners = new Map<string, RuntimeBanner>();
const lessonChecks = new Map<string, boolean>();
const completedLessonsByLanguage: Record<ScriptLanguage, Set<string>> = loadGuideProgress();

function persistCurrentGuideSessionState(): void {
    persistGuideSessionState({
        activeLessonByLanguage,
        activeChapterByLanguage,
        activeTabByLanguage,
        activePortalPageByLanguage,
        activeStepByLessonKey,
        activePracticeTrack
    });
}

function getStateKey(language: ScriptLanguage, lessonId: string): string {
    return `${language}:${lessonId}`;
}

export function ensureActiveLessonId(language: ScriptLanguage, lessonId: string): void {
    if (!activeLessonByLanguage[language]) {
        activeLessonByLanguage[language] = lessonId;
        persistCurrentGuideSessionState();
    }
}

export function ensureActiveChapterId(language: ScriptLanguage, chapterId: string): void {
    if (!activeChapterByLanguage[language]) {
        activeChapterByLanguage[language] = chapterId;
        persistCurrentGuideSessionState();
    }
}

export function setActiveLessonId(language: ScriptLanguage, lessonId: string): void {
    activeLessonByLanguage[language] = lessonId;
    activeStepByLessonKey[getStateKey(language, lessonId)] = 'theory';
    persistCurrentGuideSessionState();
}

export function setActiveGuideStep(language: ScriptLanguage, lessonId: string, step: GuideLessonStepId): void {
    activeStepByLessonKey[getStateKey(language, lessonId)] = step;
    persistCurrentGuideSessionState();
}

export function setActiveChapterId(language: ScriptLanguage, chapterId: string): void {
    activeChapterByLanguage[language] = chapterId;
    persistCurrentGuideSessionState();
}

export function getActiveTab(language: ScriptLanguage): GuideTabId {
    return activeTabByLanguage[language];
}

export function setActiveTab(language: ScriptLanguage, tab: GuideTabId): void {
    activeTabByLanguage[language] = tab;
    persistCurrentGuideSessionState();
}

export function setActivePortalPage(language: ScriptLanguage, page: GuidePortalPageId): void {
    activePortalPageByLanguage[language] = page;
    persistCurrentGuideSessionState();
}

export function getActivePracticeTrack(): GuidePracticeTrack {
    return activePracticeTrack;
}

export function setActivePracticeTrack(track: GuidePracticeTrack): void {
    activePracticeTrack = track;
    persistCurrentGuideSessionState();
}

export function getActiveLesson(state: GuideLessonState, language: ScriptLanguage): GuideLesson {
    const desiredId = activeLessonByLanguage[language] || state.activeLessonId;
    return state.lessons.find((lesson) => lesson.id === desiredId) || state.lessons[0];
}

export function getLessonsForChapter(state: GuideLessonState, chapterId: string): GuideLesson[] {
    return state.lessons.filter((lesson) => lesson.chapterId === chapterId);
}

export function getActiveChapter(state: GuideLessonState, language: ScriptLanguage): GuideChapter {
    const lesson = getActiveLesson(state, language);
    const desiredId = activeChapterByLanguage[language] || lesson.chapterId || state.chapters[0]?.id || '';
    return state.chapters.find((chapter) => chapter.id === desiredId)
        || state.chapters.find((chapter) => chapter.id === lesson.chapterId)
        || state.chapters[0];
}

export function getLessonIndex(state: GuideLessonState, lessonId: string): number {
    return state.lessons.findIndex((lesson) => lesson.id === lessonId);
}

export function getPreviousLesson(state: GuideLessonState, lessonId: string): GuideLesson | null {
    const currentIndex = getLessonIndex(state, lessonId);
    if (currentIndex <= 0) return null;
    return state.lessons[currentIndex - 1] || null;
}

export function getNextLesson(state: GuideLessonState, lessonId: string): GuideLesson | null {
    const currentIndex = getLessonIndex(state, lessonId);
    if (currentIndex < 0 || currentIndex >= state.lessons.length - 1) return null;
    return state.lessons[currentIndex + 1] || null;
}

export function isLessonCompleted(language: ScriptLanguage, lessonId: string): boolean {
    return completedLessonsByLanguage[language].has(lessonId);
}

export function setLessonCompleted(language: ScriptLanguage, lessonId: string, completed: boolean): void {
    if (completed) {
        completedLessonsByLanguage[language].add(lessonId);
    } else {
        completedLessonsByLanguage[language].delete(lessonId);
    }
    persistGuideProgress(completedLessonsByLanguage);
}

export function isLessonUnlocked(state: GuideLessonState, language: ScriptLanguage, lessonId: string): boolean {
    const currentIndex = getLessonIndex(state, lessonId);
    if (currentIndex <= 0) return true;
    const previousLesson = state.lessons[currentIndex - 1];
    return previousLesson ? isLessonCompleted(language, previousLesson.id) : true;
}

export function getFirstUnlockedLesson(state: GuideLessonState, language: ScriptLanguage): GuideLesson {
    return state.lessons.find((lesson) => !isLessonCompleted(language, lesson.id) && isLessonUnlocked(state, language, lesson.id)) || state.lessons[0];
}

export function setLessonBanner(language: ScriptLanguage, lessonId: string, banner: RuntimeBanner | null): void {
    const key = getStateKey(language, lessonId);
    if (banner) lessonBanners.set(key, banner);
    else lessonBanners.delete(key);
}

export function getLessonBanner(language: ScriptLanguage, lessonId: string): RuntimeBanner | null {
    return lessonBanners.get(getStateKey(language, lessonId)) || null;
}

export function setLessonChecked(language: ScriptLanguage, lessonId: string, checked: boolean): void {
    lessonChecks.set(getStateKey(language, lessonId), checked);
}

export function isLessonChecked(language: ScriptLanguage, lessonId: string): boolean {
    return lessonChecks.get(getStateKey(language, lessonId)) || false;
}

// Text-track (hand-typed Lua/Python) equivalents of the Blockly-track helpers
// above. `track` reuses the same string keyspace as `language` (activeLessonByLanguage`
// etc. are keyed by plain strings), so lesson/step/checked/banner/progress state
// naturally stays separate between e.g. Blockly-lua ('lua-led-single') and
// Lua-text ('lua-led-single-text') lessons without any extra bookkeeping — the ids
// never collide.
export function getActiveTextLesson(state: GuideTextLessonState, track: 'lua' | 'python'): GuideTextLesson {
    const desiredId = activeLessonByLanguage[track] || state.activeLessonId;
    return state.lessons.find((lesson) => lesson.id === desiredId) || state.lessons[0];
}

export function getTextLessonIndex(state: GuideTextLessonState, lessonId: string): number {
    return state.lessons.findIndex((lesson) => lesson.id === lessonId);
}

export function getNextTextLesson(state: GuideTextLessonState, lessonId: string): GuideTextLesson | null {
    const currentIndex = getTextLessonIndex(state, lessonId);
    if (currentIndex < 0 || currentIndex >= state.lessons.length - 1) return null;
    return state.lessons[currentIndex + 1] || null;
}

export function getPreviousTextLesson(state: GuideTextLessonState, lessonId: string): GuideTextLesson | null {
    const currentIndex = getTextLessonIndex(state, lessonId);
    if (currentIndex <= 0) return null;
    return state.lessons[currentIndex - 1] || null;
}
export function isTextLessonUnlocked(state: GuideTextLessonState, track: 'lua' | 'python', lessonId: string): boolean {
    const index = state.lessons.findIndex((lesson) => lesson.id === lessonId);
    if (index < 0) return false;
    const academy = state.lessons[index].academy;
    if (academy) return academy.number === 1 || isLessonCompleted(track, lessonId) || ['lua', 'python'].some(language => isLessonCompleted(language as 'lua' | 'python', `${language}-academy-${String(academy.number - 1).padStart(3, '0')}`));
    return index === 0 || isLessonCompleted(track, lessonId) || isLessonCompleted(track, state.lessons[index - 1].id);
}
