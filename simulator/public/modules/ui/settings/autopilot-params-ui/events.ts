import { log } from '../../../shared/logging/logger.js';
import {
    exportAutopilotPropertiesText,
    resetAutopilotParameters,
    updateAutopilotAuthor,
    updateAutopilotParameter
} from '../autopilot-params-model.js';
import type { AutopilotSettingsState } from '../autopilot-params-model.js';
import { downloadTextFile } from './helpers.js';
import type { DraftState, FilterMode, FlashMessage, ParamsView, PickMode } from './types.js';

type AttachAutopilotParamsEventsArgs = {
    body: HTMLDivElement;
    drafts: Map<string, DraftState>;
    fileInputId: string;
    render: () => void;
    getSettingsState: () => AutopilotSettingsState;
    setActiveFilter: (filter: FilterMode) => void;
    setFlash: (flash: FlashMessage | null) => void;
    setSearch: (value: string) => void;
    setSourceDirty: (dirty: boolean) => void;
    setView: (view: ParamsView) => void;
    setGroup: (group: string | null) => void;
    setPickMode: (mode: PickMode) => void;
    openPreset: (presetId: string) => void;
    /** Вариант на шаге мастера выбран или снят повторным нажатием. */
    pickWizardOption: (group: string, option: string) => void;
    wizardPreview: () => void;
    /** Файл выбран: показать, что в нём (предпросмотр), ничего не применяя. */
    onFileChosen: (fileName: string, text: string) => void;
    applyPreview: (target: 'sim' | 'drone') => Promise<void>;
    cancelPreview: () => void;
    loadSourceIntoModel: (announceSuccess: boolean) => Promise<void>;
    persistSourceFile: () => Promise<void>;
    readFromDrone: () => Promise<void>;
    writeToDrone: () => Promise<void>;
};

export function attachAutopilotParamsEvents(args: AttachAutopilotParamsEventsArgs) {
    const state = args.getSettingsState();
    const query = <T extends HTMLElement>(selector: string) => args.body.querySelector(selector) as T | null;
    const authorInput = query<HTMLInputElement>('#autopilot-author-input');
    const searchInput = query<HTMLInputElement>('#autopilot-search-input');
    const fileInput = query<HTMLInputElement>(`#${args.fileInputId}`);
    const author = () => authorInput?.value || state.author;
    const scrollMainToTop = () => query('.autopilot-editor__main')?.scrollTo({ top: 0 });

    authorInput?.addEventListener('change', () => {
        updateAutopilotAuthor(authorInput.value);
        args.setFlash({ kind: 'info', text: 'Автор изменений обновлен.' });
        args.render();
    });

    // Перерисовка тяжёлая (весь список), поэтому ждём короткую паузу в наборе; значение запоминается сразу.
    let searchTimer: number | undefined;
    searchInput?.addEventListener('input', () => {
        args.setSearch(searchInput.value);
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => {
            args.render();
            scrollMainToTop();
        }, 150);
    });
    searchInput?.addEventListener('keydown', (event) => {
        // Esc в поиске сначала очищает его; закрытие окна и возврат назад оставляем на второе нажатие.
        if (event.key === 'Escape' && searchInput.value) {
            event.stopPropagation();
            window.clearTimeout(searchTimer);
            args.setSearch('');
            args.render();
        }
    });

    // Выбор группы: список слева (широкий экран) и выпадающий список (узкий). Переход выходит из поиска, иначе группа не была бы видна.
    const goToGroup = (group: string | null) => {
        args.setGroup(group);
        if (group !== null) args.setSearch('');
        args.render();
        scrollMainToTop();
    };
    args.body.querySelectorAll('[data-nav]').forEach((element) => {
        element.addEventListener('click', () => goToGroup((element as HTMLElement).dataset.nav || null));
    });
    query<HTMLSelectElement>('#autopilot-nav-select')?.addEventListener('change', (event) => {
        goToGroup((event.currentTarget as HTMLSelectElement).value || null);
    });

    args.body.querySelectorAll('[data-filter]').forEach((element) => {
        element.addEventListener('click', () => {
            const filter = (element as HTMLElement).dataset.filter as FilterMode | undefined;
            if (!filter) return;
            args.setActiveFilter(filter);
            args.render();
        });
    });

    fileInput?.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const text = await file.text();
        fileInput.value = '';
        args.onFileChosen(file.name, text);
    });

    const applyValue = (key: string, raw: string) => {
        const result = updateAutopilotParameter(key, raw, author());
        if (result.ok) {
            args.drafts.delete(key);
            args.setSourceDirty(true);
            args.setFlash({ kind: 'success', text: `Параметр ${key} успешно применен.` });
        } else {
            args.drafts.set(key, { value: raw, error: result.error || 'Некорректное значение.' });
            args.setFlash({ kind: 'error', text: `Параметр ${key} не применен: ${result.error}` });
        }
        args.render();
    };

    args.body.querySelectorAll('[data-parameter-key]').forEach((element) => {
        element.addEventListener('change', (event) => {
            const input = event.currentTarget as HTMLInputElement;
            applyValue(input.dataset.parameterKey || '', input.value);
        });
    });

    // Кнопки вариантов значения и «Вернуть по умолчанию» на карточке параметра.
    args.body.querySelectorAll('[data-set-param]').forEach((element) => {
        element.addEventListener('click', () => {
            const target = element as HTMLElement;
            applyValue(target.dataset.setParam || '', target.dataset.setValue || '');
        });
    });

    const exportProfile = () => {
        const fileName = `autopilot-params-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.properties`;
        downloadTextFile(fileName, exportAutopilotPropertiesText());
        args.setFlash({ kind: 'success', text: 'Текущий профиль экспортирован в .properties.' });
        log('[AUTOPILOT] Экспортирован текущий профиль параметров.', 'success');
        args.render();
    };

    const resetToTemplate = () => {
        if (!window.confirm('Сбросить все параметры к шаблону исходного файла? Несохранённые правки пропадут.')) return;
        resetAutopilotParameters(author());
        args.drafts.clear();
        args.setSourceDirty(true);
        args.setFlash({ kind: 'info', text: 'Параметры сброшены к текущему шаблону исходного файла.' });
        log('[AUTOPILOT] Параметры автопилота сброшены к текущему шаблону.', 'warn');
        args.render();
    };

    const navigate = (view: ParamsView) => {
        args.setView(view);
        args.render();
    };

    args.body.querySelectorAll('[data-wizard-option]').forEach((element) => {
        element.addEventListener('click', () => {
            const target = element as HTMLElement;
            args.pickWizardOption(target.dataset.wizardGroup || '', target.dataset.wizardOption || '');
        });
    });

    const simple: Record<string, () => void> = {
        'open-editor': () => navigate('editor'),
        'open-wizard': () => navigate('wizard'),
        'wizard-preview': () => args.wizardPreview(),
        'go-home': () => navigate('home'),
        'save-source': () => void args.persistSourceFile(),
        'reload-source': () => void args.loadSourceIntoModel(true),
        'drone-read': () => void args.readFromDrone(),
        'drone-write': () => void args.writeToDrone(),
        'trigger-import': () => fileInput?.click(),
        'clear-search': () => { args.setSearch(''); args.render(); },
        'dismiss-flash': () => { args.setFlash(null); args.render(); },
        'preview-apply-sim': () => void args.applyPreview('sim'),
        'preview-apply-drone': () => void args.applyPreview('drone'),
        'preview-cancel': () => args.cancelPreview(),
        export: exportProfile,
        reset: resetToTemplate
    };

    args.body.querySelectorAll('[data-action]').forEach((element) => {
        element.addEventListener('click', () => {
            const action = (element as HTMLElement).dataset.action || '';
            if (action.startsWith('pick:')) {
                args.setPickMode(action.slice('pick:'.length) as PickMode);
                navigate('pick');
                return;
            }
            if (action.startsWith('preset:')) {
                args.openPreset(action.slice('preset:'.length));
                return;
            }
            simple[action]?.();
        });
    });
}
