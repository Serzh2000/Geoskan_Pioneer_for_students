import * as THREE from 'three';
import { log } from '../../shared/logging/logger.js';
import { camera, mouse, raycaster, renderer, scene, selectedObject } from '../../scene/core/scene-init.js';
import { collectPointerTargets } from '../../scene/interaction/input-helpers.js';
import { addObject } from '../../scene/objects/object-manager.js';
import { setSelectedObjectTransform } from '../../scene/objects/object-transform.js';
import { matchesCatalogFilter, type CatalogCategory } from '../scene-manager/catalog.js';
import { getSceneTypePreviewConfig } from '../scene-manager/support/type-preview-config.js';
import { isConfigurableMarker, openMarkerSettings } from '../marker-settings.js';
import { getLinearFeatureCurve } from '../../environment/obstacles.js';
import { listVehicles } from '../../vehicles/engine.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import { isLinearFeatureEditingActive, startRouteDrawing, type RouteKind } from '../../scene/interaction/linear-editing.js';

const VEHICLE_ROUTE: Record<string, { feature: 'road' | 'rail'; where: string; missing: string }> = {
    car: { feature: 'road', where: 'по дороге', missing: 'Автомобиль ездит только по дороге — кликните по дороге (её можно добавить из этого же списка).' },
    train: { feature: 'rail', where: 'по рельсам', missing: 'Поезд ездит только по рельсам — кликните по железнодорожным путям (их можно добавить из этого же списка).' }
};

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

/** The road/railway under the cursor, and how far along it (0..1) the click was. */
function routeUnderCursor(clientX: number, clientY: number, feature: 'road' | 'rail') {
    if (!camera || !raycaster || !renderer) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    for (const hit of raycaster.intersectObjects(collectPointerTargets(), true)) {
        let node: THREE.Object3D | null = hit.object;
        while (node && !node.userData?.supportsPoints) node = node.parent;
        if (!node || (node.userData.featureKind === 'rail' ? 'rail' : 'road') !== feature) continue;
        // Nearest point on the centerline to where the click landed.
        const curve = getLinearFeatureCurve(node);
        const local = node.worldToLocal(hit.point.clone());
        let bestU = 0;
        let bestDistance = Infinity;
        for (let i = 0; i <= 400; i++) {
            const distance = curve.getPointAt(i / 400).distanceToSquared(local);
            if (distance < bestDistance) { bestDistance = distance; bestU = i / 400; }
        }
        return { route: node, startOffset: bestU };
    }
    return null;
}

function placeVehicleAt(event: PointerEvent, type: string): void {
    const spec = VEHICLE_ROUTE[type];
    const found = routeUnderCursor(event.clientX, event.clientY, spec.feature);
    if (!found) {
        const hint = document.getElementById('scene-hotbar-hint');
        if (hint) hint.textContent = spec.missing;
        log(spec.missing, 'warn');
        return; // stay armed - the next click can land on a route
    }
    const kindLabel = type === 'car' ? 'Автомобиль' : 'Поезд';
    const count = listVehicles().filter((vehicle) => vehicle.userData.vehicle?.kind === type).length;
    const id = addObject(type, { vehicle: { routeId: found.route.uuid, startOffset: found.startOffset, name: `${kindLabel} ${count + 1}` } });
    if (!id) return;
    (window as any).updateSceneManager?.();
    setArmed(null);
    (window as any).openVehicleSettings?.(selectedObject, event.clientX, event.clientY);
}

// Roads and railways are drawn, not dropped: the click is the route's first
// point, the rest is laid out point by point (scene/interaction/linear-editing.ts).
// The object only appears on "Готово", positioned at its first point.
function startRouteAt(event: PointerEvent, type: RouteKind): void {
    const start = raycastPlaceableSurface(event.clientX, event.clientY);
    if (!start) return;
    setArmed(null);
    startRouteDrawing(type, {
        start,
        create: (points, closed) => {
            const origin = points[0];
            const local = points.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y, z: 0 }));
            const id = addObject(type, { points: local, closed });
            if (!id) return;
            setSelectedObjectTransform({ x: origin.x, y: origin.y, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
            (window as any).updateSceneManager?.();
        }
    });
}

function placeArmedObjectAt(event: PointerEvent): void {
    if (!armedType) return;
    if (armedType === 'road' || armedType === 'rail') {
        startRouteAt(event, armedType);
        return;
    }
    if (VEHICLE_ROUTE[armedType]) {
        placeVehicleAt(event, armedType);
        return;
    }
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
    // Markers and maps need an ID / grid to be useful - ask right away, at
    // the spot where it landed, instead of silently using defaults.
    if (isConfigurableMarker(selectedObject)) openMarkerSettings(selectedObject!, event.clientX, event.clientY);
    // Same for a building: floors, what happens behind which window, roof marker.
    else if (selectedObject?.userData?.type === OBJECT_TYPE.BUILDING) {
        (window as any).openBuildingSettings?.(selectedObject, event.clientX, event.clientY);
    }
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

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

// The hint under the strip follows the current step: what to do next, and
// how to back out of it, instead of one static sentence.
function renderHint(label: string | null): void {
    const hint = document.getElementById('scene-hotbar-hint');
    if (!hint) return;
    const isRoute = armedType === 'road' || armedType === 'rail';
    hint.innerHTML = label && isRoute
        ? `Кликните, где начнётся <strong>${escapeHtml(label)}</strong>, дальше — точка за точкой. <kbd>ПКМ</kbd> или <kbd>Esc</kbd> — отмена.`
        : label
        ? `Кликните ${escapeHtml(VEHICLE_ROUTE[armedType ?? '']?.where ?? 'в сцене')}, чтобы поставить <strong>${escapeHtml(label)}</strong>. <kbd>ПКМ</kbd> или <kbd>Esc</kbd> — отмена.`
        : 'Выберите предмет, затем кликните в сцене. <kbd>Esc</kbd> — выйти.';
}

function setArmed(type: string | null) {
    armedType = type;
    let armedLabel: string | null = null;
    for (const card of armedGrid?.querySelectorAll<HTMLButtonElement>('.scene-hotbar__item') ?? []) {
        const isArmed = card.dataset.type === type;
        card.classList.toggle('is-armed', isArmed);
        card.setAttribute('aria-pressed', String(isArmed));
        if (isArmed) armedLabel = card.dataset.label || null;
    }
    renderHint(type ? armedLabel ?? type : null);
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
    card.dataset.label = label;
    card.setAttribute('aria-pressed', 'false');
    card.title = preview.description ? `${label} — ${preview.description}` : label;
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
    const categories = Object.keys(CATEGORY_LABELS) as CatalogCategory[];
    const optionsIn = (category: CatalogCategory) => Array.from(sourceSelect.options).filter((option) =>
        option.value && matchesCatalogFilter(option.value, option.textContent || '', '', category)
    );

    // Edge fades (see .can-scroll-left/right in scene-hotbar.css) only where
    // there is actually more to scroll to.
    const itemsWrap = document.getElementById('scene-hotbar-items-wrap');
    const syncScrollFades = () => {
        const maxScroll = grid.scrollWidth - grid.clientWidth;
        itemsWrap?.classList.toggle('can-scroll-left', grid.scrollLeft > 1);
        itemsWrap?.classList.toggle('can-scroll-right', grid.scrollLeft < maxScroll - 1);
    };
    grid.addEventListener('scroll', syncScrollFades, { passive: true });
    window.addEventListener('resize', syncScrollFades);
    // A plain mouse wheel only scrolls vertically - map it onto the strip's
    // only axis so the items past the edge are reachable without a trackpad.
    grid.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || grid.scrollWidth <= grid.clientWidth) return;
        event.preventDefault();
        grid.scrollLeft += event.deltaY;
    }, { passive: false });

    const renderItems = () => {
        grid.innerHTML = '';
        const options = optionsIn(activeCategory);
        options.forEach((option) => grid.appendChild(buildItemCard(option)));
        if (!options.length) {
            const empty = document.createElement('p');
            empty.className = 'scene-hotbar__empty';
            empty.textContent = 'В этой категории пока нет предметов.';
            grid.appendChild(empty);
        }
        grid.scrollLeft = 0;
        setArmed(null);
        syncScrollFades();
    };

    const selectCategory = (category: CatalogCategory, focus = false) => {
        activeCategory = category;
        categoryRow.querySelectorAll<HTMLButtonElement>('.scene-hotbar__category').forEach((tab) => {
            const selected = tab.dataset.category === category;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
            if (selected && focus) tab.focus();
            if (selected) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
        renderItems();
    };

    const renderCategoryTabs = () => {
        categoryRow.innerHTML = '';
        categories.forEach((category) => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'scene-hotbar__category';
            tab.id = `scene-hotbar-tab-${category}`;
            tab.dataset.category = category;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', grid.id);
            tab.setAttribute('aria-selected', String(category === activeCategory));
            tab.tabIndex = category === activeCategory ? 0 : -1;
            const count = optionsIn(category).length;
            tab.innerHTML = `${CATEGORY_LABELS[category]}<span class="scene-hotbar__category-count">${count}</span>`;
            tab.addEventListener('click', () => selectCategory(category));
            categoryRow.appendChild(tab);
        });
    };

    // Standard tablist keyboard model: arrows move between tabs, Home/End
    // jump to the ends; the selection follows focus.
    categoryRow.addEventListener('keydown', (event) => {
        const index = categories.indexOf(activeCategory);
        const next = {
            ArrowRight: (index + 1) % categories.length,
            ArrowLeft: (index - 1 + categories.length) % categories.length,
            Home: 0,
            End: categories.length - 1
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        selectCategory(categories[next], true);
    });

    const close = () => {
        document.body.classList.remove('is-scene-hotbar-active');
        setArmed(null);
        toggleBtn.setAttribute('aria-pressed', 'false');
    };

    toggleBtn.addEventListener('click', () => {
        const opening = !document.body.classList.contains('is-scene-hotbar-active');
        if (opening) {
            // Counts are rebuilt on every open - the catalog <select> can gain
            // types after init (e.g. once scene-manager finishes loading).
            renderCategoryTabs();
            renderItems();
            document.body.classList.add('is-scene-hotbar-active');
            // Measured only once the panel is display:flex again.
            requestAnimationFrame(syncScrollFades);
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
        // Esc while laying a route belongs to the route (cancel), not to the hotbar.
        if (event.key !== 'Escape' || event.defaultPrevented || isLinearFeatureEditingActive()) return;
        if (armedType) {
            setArmed(null);
        } else if (document.body.classList.contains('is-scene-hotbar-active')) {
            close();
        }
    });
}
