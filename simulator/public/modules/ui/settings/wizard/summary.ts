import { simSettings, type AuxChannelRange, type GamepadInputRef } from '../../../core/state.js';
import { isDefaultTuning } from '../input/tuning.js';
import { buildRangesFromPositions, pickRepresentativePositions } from '../input/observed.js';
import { CHANNEL_LABELS } from './config.js';
import type { ChannelKey, PrimaryChannelKey } from '../types.js';
import type { AuxDetectionResult, WizardAuxChannelKey } from './types.js';

const PRIMARY_SUMMARY_CHANNELS: PrimaryChannelKey[] = ['throttle', 'yaw', 'pitch', 'roll'];
const AUX_SUMMARY_CHANNELS: WizardAuxChannelKey[] = ['mode', 'arm', 'magnet'];

export function buildSummaryHtml(params: {
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>;
    getChannelInversion: (channel: ChannelKey) => boolean;
}): string {
    const { detectedMapping, auxResults, getChannelInversion } = params;

    const primaryRows = PRIMARY_SUMMARY_CHANNELS
        .map((channel) => {
            const ref = detectedMapping[channel];
            const value = ref ? formatRefLabel(ref) : 'не найдено';
            const inversionLabel = getChannelInversion(channel) ? 'Инверсия включена' : 'Инверсия выключена';
            return `
                <div class="gp-wizard-summary-channel">
                    <div class="gp-wizard-summary-row"><span>${CHANNEL_LABELS[channel]}</span><strong>${value}</strong></div>
                    <div class="gp-wizard-summary-row"><span>Направление</span><strong class="gp-wizard-summary-badge" data-inverted="${getChannelInversion(channel)}">${inversionLabel}</strong></div>
                    ${describeTuning(channel)}
                </div>
            `;
        })
        .join('');

    const auxRows = AUX_SUMMARY_CHANNELS
        .map((channel) => {
            const result = auxResults[channel];
            const refText = result ? formatRefLabel(result.ref) : 'не найдено';
            const positionsText = result?.positions.length
                ? result.positions.map((position) => position.centerRc).join(' / ')
                : 'нет зафиксированных положений';
            const inversionLabel = getChannelInversion(channel) ? 'Инверсия включена' : 'Инверсия выключена';
            const rangeText = channel === 'mode'
                ? formatModeRanges(result)
                : formatAuxRange(result?.selectedRange ?? null);
            return `
                <div class="gp-wizard-summary-card">
                    <div class="gp-wizard-summary-card-title">${CHANNEL_LABELS[channel]}</div>
                    <div class="gp-wizard-summary-row"><span>Вход</span><strong>${refText}</strong></div>
                    <div class="gp-wizard-summary-row"><span>Направление</span><strong class="gp-wizard-summary-badge" data-inverted="${getChannelInversion(channel)}">${inversionLabel}</strong></div>
                    <div class="gp-wizard-summary-row"><span>Положения</span><strong>${positionsText}</strong></div>
                    <div class="gp-wizard-summary-note">${rangeText}</div>
                </div>
            `;
        })
        .join('');

    return `
        <div class="gp-wizard-summary-grid">
            <div class="gp-wizard-summary-card">
                <div class="gp-wizard-summary-card-title">Основные каналы</div>
                ${primaryRows}
            </div>
            ${auxRows}
        </div>
    `;
}

export function formatRefLabel(ref: GamepadInputRef): string {
    const index = Number(ref.slice(1));
    if (ref.startsWith('a')) {
        return `Ось ${index} / CH${index + 1}`;
    }
    return `Кнопка ${index + 1}`;
}

/** The zero point and dead zone of a flight channel, only when the student changed them. */
function describeTuning(channel: PrimaryChannelKey): string {
    const tuning = simSettings.gamepadTuning[channel];
    if (isDefaultTuning(channel, tuning)) return '';
    const trim = Math.abs(tuning.trim) < 0.0005 ? '0' : `${tuning.trim > 0 ? '+' : '−'}${Math.abs(tuning.trim * 100).toFixed(1)}%`;
    const rates = channel === 'throttle' ? '' : ` · экспо ${Math.round((tuning.expo ?? 0) * 100)}% · рейт ${Math.round((tuning.rate ?? 1) * 100)}%`;
    return `<div class="gp-wizard-summary-note">Нуль ${trim} · мёртвая зона ${(tuning.deadzone * 100).toFixed(1)}%${rates}</div>`;
}

function formatModeRanges(modeResult?: AuxDetectionResult): string {
    const ranges = modeResult?.ranges ?? [];
    const selected = ranges.length > 3
        ? pickRepresentativePositions(modeResult?.positions ?? [], 3)
        : modeResult?.positions ?? [];
    const preparedRanges = buildRangesFromPositions(selected);
    if (preparedRanges.length < 2) {
        return 'Недостаточно данных для диапазонов Mode.';
    }

    const loiter = preparedRanges[0];
    const althold = preparedRanges[Math.min(1, preparedRanges.length - 1)];
    const stabilize = preparedRanges[Math.min(2, preparedRanges.length - 1)];
    return `Loiter ${formatAuxRange(loiter)} | AltHold ${formatAuxRange(althold)} | Stabilize ${formatAuxRange(stabilize)}`;
}

function formatAuxRange(range: AuxChannelRange | null): string {
    if (!range) return 'Диапазон не определен';
    return `${range.min}-${range.max}`;
}
