import type { AutopilotSettingsState } from '../autopilot-params-model.js';
import { escapeHtml, formatDateTime, getStatusLabel } from './helpers.js';
import { AUTOPILOT_PRESETS } from './presets.js';
import type { FlashMessage, PickMode } from './types.js';

const ICONS: Record<string, string> = {
    read: '<rect x="3" y="3" width="18" height="12" rx="2"/><path d="M12 21v-6"/><path d="m8.5 18.5 3.5 3.5 3.5-3.5"/>',
    write: '<path d="M12 21V9"/><path d="m7 13 5-5 5 5"/><path d="M5 3h14"/>',
    sim: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M12 17v-6"/><path d="m9.5 13.5 2.5-2.5 2.5 2.5"/>',
    set: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    drone: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 8l8 8M16 8l-8 8"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
    current: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>'
};

const svg = (name: keyof typeof ICONS, size: number) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

type Card = { action: string; title: string; text: string; icon: keyof typeof ICONS; size?: 'big' | 'primary'; disabled?: boolean; chips?: string[] };

function card(item: Card) {
    const size = item.size ? ` autopilot-card--${item.size}` : '';
    return `
        <button type="button" class="autopilot-card${size}" data-action="${item.action}"${item.disabled ? ' disabled' : ''}>
            <span class="autopilot-card__icon" aria-hidden="true">${svg(item.icon, item.size === 'big' ? 32 : 26)}</span>
            <span class="autopilot-card__body">
                <span class="autopilot-card__title">${escapeHtml(item.title)}</span>
                <span class="autopilot-card__text">${escapeHtml(item.text)}</span>
                ${item.chips ? `<span class="autopilot-card__chips">${item.chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join('')}</span>` : ''}
            </span>
        </button>`;
}

type Common = {
    changedCount: number;
    fileInputId: string;
    flash: FlashMessage | null;
    isDroneBusy: boolean;
    isLoadingSource: boolean;
    isSavingSource: boolean;
    isSourceDirty: boolean;
    state: AutopilotSettingsState;
    summary: { total: number; documented: number; constrained: number };
};

const flashBlock = (flash: FlashMessage | null) => (flash ? `<div class="autopilot-flash autopilot-flash--${flash.kind}">${escapeHtml(flash.text)}</div>` : '');
const progressBlock = (busy: boolean) => `<div id="autopilot-drone-progress" class="autopilot-home__progress" role="status"${busy ? '' : ' hidden'}>Подключаюсь к дрону…</div>`;
const fileInput = (id: string) => `<input id="${id}" type="file" accept=".properties,text/plain" hidden>`;

function profileStrip(params: Common) {
    const status = escapeHtml(getStatusLabel(params.isLoadingSource, params.isSavingSource, params.isSourceDirty));
    return `
        <section class="autopilot-profile" aria-label="Текущий профиль">
            <div class="autopilot-profile__main">
                <span class="autopilot-profile__label">Сейчас открыт профиль</span>
                <strong class="autopilot-profile__name">${escapeHtml(params.state.sourceFileName || 'не загружен')}</strong>
                <span class="autopilot-profile__facts">${params.summary.total} параметров · изменено ${params.changedCount} · обновлён ${escapeHtml(formatDateTime(params.state.updatedAt))}</span>
            </div>
            <div class="autopilot-profile__side">
                <span class="autopilot-status-pill ${params.isSourceDirty ? 'is-dirty' : ''} ${params.isLoadingSource || params.isSavingSource ? 'is-busy' : ''}">${status}</span>
                <label class="autopilot-profile__author">
                    <span>Кто вносит изменения</span>
                    <input id="autopilot-author-input" type="text" value="${escapeHtml(params.state.author)}" placeholder="Например, Преподаватель или Student 01">
                </label>
            </div>
        </section>`;
}

/** Главный экран: три задачи, остальное тихими ссылками внизу. */
export function renderAutopilotParamsHome(params: Common) {
    return `
        <div class="autopilot-home">
            <div class="autopilot-home__inner">
                ${flashBlock(params.flash)}
                ${profileStrip(params)}
                <h3 class="autopilot-home__heading">Что вы хотите сделать?</h3>
                <div class="autopilot-home__three">
                    ${card({ action: 'drone-read', size: 'big', icon: 'read', title: 'Прочитать настройки с дрона', text: 'Подключиться к настоящему Пионеру и взять его параметры автопилота. Они откроются в окне, их можно посмотреть и сохранить в файл.', disabled: params.isDroneBusy })}
                    ${card({ action: 'pick:to-drone', size: 'big', icon: 'write', title: 'Загрузить настройки в дрон', text: 'Записать на дрон готовый набор, файл или профиль, открытый в окне. Перед записью покажем, что изменится.' })}
                    ${card({ action: 'pick:to-sim', size: 'big', icon: 'sim', title: 'Применить настройки в симуляторе', text: 'Выбрать готовый набор или файл, чтобы виртуальный дрон летал с этими параметрами.' })}
                </div>
                ${progressBlock(params.isDroneBusy)}
                <div class="autopilot-home__links">
                    <button type="button" class="autopilot-link" data-action="open-editor">${svg('set', 16)}<span>Посмотреть и изменить параметры вручную${params.changedCount ? ` (изменено ${params.changedCount})` : ''}</span></button>
                    <button type="button" class="autopilot-link" data-action="export">Скачать профиль в файл</button>
                    <button type="button" class="autopilot-link autopilot-link--danger" data-action="reset">Сбросить к шаблону</button>
                </div>
                ${fileInput(params.fileInputId)}
            </div>
        </div>
    `;
}

const presetCards = (disabled: boolean) => AUTOPILOT_PRESETS.map((preset) => card({
    action: `preset:${preset.id}`, icon: 'set', title: preset.title, text: preset.summary, chips: preset.highlights, disabled
})).join('');

/** Второй шаг: откуда взять настройки (для записи на дрон или для симулятора). */
export function renderAutopilotParamsPick(params: Common & { mode: PickMode }) {
    const toDrone = params.mode === 'to-drone';
    const heading = toDrone ? 'Что записать на дрон?' : 'Какие настройки применить в симуляторе?';
    const lead = toDrone
        ? 'Выберите источник. Перед записью дрон будет прочитан, вы увидите список изменений и сможете снять отметки с лишнего. Калибровки и номер борта по умолчанию не пишутся.'
        : 'Выберите источник. Настройки сразу начнут действовать у виртуального дрона. Вернуть исходные можно кнопкой «Сбросить к шаблону».';
    const current = toDrone
        ? card({ action: 'drone-write', size: 'primary', icon: 'current', title: 'Профиль, открытый в окне', text: `${params.state.sourceFileName || 'профиль не загружен'}: ${params.summary.total} параметров, изменено ${params.changedCount}. Если загрузили файл или набор, запишите его отсюда.`, disabled: params.isDroneBusy })
        : '';
    const sourceCards = toDrone
        ? ''
        : `${card({ action: 'drone-read', icon: 'drone', title: 'Профиль с дрона', text: 'Подключиться к настоящему дрону и взять его параметры.', disabled: params.isDroneBusy })}
           ${card({ action: 'reload-source', icon: 'refresh', title: 'Исходный профиль', text: 'Вернуть профиль, который лежит на диске, без правок.', disabled: params.isLoadingSource })}`;
    return `
        <div class="autopilot-home">
            <div class="autopilot-home__inner">
                ${flashBlock(params.flash)}
                <h3 class="autopilot-home__heading">${heading}</h3>
                <p class="autopilot-home__lead">${lead}</p>
                ${current}
                <h4 class="autopilot-home__group">Готовые наборы</h4>
                <div class="autopilot-home__grid">${presetCards(params.isDroneBusy)}</div>
                <h4 class="autopilot-home__group">Другие источники</h4>
                <div class="autopilot-home__grid">
                    ${card({ action: 'trigger-import', icon: 'file', title: 'Файл с компьютера', text: toDrone ? 'Выберите .properties. Он загрузится в окно, затем запишите его кнопкой выше.' : 'Выберите файл .properties, например профиль настоящего дрона.' })}
                    ${sourceCards}
                </div>
                ${progressBlock(params.isDroneBusy)}
                ${fileInput(params.fileInputId)}
            </div>
        </div>
    `;
}
