import { log } from '../../../shared/logging/logger.js';
import {
    exportAutopilotPropertiesText,
    getAutopilotParameterDefinitions,
    getAutopilotSettingsState,
    getAutopilotValidationSummary,
    importAutopilotProperties,
    loadAutopilotTemplateFromText
} from '../autopilot-params-model.js';
import { createDroneSync } from './drone-sync.js';
import { captureFocus, restoreFocus } from './focus.js';
import { filterDefinitions } from './filter.js';
import { installAutopilotKeyboard } from './keyboard.js';
import { attachAutopilotParamsEvents } from './events.js';
import { isParameterChanged } from './helpers.js';
import { firstNavGroup } from './markup.js';
import { buildPreview } from './preview.js';
import { type PreviewSource } from './preview-markup.js';
import { renderParamsShell } from './shell-markup.js';
import { buildWizardProfile, WIZARD_GROUPS, type WizardGroupId, type WizardSelection } from './station2-presets.js';
import { findAutopilotPreset } from './presets.js';
import { fetchAutopilotSourceFile, saveAutopilotSourceFile } from './source-api.js';
import { BACK_LABEL, BACK_TARGET, SUBTITLES } from './views.js';
import { renderViewBody } from './view-body.js';
import type { DraftState, FilterMode, FlashMessage, ParamsView, PickMode } from './types.js';

export function initAutopilotParamsUI() {
    const openButton = document.getElementById('open-autopilot-params-btn') as HTMLButtonElement | null;
    let view: ParamsView = 'home';
    let renderedView: ParamsView | null = null;
    let pickMode: PickMode = 'to-sim';
    /** Группа, открытая в редакторе: null - все подряд, undefined - ещё не выбирали (откроется первая). */
    let selectedGroup: string | null | undefined;
    /** Набор или файл, который сейчас просматривается перед применением. */
    let previewSource: PreviewSource | null = null;
    /** Выбор в мастере настройки (по одному варианту на шаг; шаг можно пропустить). */
    let wizardSelection: WizardSelection = {};
    let search = '';
    let activeFilter: FilterMode = 'all';
    let flash: FlashMessage | null = null;
    let isLoadingSource = false;
    let isSavingSource = false;
    let isSourceLoaded = false;
    let isSourceDirty = false;
    /** Разрешает ли сервер записывать исходный файл: на общем сервере нет, локально да. */
    let sourceWritable = true;
    let returnFocusTo: HTMLElement | null = null;
    const drafts = new Map<string, DraftState>();
    const fileInputId = 'autopilot-params-file-input';

    document.getElementById('autopilot-params-overlay')?.remove();
    openButton?.classList.remove('is-active');
    openButton?.setAttribute('aria-expanded', 'false');

    const overlay = document.createElement('div');
    overlay.id = 'autopilot-params-overlay';
    overlay.className = 'modal-overlay autopilot-params-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = renderParamsShell();
    document.body.appendChild(overlay);

    const body = overlay.querySelector('#autopilot-params-body') as HTMLDivElement | null;
    const authorValue = () => (overlay.querySelector('#autopilot-author-input') as HTMLInputElement | null)?.value || getAutopilotSettingsState().author;

    const loadSourceIntoModel = async (announceSuccess = false) => {
        if (isLoadingSource) return;
        isLoadingSource = true;
        render();
        try {
            const payload = await fetchAutopilotSourceFile();
            loadAutopilotTemplateFromText(payload.content, payload.fileName);
            sourceWritable = payload.writable !== false;
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
        // Фокус возвращается туда, откуда окно открыли (иначе клавиатурный пользователь теряет место).
        (returnFocusTo && returnFocusTo !== document.body ? returnFocusTo : openButton)?.focus({ preventScroll: true });
    };

    const droneSync = createDroneSync({
        getAuthor: authorValue,
        getDialogHost: () => overlay.querySelector('.autopilot-params-modal') as HTMLElement | null,
        setFlash: (next) => { flash = next; },
        render: () => render(),
        onModelChanged: () => {
            drafts.clear();
            isSourceDirty = true;
        }
    });

    /** Переход пользователя на другой экран: сообщение от прошлого действия там уже не к месту. */
    const goTo = (next: ParamsView) => {
        view = next;
        flash = null;
        if (next !== 'preview') previewSource = null;
    };

    const startPreview = (source: PreviewSource) => {
        previewSource = source;
        view = 'preview';
        flash = null;
        render();
    };

    const openPreset = (presetId: string) => {
        const preset = findAutopilotPreset(presetId);
        if (preset) startPreview({ kind: 'preset', ...preset });
    };

    const pickWizardOption = (group: string, option: string) => {
        if (!WIZARD_GROUPS.some((item) => item.id === group)) return;
        const id = group as WizardGroupId;
        wizardSelection = { ...wizardSelection, [id]: wizardSelection[id] === option ? undefined : option };
        render();
    };

    const wizardPreview = () => {
        const built = buildWizardProfile(wizardSelection);
        if (built) startPreview({ kind: 'preset', title: built.title, fileName: 'master-settings.properties', text: built.text });
    };

    const onFileChosen = (fileName: string, text: string) => {
        if (buildPreview(text, getAutopilotSettingsState().values).summary.total === 0) {
            flash = { kind: 'error', text: `В файле ${fileName} не нашлось ни одного параметра в формате «имя=значение». Выберите профиль .properties.` };
            render();
            return;
        }
        startPreview({ kind: 'file', title: fileName, fileName, text });
    };

    /** Применить просмотренный набор: в симулятор, а для «на дрон» дальше обычная запись (она сама покажет изменения для дрона). */
    const applyPreview = async (target: 'sim' | 'drone') => {
        if (!previewSource) return;
        const source = previewSource;
        const result = importAutopilotProperties(source.text, source.fileName, authorValue());
        if (!result.ok) {
            flash = { kind: 'error', text: `«${source.title}» не применился: ${result.errors.slice(0, 2).join(' ')}` };
            render();
            return;
        }
        drafts.clear();
        isSourceDirty = true;
        previewSource = null;
        view = 'home';
        log(`[AUTOPILOT] Применён профиль параметров: ${source.title}`, 'success');
        flash = { kind: 'success', text: `«${source.title}» применён в симуляторе, изменено параметров: ${result.changedKeys.length}.` };
        render();
        if (target !== 'drone') return;
        await droneSync.writeToDrone();
        if (flash?.kind === 'error') flash = { ...flash, text: `${flash.text} В симуляторе профиль уже применён, на дрон он не записан.` };
        render();
    };

    /** Чтение с дрона: при успехе сразу показываем прочитанное в редакторе (там его можно скачать). */
    const readFromDrone = async () => {
        await droneSync.readFromDrone();
        if (flash?.kind === 'success') view = 'editor';
        render();
    };

    const render = () => {
        if (!body) return;
        const backButton = overlay.querySelector('#autopilot-params-back') as HTMLButtonElement | null;
        if (backButton) {
            backButton.hidden = BACK_TARGET[view] === null;
            backButton.textContent = BACK_LABEL[view];
        }
        const subtitle = overlay.querySelector('#autopilot-params-subtitle') as HTMLElement | null;
        if (subtitle) subtitle.textContent = SUBTITLES[view];

        const keepFocus = captureFocus(body);
        const previousMain = body.querySelector('.autopilot-editor__main') as HTMLElement | null;
        const previousNav = body.querySelector('.autopilot-editor__nav') as HTMLElement | null;
        const previousMainScrollTop = previousMain?.scrollTop ?? 0;
        const previousNavScrollTop = previousNav?.scrollTop ?? 0;

        const state = getAutopilotSettingsState();
        const summary = getAutopilotValidationSummary();
        const definitions = getAutopilotParameterDefinitions();
        const normalizedSearch = search.trim().toLowerCase();
        const changedCount = definitions.filter((definition) => isParameterChanged(state.values[definition.key], definition.defaultValue)).length;
        const invalidDraftCount = Array.from(drafts.values()).filter((draft) => Boolean(draft.error)).length;
        const filteredDefinitions = filterDefinitions({ definitions, state, drafts, normalizedSearch, activeFilter });

        if (selectedGroup === undefined) selectedGroup = firstNavGroup(definitions);
        if (view === 'preview' && !previewSource) view = 'pick';
        const common = {
            changedCount,
            fileInputId,
            flash,
            isDroneBusy: droneSync.isBusy(),
            isLoadingSource,
            isSavingSource,
            isSourceDirty,
            sourceWritable,
            state,
            summary
        };
        body.innerHTML = renderViewBody({
            view, pickMode, common, previewSource, wizardSelection, flash,
            editor: {
                activeFilter, allDefinitions: definitions, changedCount, drafts, filteredDefinitions, flash, invalidDraftCount, isLoadingSource,
                isSavingSource, isSourceDirty, sourceWritable, normalizedSearch, search, selectedGroup: selectedGroup ?? null, state, summary
            }
        });

        const mainSection = body.querySelector('.autopilot-editor__main') as HTMLElement | null;
        const navSection = body.querySelector('.autopilot-editor__nav') as HTMLElement | null;
        if (mainSection) mainSection.scrollTop = previousMainScrollTop;
        if (navSection) navSection.scrollTop = previousNavScrollTop;

        if (!restoreFocus(body, keepFocus) && (renderedView !== view || !overlay.contains(document.activeElement))) {
            // Новый экран или фокус потерян при перерисовке: ставим его на заголовок, иначе клавиатура теряет место.
            (body.querySelector('[data-view-heading]') as HTMLElement | null)?.focus({ preventScroll: true });
        }
        renderedView = view;

        attachAutopilotParamsEvents({
            body,
            drafts,
            fileInputId,
            render,
            getSettingsState: () => state,
            setActiveFilter: (next) => { activeFilter = next; },
            setFlash: (next) => { flash = next; },
            setSearch: (next) => { search = next; },
            setSourceDirty: (next) => { isSourceDirty = next; },
            setView: goTo,
            setGroup: (next) => { selectedGroup = next; },
            setPickMode: (next) => { pickMode = next; },
            openPreset,
            pickWizardOption,
            wizardPreview,
            onFileChosen,
            applyPreview,
            cancelPreview: () => { goTo('pick'); render(); },
            loadSourceIntoModel,
            persistSourceFile,
            readFromDrone,
            writeToDrone: droneSync.writeToDrone
        });
    };

    const isOpen = () => overlay.style.display !== 'none';

    const show = async () => {
        returnFocusTo = document.activeElement as HTMLElement | null;
        [flash, view, previewSource, selectedGroup, renderedView, wizardSelection] = [null, 'home', null, undefined, null, {}];
        // Поиск и фильтр прошлого открытия не переносим: иначе в редакторе пусто «по старому запросу».
        search = '';
        activeFilter = 'all';
        overlay.style.display = 'flex';
        openButton?.classList.add('is-active');
        openButton?.setAttribute('aria-expanded', 'true');
        render();
        if (!isSourceLoaded) await loadSourceIntoModel(false);
        log('[AUTOPILOT] Открыто окно параметров автопилота.', 'info');
    };

    const goBack = () => {
        const target = BACK_TARGET[view];
        if (target === null) return false;
        goTo(target);
        render();
        return true;
    };

    overlay.querySelector('#autopilot-params-close')?.addEventListener('click', hide);
    overlay.querySelector('#autopilot-params-back')?.addEventListener('click', goBack);
    installAutopilotKeyboard(overlay, { isOpen, goBack, close: hide, inEditor: () => view === 'editor' });
    openButton?.addEventListener('click', () => {
        if (isOpen()) {
            hide();
            return;
        }
        void show();
    });
}
