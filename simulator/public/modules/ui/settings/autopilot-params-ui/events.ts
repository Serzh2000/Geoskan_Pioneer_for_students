import { log } from '../../../shared/logging/logger.js';
import {
    exportAutopilotPropertiesText,
    importAutopilotProperties,
    resetAutopilotParameters,
    updateAutopilotAuthor,
    updateAutopilotParameter
} from '../autopilot-params-model.js';
import type { AutopilotSettingsState } from '../autopilot-params-model.js';
import { downloadTextFile } from './helpers.js';
import type {
    DraftState,
    FilterMode,
    FlashMessage,
    GroupState,
    SectionKey,
    SectionState
} from './types.js';

type AttachAutopilotParamsEventsArgs = {
    body: HTMLDivElement;
    drafts: Map<string, DraftState>;
    fileInputId: string;
    normalizedSearch: string;
    render: () => void;
    setActiveFilter: (filter: FilterMode) => void;
    setAllExpanded: (expanded: boolean) => void;
    setFlash: (flash: FlashMessage | null) => void;
    setGroupState: (state: GroupState) => void;
    setSearch: (value: string) => void;
    setSectionState: (state: SectionState) => void;
    setSourceDirty: (dirty: boolean) => void;
    getGroupState: () => GroupState;
    getSectionState: () => SectionState;
    getSettingsState: () => AutopilotSettingsState;
    loadSourceIntoModel: (announceSuccess: boolean) => Promise<void>;
    persistSourceFile: () => Promise<void>;
};

export function attachAutopilotParamsEvents(args: AttachAutopilotParamsEventsArgs) {
    const state = args.getSettingsState();
    const authorInput = args.body.querySelector('#autopilot-author-input') as HTMLInputElement | null;
    const searchInput = args.body.querySelector('#autopilot-search-input') as HTMLInputElement | null;
    const fileInput = args.body.querySelector(`#${args.fileInputId}`) as HTMLInputElement | null;

    authorInput?.addEventListener('change', () => {
        updateAutopilotAuthor(authorInput.value);
        args.setFlash({ kind: 'info', text: 'Автор изменений обновлен.' });
        args.render();
    });

    searchInput?.addEventListener('input', () => {
        args.setSearch(searchInput.value);
        args.render();
    });

    args.body.querySelectorAll('.autopilot-section').forEach((element) => {
        element.addEventListener('toggle', (event) => {
            if (args.normalizedSearch) return;
            const details = event.currentTarget as HTMLDetailsElement;
            const sectionKey = details.dataset.section as SectionKey | undefined;
            if (!sectionKey) return;
            args.setSectionState({
                ...args.getSectionState(),
                [sectionKey]: details.open
            });
        });
    });

    args.body.querySelectorAll('.autopilot-group').forEach((element) => {
        element.addEventListener('toggle', (event) => {
            if (args.normalizedSearch) return;
            const details = event.currentTarget as HTMLDetailsElement;
            const group = details.dataset.group;
            if (!group) return;
            args.setGroupState({
                ...args.getGroupState(),
                [group]: details.open
            });
        });
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
        const result = importAutopilotProperties(text, file.name, authorInput?.value || state.author);
        if (result.ok) {
            args.drafts.clear();
            args.setSourceDirty(true);
            const warningSuffix = result.warnings.length ? ` Есть предупреждения: ${result.warnings[0]}` : '';
            args.setFlash({
                kind: 'success',
                text: `Файл ${file.name} успешно загружен. Изменено параметров: ${result.changedKeys.length}.${warningSuffix}`
            });
            log(`[AUTOPILOT] Загружен профиль параметров: ${file.name}`, 'success');
        } else {
            args.setFlash({
                kind: 'error',
                text: `Ошибка загрузки файла ${file.name}: ${result.errors.slice(0, 3).join(' ')}`
            });
            log(`[AUTOPILOT] Ошибка загрузки параметров: ${file.name}`, 'error');
        }
        fileInput.value = '';
        args.render();
    });

    args.body.querySelectorAll('[data-parameter-key]').forEach((element) => {
        element.addEventListener('change', (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const key = input.dataset.parameterKey || '';
            const result = updateAutopilotParameter(key, input.value, authorInput?.value || state.author);
            if (result.ok) {
                args.drafts.delete(key);
                args.setSourceDirty(true);
                args.setFlash({ kind: 'success', text: `Параметр ${key} успешно применен.` });
            } else {
                args.drafts.set(key, { value: input.value, error: result.error || 'Некорректное значение.' });
                args.setFlash({ kind: 'error', text: `Параметр ${key} не применен: ${result.error}` });
            }
            args.render();
        });
    });

    args.body.querySelectorAll('[data-action]').forEach((element) => {
        element.addEventListener('click', () => {
            const action = (element as HTMLElement).dataset.action;
            const author = authorInput?.value || state.author;
            if (action === 'save-source') {
                void args.persistSourceFile();
                return;
            }
            if (action === 'reload-source') {
                void args.loadSourceIntoModel(true);
                return;
            }
            if (action === 'trigger-import') {
                fileInput?.click();
                return;
            }
            if (action === 'clear-search') {
                args.setSearch('');
                args.render();
                return;
            }
            if (action === 'expand-all') {
                args.setAllExpanded(true);
                args.render();
                return;
            }
            if (action === 'collapse-all') {
                args.setAllExpanded(false);
                args.render();
                return;
            }
            if (action === 'export') {
                const fileName = `autopilot-params-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.properties`;
                downloadTextFile(fileName, exportAutopilotPropertiesText());
                args.setFlash({ kind: 'success', text: 'Текущий профиль экспортирован в .properties.' });
                log('[AUTOPILOT] Экспортирован текущий профиль параметров.', 'success');
                args.render();
                return;
            }
            if (action === 'reset') {
                resetAutopilotParameters(author);
                args.drafts.clear();
                args.setSourceDirty(true);
                args.setFlash({ kind: 'info', text: 'Параметры сброшены к текущему шаблону исходного файла.' });
                log('[AUTOPILOT] Параметры автопилота сброшены к текущему шаблону.', 'warn');
                args.render();
            }
        });
    });
}
