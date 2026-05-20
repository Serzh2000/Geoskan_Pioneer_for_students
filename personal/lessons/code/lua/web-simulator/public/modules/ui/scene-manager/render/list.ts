import type { UICallbacks } from '../../index.js';
import type { SceneManagerDomRefs } from '../support.js';
import type { SceneManagerEntry } from '../types.js';
import { escapeHtml, formatSceneLabel } from './format.js';
import { getSceneObjectIcon } from './icons.js';

export function renderObjectList(
    callbacks: UICallbacks,
    elements: SceneManagerDomRefs,
    objects: SceneManagerEntry[],
    selectedId: string | null,
    rerender: () => void
) {
    if (!elements.listEl || !callbacks.sceneManager) return;

    elements.listEl.innerHTML = '';
    if (elements.listCountEl) {
        const total = objects.length;
        elements.listCountEl.textContent = `${total} ${total === 1 ? 'объект' : total < 5 ? 'объекта' : 'объектов'}`;
    }
    for (const obj of objects) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'scene-manager-item' + (obj.id === selectedId ? ' active' : '');
        row.setAttribute('role', 'treeitem');
        row.setAttribute('aria-selected', String(obj.id === selectedId));
        row.innerHTML = `
            <span class="scene-manager-item__icon">${getSceneObjectIcon(obj)}</span>
            <span class="scene-manager-item__content">
                <span class="scene-manager-item__title">${escapeHtml(formatSceneLabel(obj.sceneType, obj.name))}</span>
                <span class="scene-manager-item__meta">${escapeHtml(obj.isDrone ? 'Дрон' : formatSceneLabel(obj.sceneType))}</span>
            </span>
        `;
        row.onclick = () => {
            callbacks.sceneManager?.select(obj.id);
            rerender();
        };
        elements.listEl.appendChild(row);
    }
}
