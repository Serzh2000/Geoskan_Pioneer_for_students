import type { ScriptLanguage } from '../api-docs/sections.js';
import { evaluateLesson, getLessonCode } from './lesson-evaluation.js';
import { isMissionGuideScenePreviewActive } from './scene-preview.js';
import { getActiveLesson, getLessonBanner, getLessonSequence } from './state.js';
import type {
    GuideBlock,
    GuideDiagnostic,
    GuideLesson,
    GuideLessonState,
    GuideMethodLink
} from './types.js';

function escapeHtml(value: string): string {
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

function renderDocLink(link: GuideMethodLink): string {
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

function renderBlock(block: GuideBlock, origin: 'library' | 'workspace', index: number): string {
    return `
        <div
            class="guide-puzzle guide-puzzle--${block.style} guide-puzzle--${origin}"
            draggable="true"
            data-guide-block-id="${escapeHtml(block.id)}"
            data-guide-origin="${origin}"
            data-guide-index="${index}"
            title="${escapeHtml(block.explanation)}"
        >
            <div class="guide-puzzle__main">
                <div class="guide-puzzle__label">${escapeHtml(block.label)}</div>
                <div class="guide-puzzle__code">${escapeHtml(block.codeLabel)}</div>
            </div>
            <div class="guide-puzzle__tooltip" role="tooltip">${escapeHtml(block.explanation)}</div>
        </div>
    `;
}

function renderWorkspace(lesson: GuideLesson, sequenceIds: string[]): string {
    const blockMap = getBlockMap(lesson);
    const rows: string[] = [];
    const hint = sequenceIds.length
        ? 'Перетаскивайте блоки выше или ниже, чтобы менять логику вызовов Pioneer API.'
        : 'Перетащите первый паззл в рабочую область или кликните по блоку в библиотеке.';

    for (let index = 0; index <= sequenceIds.length; index += 1) {
        rows.push(`
            <div class="guide-drop-zone" data-guide-drop-index="${index}">
                <span>${index === sequenceIds.length ? 'Вставить в конец' : 'Вставить сюда'}</span>
            </div>
        `);

        const blockId = sequenceIds[index];
        if (!blockId) continue;
        const block = blockMap.get(blockId);
        if (!block) continue;
        rows.push(`
            <div class="guide-workspace-row">
                ${renderBlock(block, 'workspace', index)}
                <button type="button" class="guide-workspace__remove" data-guide-remove="${escapeHtml(block.id)}">Убрать</button>
            </div>
        `);
    }

    return `
        <div class="guide-workspace">
            <div class="guide-workspace__hint">${escapeHtml(hint)}</div>
            <div class="guide-workspace__stack">
                ${rows.join('')}
            </div>
        </div>
    `;
}

function renderLibrary(lesson: GuideLesson, sequenceIds: string[]): string {
    const used = new Set(sequenceIds);
    const available = lesson.blocks.filter((block) => !used.has(block.id));

    if (!available.length) {
        return '<div class="guide-library__empty">Все блоки из этого задания уже использованы в цепочке.</div>';
    }

    return `
        <div class="guide-library__grid">
            ${available.map((block) => renderBlock(block, 'library', -1)).join('')}
        </div>
    `;
}

function renderDiagnosticCard(diagnostic: GuideDiagnostic): string {
    return `
        <article class="guide-diagnostic guide-diagnostic--${diagnostic.kind}">
            <div class="guide-diagnostic__title">${escapeHtml(diagnostic.title)}</div>
            <div class="guide-diagnostic__reason">${escapeHtml(diagnostic.reason)}</div>
            <div class="guide-diagnostic__fix"><strong>Как исправить:</strong> ${escapeHtml(diagnostic.fix)}</div>
        </article>
    `;
}

function renderTargetRoute(lesson: GuideLesson): string {
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

function renderPageTabs(state: GuideLessonState, language: ScriptLanguage): string {
    return `
        <div class="guide-page-tabs">
            ${state.lessons.map((lesson, index) => {
                const evaluation = evaluateLesson(lesson, getLessonSequence(language, lesson.id));
                const isActive = getActiveLesson(state, language).id === lesson.id;
                return `
                    <button
                        type="button"
                        class="guide-page-tab ${isActive ? 'is-active' : ''} ${evaluation.solved ? 'is-solved' : ''}"
                        data-guide-lesson="${escapeHtml(lesson.id)}"
                    >
                        <span class="guide-page-tab__step">${index + 1}</span>
                        <span class="guide-page-tab__text">${escapeHtml(lesson.title)}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function renderRunBanner(language: ScriptLanguage, lessonId: string): string {
    const banner = getLessonBanner(language, lessonId);
    if (!banner) return '';

    return `
        <div class="guide-run-banner guide-run-banner--${banner.kind}">
            ${escapeHtml(banner.message)}
        </div>
    `;
}

export function renderGuide(state: GuideLessonState, language: ScriptLanguage): string {
    const lesson = getActiveLesson(state, language);
    const sequenceIds = getLessonSequence(language, lesson.id);
    const evaluation = evaluateLesson(lesson, sequenceIds);
    const previewActive = isMissionGuideScenePreviewActive();
    const solvedCount = state.lessons
        .filter((item) => evaluateLesson(item, getLessonSequence(language, item.id)).solved)
        .length;
    const codePreview = getLessonCode(lesson, sequenceIds);
    const currentIndex = state.lessons.findIndex((item) => item.id === lesson.id);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < state.lessons.length - 1;

    return `
        <div class="guide-modal-layout" data-guide-language="${language}">
            <section class="guide-hero">
                <div class="guide-hero__eyebrow">${escapeHtml(state.heroEyebrow)}</div>
                <div class="guide-hero__title">${escapeHtml(state.heroTitle)}</div>
                <div class="guide-hero__text">${escapeHtml(state.heroText)}</div>
                <div class="guide-hero__flow">${escapeHtml(state.heroFlow)}</div>
                <div class="guide-hero__progress">Решено страниц: ${solvedCount} / ${state.lessons.length}</div>
            </section>

            ${renderPageTabs(state, language)}

            <section class="guide-lesson-page">
                <div class="guide-lesson-page__header">
                    <div>
                        <div class="guide-lesson-page__badge">${escapeHtml(lesson.badge)}</div>
                        <div class="guide-lesson-page__title">${escapeHtml(lesson.title)}</div>
                        <div class="guide-lesson-page__summary">${escapeHtml(lesson.summary)}</div>
                    </div>
                    <div class="guide-lesson-page__nav">
                        <button type="button" class="guide-lesson__action" data-guide-nav="prev" ${hasPrev ? '' : 'disabled'}>Предыдущее</button>
                        <button type="button" class="guide-lesson__action" data-guide-nav="next" ${hasNext ? '' : 'disabled'}>Следующее</button>
                    </div>
                </div>

                <div class="guide-lesson-page__goal">
                    <strong>Цель:</strong> ${escapeHtml(lesson.goal)}
                </div>
                <div class="guide-lesson-page__goal">
                    <strong>Подсказка по сборке:</strong> ${escapeHtml(lesson.builderHint)}
                </div>
                <div class="guide-lesson-page__goal">
                    <strong>Целевая логика:</strong>
                    ${renderTargetRoute(lesson)}
                </div>

                <div class="guide-page-layout">
                    <div class="guide-page-column guide-page-column--builder">
                        <section class="guide-panel-card">
                            <div class="guide-panel-card__title">Библиотека паззл-блоков</div>
                            <div class="guide-panel-card__text">Все блоки совместимы по форме, но не по логике. Можно собрать рабочий по синтаксису, но ошибочный по порядку сценарий.</div>
                            ${renderLibrary(lesson, sequenceIds)}
                        </section>

                        <section class="guide-panel-card">
                            <div class="guide-panel-card__title">Рабочая область</div>
                            <div class="guide-panel-card__text">Соберите цепочку так, чтобы вызовы Pioneer API шли в правильной причинно-следственной последовательности.</div>
                            ${renderWorkspace(lesson, sequenceIds)}
                            <div class="guide-actions">
                                <button type="button" class="guide-primary-action" data-guide-run="${escapeHtml(lesson.id)}" ${sequenceIds.length ? '' : 'disabled'}>Запустить собранный сценарий</button>
                                <button type="button" class="guide-lesson__action" data-guide-fill="${escapeHtml(lesson.id)}">Собрать эталон</button>
                                <button type="button" class="guide-lesson__action" data-guide-reset="${escapeHtml(lesson.id)}" ${sequenceIds.length ? '' : 'disabled'}>Очистить страницу</button>
                            </div>
                            ${renderRunBanner(language, lesson.id)}
                        </section>
                    </div>

                    <div class="guide-page-column guide-page-column--analysis">
                        <section class="guide-panel-card">
                            <div class="guide-panel-card__title">Живая сцена</div>
                            <div class="guide-panel-card__text">
                                ${previewActive
            ? 'Сцену не нужно искать под модалкой: запуск и результат видны прямо здесь.'
            : 'После запуска собранного сценария живая сцена появится в этом блоке, без закрытия руководства.'}
                            </div>
                            <div id="mission-guide-scene-preview-host" class="guide-scene-preview-host ${previewActive ? 'is-active' : ''}">
                                ${previewActive ? '' : '<div class="guide-scene-preview__placeholder">Нажмите "Запустить собранный сценарий", чтобы открыть live-просмотр симуляции в этом окне.</div>'}
                            </div>
                        </section>

                        <section class="guide-panel-card">
                            <div class="guide-panel-card__title">Проверка текущей сборки</div>
                            <div class="guide-panel-card__text">Диагностика пересчитывается после каждого перетаскивания. Она объясняет не только что не так, но и почему эта комбинация не соответствует логике Pioneer API.</div>
                            <div class="guide-diagnostics">
                                ${evaluation.diagnostics.map(renderDiagnosticCard).join('')}
                            </div>
                        </section>

                        <section class="guide-panel-card">
                            <div class="guide-panel-card__title">Каталог типичных ошибок</div>
                            <div class="guide-panel-card__text">Ниже перечислены все логические ошибки, которые можно допустить в рамках набора блоков этой страницы.</div>
                            <div class="guide-diagnostics">
                                ${lesson.errorCatalog.map(renderDiagnosticCard).join('')}
                            </div>
                        </section>

                        <section class="guide-panel-card">
                            <div class="guide-panel-card__title">Сгенерированный код</div>
                            <div class="guide-panel-card__text">Этот код составлен из текущего порядка блоков и использует реальные рабочие команды Pioneer API.</div>
                            <pre class="guide-lesson__code">${escapeHtml(codePreview)}</pre>
                        </section>

                        <section class="guide-panel-card">
                            <div class="guide-panel-card__title">Эталон для сравнения</div>
                            <div class="guide-panel-card__text">Если хотите проверить себя, сравните собранную цепочку с эталонным примером.</div>
                            <pre class="guide-lesson__code">${escapeHtml(lesson.solutionCode)}</pre>
                        </section>

                        <section class="guide-panel-card">
                            <div class="guide-panel-card__top">
                                <div class="guide-panel-card__title">Открыть связанные методы API</div>
                                <button
                                    type="button"
                                    class="guide-lesson__action"
                                    data-guide-query="${escapeHtml(lesson.actionQuery)}"
                                    ${lesson.actionPreviewKey ? `data-guide-preview="${escapeHtml(lesson.actionPreviewKey)}"` : ''}
                                >
                                    ${escapeHtml(lesson.actionLabel)}
                                </button>
                            </div>
                            <div class="guide-methods">
                                ${lesson.links.map(renderDocLink).join('')}
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        </div>
    `;
}
