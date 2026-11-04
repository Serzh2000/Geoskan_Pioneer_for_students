import { ACADEMY_LESSONS, ACADEMY_MODULES, type AcademyLesson } from '../academy/catalog.js';
import { getGuideLessonState } from '../lessons.js';
import { isAcademyLessonComplete } from '../course-navigation.js';
import { getLuaTextLessonState } from '../lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../lessons/catalog/python-text.js';
import { escapeHtml } from '../render/shared.js';
import { isLessonCompleted, isLessonUnlocked, isTextLessonUnlocked } from '../state.js';
import type { GuideLessonState } from '../types.js';
import type { BookVolume } from './source.js';
import { renderVolumeMark } from './volume-marks.js';

/** One lesson as the contents see it: how to open it and whether it may be opened. */
type TabLesson = { id: string; num: number; label: string; title: string; done: boolean; unlocked: boolean; open: string };
type TabChapter = { name: string; tag: string; python: boolean; lessons: TabLesson[] };

/** The lesson before or after the open one (in the order of the volume, across chapters). */
export type LessonStep = { attr: string; label: string; open: boolean };

export type Bookmarks = {
    /** The name of the open chapter, written in the bar. */
    chapter: string;
    /** Which lesson of the chapter is open: «Урок 2 · 2 из 9». */
    place: string;
    /** The bookmarks of the topics and lessons along the left edge of the sheet. */
    tabs: string;
    previous: LessonStep;
    next: LessonStep;
};

const FIRST_PYTHON_LESSON = 73;

function chapterName(title: string): string {
    return title.replace(/^\d+\.\s*/, '');
}

function tag(index: number): string {
    return String(index + 1).padStart(2, '0');
}

/** The numbered course of a text track, followed by its extra practice tasks as a last chapter. */
function courseChapters(language: 'lua' | 'python'): TabChapter[] {
    const luaState = getLuaTextLessonState();
    const pythonState = getPythonTextLessonState();
    const openable = (item: AcademyLesson): boolean => {
        const target = item.number >= FIRST_PYTHON_LESSON ? 'python' : language;
        return isTextLessonUnlocked(target === 'python' ? pythonState : luaState, target, `${target}-${item.id}`);
    };
    const chapters: TabChapter[] = ACADEMY_MODULES.map((module, index) => ({
        name: chapterName(module.title),
        tag: tag(index),
        python: module.lessons[0].number >= FIRST_PYTHON_LESSON,
        lessons: module.lessons.map(item => ({
            id: item.id, num: item.number, label: `Урок ${item.number}`, title: item.title,
            done: isAcademyLessonComplete(item.id), unlocked: openable(item), open: `data-academy-open="${item.id}"`
        }))
    }));
    const state = language === 'python' ? pythonState : luaState;
    const extras = state.lessons.filter(lesson => !lesson.academy);
    if (extras.length) {
        chapters.push({
            name: 'Дополнительная практика', tag: 'Доп', python: false,
            lessons: extras.map((lesson, index) => ({
                id: lesson.id, num: index + 1, label: `Задание ${index + 1}`, title: lesson.title,
                done: isLessonCompleted(language, lesson.id), unlocked: isTextLessonUnlocked(state, language, lesson.id), open: `data-guide-text-lesson="${lesson.id}"`
            }))
        });
    }
    return chapters;
}

/** The chapters of the Blockly assignments of one script language. */
function blocklyChapters(state: GuideLessonState, language: 'lua' | 'python'): TabChapter[] {
    return state.chapters.map((chapter, index) => ({
        name: chapter.title,
        tag: tag(index),
        python: false,
        lessons: state.lessons.filter(lesson => lesson.chapterId === chapter.id).map(lesson => ({
            id: lesson.id, num: state.lessons.indexOf(lesson) + 1, label: `Задание ${state.lessons.indexOf(lesson) + 1}`, title: lesson.title,
            done: isLessonCompleted(language, lesson.id), unlocked: isLessonUnlocked(state, language, lesson.id), open: `data-guide-open-lesson="${lesson.id}"`
        }))
    }));
}

const TICK = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8.6l3.4 3.6L13.6 3.4"/></svg>';
const LOCK = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="6.8" rx="1.4"/><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7"/></svg>';

function lessonStep(lesson: TabLesson | undefined, direction: 'previous' | 'next'): LessonStep {
    if (!lesson) return { attr: '', label: direction === 'next' ? 'Это последний урок тома' : 'Это первый урок тома', open: false };
    const word = direction === 'next' ? 'Следующий урок' : 'Предыдущий урок';
    const locked = !lesson.unlocked;
    return { attr: lesson.open, label: `${word}: ${lesson.label}. ${lesson.title}${locked ? ' (откроется после предыдущего)' : ''}`, open: !locked };
}

/**
 * The bookmarks along the left edge of the sheet: first the topics (chapters) of the volume; choosing a topic turns the
 * bookmarks into its lessons, with one more bookmark to go back to the topics. Which group shows is switched in the page
 * (interactions/book.ts), so a lesson of the same topic is one click away without turning back.
 */
function renderTopicTabs(chapters: TabChapter[], current: TabChapter, activeLesson: TabLesson | undefined): string {
    const topics = chapters.map((chapter, index) => {
        const done = chapter.lessons.filter(lesson => lesson.done).length;
        const label = `${chapter.name}${chapter.python ? ' (Python)' : ''}, пройдено ${done} из ${chapter.lessons.length}`;
        return `<li><button type="button" class="book-tab book-tab--topic${chapter === current ? ' is-current' : ''}${done === chapter.lessons.length ? ' is-done' : ''}" data-tabs-open="${index}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span class="book-tab__tag" aria-hidden="true">${chapter.tag}</span><span class="book-tab__name">${escapeHtml(chapter.name)}</span><span class="book-tab__count" aria-hidden="true">${done}/${chapter.lessons.length}</span></button></li>`;
    }).join('');
    const groups = chapters.map((chapter, index) => {
        const rows = chapter.lessons.map(lesson => {
            const active = lesson === activeLesson;
            const state = lesson.done ? ', пройдено' : !lesson.unlocked ? ', откроется после предыдущего' : '';
            const label = `${lesson.label}. ${lesson.title}${state}`;
            const mark = lesson.done ? TICK : !lesson.unlocked ? LOCK : '';
            return `<li><button type="button" class="book-tab book-tab--lesson${active ? ' is-current' : ''}${lesson.done ? ' is-done' : ''}${lesson.unlocked ? '' : ' is-locked'}" ${lesson.open} ${lesson.unlocked ? '' : 'disabled'} ${active ? 'aria-current="page"' : ''} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span class="book-tab__tag" aria-hidden="true">${lesson.num}</span><span class="book-tab__name">${escapeHtml(lesson.title)}</span><span class="book-tab__count" aria-hidden="true">${mark}</span></button></li>`;
        }).join('');
        return `<ul class="book-tabs__group" data-tabs-group="${index}" hidden aria-label="${escapeHtml(chapter.name)}"><li><button type="button" class="book-tab book-tab--back" data-tabs-back aria-label="Назад к темам тома" title="Назад к темам тома"><span class="book-tab__tag" aria-hidden="true">←</span><span class="book-tab__name">Темы</span></button></li>${rows}</ul>`;
    }).join('');
    return `<nav class="book-tabs" data-tabs-current="${chapters.indexOf(current)}" aria-label="Темы и уроки тома"><ul class="book-tabs__group" data-tabs-group="topics" aria-label="Темы">${topics}</ul>${groups}</nav>`;
}

function renderTabs(chapters: TabChapter[], activeId: string): Bookmarks {
    const isActive = (lesson: TabLesson): boolean => activeId === lesson.id || activeId.endsWith(`-${lesson.id}`);
    const current = chapters.find(chapter => chapter.lessons.some(isActive)) ?? chapters[0];
    const position = Math.max(0, current.lessons.findIndex(isActive));
    const lesson = current.lessons[position];
    const order = chapters.flatMap(chapter => chapter.lessons);
    const at = order.indexOf(lesson);
    return {
        chapter: current.name,
        place: `${lesson.label} · ${position + 1} из ${current.lessons.length}`,
        tabs: renderTopicTabs(chapters, current, lesson),
        previous: lessonStep(order[at - 1], 'previous'),
        next: lessonStep(order[at + 1], 'next')
    };
}

/** Opening goes through the handlers of the lesson buttons, so the same locks apply. */
export function renderBookmarks(volume: BookVolume, language: 'lua' | 'python', activeId: string): Bookmarks {
    return renderTabs(volume === 'blockly' ? blocklyChapters(getGuideLessonState(language), language) : courseChapters(language), activeId);
}

/** The three volumes of the course as bookmarks on the right edge of the sheet. Switching is the same as the tabs of the modal header, which the book hides. */
export function renderVolumes(active: BookVolume, busy: boolean): string {
    const volumes = [
        ['python', 'Python', ACADEMY_LESSONS.length],
        ['lua', 'Lua', ACADEMY_LESSONS.filter(item => item.languages.includes('lua')).length],
        ['blockly', 'Blockly', getGuideLessonState('lua').lessons.length]
    ] as const;
    const tabs = volumes.map(([id, name, count]) => `<button type="button" class="book-vol${id === active ? ' is-active' : ''}" role="tab" aria-selected="${id === active}" data-book-track="${id}" ${busy ? 'disabled' : ''} aria-label="${name}, ${count} ${id === 'blockly' ? 'заданий' : 'уроков'}" title="Том «${name}»: ${count}">${renderVolumeMark(id)}<span class="book-vol__name">${name}</span></button>`).join('');
    return `<nav class="book-volumes" role="tablist" aria-label="Язык курса">${tabs}</nav>`;
}
