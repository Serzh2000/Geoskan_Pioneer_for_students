import { renderPracticeBrief } from './learning.js';
import { renderWalkthrough } from './walkthrough.js';
import { getWalkthroughResult, isWalkthroughBusy, walkthroughKey } from '../walkthrough/state.js';
import { getMissionGuideDraft } from '../support/monaco-preview.js';
import { ACADEMY_MODULES } from '../academy/catalog.js';
import { getAcademySceneEvidence } from '../academy/scene.js';
import { isMissionGuideScenePreviewActive } from '../support/scene-preview.js';
import {
    getActiveTextLesson,
    getNextTextLesson,
    getPreviousTextLesson,
    isLessonChecked,
    isLessonCompleted
} from '../state.js';
import type { GuideTextLesson, GuideTextLessonState } from '../types.js';
import {
    escapeHtml,
    renderDiagnosticCard,
    renderInline,
    renderRunBanner
} from './support.js';
import { renderLessonHeader } from './shared.js';
import { renderCheckVerdict, renderFlightRecord } from './results.js';
import { foldSuccess, renderResultScene, sortDiagnostics } from './check-step.js';

function renderTextBuildStep(track: 'lua' | 'python', lesson: GuideTextLesson): string {
    const inspect = lesson.academy?.mode === 'inspect';
    const scene = getAcademySceneEvidence();
    const ownScene = scene?.number === lesson.academy?.number ? scene : undefined;
    const language = track === 'python' ? 'Python' : 'Lua';
    const printed = lesson.goal.match(/(?:выведите|напечатайте|напечатай|сообщение|сообщайте|выводите|печатайте)[^«]*«([^»]+)»/i)?.[1];
    // Checks compare printed text exactly, so the exact form is spelled out once for every such task.
    const messageRule = printed
        ? ` Текст из «ёлочек» печатайте точно как в задании, с теми же буквами и знаками, но без самих «ёлочек»: print("${printed}").`
        : '';
    const note = inspect
        ? 'Осматривайте дрон в сцене справа, а ответы выбирайте здесь, в списках ниже.'
        : /___|TODO/.test(lesson.starterCode)
            ? `Замените каждое «___» и каждую пометку TODO своим кодом: сами слова ___ и TODO в программе остаться не должны. Остальной код не меняйте.${messageRule}`
            : `Измените программу в редакторе. Она выполнится в сцене и будет оценена.${messageRule}`;
    const terrain = lesson.academy && lesson.academy.number >= 37 ? `<div class="guide-academy-terrain"><p>Подготовьте учебную сцену перед опытом. Ваши объекты вернутся кнопкой ниже или при закрытии учебника.</p>
        <label class="pk-field"><span class="pk-field__label">Seed</span><input aria-label="Seed учебной сцены" aria-describedby="guide-scene-status" type="number" min="0" max="4294967295" step="1" value="${ownScene?.seed ?? 20261009}" data-academy-lesson-seed></label>
        <div class="pk-btn-row"><button type="button" class="btn-secondary btn--sm" data-academy-prepare="${lesson.academy.number}">Подготовить полигон</button><button type="button" class="btn-secondary btn--sm" data-academy-restore>Вернуть мою сцену</button></div>
        <p id="guide-scene-status" role="status" data-academy-prepare-status>${ownScene?.intact ? `Полигон готов · seed ${ownScene.seed}` : 'Перед запуском подготовьте полигон этого урока.'}</p></div>` : '';
    const questions = inspect ? `<div class="guide-inspection-questions"><h2>Ваши ответы</h2>
        <label class="pk-field"><span class="pk-field__label">Какая часть создаёт тягу?</span>
            <select aria-label="Какая часть создаёт тягу?" data-academy-part="lift"><option value="">Выберите часть</option><option value="camera">Камера</option><option value="rotors">Винты</option><option value="leds">Светодиоды</option></select></label>
        <label class="pk-field"><span class="pk-field__label">Какая часть получает изображение?</span>
            <select aria-label="Какая часть получает изображение?" data-academy-part="vision"><option value="">Выберите часть</option><option value="rotors">Винты</option><option value="leds">Светодиоды</option><option value="camera">Камера</option></select></label></div>` : '';
    const work = inspect
        ? '<div id="mission-guide-scene-preview-host" class="guide-scene-preview-host pk-device is-active"></div>'
        : `<div class="pk-device guide-editor"><div class="guide-editor__bar"><b>Ваш код</b><span>${language}</span></div>
            <div id="mission-guide-monaco-preview-host" class="guide-monaco-preview-host"><div class="guide-monaco-preview__placeholder">Загружаю редактор…</div></div></div>
            ${lesson.academy ? '<div id="mission-guide-scene-preview-host" class="guide-scene-preview-host pk-device is-active"></div>' : ''}`;
    return `
        <div class="guide-practice">
            <div class="guide-practice__brief">
                ${renderPracticeBrief(lesson)}
                <p class="guide-practice__note">${escapeHtml(note)}</p>
                ${questions}
                ${terrain}
                ${lesson.links.length ? `<div class="pk-btn-row">${lesson.links.map(link => `<button type="button" class="btn-secondary btn--sm" data-guide-query="${escapeHtml(link.query)}">${escapeHtml(link.label)}</button>`).join('')}</div>` : ''}
                <div class="guide-actions">
                    <button type="button" class="btn-primary" data-guide-text-check>${inspect ? 'Проверить наблюдение' : 'Проверить и запустить'}</button>
                    ${!inspect && lesson.academy ? '<button type="button" class="btn-secondary" data-guide-text-starter>Вернуть заготовку</button>' : ''}
                    ${!inspect ? '<button type="button" class="btn-secondary" data-guide-text-undo hidden>Отменить замену</button>' : ''}
                    <button type="button" class="btn-secondary" data-guide-text-reset>Сбросить проверку</button>
                </div>
                <div class="guide-draft-status" role="status" data-guide-draft-status>Черновик этого урока сохраняется при переходах между вкладками.</div>
                ${renderRunBanner(track, lesson.id)}
            </div>
            <div class="guide-practice__work">${work}</div>
        </div>
    `;
}

function renderTextCheckStep(track: 'lua' | 'python', lesson: GuideTextLesson, hasChecked: boolean): string {
    const evaluation = getWalkthroughResult(walkthroughKey(track, lesson.id), getMissionGuideDraft(track, lesson.id, lesson.starterCode));
    const solved = evaluation?.solved ?? false;
    const folded = foldSuccess(evaluation?.diagnostics ?? [], solved);
    const diagnostics = folded.rest;
    const previewActive = isMissionGuideScenePreviewActive();
    const pending = isWalkthroughBusy(walkthroughKey(track, lesson.id));
    const anotherTrial = hasChecked && !solved && diagnostics.length > 0 && diagnostics.every(item => item.kind === 'info');
    const expected = `<p class="guide-verdict__expected"><span>Ожидалось:</span> ${renderInline(lesson.expectedOutcome)}</p>`;
    const verdict = pending
        ? '<div class="guide-verdict guide-verdict--idle" role="status"><h2 class="guide-verdict__title">Программа выполняется</h2><p>Наблюдайте сцену — результат появится после проверки.</p></div>'
        : anotherTrial
            ? `<div class="guide-verdict guide-verdict--success" role="status"><h2 class="guide-verdict__title">Опыт выполнен правильно</h2><p>Для сравнения нужен следующий запуск по условию урока.</p>${expected}</div>`
            : renderCheckVerdict(hasChecked, solved, diagnostics.length, false, { expected: lesson.expectedOutcome, next: folded.next, hasErrors: diagnostics.some(item => item.kind === 'error') });

    return `
        <div class="guide-result">
            <div class="guide-result__main">
                ${verdict}
                <div class="guide-actions">
                    ${pending ? '<button type="button" class="btn-secondary" data-walkthrough-cancel>Остановить проверку</button>' : `<button type="button" class="${hasChecked ? 'btn-secondary' : 'btn-primary'}" data-guide-step="build">${hasChecked ? 'Вернуться к коду' : 'Перейти к коду'}</button>`}
                    ${hasChecked && lesson.academy?.mode !== 'inspect' ? '<button type="button" class="btn-secondary" data-guide-text-check>Повторить проверку</button>' : ''}
                </div>
                ${hasChecked && !pending && evaluation?.timeline ? renderFlightRecord(evaluation.timeline) : ''}
                <div class="guide-diagnostics" id="diagnostics-container">${hasChecked && !pending ? sortDiagnostics(diagnostics).map(renderDiagnosticCard).join('') : ''}</div>
            </div>
            ${renderResultScene(previewActive)}
        </div>
    `;
}

export function renderTextGuide(state: GuideTextLessonState, track: 'lua' | 'python'): string {
    const lesson = getActiveTextLesson(state, track);
    const hasChecked = isLessonChecked(track, lesson.id);
    const isCompleted = isLessonCompleted(track, lesson.id);
    const continuesOnPython = track === 'lua' && lesson.academy?.number === 72;
    const courseEnd = lesson.academy?.number === 108;
    const nextLesson = continuesOnPython || courseEnd ? undefined : getNextTextLesson(state, lesson.id);
    const previousLesson = getPreviousTextLesson(state, lesson.id);
    const module = ACADEMY_MODULES.find(item => item.id === lesson.chapterId);
    const position = module && lesson.academy ? module.lessons.findIndex(item => item.number === lesson.academy!.number) + 1 : 0;
    const crumb = module
        ? `${module.title.replace(/^\d+\.\s*/, '')}${position ? ` · урок ${position} из ${module.lessons.length}` : ''}`
        : `Дополнительная практика · ${lesson.badge}`;
    const note = continuesOnPython
        ? 'Урок принят. Продолжайте с нижней камерой и ArUco на Python.'
        : courseEnd
            ? 'Все этапы итоговой миссии подтверждены. Курс из 108 уроков завершён.'
            : nextLesson ? 'Урок принят. Можно переходить к следующему.' : 'Урок принят. Это последнее задание текущего трека.';
    const next = continuesOnPython
        ? `<button type="button" class="btn-primary" data-academy-open="academy-073" ${isCompleted ? '' : 'disabled'}>К камере на Python</button>`
        : courseEnd || !nextLesson ? ''
            : `<button type="button" class="btn-primary" data-guide-nav="next" ${isCompleted ? '' : 'disabled'}>Следующий урок</button>`;

    return `
        <div class="guide-modal-layout" data-guide-language="${track}" data-guide-portal-page="lesson">
            <section class="guide-lesson-page">
                ${renderLessonHeader(crumb, lesson.title, isCompleted, lesson.academy ? '' : renderInline(lesson.summary))}

                ${renderWalkthrough(lesson, track, getMissionGuideDraft(track, lesson.id, lesson.starterCode), { build: renderTextBuildStep(track, lesson), check: renderTextCheckStep(track, lesson, hasChecked), completed: isCompleted, hasPrevious: Boolean(previousLesson), lessonNav: {
                    note,
                    previous: previousLesson ? '<button type="button" class="btn-secondary" data-guide-nav="prev">Предыдущий урок</button>' : '',
                    next: next.replace(' disabled', '').replace('>Следующий урок<', nextLesson ? `>Дальше: ${escapeHtml(nextLesson.title)}<` : '>Следующий урок<')
                } })}

            </section>
        </div>
    `;
}
