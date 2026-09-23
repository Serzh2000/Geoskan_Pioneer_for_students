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
    type ApiCategoryId,
    type ApiEntryView,
    type ApiSection,
    type ScriptLanguage
} from './sections.js';

const uiState: {
    language: ScriptLanguage;
    query: string;
    category: ApiCategoryId | 'all';
    expanded: Set<string>;
    openPreviewKey: string | null;
    previews: Map<string, ApiMethodPreview>;
} = {
    language: 'lua',
    query: '',
    category: 'all',
    expanded: new Set(),
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

function highlightApiCode(value: string): string {
    const escapedValue = escapeHtml(value);
    const accentTokens = [
        'nil',
        'vector2',
        'vector3',
        'string',
        'number',
        'boolean',
        'bool',
        'table',
        'function',
        'true',
        'false',
        'None'
    ];
    const accentPattern = new RegExp(`\\b(${accentTokens.join('|')})\\b`, 'g');

    return escapedValue.replace(accentPattern, '<span class="api-code-token api-code-token--accent">$1</span>');
}

function destroyPreviews(): void {
    for (const preview of uiState.previews.values()) {
        preview.destroy();
    }
    uiState.previews.clear();
}

function renderToolbar(language: ScriptLanguage, sections: ApiSection[], totalCount: number): string {
    const label = language === 'lua' ? 'Lua' : 'Python';
    const escapedQuery = escapeHtml(uiState.query);
    const chips = [
        { id: 'all' as const, title: 'Все', count: totalCount },
        ...sections.map((section) => ({ id: section.id, title: section.title, count: section.entries.length }))
    ];

    return `
        <div class="api-toolbar">
            <div class="api-search">
                <svg class="api-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="10" cy="10" r="7" />
                    <path d="M21 21l-6 -6" />
                </svg>
                <input
                    id="api-docs-search"
                    class="api-search__input"
                    type="text"
                    placeholder="Найти метод, событие или пример..."
                    value="${escapedQuery}"
                    autocomplete="off"
                    spellcheck="false"
                    aria-label="Поиск по API"
                />
                <span class="api-search__badge">${label}</span>
            </div>
            <div class="api-filters">
                ${chips
                    .map(
                        (chip) => `
                            <button
                                type="button"
                                class="api-chip ${uiState.category === chip.id ? 'is-active' : ''}"
                                data-category="${chip.id}"
                                aria-pressed="${uiState.category === chip.id}">
                                ${escapeHtml(chip.title)}
                                <span class="api-chip__count">${chip.count}</span>
                            </button>
                        `
                    )
                    .join('')}
            </div>
        </div>
    `;
}

function renderFact(label: string, value: string): string {
    return `
        <div class="api-fact">
            <dt class="api-fact__label">${label}</dt>
            <dd class="api-fact__value">${value}</dd>
        </div>
    `;
}

function renderEntryBody(entry: ApiEntryView): string {
    const isInteractive = !!entry.previewScenario;
    const isPreviewOpen = uiState.openPreviewKey === entry.name && isInteractive;
    // Direction is shown as a badge in the entry head (renderDirectionBadge).
    const facts = [
        entry.doc.params ? renderFact('Аргументы', highlightApiCode(entry.doc.params)) : '',
        entry.doc.returns ? renderFact('Возвращает', highlightApiCode(entry.doc.returns)) : ''
    ].join('');

    return `
        <div class="api-entry__body">
            ${entry.doc.syntax
                ? `<div class="api-code">
                       <div class="api-code__label">Синтаксис</div>
                       <code class="api-code__text">${highlightApiCode(entry.doc.syntax)}</code>
                   </div>`
                : ''}
            ${facts ? `<dl class="api-facts">${facts}</dl>` : ''}
            ${entry.doc.example
                ? `<div class="api-code api-code--example">
                       <div class="api-code__label">
                           Пример
                           <button type="button" class="api-copy" data-copy="${escapeHtml(entry.doc.example)}">Копировать</button>
                       </div>
                       <code class="api-code__text">${highlightApiCode(entry.doc.example)}</code>
                   </div>`
                : ''}
            ${isInteractive
                ? `<button type="button" class="api-preview-toggle ${isPreviewOpen ? 'is-open' : ''}"
                       data-preview-toggle="${escapeHtml(entry.name)}" aria-expanded="${isPreviewOpen}">
                       ${isPreviewOpen ? 'Скрыть 3D-анимацию' : 'Показать 3D-анимацию'}
                   </button>`
                : ''}
            ${isPreviewOpen ? renderPreviewShell(entry) : ''}
        </div>
    `;
}

// Visible without expanding the entry: is this something the script sends
// to the autopilot (a command), or something the autopilot sends back into
// callback(event)? The two look alike (both are Ev.*) and are easy to mix up.
function renderDirectionBadge(direction: ApiEntryView['doc']['direction']): string {
    if (direction === 'to-autopilot') {
        return `<span class="api-badge-direction api-badge-direction--to" title="Команда: скрипт отправляет её автопилоту">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6l-6 6"/></svg>
            в автопилот</span>`;
    }
    if (direction === 'from-autopilot') {
        return `<span class="api-badge-direction api-badge-direction--from" title="Событие: автопилот присылает его в callback(event)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M11 6l-6 6l6 6"/></svg>
            от автопилота</span>`;
    }
    return '';
}

function renderEntry(entry: ApiEntryView): string {
    const isInteractive = !!entry.previewScenario;
    const isExpanded = uiState.expanded.has(entry.name);

    return `
        <article class="api-entry ${isExpanded ? 'is-expanded' : ''}">
            <button
                type="button"
                class="api-entry__head"
                data-entry-toggle="${escapeHtml(entry.name)}"
                aria-expanded="${isExpanded}">
                <span class="api-entry__title">
                    <span class="api-name">${escapeHtml(entry.name)}</span>
                    ${renderDirectionBadge(entry.doc.direction)}
                    ${isInteractive ? '<span class="api-badge-3d">3D</span>' : ''}
                </span>
                <span class="api-entry__desc">${entry.doc.desc || 'Описание пока не добавлено.'}</span>
                <svg class="api-entry__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6l6 -6" />
                </svg>
            </button>
            ${isExpanded ? renderEntryBody(entry) : ''}
        </article>
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
                <div class="api-empty-state__text">Попробуйте изменить запрос или выбрать категорию «Все».</div>
            </div>
        `;
    }

    return `
        <div class="api-results">
            ${sections
                .map((section) => `
                    <section class="api-category">
                        <div class="api-category-head">
                            <h3 class="api-category-title">${section.title}</h3>
                            <p class="api-category-description">${section.description}</p>
                        </div>
                        <div class="api-category-list">
                            ${section.entries.map(renderEntry).join('')}
                        </div>
                    </section>
                `)
                .join('')}
        </div>
    `;
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

    container.querySelectorAll<HTMLElement>('[data-category]').forEach((chip) => {
        chip.addEventListener('click', () => {
            uiState.category = (chip.dataset.category || 'all') as ApiCategoryId | 'all';
            renderApiDocs(uiState.language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-entry-toggle]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const key = trigger.dataset.entryToggle;
            if (!key) return;
            if (uiState.expanded.has(key)) {
                uiState.expanded.delete(key);
                if (uiState.openPreviewKey === key) uiState.openPreviewKey = null;
            } else {
                uiState.expanded.add(key);
            }
            renderApiDocs(uiState.language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-preview-toggle]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const key = trigger.dataset.previewToggle || null;
            uiState.openPreviewKey = uiState.openPreviewKey === key ? null : key;
            renderApiDocs(uiState.language);
        });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copy || '');
                button.textContent = 'Скопировано';
                button.classList.add('is-done');
                window.setTimeout(() => {
                    button.textContent = 'Копировать';
                    button.classList.remove('is-done');
                }, 1600);
            } catch {
                button.textContent = 'Не удалось';
                window.setTimeout(() => {
                    button.textContent = 'Копировать';
                }, 1600);
            }
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
        uiState.expanded.clear();
    }
    uiState.language = language;

    const docs = language === 'python' ? pythonApiDocs : apiDocs;
    const sections = buildSections(docs, language, uiState.query);
    const totalEntries = sections.reduce((count, section) => count + section.entries.length, 0);

    // Выбранная категория может опустеть после нового запроса — тогда
    // показываем всё, иначе экран остался бы пустым без объяснения.
    if (uiState.category !== 'all' && !sections.some((section) => section.id === uiState.category)) {
        uiState.category = 'all';
    }
    const visibleSections = uiState.category === 'all'
        ? sections
        : sections.filter((section) => section.id === uiState.category);

    destroyPreviews();
    container.innerHTML = `
        ${renderToolbar(language, sections, totalEntries)}
        ${renderSections(visibleSections)}
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
    uiState.category = 'all';
    if (options.previewKey) {
        uiState.expanded.add(options.previewKey);
    }

    // The reference now lives in a drawer inside the code editor
    // (panels/editor-docs.ts) - open the editor, then the drawer.
    // openPanel is a toggle: calling it for the active editor would hide
    // the reference along with the editor instead of revealing it.
    if (!document.getElementById('editor-panel')?.classList.contains('active')) {
        (window as any).openPanel?.('editor-panel');
    }
    document.dispatchEvent(new CustomEvent('editor-docs:open'));
    renderApiDocs(language);
}
