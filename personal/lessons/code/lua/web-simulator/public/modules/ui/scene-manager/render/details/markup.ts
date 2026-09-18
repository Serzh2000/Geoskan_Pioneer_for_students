import type { SceneManagerEntry } from '../../types.js';
import { escapeHtml } from '../format.js';
import { getEntryKind, getEntryTitle } from '../label.js';

export function renderEmptyStateMarkup() {
    return `<div class="scene-details-empty">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m24 5 17 10v18L24 43 7 33V15Z M7 15l17 10 17-10M24 25v18"/></svg>
        <div class="scene-details-empty__title">Выберите объект</div>
        <div class="scene-details-empty__text">Нажмите на объект в сцене или выберите его в списке. Здесь появятся его свойства.</div>
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
            ${kind ? `<span class="scene-tree-kind">${escapeHtml(kind)}</span>` : ''}
        </div>
        <div class="scene-details-grid">
            <div class="scene-details-row"><span class="scene-details-row__label">Доступ</span><span class="scene-details-row__value">${selected.draggable ? 'Можно перемещать' : 'Зафиксирован'}</span></div>
            <div class="scene-details-row"><span class="scene-details-row__label">Поворот по Z</span><span class="scene-details-row__value">${degrees.toFixed(1)}°</span></div>
        </div>
        ${meta.length ? `<div class="scene-details-meta">${meta.map(line => `<div class="scene-details-meta__item">${escapeHtml(line)}</div>`).join('')}</div>` : ''}
    </div>`;
}
