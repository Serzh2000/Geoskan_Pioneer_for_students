import type {
    GuideApiFocusItem,
    GuideBlock,
    GuideDiagnostic,
    GuideLesson,
    GuideMethodLink
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
    return escapeHtml(value).replace(/`([^`]+)`/g, '<code class="guide-inline-code">$1</code>');
}

function getBlockMap(lesson: GuideLesson): Map<string, GuideBlock> {
    return new Map(lesson.blocks.map((block) => [block.id, block] as const));
}

export function renderDocLink(link: GuideMethodLink): string {
    return `
        <button
            type="button"
            class="guide-method-chip"
            data-guide-query="${escapeHtml(link.query)}"
            ${link.previewKey ? `data-guide-preview="${escapeHtml(link.previewKey)}"` : ''}
        >
            ${escapeHtml(link.label)}
        </button>
    `;
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
                <div class="guide-diagnostic__badge">${diagnosticKindLabel}</div>
                <div class="guide-diagnostic__title">${renderInline(diagnostic.title)}</div>
            </div>
            <div class="guide-diagnostic__reason">${renderInline(diagnostic.reason)}</div>
            <div class="guide-diagnostic__fix"><strong>${diagnostic.kind === 'success' || diagnostic.kind === 'info' ? 'Дальше:' : 'Как исправить:'}</strong> ${renderInline(diagnostic.fix)}</div>
        </article>
    `;
}

const BLOCK_LABELS: Record<string, string> = {
    lua_ledbar_new: 'Создать ленту Ledbar', lua_led_set: 'Задать цвет LED',
    lua_timer_calllater: 'Отложить действие', lua_ap_push: 'Команда автопилоту',
    lua_callback_open: 'Начало обработчика', lua_callback_end: 'Конец обработчика',
    lua_event_callback: 'При наступлении события', lua_print: 'Сообщение в журнал',
    lua_goto_local_point: 'Перейти к точке', py_led_control: 'Задать цвет LED',
    py_time_sleep: 'Подождать', py_arm: 'Подготовить двигатели', py_takeoff: 'Взлететь',
    py_print: 'Сообщение в журнал', py_goto_local_point: 'Перейти к точке',
    py_wait_point_reached: 'Дождаться прибытия', py_land: 'Приземлиться'
};

export function renderTargetRoute(lesson: GuideLesson): string {
    const blockMap = getBlockMap(lesson);
    return `
        <div class="guide-target-route">
            ${lesson.targetBlockIds.map((blockId, index) => {
                const block = blockMap.get(blockId);
                return `<span class="guide-target-chip"><span class="guide-target-chip__number">${index + 1}</span> ${escapeHtml(BLOCK_LABELS[blockId] || block?.label || 'Действие')}</span>`;
            }).join('')}
        </div>
    `;
}

export function renderApiFocusItem(item: GuideApiFocusItem): string {
    return `
        <article class="guide-api-card">
            <div class="guide-api-card__title">${renderInline(item.title)}</div>
            ${item.summary ? `<div class="guide-api-card__summary">${renderInline(item.summary)}</div>` : ''}
            ${item.example ? `<pre class="guide-api-card__example">${escapeHtml(item.example)}</pre>` : ''}
        </article>
    `;
}
