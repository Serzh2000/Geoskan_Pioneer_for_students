import { ACADEMY_MODULES } from '../academy/catalog.js';
import { getLearningNote } from '../render/learning.js';
import type { GuideLesson, GuideLessonState, GuideTextLesson, GuideTextLessonState } from '../types.js';

/** The three volumes of the course; the book is bound to one of them at a time. */
export type BookVolume = 'lua' | 'python' | 'blockly';
export type BookKind = 'course' | 'practice' | 'blockly';

/**
 * What the book needs to know about a lesson, whichever list it comes from: the numbered course,
 * the extra practice tasks of a text track, or the Blockly assignments.
 */
export type BookSource = {
    kind: BookKind;
    lesson: GuideTextLesson | GuideLesson;
    /** The language the lesson's progress, drafts and gates are kept under. */
    language: 'lua' | 'python';
    volume: BookVolume;
    /** The number printed in the lesson's heading and figure captions. */
    number: number;
    /** "Урок 10", "Задание 3". */
    label: string;
    /** What the practice spread asks the reader to work on. */
    mode: 'code' | 'inspect' | 'blocks';
    chapter: string;
    hint: string;
    experiment: string;
    /** Pages before this lesson's first page: the extra tasks follow the course in the same volume. */
    pageOffset: number;
};

const PAGES_PER_LESSON = 6;
const PRACTICE_TITLE = 'Дополнительная практика';

function chapterName(title: string): string {
    return title.replace(/^\d+\.\s*/, '');
}

/** A lesson of the numbered course (Lua 1–72, Python 1–108). */
export function courseSource(lesson: GuideTextLesson, track: 'lua' | 'python'): BookSource {
    const academy = lesson.academy!;
    const module = ACADEMY_MODULES.find(item => item.id === lesson.chapterId);
    return {
        kind: 'course', lesson, language: track, volume: track, number: academy.number, label: `Урок ${academy.number}`,
        mode: academy.mode, chapter: module ? chapterName(module.title) : 'Практика',
        hint: academy.hints[0] ?? lesson.builderHint, experiment: academy.experiment, pageOffset: 0
    };
}

/** One of the extra practice tasks that follow the course in a text track. */
export function practiceSource(state: GuideTextLessonState, lesson: GuideTextLesson, track: 'lua' | 'python'): BookSource {
    const extras = state.lessons.filter(item => !item.academy);
    const number = extras.findIndex(item => item.id === lesson.id) + 1;
    const courseLessons = state.lessons.length - extras.length;
    return {
        kind: 'practice', lesson, language: track, volume: track, number, label: `Задание ${number}`,
        mode: 'code', chapter: PRACTICE_TITLE, hint: lesson.builderHint, experiment: getLearningNote(lesson)?.experiment ?? '',
        pageOffset: courseLessons * PAGES_PER_LESSON
    };
}

/** One of the ten Blockly assignments of the current script language. */
export function blocklySource(state: GuideLessonState, lesson: GuideLesson, language: 'lua' | 'python'): BookSource {
    const number = state.lessons.findIndex(item => item.id === lesson.id) + 1;
    const chapter = state.chapters.find(item => item.id === lesson.chapterId);
    return {
        kind: 'blockly', lesson, language, volume: 'blockly', number, label: `Задание ${number}`,
        mode: 'blocks', chapter: chapter?.title ?? 'Практикум Blockly', hint: lesson.builderHint,
        experiment: getLearningNote(lesson)?.experiment ?? '', pageOffset: 0
    };
}
