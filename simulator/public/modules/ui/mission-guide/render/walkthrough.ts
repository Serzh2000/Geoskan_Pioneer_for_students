import { getLearningNote } from './learning.js';
import { BLOCK_HELP } from './blockly-copy.js';
import { BLOCK_LABELS, escapeHtml, renderInline, renderApiFocusItem } from './shared.js';
import type { GuideApiFocusItem } from '../types.js';
import { getWalkthroughContent, type WalkthroughLesson } from '../walkthrough/content.js';
import { shouldShowPracticumSummary, getPracticumScreen, getWalkthroughProgress, getWalkthroughResult, isWalkthroughBusy, WALKTHROUGH_STEPS, walkthroughKey } from '../walkthrough/state.js';

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
function renderIdea(lesson: WalkthroughLesson, content: ReturnType<typeof getWalkthroughContent>, blockly: boolean, includeTask = true): string {
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
        ${includeTask ? `<aside class="guide-task"><h2>Сегодня попробуем</h2><p>${renderInline(academy ? lesson.goal : lesson.expectedOutcome)}</p></aside>` : ''}
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


/** Two ordinary lesson screens; the book keeps its independent renderer. */
export function renderPracticum(lesson: WalkthroughLesson, language: 'lua' | 'python', source: string,
    views: { build: { brief: string; work: string; answers?: string }; check: string; completed: boolean; hasPrevious?: boolean; lessonNav?: { note: string; previous: string; next: string } }): string {
    const content = getWalkthroughContent(lesson);
    const key = walkthroughKey(language, lesson.id);
    const state = getWalkthroughProgress(key, content.correct);
    const result = getWalkthroughResult(key, source);
    const busy = isWalkthroughBusy(key);
    const choice = state.answer === null ? undefined : content.choices[state.answer];
    const screen = getPracticumScreen(key);
    const showSummary = screen === 'practice' && shouldShowPracticumSummary(key, source);
    const pending = busy ? 'disabled' : '';
    const reading = `<div class="guide-practicum__lesson">
        <div class="guide-practicum__intro"><h2 class="guide-practicum__block-title"><span class="guide-practicum__number">1</span> Разберитесь</h2>${renderIdea(lesson, content, 'blocks' in lesson, false)}</div>
        <section class="guide-practicum__prediction" aria-labelledby="practicum-prediction-title">
            <div class="guide-practicum__prediction-heading"><h2 id="practicum-prediction-title" class="guide-practicum__block-title"><span class="guide-practicum__number">2</span> Предположите</h2><span>Необязательно</span></div>
            <fieldset class="guide-knowledge-check"><legend>${escapeHtml(content.question)}</legend>
                <div class="guide-knowledge-check__choices">${content.choices.map((option, i) => `<button type="button" class="btn-secondary" data-practicum-answer="${i}" aria-pressed="${state.answer === i}" ${pending}>${escapeHtml(option.text)}</button>`).join('')}</div>
                <p>Можно выбрать предположение или сразу перейти к практике.</p>
                ${choice ? `<p class="guide-practicum__prediction-feedback" role="status">${result?.solved ? escapeHtml(choice.feedback) : 'Предположение сохранено. Проверьте его опытом.'}</p>` : ''}
            </fieldset>
        </section>
        <div class="guide-practicum__reading-actions"><div class="guide-practicum__assignment"><h2 class="guide-practicum__block-title"><span class="guide-practicum__number">3</span> Что нужно сделать</h2><p>${renderInline('academy' in lesson && lesson.academy ? lesson.goal : lesson.expectedOutcome)}</p></div><button type="button" class="btn-primary" data-practicum-screen="practice" ${pending}>К практике</button></div>
    </div>`;
    const feedback = `<section class="guide-practicum__result" aria-label="Результат опыта">${result || busy ? views.check : ''}
        ${result?.solved ? `<details class="pk-disclosure"><summary>Что показал опыт</summary><p>${renderInline(content.takeaway)}</p></details>` : ''}
        <div class="guide-complete">
            ${views.completed ? '' : result?.solved ? '<button type="button" class="btn-primary" data-practicum-finish>Завершить урок</button>' : ''}
            <div class="guide-actions">${views.completed ? views.lessonNav?.next ?? '' : ''}${views.lessonNav?.previous ?? ''}</div>
        </div>
    </section>`;
    const practice = views.build.answers
        ? `<div class="guide-practicum__observation"><div class="guide-practice__work" tabindex="-1">${views.build.work}</div>
            <aside class="guide-practicum__worksheet" aria-label="Задание и проверка"><div class="guide-practice__brief">${views.build.brief}</div>
                <div class="guide-practicum__inspection">${views.build.answers}</div>${feedback}</aside></div>`
        : `<div class="guide-practicum__workspace"><div class="guide-practice__brief">${views.build.brief}</div>
            <div class="guide-practicum__experiment"><div class="guide-practice__work" tabindex="-1">${views.build.work}</div>${feedback}</div></div>`;
    const summary = `<div class="guide-practicum__success">${feedback}<button type="button" class="btn-secondary" data-practicum-resume>Вернуться к практике</button></div>`;
    return `<section class="guide-practicum guide-walkthrough" ${showSummary ? 'data-practicum-result="success"' : ''} data-walkthrough-step="${screen === 'practice' ? 'build' : 'device'}" data-practicum-screen="${screen}" aria-label="Практикум">
        <nav class="guide-practicum__screens pk-seg" aria-label="Экраны урока">
            <button type="button" data-practicum-screen="learn" aria-controls="guide-walkthrough-content" aria-current="${screen === 'learn' ? 'page' : 'false'}" class="pk-seg__btn ${screen === 'learn' ? 'is-active' : ''}" ${pending}>Разобраться</button>
            <button type="button" data-practicum-screen="practice" aria-controls="guide-walkthrough-content" aria-current="${screen === 'practice' ? 'page' : 'false'}" class="pk-seg__btn ${screen === 'practice' ? 'is-active' : ''}" ${pending}>Практика</button>
        </nav>
        <div class="guide-practicum__screen" id="guide-walkthrough-content" tabindex="-1" role="region" aria-label="${screen === 'learn' ? 'Разобраться' : 'Практика'}">${screen === 'learn' ? reading : showSummary ? summary : practice}</div>
    </section>`;
}
