import type { ScriptLanguage } from '../api-docs/sections.js';
import type { GuideLesson, GuideLessonState, RuntimeBanner } from './types.js';

const activeLessonByLanguage: Record<ScriptLanguage, string> = {
    lua: '',
    python: ''
};

const lessonSequences = new Map<string, string[]>();
const lessonBanners = new Map<string, RuntimeBanner>();

function getStateKey(language: ScriptLanguage, lessonId: string): string {
    return `${language}:${lessonId}`;
}

export function ensureActiveLessonId(language: ScriptLanguage, lessonId: string): void {
    if (!activeLessonByLanguage[language]) {
        activeLessonByLanguage[language] = lessonId;
    }
}

export function setActiveLessonId(language: ScriptLanguage, lessonId: string): void {
    activeLessonByLanguage[language] = lessonId;
}

export function getActiveLesson(state: GuideLessonState, language: ScriptLanguage): GuideLesson {
    const desiredId = activeLessonByLanguage[language] || state.activeLessonId;
    return state.lessons.find((lesson) => lesson.id === desiredId) || state.lessons[0];
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
}

export function clearLessonSequence(language: ScriptLanguage, lessonId: string): void {
    lessonSequences.set(getStateKey(language, lessonId), []);
}

export function setLessonBanner(language: ScriptLanguage, lessonId: string, banner: RuntimeBanner | null): void {
    const key = getStateKey(language, lessonId);
    if (banner) lessonBanners.set(key, banner);
    else lessonBanners.delete(key);
}

export function getLessonBanner(language: ScriptLanguage, lessonId: string): RuntimeBanner | null {
    return lessonBanners.get(getStateKey(language, lessonId)) || null;
}
