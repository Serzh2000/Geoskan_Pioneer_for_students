import type { AutopilotParameterDefinition, AutopilotSettingsState } from '../autopilot-params-model.js';
import { FALLBACK_SECTION, GROUP_DESCRIPTIONS, getKnownGroups, SECTION_META, SECTION_ORDER } from './config.js';
import { escapeHtml, getStatusLabel } from './helpers.js';
import { renderParam } from './param-markup.js';
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
    return `
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
        return `<div class="autopilot-empty-state">Здесь нет параметров по текущему поиску и фильтру.${params.selected !== null && !params.searching ? ' <button type="button" class="autopilot-toolbar__action" data-nav="">Показать во всех группах</button>' : ''}</div>`;
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
        <div class="autopilot-params-modal__shell autopilot-editor">
            <aside class="autopilot-params-sidebar autopilot-editor__nav">
                ${renderNav({ all: params.allDefinitions, shown: params.filteredDefinitions, selected: params.selectedGroup, searching })}
            </aside>
            <section class="autopilot-params-main autopilot-editor__main">
                <div class="autopilot-editor__top">
                    <div class="autopilot-editor-bar">
                        <div class="autopilot-editor-bar__file">
                            <strong>${escapeHtml(params.state.sourceFileName || 'профиль не загружен')}</strong>
                            <span>${params.summary.total} параметров · изменено ${params.changedCount} · ${escapeHtml(getStatusLabel(params.isLoadingSource, params.isSavingSource, params.isSourceDirty).toLowerCase())}</span>
                        </div>
                        <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-action="export">Скачать .properties</button>
                        <button type="button" class="autopilot-action-btn" data-action="save-source"${params.isSavingSource || !params.isSourceDirty ? ' disabled' : ''}>Сохранить в исходный файл</button>
                    </div>
                    <div class="autopilot-toolbar autopilot-toolbar--compact">
                        <div class="autopilot-toolbar__search-wrap">
                            <input id="autopilot-search-input" type="search" value="${escapeHtml(params.search)}" placeholder="Найти параметр: Copter_pos_vMax, yaw, RTL или значение" aria-label="Поиск параметра">
                            ${params.search ? '<button type="button" class="autopilot-toolbar__clear" data-action="clear-search" aria-label="Очистить поиск">Очистить</button>' : ''}
                        </div>
                        <div class="autopilot-toolbar__filters">
                            ${chip('all', 'Все', params.summary.total)}
                            ${chip('documented', 'С описанием', params.summary.documented)}
                            ${chip('changed', 'Изменённые', params.changedCount)}
                            ${chip('invalid', 'С ошибками', params.invalidDraftCount)}
                        </div>
                    </div>
                </div>
                ${params.flash ? `<div class="autopilot-flash autopilot-flash--${params.flash.kind}">${escapeHtml(params.flash.text)}</div>` : ''}
                <header class="autopilot-editor__heading">
                    <h3>${escapeHtml(heading)}</h3>
                    <p>${escapeHtml(description)} <span class="autopilot-editor__count">Показано ${shownInView}.</span></p>
                </header>
                <div class="autopilot-params-list">${renderList({ shown: params.filteredDefinitions, selected: params.selectedGroup, searching, drafts: params.drafts, state: params.state })}</div>
            </section>
        </div>
    `;
}
