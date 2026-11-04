import { renderPracticeBrief } from './learning.js';
import { renderPracticum } from './walkthrough.js';
import { getMissionGuideDraft } from '../support/monaco-preview.js';
import { ACADEMY_MODULES } from '../academy/catalog.js';
import { getActiveTextLesson, isLessonCompleted } from '../state.js';
import type { GuideTextLesson, GuideTextLessonState } from '../types.js';
import {
    escapeHtml,
    renderInline,
    renderRunBanner
} from './support.js';
import { renderLessonHeader } from './shared.js';
import { renderTextCheckParts } from './text-check.js';
import { renderTerrainPrep } from './terrain-prep.js';
import { renderInspectionQuestions } from './inspection-questions.js';
import { describeLessonNav } from './lesson-nav.js';
import { renderBookGuide, renderBookSwitch } from '../book/render.js';
import { isBookView } from '../book/view.js';

function renderTextBuildStep(track: 'lua' | 'python', lesson: GuideTextLesson): { brief: string; work: string; answers?: string } {
    const inspect = lesson.academy?.mode === 'inspect';
    const language = track === 'python' ? 'Python' : 'Lua';
    const terrain = renderTerrainPrep(lesson);
    const questions = inspect ? renderInspectionQuestions() : '';
    const actions = `<div class="guide-actions">
                    <button type="button" class="btn-primary" data-guide-text-check>${inspect ? 'Проверить наблюдение' : 'Проверить и запустить'}</button>
                    ${!inspect && lesson.academy ? '<button type="button" class="btn-secondary" data-guide-text-starter>Вернуть заготовку</button>' : ''}
                    ${!inspect ? '<button type="button" class="btn-secondary" data-guide-text-undo hidden>Отменить замену</button>' : ''}
                    <button type="button" class="btn-secondary" data-guide-text-reset>Сбросить проверку</button>
                </div>`;
    const work = inspect
        ? '<div id="mission-guide-scene-preview-host" class="guide-scene-preview-host pk-device is-active"></div>'
        : `<div class="pk-device guide-editor"><div class="guide-editor__bar"><b>Ваш код</b><span>${language}</span></div>
            <div id="mission-guide-monaco-preview-host" class="guide-monaco-preview-host"><div class="guide-monaco-preview__placeholder">Загружаю редактор…</div></div></div>
            ${lesson.academy ? '<div id="mission-guide-scene-preview-host" class="guide-scene-preview-host pk-device is-active"></div>' : ''}`;
    return { brief: `
                ${renderPracticeBrief(lesson)}
                ${terrain}
                ${lesson.links.length ? `<div class="pk-btn-row">${lesson.links.map(link => `<button type="button" class="btn-secondary btn--sm" data-guide-query="${escapeHtml(link.query)}">${escapeHtml(link.label)}</button>`).join('')}</div>` : ''}
                ${inspect ? '' : actions}
                ${inspect ? '' : renderRunBanner(track, lesson.id)}
    `, work, answers: inspect ? `${questions}${actions}` : undefined };
}

function renderTextCheckStep(track: 'lua' | 'python', lesson: GuideTextLesson): string {
    const { hasChecked, pending, verdict, flightRecord, diagnostics } = renderTextCheckParts(track, lesson, 'Выполните задание и запустите проверку. Результат появится здесь.', true);
    if (lesson.academy?.mode === 'inspect') return `<div class="guide-result"><div class="guide-result__main">${verdict}${pending ? '<button type="button" class="btn-secondary" data-walkthrough-cancel>Остановить проверку</button>' : ''}${diagnostics ? `<div class="guide-diagnostics" id="diagnostics-container">${diagnostics}</div>` : ''}</div></div>`;
    return `
        <div class="guide-result">
            <div class="guide-result__main">
                ${verdict}
                <div class="guide-actions">
                    ${pending ? '<button type="button" class="btn-secondary" data-walkthrough-cancel>Остановить проверку</button>' : ''}
                    ${hasChecked ? '<button type="button" class="btn-secondary" data-guide-text-check>Повторить проверку</button>' : ''}
                </div>
${flightRecord ? `<details class="pk-disclosure guide-practicum__journal"><summary>Журнал опыта</summary>${flightRecord}</details>` : ''}
                <div class="guide-diagnostics" id="diagnostics-container">${diagnostics}</div>
            </div>
            
        </div>
    `;
}

export function renderTextGuide(state: GuideTextLessonState, track: 'lua' | 'python'): string {
    const lesson = getActiveTextLesson(state, track);
    if (isBookView()) return renderBookGuide(state, track, lesson);
    const isCompleted = isLessonCompleted(track, lesson.id);
    const nav = describeLessonNav(state, track, lesson);
    const module = ACADEMY_MODULES.find(item => item.id === lesson.chapterId);
    const position = module && lesson.academy ? module.lessons.findIndex(item => item.number === lesson.academy!.number) + 1 : 0;
    const crumb = module
        ? `${module.title.replace(/^\d+\.\s*/, '')}${position ? ` · урок ${position} из ${module.lessons.length}` : ''}`
        : `Дополнительная практика · ${lesson.badge}`;
    const next = nav.next?.kind === 'python'
        ? `<button type="button" class="btn-primary" data-academy-open="academy-073" ${isCompleted ? '' : 'disabled'}>К камере на Python</button>`
        : nav.next
            ? `<button type="button" class="btn-primary" data-guide-nav="next" ${isCompleted ? '' : 'disabled'}>Следующий урок</button>`
            : '';

    return `
        <div class="guide-modal-layout" data-guide-language="${track}" data-guide-portal-page="lesson">
            <section class="guide-lesson-page">
                ${renderBookSwitch()}
                ${renderLessonHeader(crumb, lesson.title, isCompleted, lesson.academy ? '' : renderInline(lesson.summary))}

                ${renderPracticum(lesson, track, getMissionGuideDraft(track, lesson.id, lesson.starterCode), { build: renderTextBuildStep(track, lesson), check: renderTextCheckStep(track, lesson), completed: isCompleted, hasPrevious: Boolean(nav.previous), lessonNav: {
                    note: nav.note,
                    previous: nav.previous ? '<button type="button" class="btn-secondary" data-guide-nav="prev">Предыдущий урок</button>' : '',
                    next: next.replace(' disabled', '').replace('>Следующий урок<', nav.next?.kind === 'lesson' ? `>Дальше: ${escapeHtml(nav.next.lesson.title)}<` : '>Следующий урок<')
                } })}

            </section>
        </div>
    `;
}
