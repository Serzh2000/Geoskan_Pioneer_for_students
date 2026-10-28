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
    /** The contents panel (hidden until the bar's button opens it). */
    contents: string;
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
const VOLUME_NAMES: Record<BookVolume, string> = { python: 'Python', lua: 'Lua', blockly: 'Blockly' };

function lessonStep(lesson: TabLesson | undefined, direction: 'previous' | 'next'): LessonStep {
    if (!lesson) return { attr: '', label: direction === 'next' ? 'Это последний урок тома' : 'Это первый урок тома', open: false };
    const word = direction === 'next' ? 'Следующий урок' : 'Предыдущий урок';
    const locked = !lesson.unlocked;
    return { attr: lesson.open, label: `${word}: ${lesson.label}. ${lesson.title}${locked ? ' (откроется после предыдущего)' : ''}`, open: !locked };
}

/** The contents: every chapter of the volume as a folded section, the open chapter unfolded. Opens through the same attributes as the tabs did. */
function renderContents(chapters: TabChapter[], current: TabChapter, activeLesson: TabLesson | undefined, volume: BookVolume): string {
    const all = chapters.flatMap(chapter => chapter.lessons);
    const passed = all.filter(lesson => lesson.done).length;
    const sections = chapters.map(chapter => {
        const done = chapter.lessons.filter(lesson => lesson.done).length;
        const rows = chapter.lessons.map(lesson => {
            const active = lesson === activeLesson;
            const state = lesson.done ? ', пройдено' : !lesson.unlocked ? ', откроется после предыдущего' : '';
            const label = `${lesson.label}. ${lesson.title}${state}`;
            const mark = lesson.done ? TICK : !lesson.unlocked ? LOCK : '';
            return `<li><button type="button" class="book-toc__lesson${active ? ' is-current' : ''}${lesson.done ? ' is-done' : ''}${lesson.unlocked ? '' : ' is-locked'}" ${lesson.open} ${lesson.unlocked ? '' : 'disabled'} ${active ? 'aria-current="page"' : ''} aria-label="${escapeHtml(label)}"><span class="book-toc__num" aria-hidden="true">${lesson.num}</span><span class="book-toc__name">${escapeHtml(lesson.title)}</span><span class="book-toc__dots" aria-hidden="true"></span><span class="book-toc__mark" aria-hidden="true">${mark}</span></button></li>`;
        }).join('');
        return `<details class="book-toc__chapter${done === chapter.lessons.length ? ' is-done' : ''}"${chapter === current ? ' open' : ''}><summary><span class="book-toc__tag" aria-hidden="true">${chapter.tag}</span><span class="book-toc__chapter-name">${escapeHtml(chapter.name)}${chapter.python ? ' <small>Python</small>' : ''}</span><span class="book-toc__count" aria-label="пройдено ${done} из ${chapter.lessons.length}">${done}/${chapter.lessons.length}</span></summary><ol class="book-toc__lessons">${rows}</ol></details>`;
    }).join('');
    return `<section class="book-toc" id="book-toc" role="region" aria-labelledby="book-toc-title" tabindex="-1" hidden>
        <header class="book-toc__head">
            <div><h2 class="book-toc__title" id="book-toc-title">Оглавление</h2><p class="book-toc__sub">Том «${VOLUME_NAMES[volume]}» · пройдено ${passed} из ${all.length}</p></div>
            <button type="button" class="book-toc__close" data-book-toc-close aria-label="Закрыть оглавление"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </header>
        <div class="book-toc__body">${sections}</div>
    </section>`;
}

function renderTabs(chapters: TabChapter[], activeId: string, volume: BookVolume): Bookmarks {
    const isActive = (lesson: TabLesson): boolean => activeId === lesson.id || activeId.endsWith(`-${lesson.id}`);
    const current = chapters.find(chapter => chapter.lessons.some(isActive)) ?? chapters[0];
    const position = Math.max(0, current.lessons.findIndex(isActive));
    const lesson = current.lessons[position];
    const order = chapters.flatMap(chapter => chapter.lessons);
    const at = order.indexOf(lesson);
    return {
        chapter: current.name,
        place: `${lesson.label} · ${position + 1} из ${current.lessons.length}`,
        contents: renderContents(chapters, current, lesson, volume),
        previous: lessonStep(order[at - 1], 'previous'),
        next: lessonStep(order[at + 1], 'next')
    };
}

/** Opening goes through the handlers of the lesson buttons, so the same locks apply. */
export function renderBookmarks(volume: BookVolume, language: 'lua' | 'python', activeId: string): Bookmarks {
    return renderTabs(volume === 'blockly' ? blocklyChapters(getGuideLessonState(language), language) : courseChapters(language), activeId, volume);
}

/** The three volumes of the course. Switching is the same as the tabs of the modal header, which the book hides. */
export function renderVolumes(active: BookVolume, busy: boolean): string {
    const volumes = [
        ['python', 'Python', ACADEMY_LESSONS.length],
        ['lua', 'Lua', ACADEMY_LESSONS.filter(item => item.languages.includes('lua')).length],
        ['blockly', 'Blockly', getGuideLessonState('lua').lessons.length]
    ] as const;
    return volumes.map(([id, name, count]) => `<button type="button" class="pk-seg__btn${id === active ? ' is-active' : ''}" role="tab" aria-selected="${id === active}" data-book-track="${id}" ${busy ? 'disabled' : ''} aria-label="${name}, ${count} ${id === 'blockly' ? 'заданий' : 'уроков'}" title="Том «${name}»: ${count}">${renderVolumeMark(id)}<span class="pk-seg__name">${name}</span> <small>${count}</small></button>`).join('');
}
