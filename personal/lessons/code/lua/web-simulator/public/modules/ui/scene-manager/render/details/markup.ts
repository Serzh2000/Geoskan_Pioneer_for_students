import type { SceneManagerEntry } from '../../types.js';
import { escapeHtml } from '../format.js';
import { getEntryKind, getEntryTitle } from '../label.js';

/** Nothing selected: a one-line hint, not a placeholder card - the pane below it has real content. */
export function renderEmptyStateMarkup() {
    return `<div class="scene-details-empty">
        <svg class="scene-details-empty__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
        <div class="scene-details-empty__body">
            <div class="scene-details-empty__title">Объект не выбран</div>
            <div class="scene-details-empty__text">Кликните по объекту в сцене или в списке — здесь откроются его свойства.</div>
        </div>
        <button type="button" data-scene-browse>К списку объектов →</button>
    </div>`;
}

export function renderSelectedDetailsMarkup(selected: SceneManagerEntry) {
    const degrees = selected.rotation.z * 180 / Math.PI;
    const kind = getEntryKind(selected);
    const meta = (selected.metaLines || []).filter(line => !line.startsWith('Пресет:'));
    return `<div class="scene-details-card">
        <div class="scene-details-heading">
            <span class="scene-details-heading__title">${escapeHtml(getEntryTitle(selected))}</span>
            ${kind && kind !== getEntryTitle(selected) ? `<span class="scene-tree-kind">${escapeHtml(kind)}</span>` : ''}
        </div>
        <div class="scene-details-grid">
            <div class="scene-details-row"><span class="scene-details-row__label">Доступ</span><span class="scene-details-row__value">${selected.draggable ? 'Можно перемещать' : 'Зафиксирован'}</span></div>
            <div class="scene-details-row"><span class="scene-details-row__label">Поворот по Z</span><span class="scene-details-row__value">${degrees.toFixed(1)}°</span></div>
        </div>
        ${meta.length ? `<div class="scene-details-meta">${meta.map(line => `<div class="scene-details-meta__item">${escapeHtml(line)}</div>`).join('')}</div>` : ''}
    </div>`;
}
