import { getNextTextLesson, getPreviousTextLesson } from '../state.js';
import type { GuideTextLesson, GuideTextLessonState } from '../types.js';

export type LessonNav = {
    note: string;
    previous: GuideTextLesson | null;
    /** The way forward: the next lesson, the Python camera lessons after Lua lesson 72, or nothing at the end of a track. */
    next: { kind: 'lesson'; lesson: GuideTextLesson } | { kind: 'python' } | null;
};

/** Where a finished lesson leads, said once for the plain page and the book. */
export function describeLessonNav(state: GuideTextLessonState, track: 'lua' | 'python', lesson: GuideTextLesson): LessonNav {
    const continuesOnPython = track === 'lua' && lesson.academy?.number === 72;
    const courseEnd = lesson.academy?.number === 108;
    const nextLesson = continuesOnPython || courseEnd ? null : getNextTextLesson(state, lesson.id);
    const note = continuesOnPython
        ? 'Урок принят. Продолжайте с нижней камерой и ArUco на Python.'
        : courseEnd
            ? 'Все этапы итоговой миссии подтверждены. Курс из 108 уроков завершён.'
            : nextLesson ? 'Урок принят. Можно переходить к следующему.' : 'Урок принят. Это последнее задание текущего трека.';
    return {
        note,
        previous: getPreviousTextLesson(state, lesson.id),
        next: continuesOnPython ? { kind: 'python' } : nextLesson ? { kind: 'lesson', lesson: nextLesson } : null
    };
}
