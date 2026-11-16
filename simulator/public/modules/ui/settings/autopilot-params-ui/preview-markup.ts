import { escapeHtml, formatNumber, pluralize } from './helpers.js';
import type { Preview } from './preview.js';
import { flashBlock } from './home-markup.js';
import type { FlashMessage, PickMode } from './types.js';

export type PreviewSource = { kind: 'preset' | 'file'; title: string; fileName: string; text: string };

/**
 * Предпросмотр набора или файла: что изменится относительно профиля, открытого сейчас. Дрон для просмотра не нужен.
 * Применение (в симулятор или на дрон) только по кнопке внизу.
 */
export function renderAutopilotParamsPreview(params: {
    source: PreviewSource;
    preview: Preview;
    mode: PickMode;
    flashMessage: FlashMessage | null;
    isDroneBusy: boolean;
}) {
    const { source, preview } = params;
    const { summary } = preview;
    const toDrone = params.mode === 'to-drone';
    const kindLabel = source.kind === 'preset' ? 'Готовый набор' : 'Файл';
    const facts = [
        `${pluralize(summary.total, 'параметр', 'параметра', 'параметров')} в ${source.kind === 'preset' ? 'наборе' : 'файле'}`,
        `изменится ${summary.changed}`,
        summary.added ? `новых для этого профиля ${summary.added}` : '',
        `без изменений ${summary.unchanged}`,
        summary.skipped ? `не разобрано строк ${summary.skipped}` : ''
    ].filter(Boolean).join(' · ');
    const rows = preview.rows.map((row) => `
        <tr class="${row.protectedParam ? 'is-protected' : ''}">
            <th scope="row"><code>${escapeHtml(row.key)}</code>${row.protectedParam ? '<span class="autopilot-preview__tag" title="Калибровка, номер борта или счётчик: на дрон по умолчанию не пишется">не пишется на дрон</span>' : ''}${row.current === null ? '<span class="autopilot-preview__tag autopilot-preview__tag--new">новый</span>' : ''}</th>
            <td class="autopilot-preview__values"><span class="autopilot-preview__from">${row.current === null ? '—' : escapeHtml(formatNumber(row.current))}</span><span aria-hidden="true">→</span><strong>${escapeHtml(formatNumber(row.next))}</strong></td>
            <td class="autopilot-preview__what">${escapeHtml(row.description)}</td>
        </tr>`).join('');
    const body = preview.rows.length
        ? `<div class="autopilot-preview__tablewrap"><table class="autopilot-preview__table"><thead><tr><th scope="col">Параметр</th><th scope="col">Было → станет</th><th scope="col">Что это</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : '<div class="autopilot-empty-state">Все значения совпадают с текущим профилем: применять нечего.</div>';
    const primary = toDrone
        ? '<button type="button" class="autopilot-action-btn" data-action="preview-apply-drone"' + (params.isDroneBusy ? ' disabled' : '') + '>Записать на дрон…</button>'
        : '<button type="button" class="autopilot-action-btn" data-action="preview-apply-sim">Применить в симуляторе</button>';
    const secondary = toDrone
        ? '<button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-action="preview-apply-sim">Только в симулятор</button>'
        : '';
    return `
        <div class="autopilot-preview">
            <div class="autopilot-preview__head">
                ${flashBlock(params.flashMessage)}
                <span class="autopilot-profile__label">${kindLabel}</span>
                <h3 class="autopilot-preview__title" tabindex="-1" data-view-heading>${escapeHtml(source.title)}</h3>
                <p class="autopilot-preview__facts">${escapeHtml(facts)}</p>
                <p class="autopilot-preview__hint">${toDrone
                    ? 'Это предпросмотр, ничего ещё не применено и дрон не нужен. «Записать на дрон» сначала прочитает дрон и покажет изменения уже для него: калибровки и номер борта по умолчанию не пишутся.'
                    : 'Это предпросмотр, ничего ещё не применено. После применения виртуальный дрон полетит с этими параметрами; вернуть исходные можно кнопкой «Сбросить к шаблону».'}</p>
            </div>
            ${body}
            <div class="autopilot-preview__bar">
                <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-action="preview-cancel">Назад к выбору</button>
                <span class="autopilot-preview__bar-spacer"></span>
                ${secondary}
                ${preview.rows.length || toDrone ? primary : ''}
            </div>
        </div>
    `;
}
