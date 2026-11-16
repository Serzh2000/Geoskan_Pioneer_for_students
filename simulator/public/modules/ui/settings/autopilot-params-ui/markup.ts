import type { AutopilotParameterDefinition, AutopilotSettingsState } from '../autopilot-params-model.js';
import { FALLBACK_SECTION, GROUP_DESCRIPTIONS, getKnownGroups, SECTION_META, SECTION_ORDER } from './config.js';
import { escapeHtml, getStatusLabel, pluralize } from './helpers.js';
import { renderParam } from './param-markup.js';
import { flashBlock } from './home-markup.js';
import type { DraftState, FilterMode, FlashMessage } from './types.js';

export type NavSection = { title: string; groups: string[] };

/** Разделы с их группами в порядке интерфейса. Группы, которых нет в SECTION_META (профиль новее интерфейса), идут в служебный раздел. */
export function listNavSections(definitions: AutopilotParameterDefinition[]): NavSection[] {
    const known = getKnownGroups();
    const present = new Set(definitions.map((definition) => definition.group));
    const unknown = [...present].filter((group) => !known.has(group)).sort();
    return SECTION_ORDER.map((key) => ({
        title: SECTION_META[key].title,
        groups: [...SECTION_META[key].groups, ...(key === FALLBACK_SECTION ? unknown : [])].filter((group) => present.has(group))
    })).filter((section) => section.groups.length > 0);
}

/** Группа, которая открывается первой. */
export function firstNavGroup(definitions: AutopilotParameterDefinition[]): string | null {
    return listNavSections(definitions)[0]?.groups[0] ?? null;
}

function renderNav(params: { all: AutopilotParameterDefinition[]; shown: AutopilotParameterDefinition[]; selected: string | null; searching: boolean }) {
    const countIn = (list: AutopilotParameterDefinition[], group: string) => list.filter((definition) => definition.group === group).length;
    const sections = listNavSections(params.all).map((section) => `
        <div class="autopilot-nav__section">
            <div class="autopilot-nav__section-title">${escapeHtml(section.title)}</div>
            ${section.groups.map((group) => {
                const shown = countIn(params.shown, group);
                const active = !params.searching && params.selected === group;
                return `<button type="button" class="autopilot-nav__item${active ? ' is-active' : ''}${shown === 0 ? ' is-empty' : ''}" data-nav="${escapeHtml(group)}"${active ? ' aria-current="true"' : ''}>
                    <span class="autopilot-nav__name">${escapeHtml(group)}</span><span class="autopilot-nav__count">${shown}</span>
                </button>`;
            }).join('')}
        </div>`).join('');
    const allActive = !params.searching && params.selected === null;
    const select = `
        <label class="autopilot-navselect">
            <span>Группа</span>
            <select id="autopilot-nav-select">
                <option value=""${allActive ? ' selected' : ''}>Все параметры (${params.shown.length})</option>
                ${listNavSections(params.all).map((section) => `<optgroup label="${escapeHtml(section.title)}">${section.groups.map((group) => `<option value="${escapeHtml(group)}"${!params.searching && params.selected === group ? ' selected' : ''}>${escapeHtml(group)} (${countIn(params.shown, group)})</option>`).join('')}</optgroup>`).join('')}
            </select>
        </label>`;
    return `
        ${select}
        <nav class="autopilot-nav" aria-label="Группы параметров">
            <button type="button" class="autopilot-nav__item autopilot-nav__item--all${allActive ? ' is-active' : ''}" data-nav=""${allActive ? ' aria-current="true"' : ''}>
                <span class="autopilot-nav__name">Все параметры</span><span class="autopilot-nav__count">${params.shown.length}</span>
            </button>
            ${sections}
        </nav>`;
}

function renderList(params: {
    shown: AutopilotParameterDefinition[];
    selected: string | null;
    searching: boolean;
    drafts: Map<string, DraftState>;
    state: AutopilotSettingsState;
}) {
    const inGroup = params.searching || params.selected === null ? params.shown : params.shown.filter((definition) => definition.group === params.selected);
    const card = (definition: AutopilotParameterDefinition) => renderParam(definition, params);
    if (!inGroup.length) {
        return `<div class="autopilot-empty-state">Здесь нет параметров по текущему поиску и фильтру.${params.selected !== null && !params.searching ? ' <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-nav="">Показать во всех группах</button>' : ''}</div>`;
    }
    if (params.searching || params.selected === null) {
        // Несколько групп подряд: заголовок группы перед её параметрами.
        const groups = [...new Set(inGroup.map((definition) => definition.group))];
        return groups.map((group) => `
            <section class="autopilot-list-group">
                <h4 class="autopilot-list-group__title">${escapeHtml(group)}<span>${inGroup.filter((definition) => definition.group === group).length}</span></h4>
                ${inGroup.filter((definition) => definition.group === group).map(card).join('')}
            </section>`).join('');
    }
    return inGroup.map(card).join('');
}

export function renderAutopilotParamsBody(params: {
    activeFilter: FilterMode;
    allDefinitions: AutopilotParameterDefinition[];
    changedCount: number;
    drafts: Map<string, DraftState>;
    filteredDefinitions: AutopilotParameterDefinition[];
    flash: FlashMessage | null;
    invalidDraftCount: number;
    isLoadingSource: boolean;
    isSavingSource: boolean;
    isSourceDirty: boolean;
    sourceWritable: boolean;
    normalizedSearch: string;
    search: string;
    selectedGroup: string | null;
    state: AutopilotSettingsState;
    summary: { total: number; documented: number; constrained: number };
}) {
    const searching = Boolean(params.normalizedSearch);
    const heading = searching ? 'Результаты поиска' : params.selectedGroup ?? 'Все параметры';
    const description = searching
        ? `Поиск идёт по имени, группе, описанию и значению во всех группах.`
        : params.selectedGroup ? (GROUP_DESCRIPTIONS[params.selectedGroup] || 'Группа параметров автопилота.') : 'Все группы подряд. Выберите группу слева, чтобы сузить список.';
    const shownInView = searching || params.selectedGroup === null
        ? params.filteredDefinitions.length
        : params.filteredDefinitions.filter((definition) => definition.group === params.selectedGroup).length;
    const chip = (filter: FilterMode, label: string, count: number) =>
        `<button type="button" class="autopilot-filter-chip ${params.activeFilter === filter ? 'is-active' : ''}" data-filter="${filter}">${label} (${count})</button>`;
    return `
        <div class="autopilot-editor">
            <aside class="autopilot-editor__nav">
                ${renderNav({ all: params.allDefinitions, shown: params.filteredDefinitions, selected: params.selectedGroup, searching })}
            </aside>
            <section class="autopilot-editor__main">
                <div class="autopilot-editor__top">
                    <label class="autopilot-search">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                        <input id="autopilot-search-input" type="search" value="${escapeHtml(params.search)}" placeholder="Поиск по имени, описанию или значению" aria-label="Поиск параметра" autocomplete="off" spellcheck="false">
                        ${params.search ? '<button type="button" class="autopilot-search__clear" data-action="clear-search" aria-label="Очистить поиск">&times;</button>' : ''}
                    </label>
                    <div class="autopilot-seg" role="group" aria-label="Какие параметры показывать">
                        ${chip('all', 'Все', params.summary.total)}
                        ${chip('documented', 'С описанием', params.summary.documented)}
                        ${chip('changed', 'Изменённые', params.changedCount)}
                        ${params.invalidDraftCount || params.activeFilter === 'invalid' ? chip('invalid', 'С ошибками', params.invalidDraftCount) : ''}
                    </div>
                    <div class="autopilot-editor__actions">
                        <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-action="export" title="Скачать текущий профиль файлом .properties">Скачать</button>
                        ${params.sourceWritable ? `<button type="button" class="autopilot-action-btn" data-action="save-source" title="Записать изменения в исходный файл профиля"${params.isSavingSource || !params.isSourceDirty ? ' disabled' : ''}>Сохранить</button>` : ''}
                    </div>
                </div>
                ${flashBlock(params.flash)}
                <header class="autopilot-editor__heading">
                    <h3 tabindex="-1" data-view-heading>${escapeHtml(heading)}<span class="autopilot-editor__count">${shownInView}</span></h3>
                    <p>${escapeHtml(description)}</p>
                    <p class="autopilot-editor__file"><strong>${escapeHtml(params.state.sourceFileName || 'профиль не загружен')}</strong> · ${pluralize(params.summary.total, 'параметр', 'параметра', 'параметров')} · изменено ${params.changedCount} · ${escapeHtml(getStatusLabel(params.isLoadingSource, params.isSavingSource, params.isSourceDirty, params.sourceWritable).toLowerCase())}</p>
                </header>
                <div class="autopilot-params-list">${renderList({ shown: params.filteredDefinitions, selected: params.selectedGroup, searching, drafts: params.drafts, state: params.state })}</div>
            </section>
        </div>
    `;
}
