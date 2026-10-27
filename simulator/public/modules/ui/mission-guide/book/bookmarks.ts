import { ACADEMY_LESSONS, ACADEMY_MODULES, type AcademyLesson } from '../academy/catalog.js';
import { getGuideLessonState } from '../lessons.js';
import { isAcademyLessonComplete } from '../course-navigation.js';
import { getLuaTextLessonState } from '../lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../lessons/catalog/python-text.js';
import { escapeHtml } from '../render/shared.js';
import { isLessonCompleted, isLessonUnlocked, isTextLessonUnlocked } from '../state.js';
import type { GuideLessonState } from '../types.js';
import type { BookVolume } from './source.js';

/** One lesson as the bookmarks see it: how to open it and whether it may be opened. */
type TabLesson = { id: string; label: string; title: string; done: boolean; unlocked: boolean; open: string };
type TabChapter = { name: string; heading: string; tag: string; python: boolean; lessons: TabLesson[] };

export type Bookmarks = {
    /** Numbered tabs on the top edge: the lessons of the open chapter. */
    lessons: string;
    /** What the top row is, written in the margin above it. */
    lessonsLabel: string;
    /** Tabs on the outer edge: the chapters of the volume. */
    chapters: string;
};

const FIRST_PYTHON_LESSON = 73;
const MAX_SPINE_TITLE = 30;

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
        heading: `Уроки главы «${chapterName(module.title)}»`,
        tag: tag(index),
        python: module.lessons[0].number >= FIRST_PYTHON_LESSON,
        lessons: module.lessons.map(item => ({
            id: item.id, label: `Урок ${item.number}`, title: item.title,
            done: isAcademyLessonComplete(item.id), unlocked: openable(item), open: `data-academy-open="${item.id}"`
        }))
    }));
    const state = language === 'python' ? pythonState : luaState;
    const extras = state.lessons.filter(lesson => !lesson.academy);
    if (extras.length) {
        chapters.push({
            name: 'Дополнительная практика', heading: 'Дополнительная практика', tag: 'Доп', python: false,
            lessons: extras.map((lesson, index) => ({
                id: lesson.id, label: `Задание ${index + 1}`, title: lesson.title,
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
        heading: `Задания главы «${chapter.title}»`,
        tag: tag(index),
        python: false,
        lessons: state.lessons.filter(lesson => lesson.chapterId === chapter.id).map(lesson => ({
            id: lesson.id, label: `Задание ${state.lessons.indexOf(lesson) + 1}`, title: lesson.title,
            done: isLessonCompleted(language, lesson.id), unlocked: isLessonUnlocked(state, language, lesson.id), open: `data-guide-open-lesson="${lesson.id}"`
        }))
    }));
}

function spineTitle(name: string): string {
    return name.length > MAX_SPINE_TITLE ? `${name.slice(0, MAX_SPINE_TITLE - 1).trimEnd()}…` : name;
}

function renderTabs(chapters: TabChapter[], activeId: string): Bookmarks {
    const isActive = (lesson: TabLesson): boolean => activeId === lesson.id || activeId.endsWith(`-${lesson.id}`);
    const current = chapters.find(chapter => chapter.lessons.some(isActive)) ?? chapters[0];
    const position = Math.max(0, current.lessons.findIndex(isActive));

    const lessons = current.lessons.map((lesson, index) => {
        const active = index === position;
        const label = `${lesson.label}. ${lesson.title}${lesson.done ? ', пройдено' : !lesson.unlocked ? ', откроется после предыдущего' : ''}`;
        return `<button type="button" class="book-tab book-tab--lesson${active ? ' is-current' : ''}${lesson.done ? ' is-done' : ''}" ${lesson.open} ${lesson.unlocked ? '' : 'disabled'} ${active ? 'aria-current="page"' : ''} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${index + 1}</span>${lesson.done ? '<i aria-hidden="true">✓</i>' : ''}</button>`;
    }).join('');

    const tabs = chapters.map(chapter => {
        const done = chapter.lessons.filter(lesson => lesson.done).length;
        const isCurrent = chapter === current;
        const target = isCurrent
            ? chapter.lessons[position]
            : chapter.lessons.find(lesson => lesson.unlocked && !lesson.done) ?? chapter.lessons.find(lesson => lesson.unlocked);
        const label = `${chapter.name}: пройдено ${done} из ${chapter.lessons.length}${chapter.python ? ', Python' : ''}`;
        return `<button type="button" class="book-tab book-tab--chapter${isCurrent ? ' is-current' : ''}${done === chapter.lessons.length ? ' is-done' : ''}" ${target ? target.open : 'disabled'} ${isCurrent ? 'aria-current="true"' : ''} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${chapter.tag}</span>${chapter.python ? '<small aria-hidden="true">Py</small>' : ''}${isCurrent ? `<em aria-hidden="true">${escapeHtml(spineTitle(chapter.name))}</em>` : ''}</button>`;
    }).join('');

    return { lessons, lessonsLabel: `${current.heading} · ${position + 1} из ${current.lessons.length}`, chapters: tabs };
}

/** Opening goes through the handlers of the contents list, so the same locks apply. */
export function renderBookmarks(volume: BookVolume, language: 'lua' | 'python', activeId: string): Bookmarks {
    return renderTabs(volume === 'blockly' ? blocklyChapters(getGuideLessonState(language), language) : courseChapters(language), activeId);
}

/** The three volumes of the course. Switching is the same as the tabs of the modal header, which the book hides. */
export function renderVolumes(active: BookVolume, busy: boolean): string {
    const volumes = [
        ['python', 'Python', ACADEMY_LESSONS.length],
        ['lua', 'Lua', ACADEMY_LESSONS.filter(item => item.languages.includes('lua')).length],
        ['blockly', 'Blockly', getGuideLessonState('lua').lessons.length]
    ] as const;
    return volumes.map(([id, name, count]) => `<button type="button" class="book-tab book-tab--volume${id === active ? ' is-current' : ''}" role="tab" aria-selected="${id === active}" data-book-track="${id}" ${busy ? 'disabled' : ''} aria-label="${name}, ${count} ${id === 'blockly' ? 'заданий' : 'уроков'}" title="Том «${name}»: ${count}"><span>${name}</span><small>${count}</small></button>`).join('');
}
