import { ACADEMY_MODULES } from '../academy/catalog.js';
import { academyCompletedCount, isAcademyLessonComplete } from '../course-navigation.js';
import { getGuideLessonState } from '../lessons.js';
import { getLuaTextLessonState } from '../lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../lessons/catalog/python-text.js';
import { isLessonCompleted, isLessonUnlocked, isTextLessonUnlocked } from '../state.js';
import type { GuidePracticeTrack } from '../types.js';
import { escapeHtml as esc } from './shared.js';
import { renderAcademyRoadmap } from './academy.js';

function renderIntro(title: string, meta: string, done: number, total: number, label: string): string {
    const percent = Math.round((done / Math.max(total, 1)) * 100);
    return `<div class="guide-outline__intro"><p class="guide-outline__title">${esc(title)}</p><p>${esc(meta)}</p>
        <div class="pk-meter" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><div class="pk-meter__fill" style="width:${percent}%"></div></div>
        <small>${done} из ${total} пройдено</small></div>`;
}

export function renderCourseOutline(track: GuidePracticeTrack, language: 'lua' | 'python', activeId: string): string {
    const completed = academyCompletedCount();
    const textState = language === 'lua' ? getLuaTextLessonState() : getPythonTextLessonState();
    if (track === 'blockly') {
        const state = getGuideLessonState(language);
        const count = state.lessons.filter(item => isLessonCompleted(language, item.id)).length;
        return `${renderIntro('Программы из блоков', `${state.lessons.length} заданий · блоки`, count, state.lessons.length, 'Пройдено заданий Blockly')}
            <nav class="guide-outline__lessons" aria-label="Практикумы Blockly">${state.lessons.map((item, index) => {
                const unlocked = isLessonUnlocked(state, language, item.id);
                const done = isLessonCompleted(language, item.id);
                const description = `Задание ${index + 1}. ${item.title}${done ? ', пройдено' : !unlocked ? `, откроется после задания ${index}` : ''}`;
                return `<button type="button" class="guide-outline__lesson${done ? ' is-done' : ''}" data-guide-open-lesson="${esc(item.id)}" ${unlocked ? '' : 'disabled'} ${activeId === item.id ? 'aria-current="page"' : ''} aria-label="${esc(description)}" title="${esc(description)}"><span class="guide-outline__number" aria-hidden="true">${done ? '✓' : String(index + 1).padStart(2, '0')}</span><span>${esc(item.title)}</span></button>`;
            }).join('')}</nav>
            <p class="guide-outline__note">Полный курс — во вкладках Python (108 уроков) и Lua (72 урока).</p>`;
    }
    const lessons = ACADEMY_MODULES.reduce((sum, module) => sum + module.lessons.length, 0);
    return `${renderIntro('От arm до ArUco', `${ACADEMY_MODULES.length} разделов · ${lessons} уроков`, completed, lessons, 'Пройдено уроков большого курса')}
        <nav class="guide-outline__modules" aria-label="Оглавление курса">${ACADEMY_MODULES.map(module => {
            const current = module.lessons.some(item => activeId.endsWith(item.id));
            const count = module.lessons.filter(item => isAcademyLessonComplete(item.id)).length;
            return `<details class="guide-outline__module" data-outline-module="${module.id}" ${current ? 'open' : ''}><summary><span>${esc(module.title.replace(/^\d+\.\s*/, ''))}</span><small>${count}/${module.lessons.length}</small></summary><div class="guide-outline__lessons">${module.lessons.map(item => {
                const target = item.number > 72 ? 'python' : language;
                const targetState = target === 'python' ? getPythonTextLessonState() : textState;
                const unlocked = isTextLessonUnlocked(targetState, target, `${target}-${item.id}`);
                const done = isAcademyLessonComplete(item.id);
                return `<button type="button" class="guide-outline__lesson${done ? ' is-done' : ''}" data-academy-open="${item.id}" ${unlocked ? '' : 'disabled'} ${activeId.endsWith(item.id) ? 'aria-current="page"' : ''} aria-label="${esc(`Урок ${item.number}. ${item.title}${done ? ', пройдено' : !unlocked ? `, откроется после урока ${item.number - 1}` : ''}${item.number > 72 ? ', Python' : ''}`)}" title="${esc(unlocked ? item.title : `Откроется после урока ${item.number - 1}`)}"><span class="guide-outline__number" aria-hidden="true">${done ? '✓' : String(item.number).padStart(2, '0')}</span><span>${esc(item.title)}${item.number > 72 ? '<small>Python</small>' : ''}</span></button>`;
            }).join('')}</div></details>`;
        }).join('')}
        <details class="guide-outline__module"><summary><span>Дополнительная практика</span><small>${textState.lessons.filter(item => !item.academy).length}</small></summary><div class="guide-outline__lessons">${textState.lessons.filter(item => !item.academy).map((item, index) => `<button type="button" class="guide-outline__lesson" data-guide-text-lesson="${esc(item.id)}" ${isTextLessonUnlocked(textState, language, item.id) ? '' : 'disabled'} ${activeId === item.id ? 'aria-current="page"' : ''}><span class="guide-outline__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${esc(item.title)}</span></button>`).join('')}</div></details></nav>
        <details class="guide-outline__module guide-outline__about"><summary><span>О курсе и полигонах</span></summary>${renderAcademyRoadmap(language)}</details>`;
}
