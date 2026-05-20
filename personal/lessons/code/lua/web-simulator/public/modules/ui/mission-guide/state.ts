import type { ScriptLanguage } from '../api-docs/sections.js';
import type {
    GuideChapter,
    GuideLesson,
    GuideLessonProgressState,
    GuideLessonState,
    GuidePortalPageId,
    GuideTabId,
    GuideThemeId,
    RuntimeBanner
} from './types.js';
import {
    loadGuideProgress,
    loadGuideSessionState,
    persistGuideProgress,
    persistGuideSessionState
} from './state-storage.js';

const loadedSessionState = loadGuideSessionState();

const activeLessonByLanguage: Record<ScriptLanguage, string> = loadedSessionState.activeLessonByLanguage;
const activeChapterByLanguage: Record<ScriptLanguage, string> = loadedSessionState.activeChapterByLanguage;
const activeTabByLanguage: Record<ScriptLanguage, GuideTabId> = loadedSessionState.activeTabByLanguage;
const activePortalPageByLanguage: Record<ScriptLanguage, GuidePortalPageId> = loadedSessionState.activePortalPageByLanguage;
let activeGuideTheme: GuideThemeId = 'dark';

const lessonSequences = loadedSessionState.lessonSequences;
const lessonWorkspaceXml = loadedSessionState.lessonWorkspaceXml;
const lessonBanners = new Map<string, RuntimeBanner>();
const lessonChecks = new Map<string, boolean>();
const lessonSolutionVisibility = new Map<string, boolean>();
const lessonGeneratedCodeVisibility = new Map<string, boolean>();
const completedLessonsByLanguage: Record<ScriptLanguage, Set<string>> = loadGuideProgress();

function persistCurrentGuideSessionState(): void {
    persistGuideSessionState({
        activeLessonByLanguage,
        activeChapterByLanguage,
        activeTabByLanguage,
        activePortalPageByLanguage,
        lessonSequences,
        lessonWorkspaceXml
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

export function getActivePortalPage(language: ScriptLanguage): GuidePortalPageId {
    return activePortalPageByLanguage[language];
}

export function setActivePortalPage(language: ScriptLanguage, page: GuidePortalPageId): void {
    activePortalPageByLanguage[language] = page;
    persistCurrentGuideSessionState();
}

export function getActiveGuideTheme(): GuideThemeId {
    return activeGuideTheme;
}

export function setActiveGuideTheme(theme: GuideThemeId): void {
    activeGuideTheme = theme;
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

export function getCompletedLessonsCount(state: GuideLessonState, language: ScriptLanguage): number {
    return state.lessons.filter((lesson) => isLessonCompleted(language, lesson.id)).length;
}

export function isLessonUnlocked(state: GuideLessonState, language: ScriptLanguage, lessonId: string): boolean {
    const currentIndex = getLessonIndex(state, lessonId);
    if (currentIndex <= 0) return true;
    const previousLesson = state.lessons[currentIndex - 1];
    return previousLesson ? isLessonCompleted(language, previousLesson.id) : true;
}

export function getLessonProgressState(
    state: GuideLessonState,
    language: ScriptLanguage,
    lessonId: string
): GuideLessonProgressState {
    if (isLessonCompleted(language, lessonId)) {
        return 'completed';
    }
    if (!isLessonUnlocked(state, language, lessonId)) {
        return 'locked';
    }
    if (getActiveLesson(state, language).id === lessonId) {
        return 'in_progress';
    }
    return 'available';
}

export function getFirstUnlockedLesson(state: GuideLessonState, language: ScriptLanguage): GuideLesson {
    return state.lessons.find((lesson) => isLessonUnlocked(state, language, lesson.id)) || state.lessons[0];
}

export function getLessonSequence(language: ScriptLanguage, lessonId: string): string[] {
    const key = getStateKey(language, lessonId);
    if (!lessonSequences.has(key)) {
        lessonSequences.set(key, []);
    }
    return [...(lessonSequences.get(key) || [])];
}

export function setLessonSequence(language: ScriptLanguage, lessonId: string, sequence: string[]): void {
    lessonSequences.set(getStateKey(language, lessonId), [...sequence]);
    persistCurrentGuideSessionState();
}

export function setLessonWorkspaceState(language: ScriptLanguage, lessonId: string, xml: string | null): void {
    const key = getStateKey(language, lessonId);
    if (xml) lessonWorkspaceXml.set(key, xml);
    else lessonWorkspaceXml.delete(key);
    persistCurrentGuideSessionState();
}

export function getLessonWorkspaceState(language: ScriptLanguage, lessonId: string): string | null {
    return lessonWorkspaceXml.get(getStateKey(language, lessonId)) || null;
}

export function clearLessonSequence(language: ScriptLanguage, lessonId: string): void {
    lessonSequences.set(getStateKey(language, lessonId), []);
    lessonWorkspaceXml.delete(getStateKey(language, lessonId));
    persistCurrentGuideSessionState();
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

export function setLessonSolutionVisible(language: ScriptLanguage, lessonId: string, visible: boolean): void {
    lessonSolutionVisibility.set(getStateKey(language, lessonId), visible);
}

export function isLessonSolutionVisible(language: ScriptLanguage, lessonId: string): boolean {
    return lessonSolutionVisibility.get(getStateKey(language, lessonId)) || false;
}

export function setLessonGeneratedCodeVisible(language: ScriptLanguage, lessonId: string, visible: boolean): void {
    lessonGeneratedCodeVisibility.set(getStateKey(language, lessonId), visible);
}

export function isLessonGeneratedCodeVisible(language: ScriptLanguage, lessonId: string): boolean {
    return lessonGeneratedCodeVisibility.get(getStateKey(language, lessonId)) || false;
}
