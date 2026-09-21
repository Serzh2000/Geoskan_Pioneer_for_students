import * as THREE from 'three';
import { log } from '../../shared/logging/logger.js';
import { camera, mouse, raycaster, renderer } from '../../scene/core/scene-init.js';
import { collectPointerTargets, getGroundPointFromPointer } from '../../scene/interaction/input-helpers.js';
import { addObject } from '../../scene/objects/object-manager.js';
import { setSelectedObjectTransform } from '../../scene/objects/object-transform.js';
import { matchesCatalogFilter, type CatalogCategory } from '../scene-manager/catalog.js';
import { getSceneTypePreviewConfig } from '../scene-manager/support/type-preview-config.js';

/*
 * Game-editor-style placement overlay for the 3D viewport - an additional,
 * separate way to add scene objects alongside the existing Scene Manager
 * sidebar panel (which is untouched). Opening it hides the other floating
 * viewport controls (camera switcher, run/stop/reset, rail toggle) and
 * replaces them with a horizontal item hotbar + category filter. Picking an
 * item "arms" it; the next click(s) in the viewport place it exactly where
 * the cursor hits, via the same addObject()/setSelectedObjectTransform()
 * pair the scene-file importer uses.
 */

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
    all: 'Все категории',
    flight: 'Полёт и посадка',
    markers: 'Маркеры',
    landscape: 'Ландшафт и город',
    equipment: 'Оборудование'
};

let armedType: string | null = null;
let armedGrid: HTMLElement | null = null;

function isSceneCanvasEvent(event: Event): boolean {
    if (!renderer?.domElement) return false;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    return path.includes(renderer.domElement) || event.target === renderer.domElement;
}

function placeArmedObjectAt(event: PointerEvent): void {
    if (!armedType || !camera || !raycaster || !renderer) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    let point: THREE.Vector3 | null = null;
    try {
        point = raycaster.intersectObjects(collectPointerTargets(), true)[0]?.point ?? getGroundPointFromPointer();
    } catch (e) {
        console.warn('[scene-hotbar] Placement raycasting failed:', e);
    }
    if (!point) return;

    const id = addObject(armedType, {});
    if (!id) {
        log(`Не удалось добавить объект типа "${armedType}"`, 'warn');
        return;
    }
    setSelectedObjectTransform({ x: point.x, y: point.y, z: point.z }, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    (window as any).updateSceneManager?.();
}

// Registered once, early (before scene-events.ts's own document-capture
// handlers exist), so this fires first and can fully take over a click
// while an item is armed - the normal select/deselect/context-menu logic
// underneath must not also react to what is really a placement click.
function registerPlacementInterceptor(): void {
    document.addEventListener('pointerup', (event) => {
        if (!armedType || !isSceneCanvasEvent(event)) return;
        event.preventDefault();
        event.stopImmediatePropagation();

        if (event.button === 2) {
            setArmed(null); // right-click cancels the armed item, like most editors
            return;
        }
        if (event.button === 0) placeArmedObjectAt(event);
    }, true);
}

function setArmed(type: string | null) {
    armedType = type;
    armedGrid?.querySelectorAll<HTMLButtonElement>('.scene-hotbar__item').forEach((card) => {
        card.classList.toggle('is-armed', card.dataset.type === type);
    });
}

function buildItemCard(option: HTMLOptionElement): HTMLButtonElement {
    const type = option.value;
    const label = option.textContent?.trim() || type;
    const preview = getSceneTypePreviewConfig(type, label);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'scene-hotbar__item';
    card.dataset.type = type;
    card.title = preview.description;
    card.innerHTML = `
        <span class="scene-hotbar__item-icon" aria-hidden="true">${preview.icon}</span>
        <span class="scene-hotbar__item-label">${label}</span>
    `;
    card.addEventListener('click', () => setArmed(armedType === type ? null : type));
    return card;
}

export function initSceneHotbar(): void {
    const toggleBtn = document.getElementById('scene-hotbar-toggle-btn');
    const closeBtn = document.getElementById('scene-hotbar-close-btn');
    const grid = document.getElementById('scene-hotbar-items');
    const categoryRow = document.getElementById('scene-hotbar-categories');
    const sourceSelect = document.getElementById('scene-add-type') as HTMLSelectElement | null;
    if (!toggleBtn || !closeBtn || !grid || !categoryRow || !sourceSelect) return;

    armedGrid = grid;
    registerPlacementInterceptor();

    let activeCategory: CatalogCategory = 'all';

    const renderItems = () => {
        grid.innerHTML = '';
        const options = Array.from(sourceSelect.options).filter((option) =>
            matchesCatalogFilter(option.value, option.textContent || '', '', activeCategory)
        );
        options.forEach((option) => grid.appendChild(buildItemCard(option)));
        setArmed(null);
    };

    (Object.keys(CATEGORY_LABELS) as CatalogCategory[]).forEach((category) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'scene-hotbar__category';
        chip.dataset.category = category;
        chip.textContent = CATEGORY_LABELS[category];
        chip.classList.toggle('is-active', category === 'all');
        chip.addEventListener('click', () => {
            activeCategory = category;
            categoryRow.querySelectorAll('.scene-hotbar__category').forEach((btn) => {
                btn.classList.toggle('is-active', (btn as HTMLElement).dataset.category === category);
            });
            renderItems();
        });
        categoryRow.appendChild(chip);
    });

    const close = () => {
        document.body.classList.remove('is-scene-hotbar-active');
        setArmed(null);
        toggleBtn.setAttribute('aria-pressed', 'false');
    };

    toggleBtn.addEventListener('click', () => {
        const opening = !document.body.classList.contains('is-scene-hotbar-active');
        if (opening) {
            renderItems();
            document.body.classList.add('is-scene-hotbar-active');
            toggleBtn.setAttribute('aria-pressed', 'true');
            log('Режим расстановки объектов открыт', 'info');
        } else {
            close();
        }
    });
    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (armedType) {
            setArmed(null);
        } else if (document.body.classList.contains('is-scene-hotbar-active')) {
            close();
        }
    });
}
