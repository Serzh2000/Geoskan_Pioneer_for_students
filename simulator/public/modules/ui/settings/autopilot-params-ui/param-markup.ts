import type { AutopilotParameterDefinition, AutopilotSettingsState } from '../autopilot-params-model.js';
import { escapeHtml, formatNumber, isParameterChanged } from './helpers.js';
import type { DraftState } from './types.js';

export type ParamOption = { value: number; label: string };

/**
 * Варианты значения из текста вида «0 - выключить; 1 - включить.». Возвращает пусто, если хоть одна часть не похожа на «число - подпись»:
 * тогда это обычное пояснение, а не перечисление.
 */
export function parseOptions(details: string): ParamOption[] {
    const options: ParamOption[] = [];
    for (const part of details.split(/;|\n/).map((item) => item.trim()).filter(Boolean)) {
        const match = part.match(/^(-?\d+(?:\.\d+)?)\s*[-–—=:]\s*(.+?)\.?$/);
        if (!match) return [];
        options.push({ value: Number(match[1]), label: match[2].trim() });
    }
    return options.length >= 2 && options.length <= 8 ? options : [];
}

function limitsOf(definition: AutopilotParameterDefinition) {
    const limits: string[] = [];
    const rule = definition.validation;
    if (Array.isArray(rule.allowedValues)) limits.push(`Допустимо: ${rule.allowedValues.join(', ')}`);
    if (typeof rule.min === 'number') limits.push(`мин. ${rule.min}`);
    if (typeof rule.max === 'number') limits.push(`макс. ${rule.max}`);
    if (rule.unit) limits.push(`единицы: ${rule.unit}`);
    return limits;
}

/** Карточка параметра: имя и смысл слева; справа значение (кнопки вариантов или число), «по умолчанию» и сброс, если изменено. */
export function renderParam(definition: AutopilotParameterDefinition, params: { drafts: Map<string, DraftState>; state: AutopilotSettingsState }) {
    const key = escapeHtml(definition.key);
    const draft = params.drafts.get(definition.key);
    const applied = params.state.values[definition.key] ?? definition.defaultValue;
    const error = draft?.error || '';
    const changed = isParameterChanged(params.state.values[definition.key], definition.defaultValue);
    const options = definition.source === 'template' ? [] : parseOptions(definition.details);
    const knownValue = options.some((option) => option.value === applied);
    const limits = limitsOf(definition);
    // Перечисление показывается кнопками справа, а не абзацем; общее пояснение по группе у параметров без описания не повторяем.
    const note = options.length || definition.source === 'template' ? '' : definition.details;

    const optionButtons = options.map((option) => `
        <button type="button" class="autopilot-opt${option.value === applied ? ' is-active' : ''}" role="radio" aria-checked="${option.value === applied}" data-set-param="${key}" data-set-value="${option.value}">
            <span class="autopilot-opt__value">${option.value}</span><span class="autopilot-opt__label">${escapeHtml(option.label)}</span>
        </button>`).join('');
    const numberInput = `
        <input id="autopilot-param-${key}" type="number" class="autopilot-param__input" data-parameter-key="${key}" value="${escapeHtml(draft?.value ?? String(applied))}" step="any" aria-label="Значение ${key}" aria-invalid="${error ? 'true' : 'false'}">`;
    const control = options.length
        ? `<div class="autopilot-param__options" role="radiogroup" aria-label="Значение ${key}">${optionButtons}</div>${knownValue ? '' : `<div class="autopilot-param__other">Сейчас другое значение: ${numberInput}</div>`}`
        : numberInput;

    return `
        <article class="autopilot-param ${error ? 'is-invalid' : ''} ${changed ? 'is-changed' : ''}">
            <div class="autopilot-param__main">
                <div class="autopilot-param__headline">
                    <code class="autopilot-param__key">${key}</code>
                    ${definition.source === 'template' ? '<span class="autopilot-param__badge">Без описания</span>' : ''}
                    ${changed ? '<span class="autopilot-param__badge autopilot-param__badge--changed">Изменён</span>' : ''}
                </div>
                <p class="autopilot-param__description">${escapeHtml(definition.description)}</p>
                ${note ? `<p class="autopilot-param__details">${escapeHtml(note)}</p>` : ''}
                <div class="autopilot-param__meta-line">
                    <span>По умолчанию: <strong>${escapeHtml(formatNumber(definition.defaultValue))}</strong></span>
                    ${limits.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}
                    ${definition.validation.recommended ? `<span class="autopilot-param__rec">${escapeHtml(definition.validation.recommended)}</span>` : ''}
                </div>
            </div>
            <div class="autopilot-param__control">
                ${options.length ? '' : `<label class="autopilot-param__input-label" for="autopilot-param-${key}">Значение</label>`}
                ${control}
                ${error ? `<div class="autopilot-param__status is-error">${escapeHtml(error)}</div>` : ''}
                ${changed ? `<button type="button" class="autopilot-param__reset" data-set-param="${key}" data-set-value="${definition.defaultValue}">Вернуть ${escapeHtml(formatNumber(definition.defaultValue))}</button>` : ''}
            </div>
        </article>`;
}
