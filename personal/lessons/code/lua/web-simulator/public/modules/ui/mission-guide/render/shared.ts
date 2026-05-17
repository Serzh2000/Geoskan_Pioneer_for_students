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
                <div class="guide-diagnostic__title">${escapeHtml(diagnostic.title)}</div>
            </div>
            <div class="guide-diagnostic__reason">${escapeHtml(diagnostic.reason)}</div>
            <div class="guide-diagnostic__fix"><strong>Как исправить:</strong> ${escapeHtml(diagnostic.fix)}</div>
        </article>
    `;
}

export function renderTargetRoute(lesson: GuideLesson): string {
    const blockMap = getBlockMap(lesson);
    return `
        <div class="guide-target-route">
            ${lesson.targetBlockIds.map((blockId) => {
                const block = blockMap.get(blockId);
                return `<span class="guide-target-chip">${escapeHtml(block?.label || blockId)}</span>`;
            }).join('')}
        </div>
    `;
}

export function renderApiFocusItem(item: GuideApiFocusItem): string {
    return `
        <article class="guide-api-card">
            <div class="guide-api-card__title">${escapeHtml(item.title)}</div>
            <div class="guide-api-card__summary">${escapeHtml(item.summary)}</div>
            ${item.example ? `<pre class="guide-api-card__example">${escapeHtml(item.example)}</pre>` : ''}
        </article>
    `;
}
