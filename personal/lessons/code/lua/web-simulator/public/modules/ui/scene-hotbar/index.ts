import * as THREE from 'three';
import { log } from '../../shared/logging/logger.js';
import { camera, mouse, raycaster, renderer, scene } from '../../scene/core/scene-init.js';
import { collectPointerTargets } from '../../scene/interaction/input-helpers.js';
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
let placementMarker: THREE.Mesh | null = null;

function isSceneCanvasEvent(event: Event): boolean {
    if (!renderer?.domElement) return false;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    return path.includes(renderer.domElement) || event.target === renderer.domElement;
}

function ensurePlacementMarker(): THREE.Mesh | null {
    if (!scene) return null;
    if (!placementMarker) {
        // Lies flat in the XY plane (this scene is Z-up), facing the same way
        // as the ground - no rotation needed to sit flush on a surface.
        const geometry = new THREE.RingGeometry(0.22, 0.32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6b00,
            transparent: true,
            opacity: 0.85,
            depthTest: false,
            side: THREE.DoubleSide
        });
        placementMarker = new THREE.Mesh(geometry, material);
        placementMarker.renderOrder = 999;
        placementMarker.visible = false;
        scene.add(placementMarker);
    }
    return placementMarker;
}

function setMarkerVisible(visible: boolean): void {
    if (placementMarker) placementMarker.visible = visible;
}

// Only the ground and existing objects are valid placement surfaces - no
// fallback onto an infinite math plane, which used to let objects land far
// outside the visible arena (effectively "in mid-air"). The hit's X/Y is
// still useful even when it lands on another object (e.g. the drone's
// frame, a pylon's shaft) - but using its Z directly put the new object's
// origin at whatever height was clicked, visibly floating since most
// models assume their own origin sits at their own base. Every placement
// is projected straight down onto the ground plane (Z=0) instead.
function raycastPlaceableSurface(clientX: number, clientY: number): THREE.Vector3 | null {
    if (!camera || !raycaster || !renderer) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    try {
        const point = raycaster.intersectObjects(collectPointerTargets(), true)[0]?.point ?? null;
        if (point) point.z = 0;
        return point;
    } catch (e) {
        console.warn('[scene-hotbar] Placement raycasting failed:', e);
        return null;
    }
}

function onPlacementPointerMove(event: PointerEvent): void {
    if (!armedType || !isSceneCanvasEvent(event)) {
        setMarkerVisible(false);
        return;
    }
    const point = raycastPlaceableSurface(event.clientX, event.clientY);
    const marker = ensurePlacementMarker();
    if (!marker || !point) {
        setMarkerVisible(false);
        return;
    }
    marker.position.copy(point);
    setMarkerVisible(true);
}

function placeArmedObjectAt(event: PointerEvent): void {
    if (!armedType) return;
    const point = raycastPlaceableSurface(event.clientX, event.clientY);
    if (!point) return; // no valid surface under the cursor - nothing to place on

    const id = addObject(armedType, {});
    if (!id) {
        log(`Не удалось добавить объект типа "${armedType}"`, 'warn');
        return;
    }
    setSelectedObjectTransform({ x: point.x, y: point.y, z: point.z }, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    (window as any).updateSceneManager?.();
    setArmed(null); // one placement per pick, like most level editors
}

// Registered once, early (before scene-events.ts's own document-capture
// handlers exist), so this fires first and can fully take over a click
// while an item is armed - the normal select/deselect/context-menu logic
// underneath, AND the orbit/fly camera controls (which bind pointerdown
// directly on the canvas), must not also react to what is really a
// placement click. Blocking only pointerup used to let the camera's own
// pointerdown start a drag that pointerup could then never end (since it
// never reached the canvas), leaving it stuck mid-drag on the very next
// mouse move - hence intercepting pointerdown too.
function registerPlacementInterceptor(): void {
    document.addEventListener('pointerdown', (event) => {
        if (!armedType || !isSceneCanvasEvent(event)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);

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

    document.addEventListener('pointermove', onPlacementPointerMove);
}

function setArmed(type: string | null) {
    armedType = type;
    armedGrid?.querySelectorAll<HTMLButtonElement>('.scene-hotbar__item').forEach((card) => {
        card.classList.toggle('is-armed', card.dataset.type === type);
    });
    if (!type) setMarkerVisible(false);
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
    const expandBtn = document.getElementById('scene-hotbar-expand-btn');
    const grid = document.getElementById('scene-hotbar-items');
    const categoryRow = document.getElementById('scene-hotbar-categories');
    const sourceSelect = document.getElementById('scene-add-type') as HTMLSelectElement | null;
    // The full catalog modal (search/filter/3D preview/pagination) still lives
    // in the scene-manager fragment - #scene-add-type-open-btn is its real,
    // now-hidden trigger button, wired by scene-manager/bindings/add-form.ts.
    const catalogOpenBtn = document.getElementById('scene-add-type-open-btn');
    const catalogApplyBtn = document.getElementById('scene-type-modal-apply-btn');
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

    expandBtn?.addEventListener('click', () => catalogOpenBtn?.click());

    // Registered after add-form.ts's own apply handler (scene-manager inits
    // first) - by the time this runs, sourceSelect.value already reflects
    // the card the user just picked in the modal, so arm the hotbar with it.
    catalogApplyBtn?.addEventListener('click', () => {
        if (sourceSelect.value) setArmed(sourceSelect.value);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (armedType) {
            setArmed(null);
        } else if (document.body.classList.contains('is-scene-hotbar-active')) {
            close();
        }
    });
}
