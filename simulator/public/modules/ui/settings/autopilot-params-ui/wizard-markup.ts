import { escapeHtml } from './helpers.js';
import { flashBlock } from './home-markup.js';
import { WIZARD_GROUPS, buildWizardProfile, type WizardSelection } from './station2-presets.js';
import type { FlashMessage, PickMode } from './types.js';

/**
 * «Мастер настройки» как в Pioneer Station 2.0: по одному варианту на шаг (тип связи, навигация, скорость, газ). Шаг можно пропустить,
 * тогда его параметры не трогаются. Выбор показывается предпросмотром изменений, ничего не применяется сразу.
 */
export function renderAutopilotParamsWizard(params: { selection: WizardSelection; mode: PickMode; flashMessage: FlashMessage | null }) {
    const chosen = buildWizardProfile(params.selection);
    const groups = WIZARD_GROUPS.map((group) => `
        <fieldset class="autopilot-wizard__group">
            <legend class="autopilot-home__group">${escapeHtml(group.title)}</legend>
            <div class="autopilot-wizard__options" role="radiogroup" aria-label="${escapeHtml(group.title)}">
                ${group.options.map((option) => {
                    const selected = params.selection[group.id] === option.id;
                    return `<button type="button" class="autopilot-card autopilot-wizard__option${selected ? ' is-selected' : ''}" role="radio" aria-checked="${selected}" data-wizard-group="${group.id}" data-wizard-option="${option.id}">
                        <span class="autopilot-card__body">
                            <span class="autopilot-card__title">${escapeHtml(option.title)}${selected ? '<span class="autopilot-card__badge">выбрано</span>' : ''}</span>
                            <span class="autopilot-card__text">${escapeHtml(option.text)}</span>
                        </span>
                    </button>`;
                }).join('')}
            </div>
        </fieldset>`).join('');
    const action = params.mode === 'to-drone' ? 'для записи на дрон' : 'для симулятора';
    return `
        <div class="autopilot-home">
            <div class="autopilot-home__inner">
                ${flashBlock(params.flashMessage)}
                <h3 class="autopilot-home__heading" tabindex="-1" data-view-heading>Мастер настройки</h3>
                <p class="autopilot-home__lead">Так настраивает дрон Pioneer Station 2.0: выберите по варианту на нужных шагах, лишние шаги пропустите. Изменятся только связанные с выбором параметры, калибровки и номер борта не затрагиваются. Дальше покажем, что изменится ${action}.</p>
                ${groups}
                <div class="autopilot-wizard__bar">
                    <span class="autopilot-wizard__summary">${chosen ? escapeHtml(chosen.title.replace('Мастер настройки: ', 'Выбрано: ')) : 'Пока ничего не выбрано'}</span>
                    <button type="button" class="autopilot-action-btn" data-action="wizard-preview"${chosen ? '' : ' disabled'}>Показать, что изменится</button>
                </div>
            </div>
        </div>`;
}
