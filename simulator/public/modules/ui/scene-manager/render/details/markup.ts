import type { SceneManagerEntry } from '../../types.js';
import { escapeHtml } from '../format.js';
import { getEntryKind, getEntryTitle, isGroundEntry, isGroupEntry, isPresetEntry } from '../label.js';
import { getSceneObjectIcon } from '../icons.js';
import { PRESET_MISSIONS } from '../../preset-missions.js';

/** Nothing selected: a one-line hint, not a placeholder card - the pane below it has real content. */
export function renderEmptyStateMarkup() {
    return `<div class="scene-details-empty">
        <svg class="scene-details-empty__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
        <div class="scene-details-empty__body">
            <div class="scene-details-empty__title">Объект не выбран</div>
            <div class="scene-details-empty__text">Кликните по объекту в сцене или в списке — здесь откроются его свойства.</div>
        </div>
        <button type="button" class="btn-secondary btn--sm" data-scene-browse>К списку объектов</button>
    </div>`;
}

export function renderSelectedDetailsMarkup(selected: SceneManagerEntry) {
    const degrees = selected.rotation.z * 180 / Math.PI;
    const kind = getEntryKind(selected);
    const meta = (selected.metaLines || []).filter(line => !line.startsWith('Пресет:'));
    const missions = PRESET_MISSIONS[selected.presetName || ''] || [];
    const rowKind = selected.isDrone ? 'drone' : isGroundEntry(selected) ? 'ground' : isGroupEntry(selected) || isPresetEntry(selected) ? 'group' : 'prop';
    const subtitle = kind && kind !== getEntryTitle(selected) ? kind : selected.draggable ? 'Ваш объект' : 'Часть полигона';
    return `<div class="scene-details-card" data-kind="${rowKind}">
        <div class="scene-details-hero">
            <span class="scene-details-hero__tile" aria-hidden="true">${getSceneObjectIcon(selected)}</span>
            <div class="scene-details-hero__text">
                <span class="scene-details-heading__title">${escapeHtml(getEntryTitle(selected))}</span>
                <span class="scene-details-kind">${escapeHtml(subtitle)}</span>
            </div>
        </div>
        <div class="scene-details-chips">
            <span class="scene-chip ${selected.draggable ? 'scene-chip--movable' : 'scene-chip--locked'}">${selected.draggable ? 'Можно перемещать' : 'Зафиксирован'}</span>
            <span class="scene-chip">Поворот по Z <b>${degrees.toFixed(1)}°</b></span>
        </div>
        ${meta.length ? `<div class="scene-details-meta">${meta.map(line => `<div class="scene-details-meta__item">${escapeHtml(line)}</div>`).join('')}</div>` : ''}
        ${missions.length ? `<section class="scene-preset-missions" aria-label="Задания на этой сцене">
            <div class="scene-preset-missions__heading">Задания на этой сцене</div>
            <ol class="scene-preset-missions__list">${missions.map(mission => `<li class="scene-preset-missions__item">
                <strong>${escapeHtml(mission.title)}</strong>
                <span>${escapeHtml(mission.task)}</span>
                <small>Результат: ${escapeHtml(mission.result)}</small>
            </li>`).join('')}</ol>
            <p class="scene-preset-missions__hint">Компоненты можно выбирать в списке или прямо на сцене и менять под своё задание.</p>
        </section>` : ''}
    </div>`;
}
