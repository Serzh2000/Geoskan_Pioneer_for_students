import { log } from '../../../shared/logging/logger.js';
import {
    exportAutopilotPropertiesText,
    getAutopilotParameterDefinitions,
    getAutopilotSettingsState,
    getAutopilotValidationSummary,
    importAutopilotProperties,
    loadAutopilotTemplateFromText
} from '../autopilot-params-model.js';
import type { DraftState, FilterMode, FlashMessage, GroupState, ParamsView, SectionState } from './types.js';
import { getKnownGroups } from './config.js';
import { createDroneSync } from './drone-sync.js';
import { attachAutopilotParamsEvents } from './events.js';
import { askPreset } from './preset-dialog.js';
import { findAutopilotPreset } from './presets.js';
import { isParameterChanged } from './helpers.js';
import { renderAutopilotParamsHome } from './home-markup.js';
import { firstNavGroup, renderAutopilotParamsBody } from './markup.js';
import { fetchAutopilotSourceFile, saveAutopilotSourceFile } from './source-api.js';

export function initAutopilotParamsUI() {
    const openButton = document.getElementById('open-autopilot-params-btn') as HTMLButtonElement | null;
    let view: ParamsView = 'home';
    /** Группа, открытая в редакторе: null - все подряд, undefined - ещё не выбирали (откроется первая). */
    let selectedGroup: string | null | undefined;
    let search = '';
    let activeFilter: FilterMode = 'all';
    let flash: FlashMessage | null = null;
    let isLoadingSource = false;
    let isSavingSource = false;
    let isSourceLoaded = false;
    let isSourceDirty = false;
    let sectionState: SectionState = { flight: true, sensors: true, hardware: true, system: true };
    let groupState: GroupState = {};
    const drafts = new Map<string, DraftState>();
    const fileInputId = 'autopilot-params-file-input';

    document.getElementById('autopilot-params-overlay')?.remove();
    openButton?.classList.remove('is-active');
    openButton?.setAttribute('aria-expanded', 'false');

    const overlay = document.createElement('div');
    overlay.id = 'autopilot-params-overlay';
    overlay.className = 'modal-overlay autopilot-params-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
        <div class="modal-content autopilot-params-modal" role="dialog" aria-modal="true" aria-labelledby="autopilot-params-title">
            <div class="autopilot-params-modal__header">
                <div class="autopilot-params-modal__title-wrap">
                    <button type="button" id="autopilot-params-back" class="autopilot-params-modal__back" hidden>&larr; К выбору действий</button>
                    <div class="autopilot-params-modal__eyebrow">Настройки автопилота</div>
                    <div id="autopilot-params-title" class="autopilot-params-modal__title">Параметры автопилота Pioneer</div>
                    <div id="autopilot-params-subtitle" class="autopilot-params-modal__subtitle"></div>
                </div>
                <button type="button" id="autopilot-params-close" class="modal-close-btn autopilot-params-modal__close" aria-label="Закрыть">&times;</button>
            </div>
            <div id="autopilot-params-body" class="autopilot-params-modal__body"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const body = overlay.querySelector('#autopilot-params-body') as HTMLDivElement | null;

    const setAllExpanded = (expanded: boolean) => {
        sectionState = { flight: expanded, sensors: expanded, hardware: expanded, system: expanded };
        for (const group of new Set([...getKnownGroups(), ...getAutopilotParameterDefinitions().map((definition) => definition.group)])) {
            groupState[group] = expanded;
        }
    };

    const loadSourceIntoModel = async (announceSuccess = false) => {
        if (isLoadingSource) return;
        isLoadingSource = true;
        render();
        try {
            const payload = await fetchAutopilotSourceFile();
            loadAutopilotTemplateFromText(payload.content, payload.fileName);
            isSourceLoaded = true;
            isSourceDirty = false;
            drafts.clear();
            flash = announceSuccess
                ? { kind: 'success', text: `Исходный файл ${payload.fileName} перечитан, доступно параметров: ${getAutopilotParameterDefinitions().length}.` }
                : null;
            log(`[AUTOPILOT] Загружен исходный файл параметров: ${payload.fileName}`, 'success');
        } catch {
            flash = { kind: 'error', text: 'Не удалось прочитать исходный файл параметров автопилота через API.' };
            log('[AUTOPILOT] Не удалось загрузить исходный файл параметров.', 'error');
        } finally {
            isLoadingSource = false;
            render();
        }
    };

    const persistSourceFile = async () => {
        if (isSavingSource) return;
        isSavingSource = true;
        render();
        try {
            const content = exportAutopilotPropertiesText();
            const payload = await saveAutopilotSourceFile(content);
            loadAutopilotTemplateFromText(content, payload.fileName);
            isSourceLoaded = true;
            isSourceDirty = false;
            flash = { kind: 'success', text: `Изменения сохранены в исходный файл ${payload.fileName}.` };
            log(`[AUTOPILOT] Изменения сохранены в исходный файл: ${payload.fileName}`, 'success');
        } catch {
            flash = { kind: 'error', text: 'Не удалось сохранить изменения в исходный файл параметров.' };
            log('[AUTOPILOT] Ошибка сохранения исходного файла параметров.', 'error');
        } finally {
            isSavingSource = false;
            render();
        }
    };

    const hide = () => {
        overlay.style.display = 'none';
        openButton?.classList.remove('is-active');
        openButton?.setAttribute('aria-expanded', 'false');
    };

    const droneSync = createDroneSync({
        getAuthor: () => (overlay.querySelector('#autopilot-author-input') as HTMLInputElement | null)?.value || getAutopilotSettingsState().author,
        getDialogHost: () => overlay.querySelector('.autopilot-params-modal') as HTMLElement | null,
        setFlash: (next) => { flash = next; },
        render: () => render(),
        onModelChanged: () => {
            drafts.clear();
            isSourceDirty = true;
        }
    });

    const SUBTITLES: Record<ParamsView, string> = {
        home: 'Выберите, что нужно сделать с параметрами автопилота: загрузить профиль, изменить значения, сохранить или записать на дрон.',
        editor: 'Поиск, фильтры и редактирование всех параметров профиля. Правки применяются сразу, в файл они уходят по кнопке сохранения.'
    };

    /** Готовый набор: загрузить в окно, а при выборе «к дрону» сразу перейти к обычной записи на дрон (она показывает изменения). */
    const openPreset = async (presetId: string) => {
        const preset = findAutopilotPreset(presetId);
        const host = overlay.querySelector('.autopilot-params-modal') as HTMLElement | null;
        if (!preset || !host) return;
        const choice = await askPreset(host, preset);
        if (!choice) return;
        const author = (overlay.querySelector('#autopilot-author-input') as HTMLInputElement | null)?.value || getAutopilotSettingsState().author;
        const result = importAutopilotProperties(preset.text, preset.fileName, author);
        if (!result.ok) {
            flash = { kind: 'error', text: `Набор «${preset.title}» не загрузился: ${result.errors.slice(0, 2).join(' ')}` };
            render();
            return;
        }
        drafts.clear();
        isSourceDirty = true;
        flash = { kind: 'success', text: `Набор «${preset.title}» загружен в окно, изменено параметров: ${result.changedKeys.length}.` };
        log(`[AUTOPILOT] Загружен готовый набор параметров: ${preset.title}`, 'success');
        render();
        if (choice === 'drone') await droneSync.writeToDrone();
    };

    const render = () => {
        if (!body) return;
        const backButton = overlay.querySelector('#autopilot-params-back') as HTMLButtonElement | null;
        if (backButton) backButton.hidden = view === 'home';
        const subtitle = overlay.querySelector('#autopilot-params-subtitle') as HTMLElement | null;
        if (subtitle) subtitle.textContent = SUBTITLES[view];
        const previousMain = body.querySelector('.autopilot-params-main') as HTMLElement | null;
        const previousSidebar = body.querySelector('.autopilot-params-sidebar') as HTMLElement | null;
        const previousMainScrollTop = previousMain?.scrollTop ?? 0;
        const previousSidebarScrollTop = previousSidebar?.scrollTop ?? 0;
        const state = getAutopilotSettingsState();
        const summary = getAutopilotValidationSummary();
        const definitions = getAutopilotParameterDefinitions();
        const normalizedSearch = search.trim().toLowerCase();
        const changedCount = definitions.filter((definition) => isParameterChanged(state.values[definition.key], definition.defaultValue)).length;
        const invalidDraftCount = Array.from(drafts.values()).filter((draft) => Boolean(draft.error)).length;
        const filteredDefinitions = definitions.filter((definition) => {
            const currentValue = drafts.get(definition.key)?.value ?? String(state.values[definition.key] ?? definition.defaultValue);
            const haystack = [definition.key, definition.group, definition.description, definition.details, currentValue].join(' ').toLowerCase();
            if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
            if (activeFilter === 'documented') return definition.source === 'documentation';
            if (activeFilter === 'changed') return isParameterChanged(state.values[definition.key], definition.defaultValue);
            if (activeFilter === 'invalid') return Boolean(drafts.get(definition.key)?.error);
            return true;
        });

        if (selectedGroup === undefined) selectedGroup = firstNavGroup(definitions);
        body.innerHTML = view === 'home' ? renderAutopilotParamsHome({
            changedCount,
            fileInputId,
            flash,
            isDroneBusy: droneSync.isBusy(),
            isLoadingSource,
            isSavingSource,
            isSourceDirty,
            state,
            summary
        }) : renderAutopilotParamsBody({
            activeFilter,
            allDefinitions: definitions,
            changedCount,
            drafts,
            filteredDefinitions,
            flash,
            invalidDraftCount,
            isLoadingSource,
            isSavingSource,
            isSourceDirty,
            normalizedSearch,
            search,
            selectedGroup: selectedGroup ?? null,
            state,
            summary
        });

        const mainSection = body.querySelector('.autopilot-params-main') as HTMLElement | null;
        const sidebarSection = body.querySelector('.autopilot-params-sidebar') as HTMLElement | null;
        if (mainSection) mainSection.scrollTop = previousMainScrollTop;
        if (sidebarSection) sidebarSection.scrollTop = previousSidebarScrollTop;

        attachAutopilotParamsEvents({
            body,
            drafts,
            fileInputId,
            normalizedSearch,
            render,
            setActiveFilter: (next) => { activeFilter = next; },
            setAllExpanded,
            setFlash: (next) => { flash = next; },
            setGroupState: (next) => { groupState = next; },
            setSearch: (next) => { search = next; },
            setSectionState: (next) => { sectionState = next; },
            setSourceDirty: (next) => { isSourceDirty = next; },
            setView: (next) => { view = next; },
            setGroup: (next) => { selectedGroup = next; },
            openPreset,
            getGroupState: () => groupState,
            getSectionState: () => sectionState,
            getSettingsState: () => state,
            loadSourceIntoModel,
            readFromDrone: droneSync.readFromDrone,
            writeToDrone: droneSync.writeToDrone,
            persistSourceFile
        });
    };

    const show = async () => {
        flash = null;
        view = 'home';
        selectedGroup = undefined;
        overlay.style.display = 'flex';
        openButton?.classList.add('is-active');
        openButton?.setAttribute('aria-expanded', 'true');
        render();
        if (!isSourceLoaded) await loadSourceIntoModel(false);
        log('[AUTOPILOT] Открыто окно параметров автопилота.', 'info');
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) hide();
    });
    overlay.querySelector('#autopilot-params-close')?.addEventListener('click', hide);
    overlay.querySelector('#autopilot-params-back')?.addEventListener('click', () => { view = 'home'; render(); });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.style.display !== 'none') {
            // Из редактора Esc ведёт на экран выбора, с него закрывает окно.
            if (view === 'editor') { view = 'home'; render(); } else hide();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && overlay.style.display !== 'none' && view === 'editor') {
            event.preventDefault();
            (overlay.querySelector('#autopilot-search-input') as HTMLInputElement | null)?.focus();
        }
    });
    openButton?.addEventListener('click', () => {
        if (overlay.style.display === 'flex') {
            hide();
            return;
        }
        void show();
    });
}
