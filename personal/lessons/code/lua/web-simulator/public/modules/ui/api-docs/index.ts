/**
 * Модуль рендеринга справочника API.
 * Формирует структурированный каталог методов, поддерживает поиск по API
 * и подключает раскрывающиеся 3D-визуализации для методов автопилота.
 */
import { apiDocs, pythonApiDocs } from '../../docs/api-docs.js';
import { ApiMethodPreview, type ApiPreviewScenario } from './preview/index.js';
import {
    buildSections,
    getPreviewScenario,
    type ApiEntryView,
    type ApiSection,
    type ScriptLanguage
} from './sections.js';

const uiState: {
    language: ScriptLanguage;
    query: string;
    openPreviewKey: string | null;
    previews: Map<string, ApiMethodPreview>;
} = {
    language: 'lua',
    query: '',
    openPreviewKey: null,
    previews: new Map()
};

type SearchSelectionState = {
    start: number;
    end: number;
    direction?: 'forward' | 'backward' | 'none';
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function destroyPreviews(): void {
    for (const preview of uiState.previews.values()) {
        preview.destroy();
    }
    uiState.previews.clear();
}

function renderToolbar(language: ScriptLanguage, totalCount: number): string {
    const label = language === 'lua' ? 'Lua API' : 'Python API';
    const escapedQuery = escapeHtml(uiState.query);
    const summary = totalCount === 0 ? 'Совпадений нет' : `Найдено: ${totalCount}`;

    return `
        <div class="api-toolbar">
            <label class="api-search">
                <span class="api-search__label">Поиск по API</span>
                <input
                    id="api-docs-search"
                    class="api-search__input"
                    type="search"
                    placeholder="Метод, событие, аргумент, пример..."
                    value="${escapedQuery}"
                    autocomplete="off"
                    spellcheck="false"
                />
            </label>
            <div class="api-toolbar__meta">
                <span class="api-toolbar__badge">${label}</span>
                <span class="api-toolbar__summary">${summary}</span>
            </div>
        </div>
    `;
}

function renderEntry(entry: ApiEntryView): string {
    const isInteractive = !!entry.previewScenario;
    const isOpen = uiState.openPreviewKey === entry.name && isInteractive;
    const headerTag = isInteractive ? 'button' : 'div';
    const headerAttrs = isInteractive
        ? `type="button" class="api-header api-header--button" data-preview-toggle="${escapeHtml(entry.name)}" aria-expanded="${isOpen}"`
        : 'class="api-header"';
    const scopeTag = escapeHtml(entry.scopeLabel);
    const kind = escapeHtml(entry.doc.kind || 'Method');

    return `
        <div class="api-entry ${isInteractive ? 'api-entry--interactive' : ''}">
            <${headerTag} ${headerAttrs}>
                <span class="api-header__main">
                    <span class="api-name">${escapeHtml(entry.name)}</span>
                    <span class="api-tags">
                        <span class="api-tag">${scopeTag}</span>
                        ${isInteractive ? '<span class="api-tag api-tag--accent">3D</span>' : ''}
                    </span>
                </span>
                <span class="api-header__side">
                    <span class="api-kind">${kind}</span>
                    ${isInteractive ? `<span class="api-toggle-indicator">${isOpen ? 'Скрыть' : 'Показать'} анимацию</span>` : ''}
                </span>
            </${headerTag}>
            <div class="api-desc">${entry.doc.desc || 'Описание пока не добавлено.'}</div>
            <div class="api-details">
                ${entry.doc.syntax ? `<div class="api-details-row"><span class="api-details-label">Синтаксис:</span><span class="api-details-value">${entry.doc.syntax}</span></div>` : ''}
                ${entry.doc.params ? `<div class="api-details-row"><span class="api-details-label">Аргументы:</span><span class="api-details-value">${entry.doc.params}</span></div>` : ''}
                ${entry.doc.returns ? `<div class="api-details-row"><span class="api-details-label">Возвращает:</span><span class="api-details-value">${entry.doc.returns}</span></div>` : ''}
            </div>
            ${entry.doc.example ? `<div class="api-example">${entry.doc.example}</div>` : ''}
            ${isOpen ? renderPreviewShell(entry) : ''}
        </div>
    `;
}

function renderPreviewShell(entry: ApiEntryView): string {
    return `
        <div class="api-preview" data-api-preview-root="${escapeHtml(entry.name)}">
            <div class="api-preview__stage" data-api-preview-stage>
                <div class="api-preview__legend">
                    <span class="api-preview__legend-item"><span class="api-preview__swatch api-preview__swatch--start"></span>Старт</span>
                    <span class="api-preview__legend-item"><span class="api-preview__swatch api-preview__swatch--route"></span>Траектория</span>
                    <span class="api-preview__legend-item"><span class="api-preview__swatch api-preview__swatch--target"></span>Цель</span>
                </div>
                <div class="api-preview__phase" data-api-preview-phase>Подготовка...</div>
            </div>
            <div class="api-preview__meta">
                <div class="api-preview__title">Визуализация метода</div>
                <div class="api-preview__status" data-api-preview-status>Подготовка сцены...</div>
                <div class="api-preview__hint" data-api-preview-hint>Используется существующая модель дрона из симулятора.</div>
            </div>
        </div>
    `;
}

function renderSections(sections: ApiSection[]): string {
    if (sections.length === 0) {
        return `
            <div class="api-empty-state">
                <div class="api-empty-state__title">Ничего не найдено</div>
                <div class="api-empty-state__text">Попробуйте изменить строку поиска или очистить фильтр.</div>
            </div>
        `;
    }

    return sections
        .map((section) => `
            <section class="api-category">
                <div class="api-category-title">
                    <span>${section.title}</span>
                    <span class="api-category-count">${section.entries.length}</span>
                </div>
                <div class="api-category-description">${section.description}</div>
                <div class="api-category-list">
                    ${section.entries.map(renderEntry).join('')}
                </div>
            </section>
        `)
        .join('');
}

function restoreSearchSelection(container: HTMLElement, selection: SearchSelectionState | null): void {
    if (!selection) return;

    const searchInput = container.querySelector('#api-docs-search') as HTMLInputElement | null;
    if (!searchInput) return;

    searchInput.focus();
    searchInput.setSelectionRange(selection.start, selection.end, selection.direction);
}

function attachInteractions(container: HTMLElement): void {
    const searchInput = container.querySelector('#api-docs-search') as HTMLInputElement | null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            uiState.query = searchInput.value;
            renderApiDocs(uiState.language, {
                searchSelection: {
                    start: searchInput.selectionStart ?? searchInput.value.length,
                    end: searchInput.selectionEnd ?? searchInput.value.length,
                    direction: searchInput.selectionDirection ?? 'none'
                }
            });
        });
    }

    container.querySelectorAll<HTMLElement>('[data-preview-toggle]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const key = trigger.dataset.previewToggle || null;
            uiState.openPreviewKey = uiState.openPreviewKey === key ? null : key;
            renderApiDocs(uiState.language);
        });
    });
}

function mountOpenPreview(container: HTMLElement): void {
    const previewRoot = container.querySelector<HTMLElement>('[data-api-preview-root]');
    if (!previewRoot) return;

    const key = previewRoot.dataset.apiPreviewRoot || '';
    const scenario = getPreviewScenario(key);
    if (!scenario) return;

    const preview = new ApiMethodPreview(previewRoot, scenario);
    uiState.previews.set(key, preview);
}

export function renderApiDocs(
    language: ScriptLanguage = 'lua',
    options: { searchSelection?: SearchSelectionState | null } = {}
) {
    const container = document.getElementById('api-docs');
    if (!container) return;

    if (uiState.language !== language) {
        uiState.openPreviewKey = null;
    }
    uiState.language = language;

    const docs = language === 'python' ? pythonApiDocs : apiDocs;
    const sections = buildSections(docs, language, uiState.query);
    const totalEntries = sections.reduce((count, section) => count + section.entries.length, 0);

    destroyPreviews();
    container.innerHTML = `
        ${renderToolbar(language, totalEntries)}
        ${renderSections(sections)}
    `;

    attachInteractions(container);
    restoreSearchSelection(container, options.searchSelection ?? null);
    mountOpenPreview(container);
}

export function openApiDocsCatalog(options: {
    language?: ScriptLanguage;
    query?: string;
    previewKey?: string | null;
} = {}) {
    const language = options.language ?? uiState.language;
    uiState.language = language;
    if (typeof options.query === 'string') {
        uiState.query = options.query;
    }
    uiState.openPreviewKey = options.previewKey ?? null;

    (window as any).openPanel?.('docs-panel');
    renderApiDocs(language);
}
