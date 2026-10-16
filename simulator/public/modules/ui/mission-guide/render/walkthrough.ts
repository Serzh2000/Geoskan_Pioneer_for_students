import { getLearningNote } from './learning.js';
import { BLOCK_HELP } from './blockly-copy.js';
import { BLOCK_LABELS, escapeHtml, renderInline, renderApiFocusItem } from './shared.js';
import type { GuideApiFocusItem } from '../types.js';
import { getWalkthroughContent, type WalkthroughLesson } from '../walkthrough/content.js';
import { getWalkthroughProgress, getWalkthroughResult, isWalkthroughBusy, WALKTHROUGH_STEPS, walkthroughKey } from '../walkthrough/state.js';

const LABELS = ['Идея', 'Прогноз', 'Практика', 'Результат', 'Разбор'];
const STEP_HINTS = ['Разберитесь', 'Предскажите', 'Попробуйте', 'Наблюдайте', 'Объясните'];

/** Explain the actual learning gate without adding a second navigation system. */
function gateHint(step: typeof WALKTHROUGH_STEPS[number], correct: boolean, solved: boolean, busy: boolean): string {
    if (busy) return 'Программа выполняется. Дождитесь результата или остановите проверку.';
    if (step === 'predict' && !correct) return 'Выберите верный прогноз, чтобы перейти к практике.';
    if (step === 'build') return 'Запустите проверку в практике — следующий шаг покажет результат опыта.';
    if (step === 'check' && !solved) return 'Вернитесь к практике и выполните условия урока, чтобы открыть разбор.';
    return '';
}

/** Each fact appears once: an API row is shown only for what the lead sentence does not already say. */
function uniqueApiList(items: GuideApiFocusItem[], lead: string): string {
    const said = lead.trim();
    const rows = items
        .map(item => ({ ...item, summary: item.summary?.trim() === said ? '' : item.summary, example: item.example?.trim() === item.title?.trim() ? '' : item.example }))
        .filter(item => item.summary || item.example);
    return rows.length ? `<div class="guide-api-list">${rows.map(item => renderApiFocusItem(item)).join('')}</div>` : '';
}

/** Step 1: the idea, what is needed, and today's task, each said once in one reading column. */
function renderIdea(lesson: WalkthroughLesson, content: ReturnType<typeof getWalkthroughContent>, blockly: boolean): string {
    const academy = 'academy' in lesson && lesson.academy;
    const lead = academy ? lesson.summary : content.device;
    const needs = academy ? lesson.builderHint : lesson.lessonIntro;
    const rows = blockly && 'targetBlockIds' in lesson
        ? `<div class="guide-api-list">${[...new Set(lesson.targetBlockIds)].map(id => renderApiFocusItem({ title: BLOCK_LABELS[id] || id, summary: BLOCK_HELP[id] || 'Настройте блок по условию задания.' }, true)).join('')}</div>`
        : uniqueApiList(lesson.apiFocus, needs);
    const needsText = needs.trim() === lead.trim() ? '' : `<p>${renderInline(needs)}</p>`;
    return `<div class="guide-reading guide-reading--idea">
        <p class="guide-lead">${renderInline(lead)}</p>
        ${needsText || rows ? `<section class="guide-needs"><h2>Перед началом</h2>${needsText}${rows}</section>` : ''}
        <aside class="guide-task"><h2>Сегодня попробуем</h2><p>${renderInline(academy ? lesson.goal : lesson.expectedOutcome)}</p></aside>
    </div>`;
}

export function renderWalkthrough(lesson: WalkthroughLesson, language: 'lua' | 'python', source: string,
    views: { build: string; check: string; completed: boolean; hasPrevious?: boolean; lessonNav?: { note: string; previous: string; next: string } }): string {
    const content = getWalkthroughContent(lesson);
    const key = walkthroughKey(language, lesson.id);
    const state = getWalkthroughProgress(key, content.correct);
    const index = WALKTHROUGH_STEPS.indexOf(state.step);
    const result = getWalkthroughResult(key, source);
    const busy = isWalkthroughBusy(key);
    const note = getLearningNote(lesson);
    const blockly = 'blocks' in lesson;
    let body: string;
    if (state.step === 'device') {
        body = renderIdea(lesson, content, blockly);
    } else if (state.step === 'predict') {
        const choice = state.answer === null ? undefined : content.choices[state.answer];
        const right = state.answer === content.correct;
        body = `<fieldset class="guide-reading guide-knowledge-check"><p class="guide-knowledge-check__intro">Сначала предскажите, потом проверьте. На шаге «Результат» вы сравните ответ с тем, что покажет симулятор.</p>
            <legend>${escapeHtml(content.question)}</legend>
            <div class="guide-knowledge-check__choices">${content.choices.map((option, i) => `<button type="button" class="btn-secondary" data-walkthrough-answer="${i}" aria-pressed="${state.answer === i}"><span class="guide-knowledge-check__mark" aria-hidden="true">${String.fromCharCode(1040 + i)}</span><span>${escapeHtml(option.text)}</span></button>`).join('')}</div>
            ${choice ? `<div class="guide-knowledge-check__feedback" role="status" data-result="${right ? 'correct' : 'retry'}"><span class="guide-knowledge-check__icon" aria-hidden="true">${right ? '✓' : '!'}</span><div><p>${escapeHtml(choice.feedback)}</p>${right ? '<p class="guide-knowledge-check__next">Дальше — практика: вы проверите прогноз запуском.</p>' : '<p class="guide-knowledge-check__next">Выберите другой вариант — ошибка здесь ничего не стоит.</p>'}</div></div>` : '<small>Выберите вариант. Если ошибётесь, можно попробовать снова.</small>'}</fieldset>`;
    } else if (state.step === 'build') {
        body = views.build;
    } else if (state.step === 'check') {
        body = views.check;
    } else {
        const nav = views.lessonNav;
        body = `<div class="guide-reading guide-reading--reflect">
            <section class="guide-takeaway"><h2>Главное из урока</h2><p class="guide-lead">${renderInline(content.takeaway)}</p></section>
            <section class="guide-compare" aria-label="Прогноз и результат">
                <div class="guide-compare__row"><span class="guide-compare__who">Вы предсказали</span><p>${escapeHtml(content.choices[content.correct]?.text ?? '')}</p></div>
                <div class="guide-compare__row"><span class="guide-compare__who">Опыт показал</span><p>${renderInline(lesson.expectedOutcome)}</p></div>
                <p class="guide-compare__verdict"><span aria-hidden="true">✓</span> Прогноз совпал с результатом</p>
            </section>
            ${note ? `<section class="guide-try"><h2>Попробуйте сами</h2><p>${renderInline(note.experiment)}</p><p class="guide-try__hint">Изменённая программа потребует новой проверки исходного задания.</p><button type="button" class="btn-secondary btn--sm" data-walkthrough-step="build">Вернуться к практике</button></section>` : ''}
            <aside class="guide-complete" aria-label="Завершение урока">
                <h2 class="guide-complete__status" role="status">${views.completed ? 'Что дальше' : 'Осталось завершить урок'}</h2>
                ${!result?.solved && !views.completed ? '<p class="guide-reading__status" role="status">Программа изменилась или результат запуска недоступен. Вернитесь к практике и выполните проверку.</p>' : ''}
                <div class="guide-complete__actions">
                    ${views.completed ? '' : `<button type="button" class="btn-primary" data-walkthrough-finish ${result?.solved ? '' : 'disabled'}>Завершить урок</button>`}
                    ${views.completed ? nav?.next ?? '' : ''}
                    <button type="button" class="btn-ghost" data-walkthrough-step="check" ${busy ? 'disabled' : ''}>К результату опыта</button>
                    ${nav?.previous ?? ''}
                </div>
            </aside>
        </div>`;
    }
    const last = WALKTHROUGH_STEPS.length - 1;
    const canNext = state.step !== 'build' && state.step !== 'reflect' && !busy
        && (state.step !== 'predict' || state.answer === content.correct)
        && (state.step !== 'check' || result?.solved);
    const hint = gateHint(state.step, state.answer === content.correct, Boolean(result?.solved), busy);
    return `<section class="guide-walkthrough" data-walkthrough-step="${state.step}">
        <nav class="guide-walkthrough__steps" aria-label="Шаги урока">${WALKTHROUGH_STEPS.map((step, i) => {
            const unlocked = i <= state.furthest && (i < 2 || state.answer === content.correct) && (i !== last || result?.solved);
            const complete = i < state.furthest && (i < last - 1 || Boolean(result?.solved));
            const reason = busy ? 'Программа выполняется' : i >= 2 && state.answer !== content.correct ? 'После верного прогноза' : i === last && !result?.solved ? 'После успешной проверки' : i === 3 && !unlocked ? 'После запуска программы' : !unlocked ? 'После предыдущего шага' : '';
            return `<button type="button" class="guide-walkthrough__step ${i === index ? 'is-active' : complete ? 'is-complete' : ''}" data-walkthrough-step="${step}" ${i === index ? 'aria-current="step"' : ''} ${unlocked && !busy ? '' : 'disabled'} aria-controls="guide-walkthrough-content" aria-label="${i + 1}. ${LABELS[i]}${i === index ? ', текущий шаг' : complete ? ', выполнено' : reason ? `, ${reason.toLowerCase()}` : ''}"><span class="guide-walkthrough__step-number" aria-hidden="true">${complete && i !== index ? '✓' : i + 1}</span><span class="guide-walkthrough__step-label"><strong>${LABELS[i]}</strong><small>${STEP_HINTS[i]}</small></span></button>`;
        }).join('')}</nav>
        <div class="guide-walkthrough__stage-status" id="guide-walkthrough-stage">Шаг ${index + 1} из ${WALKTHROUGH_STEPS.length} · ${LABELS[index]}</div>
        <div class="guide-walkthrough__body" id="guide-walkthrough-content" tabindex="-1" role="region" aria-labelledby="guide-walkthrough-stage">${body}</div>
        ${state.step === 'reflect' ? '' : `<div class="guide-walkthrough__navigation">
            ${index > 0
                ? `<button type="button" class="btn-secondary" data-walkthrough-step="${WALKTHROUGH_STEPS[index - 1]}" ${busy ? 'disabled' : ''}>Назад</button>`
                : views.hasPrevious ? '<button type="button" class="btn-secondary" data-guide-nav="prev">Предыдущий урок</button>' : '<span></span>'}
            ${hint ? `<p class="guide-walkthrough__gate">${hint}</p>` : ''}
            ${index < last && state.step !== 'build' ? `<button type="button" class="btn-primary" data-walkthrough-step="${WALKTHROUGH_STEPS[index + 1]}" ${canNext ? '' : 'disabled'}>${state.step === 'check' ? 'Объяснить результат' : state.step === 'device' ? 'К прогнозу' : 'Дальше'}</button>` : ''}
        </div>`}
    </section>`;
}
