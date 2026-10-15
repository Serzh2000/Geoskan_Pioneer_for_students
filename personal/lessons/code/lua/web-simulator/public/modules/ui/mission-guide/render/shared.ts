import type {
    GuideApiFocusItem,
    GuideBlock,
    GuideDiagnostic,
    GuideLesson
} from '../types.js';

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderInline(value: string): string {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code class="guide-inline-code">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function getBlockMap(lesson: GuideLesson): Map<string, GuideBlock> {
    return new Map(lesson.blocks.map((block) => [block.id, block] as const));
}

export function renderDiagnosticCard(diagnostic: GuideDiagnostic): string {
    const diagnosticKindLabel = diagnostic.kind === 'error'
        ? 'Ошибка'
        : diagnostic.kind === 'warning'
            ? 'Замечание'
            : diagnostic.kind === 'success'
                ? 'Успех'
                : 'Подсказка';

    return `
        <article class="guide-diagnostic guide-diagnostic--${diagnostic.kind}">
            <div class="guide-diagnostic__head">
                <span class="guide-diagnostic__badge">${diagnosticKindLabel}</span>
                <span class="guide-diagnostic__title">${renderInline(diagnostic.title)}</span>
            </div>
            <p class="guide-diagnostic__reason">${renderInline(diagnostic.reason)}</p>
            <p class="guide-diagnostic__fix"><strong>${diagnostic.kind === 'success' || diagnostic.kind === 'info' ? 'Дальше:' : 'Как исправить:'}</strong> ${renderInline(diagnostic.fix)}</p>
        </article>
    `;
}

export const BLOCK_LABELS: Record<string, string> = {
    lua_ledbar_new: 'Создать линейку светодиодов', lua_led_set: 'Установить для светодиода цвет',
    lua_timer_calllater: 'Через … сек сделать', lua_ap_push: 'Отправить событие автопилоту',
    lua_callback_open: 'Открыть взаимодействие с автопилотом', lua_callback_end: 'Закрыть взаимодействие с автопилотом',
    lua_event_callback: 'Если получено событие', lua_print: 'print',
    lua_goto_local_point: 'ap.goToLocalPoint', py_led_control: 'Задать цвет LED',
    py_time_sleep: 'Подождать', py_arm: 'Подготовить двигатели', py_takeoff: 'Взлететь',
    py_print: 'Сообщение в журнал', py_goto_local_point: 'Перейти к точке',
    py_wait_point_reached: 'Дождаться прибытия', py_land: 'Приземлиться'
};

export function renderTargetRoute(lesson: GuideLesson): string {
    const blockMap = getBlockMap(lesson);
    return `
        <ol class="guide-target-route">
            ${lesson.targetBlockIds.map((blockId, index) => {
                const block = blockMap.get(blockId);
                return `<li class="guide-target-chip"><span class="guide-target-chip__number">${index + 1}</span> ${escapeHtml(BLOCK_LABELS[blockId] || block?.label || 'Действие')}</li>`;
            }).join('')}
        </ol>
    `;
}

/** API names that read as code (no Cyrillic) are set in mono; concept names stay in the text font. */
const isCodeLike = (value: string): boolean => !/[А-Яа-яЁё]/.test(value);

/** One flat row per API fact: the name on the left, what it does (and an example) on the right. */
export function renderApiFocusItem(item: GuideApiFocusItem, plain = false): string {
    const name = plain || !isCodeLike(item.title) ? `<span class="guide-api-row__name">${renderInline(item.title)}</span>` : `<code class="guide-api-row__name guide-api-row__name--code">${escapeHtml(item.title)}</code>`;
    return `
        <div class="guide-api-row">
            ${name}
            <div class="guide-api-row__body">
                ${item.summary ? `<p>${renderInline(item.summary)}</p>` : ''}
                ${item.example ? `<pre class="guide-api-row__example">${escapeHtml(item.example)}</pre>` : ''}
            </div>
        </div>
    `;
}

/** Lesson heading: a quiet breadcrumb, the title, and (for extra practice) one summary line. */
export function renderLessonHeader(crumb: string, title: string, completed: boolean, summary = ''): string {
    return `<header class="guide-lesson-page__header">
        <div class="guide-lesson-page__crumb">${escapeHtml(crumb)}</div>
        <h1 class="guide-lesson-page__title" id="guide-lesson-title">${escapeHtml(title)}${completed ? ' <span class="guide-lesson-done pk-chip pk-chip--success pk-chip--plain">Пройден</span>' : ''}</h1>
        ${summary ? `<p class="guide-lesson-page__summary">${summary}</p>` : ''}
    </header>`;
}
