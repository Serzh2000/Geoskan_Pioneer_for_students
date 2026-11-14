import type { AutopilotSettingsState } from '../autopilot-params-model.js';
import { escapeHtml, formatDateTime, getStatusLabel } from './helpers.js';
import { AUTOPILOT_PRESETS } from './presets.js';
import type { FlashMessage } from './types.js';

const ICONS: Record<string, string> = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M12 17v-6"/><path d="m9.5 13.5 2.5-2.5 2.5 2.5"/>',
    drone: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 8l8 8M16 8l-8 8"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    send: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'
};

type HomeCard = { action: string; title: string; text: string; icon: keyof typeof ICONS; kind?: 'primary' | 'normal'; disabled?: boolean; badge?: string };

function homeCard(card: HomeCard) {
    const kind = card.kind === 'primary' ? ' autopilot-card--primary' : '';
    return `
        <button type="button" class="autopilot-card${kind}" data-action="${card.action}"${card.disabled ? ' disabled' : ''}>
            <span class="autopilot-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[card.icon]}</svg></span>
            <span class="autopilot-card__body">
                <span class="autopilot-card__title">${escapeHtml(card.title)}${card.badge ? `<span class="autopilot-card__badge">${escapeHtml(card.badge)}</span>` : ''}</span>
                <span class="autopilot-card__text">${escapeHtml(card.text)}</span>
            </span>
        </button>`;
}

const ICON_RESET = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.reset}</svg>`;

/** Стартовый экран: «что вы хотите сделать?» карточками, вместо стены кнопок и полей. */
export function renderAutopilotParamsHome(params: {
    changedCount: number;
    fileInputId: string;
    flash: FlashMessage | null;
    isDroneBusy: boolean;
    isLoadingSource: boolean;
    isSavingSource: boolean;
    isSourceDirty: boolean;
    state: AutopilotSettingsState;
    summary: { total: number; documented: number; constrained: number };
}) {
    const { changedCount, summary } = params;
    const status = escapeHtml(getStatusLabel(params.isLoadingSource, params.isSavingSource, params.isSourceDirty));
    const canSave = params.isSourceDirty && !params.isSavingSource;
    return `
        <div class="autopilot-home">
            <div class="autopilot-home__inner">
                ${params.flash ? `<div class="autopilot-flash autopilot-flash--${params.flash.kind}">${escapeHtml(params.flash.text)}</div>` : ''}
                <section class="autopilot-profile" aria-label="Текущий профиль">
                    <div class="autopilot-profile__main">
                        <span class="autopilot-profile__label">Сейчас открыт профиль</span>
                        <strong class="autopilot-profile__name">${escapeHtml(params.state.sourceFileName || 'не загружен')}</strong>
                        <span class="autopilot-profile__facts">${summary.total} параметров · изменено ${changedCount} · обновлён ${escapeHtml(formatDateTime(params.state.updatedAt))}</span>
                    </div>
                    <div class="autopilot-profile__side">
                        <span class="autopilot-status-pill ${params.isSourceDirty ? 'is-dirty' : ''} ${params.isLoadingSource || params.isSavingSource ? 'is-busy' : ''}">${status}</span>
                        <label class="autopilot-profile__author">
                            <span>Кто вносит изменения</span>
                            <input id="autopilot-author-input" type="text" value="${escapeHtml(params.state.author)}" placeholder="Например, Преподаватель или Student 01">
                        </label>
                    </div>
                </section>

                <h3 class="autopilot-home__heading">Что вы хотите сделать?</h3>
                ${homeCard({ action: 'open-editor', kind: 'primary', icon: 'edit', title: 'Посмотреть и изменить параметры', text: `Поиск по ${summary.total} параметрам, пояснения и допустимые значения. Правки применяются сразу.`, badge: changedCount ? `изменено ${changedCount}` : undefined })}

                <h4 class="autopilot-home__group">Готовые наборы для дрона</h4>
                <div class="autopilot-home__grid">
                    ${AUTOPILOT_PRESETS.map((preset) => homeCard({ action: `preset:${preset.id}`, icon: 'send', title: preset.title, text: preset.summary, disabled: params.isDroneBusy })).join('')}
                </div>

                <h4 class="autopilot-home__group">Получить параметры</h4>
                <div class="autopilot-home__grid">
                    ${homeCard({ action: 'trigger-import', icon: 'file', title: 'Загрузить из файла', text: 'Выберите файл .properties на компьютере, например профиль настоящего дрона.' })}
                    ${homeCard({ action: 'drone-read', icon: 'drone', title: 'Прочитать с дрона', text: 'Подключиться к настоящему Пионеру и взять его текущие настройки.', disabled: params.isDroneBusy })}
                    ${homeCard({ action: 'reload-source', icon: 'refresh', title: 'Перечитать исходный файл', text: 'Отменить правки и заново взять профиль, который лежит на диске.', disabled: params.isLoadingSource })}
                </div>

                <h4 class="autopilot-home__group">Сохранить и отправить</h4>
                <div class="autopilot-home__grid">
                    ${homeCard({ action: 'export', icon: 'download', title: 'Скачать профиль', text: 'Сохранить текущие значения в файл .properties на этот компьютер.' })}
                    ${homeCard({ action: 'save-source', icon: 'save', title: 'Записать в исходный файл', text: canSave ? 'Есть несохранённые изменения: записать их обратно в файл профиля.' : 'Сохранять пока нечего: изменений нет.', disabled: !canSave })}
                    ${homeCard({ action: 'drone-write', icon: 'send', title: 'Записать на дрон', text: 'Отправить текущий профиль на настоящий дрон. Перед записью покажем, что изменится.', disabled: params.isDroneBusy })}
                </div>

                <div id="autopilot-drone-progress" class="autopilot-home__progress" role="status"${params.isDroneBusy ? '' : ' hidden'}>Подключаюсь к дрону…</div>

                <div class="autopilot-home__footer">
                    <button type="button" class="autopilot-home__reset" data-action="reset">${ICON_RESET}<span>Сбросить все параметры к шаблону</span></button>
                    <span class="autopilot-home__footnote">Изменения сначала попадают только в симулятор. В файл или на дрон они уходят по кнопкам выше.</span>
                </div>
                <input id="${params.fileInputId}" type="file" accept=".properties,text/plain" hidden>
            </div>
        </div>
    `;
}
