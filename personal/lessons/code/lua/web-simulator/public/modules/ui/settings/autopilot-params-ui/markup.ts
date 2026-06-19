import type { AutopilotParameterDefinition, AutopilotSettingsState } from '../autopilot-params-model.js';
import { GROUP_DESCRIPTIONS, SECTION_META, SECTION_ORDER } from './config.js';
import { escapeHtml, formatDateTime, formatNumber, getStatusLabel, isParameterChanged } from './helpers.js';
import type { DraftState, FilterMode, FlashMessage, GroupState, SectionKey, SectionState } from './types.js';

function buildGroupedMarkup(params: {
    definitions: AutopilotParameterDefinition[];
    drafts: Map<string, DraftState>;
    state: AutopilotSettingsState;
    normalizedSearch: string;
    sectionState: SectionState;
    groupState: GroupState;
}) {
    const groupsBySection = new Map<SectionKey, { markup: string; itemsCount: number }[]>();
    SECTION_ORDER.forEach((sectionKey) => groupsBySection.set(sectionKey, []));

    SECTION_ORDER.forEach((sectionKey) => {
        SECTION_META[sectionKey].groups.forEach((group) => {
            const items = params.definitions.filter((definition) => definition.group === group);
            if (!items.length) return;
            const isGroupOpen = params.normalizedSearch ? true : params.groupState[group] === true;
            const groupMarkup = `
                <details class="autopilot-group" data-group="${escapeHtml(group)}"${isGroupOpen ? ' open' : ''}>
                    <summary class="autopilot-group__summary">
                        <div class="autopilot-group__heading">
                            <span class="autopilot-group__title">${escapeHtml(group)}</span>
                            <span class="autopilot-group__description">${escapeHtml(GROUP_DESCRIPTIONS[group] || 'Группа параметров автопилота.')}</span>
                        </div>
                        <span class="autopilot-group__meta">${items.length} параметров</span>
                    </summary>
                    <div class="autopilot-group__body">
                        ${items.map((definition) => {
                            const draft = params.drafts.get(definition.key);
                            const appliedValue = params.state.values[definition.key] ?? definition.defaultValue;
                            const value = draft?.value ?? String(appliedValue);
                            const error = draft?.error || '';
                            const isChanged = isParameterChanged(params.state.values[definition.key], definition.defaultValue);
                            const sourceBadge = definition.source === 'documentation' ? 'Есть описание' : 'Без описания';
                            const validationBits: string[] = [];
                            if (Array.isArray(definition.validation.allowedValues)) {
                                validationBits.push(`Допустимо: ${definition.validation.allowedValues.join(', ')}`);
                            }
                            if (typeof definition.validation.min === 'number') validationBits.push(`Мин. ${definition.validation.min}`);
                            if (typeof definition.validation.max === 'number') validationBits.push(`Макс. ${definition.validation.max}`);
                            if (definition.validation.unit) validationBits.push(`Ед. ${definition.validation.unit}`);
                            const statusText = error
                                ? error
                                : isChanged
                                    ? 'Изменение уже применено локально. Сохрани исходный файл, чтобы записать его обратно в .properties.'
                                    : 'Используется текущее значение шаблона или импортированного профиля.';
                            return `
                                <article class="autopilot-param ${error ? 'is-invalid' : ''} ${isChanged ? 'is-changed' : ''}">
                                    <div class="autopilot-param__meta">
                                        <div class="autopilot-param__headline">
                                            <code class="autopilot-param__key">${escapeHtml(definition.key)}</code>
                                            <span class="autopilot-param__badge">${escapeHtml(sourceBadge)}</span>
                                            ${isChanged ? '<span class="autopilot-param__badge autopilot-param__badge--changed">Изменен</span>' : ''}
                                            ${validationBits.length ? '<span class="autopilot-param__badge autopilot-param__badge--neutral">Есть ограничения</span>' : ''}
                                        </div>
                                        <p class="autopilot-param__description">${escapeHtml(definition.description)}</p>
                                        <p class="autopilot-param__details">${escapeHtml(definition.details)}</p>
                                        <div class="autopilot-param__facts">
                                            <span class="autopilot-param__fact"><strong>Текущее:</strong> ${escapeHtml(formatNumber(appliedValue))}</span>
                                            <span class="autopilot-param__fact"><strong>Шаблон:</strong> ${escapeHtml(formatNumber(definition.defaultValue))}</span>
                                            <span class="autopilot-param__fact"><strong>Группа:</strong> ${escapeHtml(definition.group)}</span>
                                        </div>
                                        <div class="autopilot-param__support">
                                            ${validationBits.length
                                                ? validationBits.map((item) => `<span class="autopilot-param__chip">${escapeHtml(item)}</span>`).join('')
                                                : '<span class="autopilot-param__chip">Проверка: конечное число</span>'}
                                            ${definition.validation.recommended ? `<span class="autopilot-param__chip autopilot-param__chip--accent">${escapeHtml(definition.validation.recommended)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="autopilot-param__control">
                                        <label class="autopilot-param__input-label" for="autopilot-param-${escapeHtml(definition.key)}">Новое значение</label>
                                        <input
                                            id="autopilot-param-${escapeHtml(definition.key)}"
                                            type="number"
                                            class="autopilot-param__input"
                                            data-parameter-key="${escapeHtml(definition.key)}"
                                            value="${escapeHtml(value)}"
                                            step="any"
                                            aria-invalid="${error ? 'true' : 'false'}"
                                        >
                                        <div class="autopilot-param__status ${error ? 'is-error' : ''}">
                                            ${escapeHtml(statusText)}
                                        </div>
                                    </div>
                                </article>
                            `;
                        }).join('')}
                    </div>
                </details>
            `;
            groupsBySection.get(sectionKey)?.push({ markup: groupMarkup, itemsCount: items.length });
        });
    });

    const derivedSectionState = params.normalizedSearch
        ? {
            flight: (groupsBySection.get('flight')?.length ?? 0) > 0,
            sensors: (groupsBySection.get('sensors')?.length ?? 0) > 0,
            hardware: (groupsBySection.get('hardware')?.length ?? 0) > 0,
            system: (groupsBySection.get('system')?.length ?? 0) > 0
        }
        : params.sectionState;

    return SECTION_ORDER.map((sectionKey) => {
        const groups = groupsBySection.get(sectionKey) ?? [];
        if (!groups.length) return '';
        const totalItems = groups.reduce((sum, entry) => sum + entry.itemsCount, 0);
        return `
            <details class="autopilot-section" data-section="${escapeHtml(sectionKey)}"${derivedSectionState[sectionKey] ? ' open' : ''}>
                <summary class="autopilot-section__summary">
                    <div class="autopilot-section__heading">
                        <span class="autopilot-section__title">${escapeHtml(SECTION_META[sectionKey].title)}</span>
                        <span class="autopilot-section__description">${escapeHtml(SECTION_META[sectionKey].description)}</span>
                    </div>
                    <span class="autopilot-section__meta">${groups.length} групп, ${totalItems} параметров</span>
                </summary>
                <div class="autopilot-section__body">${groups.map((entry) => entry.markup).join('')}</div>
            </details>
        `;
    }).join('');
}

export function renderAutopilotParamsBody(params: {
    activeFilter: FilterMode;
    changedCount: number;
    definitions: AutopilotParameterDefinition[];
    drafts: Map<string, DraftState>;
    fileInputId: string;
    filteredDefinitions: AutopilotParameterDefinition[];
    flash: FlashMessage | null;
    invalidDraftCount: number;
    isLoadingSource: boolean;
    isSavingSource: boolean;
    isSourceDirty: boolean;
    normalizedSearch: string;
    search: string;
    sectionState: SectionState;
    groupState: GroupState;
    sourceFilePath: string | null;
    state: AutopilotSettingsState;
    summary: { total: number; documented: number; constrained: number };
}) {
    const groupedMarkup = buildGroupedMarkup(params);
    const filterLabel = params.activeFilter === 'all'
        ? 'все параметры'
        : params.activeFilter === 'documented'
            ? 'только параметры с описанием'
            : params.activeFilter === 'changed'
                ? 'только измененные параметры'
                : 'только поля с ошибками ввода';

    return `
        <div class="autopilot-params-modal__shell">
            <aside class="autopilot-params-sidebar">
                <label class="autopilot-params-sidebar__field">
                    <span class="autopilot-params-sidebar__label">Автор изменений</span>
                    <input id="autopilot-author-input" type="text" value="${escapeHtml(params.state.author)}" placeholder="Например, Преподаватель или Student 01">
                </label>
                <div class="autopilot-summary-card">
                    <div class="autopilot-summary-card__title">Сводка и состояние</div>
                    <div class="autopilot-status-pill ${params.isSourceDirty ? 'is-dirty' : ''} ${params.isLoadingSource || params.isSavingSource ? 'is-busy' : ''}">
                        ${escapeHtml(getStatusLabel(params.isLoadingSource, params.isSavingSource, params.isSourceDirty))}
                    </div>
                    <div class="autopilot-summary-card__grid">
                        <div class="autopilot-summary-card__metric"><strong>${params.summary.total}</strong><span>Всего</span></div>
                        <div class="autopilot-summary-card__metric"><strong>${params.filteredDefinitions.length}</strong><span>Показано</span></div>
                        <div class="autopilot-summary-card__metric"><strong>${params.changedCount}</strong><span>Изменено</span></div>
                        <div class="autopilot-summary-card__metric"><strong>${params.invalidDraftCount}</strong><span>Ошибки</span></div>
                    </div>
                    <div class="autopilot-summary-card__item"><strong>${params.summary.documented}</strong><span>С описанием из документации</span></div>
                    <div class="autopilot-summary-card__item"><strong>${params.summary.constrained}</strong><span>С формальной валидацией</span></div>
                    <div class="autopilot-summary-card__meta"><strong>Источник:</strong> ${escapeHtml(params.state.sourceFileName || 'не указан')}</div>
                    <div class="autopilot-summary-card__meta autopilot-summary-card__meta--wrap"><strong>Исходный файл:</strong> ${escapeHtml(params.sourceFilePath || 'API недоступен')}</div>
                    <div class="autopilot-summary-card__meta"><strong>Импорт:</strong> ${escapeHtml(formatDateTime(params.state.importedAt))}</div>
                    <div class="autopilot-summary-card__meta"><strong>Обновлено:</strong> ${escapeHtml(formatDateTime(params.state.updatedAt))}</div>
                </div>
                <div class="autopilot-summary-card">
                    <div class="autopilot-summary-card__title">Действия</div>
                    <div class="autopilot-params-sidebar__hint">Изменения параметров сначала попадают в локальное состояние симулятора. Чтобы записать профиль обратно в файл, используй отдельную кнопку сохранения.</div>
                    <div class="autopilot-action-list">
                        <button type="button" class="autopilot-action-btn" data-action="save-source"${params.isSavingSource || !params.isSourceDirty ? ' disabled' : ''}>Сохранить в исходный файл</button>
                        <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-action="reload-source"${params.isLoadingSource ? ' disabled' : ''}>Перечитать исходный файл</button>
                        <button type="button" class="autopilot-action-btn" data-action="trigger-import">Загрузить .properties</button>
                        <button type="button" class="autopilot-action-btn" data-action="export">Скачать текущий профиль</button>
                        <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-action="reset">Сбросить к шаблону</button>
                    </div>
                    <input id="${params.fileInputId}" type="file" accept=".properties,text/plain" hidden>
                </div>
            </aside>
            <section class="autopilot-params-main">
                ${params.flash ? `<div class="autopilot-flash autopilot-flash--${params.flash.kind}">${escapeHtml(params.flash.text)}</div>` : ''}
                <div class="autopilot-params-main__note">
                    Для параметров, описанных на странице документации, показаны подробные пояснения и ограничения. Для остальных полей доступен полный импорт и редактирование по шаблону .properties. Изменение значения применяется при подтверждении поля, а запись в файл выполняется отдельной командой сохранения.
                </div>
                <div class="autopilot-toolbar">
                    <label class="autopilot-toolbar__search" for="autopilot-search-input">
                        <span class="autopilot-toolbar__label">Поиск параметра</span>
                        <div class="autopilot-toolbar__search-wrap">
                            <input id="autopilot-search-input" type="search" value="${escapeHtml(params.search)}" placeholder="Например, Copter_pos_vMax, yaw, RTL или 6.8">
                            ${params.search ? '<button type="button" class="autopilot-toolbar__clear" data-action="clear-search" aria-label="Очистить поиск">Очистить</button>' : ''}
                        </div>
                        <span class="autopilot-toolbar__hint">Поиск идет по имени параметра, группе, описанию и текущему значению.</span>
                    </label>
                    <div class="autopilot-toolbar__filters">
                        <button type="button" class="autopilot-filter-chip ${params.activeFilter === 'all' ? 'is-active' : ''}" data-filter="all">Все (${params.summary.total})</button>
                        <button type="button" class="autopilot-filter-chip ${params.activeFilter === 'documented' ? 'is-active' : ''}" data-filter="documented">С описанием (${params.summary.documented})</button>
                        <button type="button" class="autopilot-filter-chip ${params.activeFilter === 'changed' ? 'is-active' : ''}" data-filter="changed">Измененные (${params.changedCount})</button>
                        <button type="button" class="autopilot-filter-chip ${params.activeFilter === 'invalid' ? 'is-active' : ''}" data-filter="invalid">С ошибками (${params.invalidDraftCount})</button>
                    </div>
                    <div class="autopilot-toolbar__actions">
                        <button type="button" class="autopilot-toolbar__action" data-action="expand-all">Развернуть все</button>
                        <button type="button" class="autopilot-toolbar__action" data-action="collapse-all">Свернуть все</button>
                    </div>
                    <div class="autopilot-toolbar__meta">
                        Показано ${params.filteredDefinitions.length} из ${params.summary.total} параметров. Активный фильтр: ${escapeHtml(filterLabel)}.
                    </div>
                </div>
                <div class="autopilot-params-list">
                    ${groupedMarkup || '<div class="autopilot-empty-state">По текущему поиску и фильтру параметры не найдены.</div>'}
                </div>
            </section>
        </div>
    `;
}
