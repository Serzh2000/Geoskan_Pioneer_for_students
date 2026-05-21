import { formatSceneNumber } from '../../support.js';
import type { SceneManagerEntry } from '../../types.js';
import { escapeHtml, formatSceneLabel } from '../format.js';

function normalizeDegrees(radians: number): number {
    const degrees = (radians * 180) / Math.PI;
    return ((degrees % 360) + 360) % 360;
}

function getCompassDirectionLabel(degrees: number): string {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return directions[Math.round(degrees / 45) % directions.length];
}

function formatCompassDegrees(degrees: number): string {
    return `${degrees.toFixed(1)}°`;
}

export function renderEmptyStateMarkup() {
    return `
        <div class="scene-details-empty">
            <div class="scene-details-empty__title">Объект не выбран</div>
            <div class="scene-details-empty__text">Выберите элемент в иерархии, чтобы открыть его параметры в инспекторе.</div>
        </div>
    `;
}

export function renderSelectedDetailsMarkup(selected: SceneManagerEntry) {
    const headingDegrees = normalizeDegrees(selected.rotation.y);
    const headingDirection = getCompassDirectionLabel(headingDegrees);
    const metaLines = selected.metaLines || [];
    const metaMarkup = metaLines.length > 0
        ? `
            <div class="scene-details-meta">
                ${metaLines.map((line) => `<div class="scene-details-meta__item">${escapeHtml(line)}</div>`).join('')}
            </div>
        `
        : '';

    return `
        <div class="scene-details-card">
            <div class="scene-details-grid">
                <div class="scene-details-row">
                    <span class="scene-details-row__label">Тип</span>
                    <span class="scene-details-row__value">${escapeHtml(formatSceneLabel(selected.sceneType, selected.name))}</span>
                </div>
                <div class="scene-details-row">
                    <span class="scene-details-row__label">Имя</span>
                    <span class="scene-details-row__value">${escapeHtml(selected.name || formatSceneLabel(selected.sceneType, selected.name))}</span>
                </div>
                <div class="scene-details-row">
                    <span class="scene-details-row__label">Статус</span>
                    <span class="scene-details-row__value">${selected.draggable ? 'Редактируемый' : 'Зафиксирован'}</span>
                </div>
            </div>
            <div class="scene-details-compass" style="--scene-compass-angle: ${headingDegrees.toFixed(2)}deg;">
                <div class="scene-details-compass__header">
                    <span class="scene-details-compass__title">Компас</span>
                    <span class="scene-details-compass__badge">${headingDirection} ${formatCompassDegrees(headingDegrees)}</span>
                </div>
                <div class="scene-details-compass__body">
                    <div class="scene-details-compass__dial" aria-hidden="true">
                        <span class="scene-details-compass__marker scene-details-compass__marker--north">С</span>
                        <span class="scene-details-compass__marker scene-details-compass__marker--east">В</span>
                        <span class="scene-details-compass__marker scene-details-compass__marker--south">Ю</span>
                        <span class="scene-details-compass__marker scene-details-compass__marker--west">З</span>
                        <span class="scene-details-compass__needle"></span>
                        <span class="scene-details-compass__center"></span>
                    </div>
                    <div class="scene-details-compass__readout">
                        <span class="scene-details-compass__readout-label">Поворот вокруг оси Y</span>
                        <span class="scene-details-compass__readout-value">${formatSceneNumber(selected.rotation.y)} rad</span>
                    </div>
                </div>
            </div>
            ${metaMarkup}
        </div>
    `;
}
