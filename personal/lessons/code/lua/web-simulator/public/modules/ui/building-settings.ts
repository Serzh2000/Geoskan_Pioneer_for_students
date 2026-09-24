import * as THREE from 'three';
import { MARKER_DICTIONARY_OPTIONS } from '../environment/obstacles/marker-dictionaries.js';
import {
    BUILDING_BASE_HEIGHT,
    BUILDING_FLOOR_HEIGHT,
    MAX_BUILDING_FLOORS,
    MIN_BUILDING_FLOORS,
    getBuildingWindowSlots,
    normalizeBuildingConfig,
    parseWindowIncidents,
    updateApartmentBuildingMetadata,
    type BuildingConfig
} from '../environment/obstacles.js';
import { OBJECT_TYPE } from '../shared/object-types.js';
import { updateObjectSelectionVisuals } from '../scene/interaction/input.js';
import { scene, selectedObject } from '../scene/core/scene-init.js';
import { tablerIcon, type TablerIconName } from './icons/tabler.js';

/*
 * Settings popover for an apartment building (same look and behaviour as
 * the marker and vehicle popovers, whose .mset styles it shares): floors,
 * facade colour, what is going on behind which window, and a marker on the
 * roof. Opened from the building's right-click menu and right after placing
 * one. Changes apply live; "Отменить"/Esc restores what it opened with.
 *
 * Incidents are painted onto a facade grid instead of typed as
 * "3:front:2=fire" lines: pick a brush, click (or drag across) windows. The
 * window under the pointer is outlined in the scene, so it is always clear
 * which one on the real building a cell stands for.
 */

type Face = 'front' | 'back';
type Kind = 'fire' | 'smoke' | 'thief';
type Tool = Kind | 'erase';

const EDGE = 12;
const APPLY_DELAY_MS = 150;
const WINDOWS = [1, 2, 3];

const KINDS: Record<Kind, { label: string; plural: string; icon: TablerIconName }> = {
    fire: { label: 'Пожар', plural: 'пожар', icon: 'flame' },
    smoke: { label: 'Дым', plural: 'дым', icon: 'cloud' },
    thief: { label: 'Вор', plural: 'вор', icon: 'spy' }
};
const FACES: Record<Face, string> = { front: 'С подъездом', back: 'Задний фасад' };

const COLORS: Array<[number, string]> = [
    [0xc8c4b8, 'Бетон'],
    [0xece8e1, 'Белый'],
    [0xd8c29b, 'Песочный'],
    [0xb4664b, 'Кирпич'],
    [0x9ca3ab, 'Серый'],
    [0xa8c2d4, 'Голубой']
];

let closeActive: ((keep: boolean) => void) | null = null;

function escapeHtml(text: string) {
    return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function icon(name: TablerIconName, size = 16) {
    return tablerIcon(name).replace('width="24" height="24"', `width="${size}" height="${size}"`);
}

function options(list: Array<[string, string]>, value: string) {
    return list.map(([v, label]) => `<option value="${v}"${v === value ? ' selected' : ''}>${label}</option>`).join('');
}

function floorsWord(count: number) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'этаж';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'этажа';
    return 'этажей';
}

function metres(value: number) {
    return `${value.toFixed(1).replace('.', ',')} м`;
}

const key = (face: Face, floor: number, window: number) => `${face}:${floor}:${window}`;

function serialize(incidents: Map<string, Kind>, floors: number) {
    return [...incidents.entries()]
        .map(([k, kind]) => {
            const [face, floor, window] = k.split(':');
            return { face, floor: Number(floor), window: Number(window), kind };
        })
        .filter((item) => item.floor <= floors)
        .sort((a, b) => a.face.localeCompare(b.face) || a.floor - b.floor || a.window - b.window)
        .map((item) => `${item.floor}:${item.face}:${item.window}=${item.kind}`)
        .join('\n');
}

// ------------------------------------------------------------ 3D highlight

let highlight: THREE.LineSegments | null = null;

function clearHighlight() {
    if (!highlight) return;
    highlight.removeFromParent();
    highlight.geometry.dispose();
    (highlight.material as THREE.Material).dispose();
    highlight = null;
}

function showHighlight(building: THREE.Object3D, face: Face, floor: number, window: number) {
    clearHighlight();
    const slot = getBuildingWindowSlots(Number(building.userData.floors))
        .find((s) => s.face === face && s.floor === floor && s.window === window);
    if (!slot || !scene) return;
    building.updateWorldMatrix(true, false);
    const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.08, 0.06, 0.66)),
        new THREE.LineBasicMaterial({ color: 0xff7a1a, depthTest: false, transparent: true })
    );
    frame.position.copy(building.localToWorld(slot.position.clone().add(new THREE.Vector3(0, 0.06 * slot.outward, 0))));
    frame.quaternion.copy(building.getWorldQuaternion(new THREE.Quaternion()));
    frame.renderOrder = 9900;
    scene.add(frame);
    highlight = frame;
}

// ------------------------------------------------------------ popover

export function openBuildingSettings(building: THREE.Object3D, clientX: number, clientY: number): void {
    if (building?.userData?.type !== OBJECT_TYPE.BUILDING) return;
    closeActive?.(true);

    const initial = {
        floors: Number(building.userData.floors),
        value: String(building.userData.value ?? ''),
        building: normalizeBuildingConfig(structuredClone(building.userData.building))
    };
    const incidents = new Map<string, Kind>();
    for (const item of parseWindowIncidents(initial.value, MAX_BUILDING_FLOORS)) {
        incidents.set(key(item.face, item.floor, item.window), item.kind);
    }
    let floors = initial.floors;
    let face: Face = 'front';
    let tool: Tool = 'fire';
    let config: BuildingConfig = structuredClone(initial.building);

    const root = document.createElement('div');
    root.className = 'mset mset--building';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Настройки многоэтажки');
    root.innerHTML = `
        <div class="mset__head">
            <div class="mset__title">Многоэтажка</div>
            <div class="mset__subtitle">Изменения сразу видны на сцене</div>
        </div>
        <div class="mset__grid">
            <label class="mset__field mset__field--wide"><span>Этажность: <output data-out="floors"></output></span>
                <input type="range" data-key="floors" min="${MIN_BUILDING_FLOORS}" max="${MAX_BUILDING_FLOORS}" step="1" value="${floors}"></label>

            <div class="mset__field mset__field--wide"><span id="bset-color-label">Цвет фасада</span>
                <div class="bset-swatches" role="radiogroup" aria-labelledby="bset-color-label">
                    ${COLORS.map(([color, label]) => `<button type="button" class="bset-swatch" role="radio" data-color="${color}"
                        aria-label="${label}" title="${label}" style="--swatch:#${color.toString(16).padStart(6, '0')}"></button>`).join('')}
                </div>
            </div>

            <div class="mset__section mset__field--wide">Происшествия в окнах</div>
            <div class="mset__field mset__field--wide">
                <div class="bset-tools" role="radiogroup" aria-label="Кисть">
                    ${(Object.keys(KINDS) as Kind[]).map((kind) => `<button type="button" class="bset-tool bset-tool--${kind}" role="radio" data-tool="${kind}">${icon(KINDS[kind].icon)}<span>${KINDS[kind].label}</span></button>`).join('')}
                    <button type="button" class="bset-tool bset-tool--erase" role="radio" data-tool="erase">${icon('eraser')}<span>Стереть</span></button>
                </div>
            </div>
            <div class="mset__field mset__field--wide">
                <div class="bset-faces" role="tablist" aria-label="Фасад">
                    ${(Object.keys(FACES) as Face[]).map((f) => `<button type="button" class="bset-face" role="tab" data-face="${f}">${FACES[f]} <span class="bset-face__count" data-face-count="${f}"></span></button>`).join('')}
                </div>
                <div class="bset-facade" data-facade></div>
                <div class="bset-facade-actions">
                    <button type="button" class="mset__btn bset-small" data-action="random">${icon('dice-5', 15)}<span>Случайный сценарий</span></button>
                    <button type="button" class="mset__btn bset-small" data-action="clear">${icon('x', 15)}<span>Очистить</span></button>
                </div>
            </div>

            <div class="mset__section mset__field--wide">Маркер на крыше</div>
            <label class="mset__check mset__field--wide"><input type="checkbox" data-key="markerEnabled"${config.roofMarker.enabled ? ' checked' : ''}> Есть маркер — на него можно искать и садиться</label>
            <label class="mset__field" data-marker-field><span>Тип</span><select data-key="markerKind">${options([
                ['ArUco', 'ArUco'],
                ['AprilTag', 'AprilTag']
            ], config.roofMarker.kind)}</select></label>
            <label class="mset__field" data-marker-field><span>ID</span>
                <input type="number" data-key="markerId" value="${escapeHtml(config.roofMarker.id)}" min="0" step="1"></label>
            <label class="mset__field" data-marker-field><span>Словарь</span><select data-key="markerDictionary"></select></label>
            <label class="mset__field" data-marker-field><span>Размер, м</span>
                <input type="number" data-key="markerSize" value="${config.roofMarker.size}" min="0.3" max="3" step="0.1"></label>
        </div>
        <p class="mset__summary" aria-live="polite"></p>
        <div class="mset__actions">
            <button type="button" class="mset__btn mset__cancel">Отменить</button>
            <button type="button" class="mset__btn mset__btn--primary mset__done">Готово</button>
        </div>`;
    document.body.appendChild(root);

    const field = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-key="${name}"]`)!;
    const facade = root.querySelector<HTMLElement>('[data-facade]')!;
    const summary = root.querySelector<HTMLElement>('.mset__summary')!;
    const markerKindSelect = field<HTMLSelectElement>('markerKind');
    const dictionarySelect = field<HTMLSelectElement>('markerDictionary');

    const fillDictionaries = (kind: string, value?: string) => {
        const list = MARKER_DICTIONARY_OPTIONS[kind === 'AprilTag' ? 'apriltag' : 'aruco'];
        dictionarySelect.innerHTML = options(list.map((o) => [o.id, o.label]), value && list.some((o) => o.id === value) ? value : list[0].id);
    };
    fillDictionaries(config.roofMarker.kind, config.roofMarker.dictionary);

    // ---- facade grid

    // Seen from outside: on the front (+Y) window 1 (x < 0) is on the right,
    // on the back it is on the left.
    const windowOrder = () => (face === 'front' ? [...WINDOWS].reverse() : WINDOWS);

    const renderFacade = () => {
        const rows: string[] = [];
        for (let floor = floors; floor >= 1; floor--) {
            const cells = windowOrder().map((window) => {
                const kind = incidents.get(key(face, floor, window));
                const label = `${floor} ${floorsWord(1)}, окно ${window}${kind ? `: ${KINDS[kind].label.toLowerCase()}` : ''}`;
                return `<button type="button" class="bset-window${kind ? ` bset-window--${kind}` : ''}" data-floor="${floor}" data-window="${window}"
                    aria-label="${label}" title="${label}">${kind ? icon(KINDS[kind].icon, 14) : ''}</button>`;
            }).join('');
            rows.push(`<div class="bset-row"><span class="bset-row__floor">${floor}</span>${cells}</div>`);
        }
        facade.innerHTML = `<div class="bset-roof" aria-hidden="true">${config.roofMarker.enabled ? `маркер ${escapeHtml(config.roofMarker.id)}` : ''}</div>${rows.join('')}
            <div class="bset-ground" aria-hidden="true">${face === 'front' ? '<span class="bset-door"></span>' : ''}</div>`;
    };

    const renderChrome = () => {
        root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) => {
            const on = b.dataset.tool === tool;
            b.setAttribute('aria-checked', String(on));
            b.tabIndex = on ? 0 : -1;
        });
        root.querySelectorAll<HTMLButtonElement>('[data-face]').forEach((b) => {
            const on = b.dataset.face === face;
            b.setAttribute('aria-selected', String(on));
            b.tabIndex = on ? 0 : -1;
        });
        root.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((b) => {
            const on = Number(b.dataset.color) === config.bodyColor;
            b.setAttribute('aria-checked', String(on));
            b.tabIndex = on ? 0 : -1;
        });
        if (![...root.querySelectorAll('[data-color]')].some((b) => b.getAttribute('aria-checked') === 'true')) {
            (root.querySelector('[data-color]') as HTMLElement).tabIndex = 0;
        }
        for (const f of Object.keys(FACES) as Face[]) {
            const count = [...incidents.keys()].filter((k) => k.startsWith(`${f}:`) && Number(k.split(':')[1]) <= floors).length;
            root.querySelector(`[data-face-count="${f}"]`)!.textContent = count ? String(count) : '';
        }
        root.querySelector('[data-out="floors"]')!.textContent =
            `${floors} ${floorsWord(floors)} · крыша ≈ ${metres(BUILDING_BASE_HEIGHT + floors * BUILDING_FLOOR_HEIGHT + 0.22)}`;
        root.querySelectorAll<HTMLElement>('[data-marker-field]').forEach((el) => { el.hidden = !config.roofMarker.enabled; });
    };

    const renderSummary = () => {
        const counts = new Map<Kind, number>();
        for (const [k, kind] of incidents) {
            if (Number(k.split(':')[1]) <= floors) counts.set(kind, (counts.get(kind) ?? 0) + 1);
        }
        const parts = (Object.keys(KINDS) as Kind[]).filter((k) => counts.get(k)).map((k) => `${KINDS[k].plural} ×${counts.get(k)}`);
        const incidentText = parts.length
            ? `В окнах: ${parts.join(', ')}.`
            : 'Окна пустые: выберите кисть и кликните по окну (можно провести по нескольким).';
        const marker = config.roofMarker;
        const markerText = marker.enabled ? ` На крыше ${marker.kind} ID ${marker.id}, ${metres(marker.size)}.` : '';
        summary.textContent = incidentText + markerText;
    };

    const renderAll = () => {
        renderChrome();
        renderFacade();
        renderSummary();
    };

    // ---- apply

    const readMarker = () => ({
        enabled: field<HTMLInputElement>('markerEnabled').checked,
        kind: markerKindSelect.value === 'AprilTag' ? 'AprilTag' as const : 'ArUco' as const,
        dictionary: dictionarySelect.value,
        id: String(Math.max(0, Math.round(Number(field<HTMLInputElement>('markerId').value) || 0))),
        size: Number(field<HTMLInputElement>('markerSize').value)
    });

    const applyNow = (state: { floors: number; value: string; building: BuildingConfig }) => {
        updateApartmentBuildingMetadata(building, { floors: state.floors, value: state.value, building: state.building });
        if (selectedObject === building) updateObjectSelectionVisuals(building, true);
        (window as any).updateSceneManager?.();
    };

    let timer = 0;
    const current = () => ({ floors, value: serialize(incidents, floors), building: config });
    const scheduleApply = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => applyNow(current()), APPLY_DELAY_MS);
    };

    const onFieldChange = (event: Event) => {
        const target = event.target as HTMLElement;
        const name = target.dataset.key;
        if (!name) return;
        if (name === 'floors') {
            floors = Number(field<HTMLInputElement>('floors').value);
            clearHighlight();
        } else {
            if (name === 'markerKind') fillDictionaries(markerKindSelect.value);
            config = normalizeBuildingConfig({ ...config, roofMarker: readMarker() });
        }
        renderAll();
        scheduleApply();
    };
    root.addEventListener('input', onFieldChange);
    root.addEventListener('change', onFieldChange);

    // ---- painting

    let painting: { erase: boolean; kind: Kind | null } | null = null;

    const paint = (cell: HTMLElement) => {
        if (!painting) return;
        const k = key(face, Number(cell.dataset.floor), Number(cell.dataset.window));
        if (painting.erase) incidents.delete(k);
        else incidents.set(k, painting.kind!);
        renderChrome();
        renderSummary();
        const kind = incidents.get(k);
        cell.className = `bset-window${kind ? ` bset-window--${kind}` : ''}`;
        cell.innerHTML = kind ? icon(KINDS[kind].icon, 14) : '';
        scheduleApply();
    };

    facade.addEventListener('pointerdown', (event) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>('.bset-window');
        if (!cell || event.button !== 0) return;
        event.preventDefault();
        const k = key(face, Number(cell.dataset.floor), Number(cell.dataset.window));
        // Clicking a window that already has the brush's incident clears it.
        const erase = tool === 'erase' || incidents.get(k) === tool;
        painting = { erase, kind: tool === 'erase' ? null : tool };
        paint(cell);
    });
    facade.addEventListener('pointerover', (event) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>('.bset-window');
        if (!cell) return;
        showHighlight(building, face, Number(cell.dataset.floor), Number(cell.dataset.window));
        if (painting && (event.buttons & 1)) paint(cell);
    });
    facade.addEventListener('pointerleave', () => { if (!painting) clearHighlight(); });
    const stopPainting = () => { painting = null; };
    document.addEventListener('pointerup', stopPainting);
    // Keyboard: Enter/Space on a focused window applies the brush once.
    facade.addEventListener('keydown', (event) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>('.bset-window');
        if (!cell || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        const k = key(face, Number(cell.dataset.floor), Number(cell.dataset.window));
        painting = { erase: tool === 'erase' || incidents.get(k) === tool, kind: tool === 'erase' ? null : tool };
        paint(cell);
        painting = null;
    });
    facade.addEventListener('focusin', (event) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>('.bset-window');
        if (cell) showHighlight(building, face, Number(cell.dataset.floor), Number(cell.dataset.window));
    });

    // ---- tools, faces, colours, actions

    const radioKeys = (selector: string, attr: string, pick: (value: string) => void) => {
        root.querySelectorAll<HTMLButtonElement>(selector).forEach((button, index, all) => {
            button.addEventListener('click', () => { pick(button.getAttribute(attr)!); renderAll(); });
            button.addEventListener('keydown', (event) => {
                const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
                    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
                if (!delta) return;
                event.preventDefault();
                const next = all[(index + delta + all.length) % all.length];
                pick(next.getAttribute(attr)!);
                renderAll();
                next.focus();
            });
        });
    };
    radioKeys('[data-tool]', 'data-tool', (value) => { tool = value as Tool; });
    radioKeys('[data-face]', 'data-face', (value) => { face = value as Face; clearHighlight(); });
    radioKeys('[data-color]', 'data-color', (value) => {
        config = normalizeBuildingConfig({ ...config, bodyColor: Number(value) });
        scheduleApply();
    });

    root.querySelector('[data-action="clear"]')!.addEventListener('click', () => {
        incidents.clear();
        renderAll();
        scheduleApply();
    });
    // One of each incident behind random windows, anywhere on the building:
    // a ready search-and-rescue task.
    root.querySelector('[data-action="random"]')!.addEventListener('click', () => {
        incidents.clear();
        const slots = getBuildingWindowSlots(floors).sort(() => Math.random() - 0.5);
        (Object.keys(KINDS) as Kind[]).forEach((kind, index) => {
            const slot = slots[index];
            incidents.set(key(slot.face, slot.floor, slot.window), kind);
        });
        renderAll();
        scheduleApply();
    });

    // ---- open / close

    let stopObserving = () => {};
    const onOutside = (event: PointerEvent) => {
        if (!root.contains(event.target as Node)) close(true);
    };
    const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            close(false);
        }
    };

    function close(keep: boolean) {
        window.clearTimeout(timer);
        applyNow(keep ? current() : initial);
        clearHighlight();
        document.removeEventListener('pointerdown', onOutside, true);
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerup', stopPainting);
        stopObserving();
        root.remove();
        closeActive = null;
    }

    root.querySelector('.mset__done')!.addEventListener('click', () => close(true));
    root.querySelector('.mset__cancel')!.addEventListener('click', () => close(false));
    window.setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
    document.addEventListener('keydown', onKey, true);
    closeActive = close;

    // Keep it on screen as it grows (roof marker fields, more floors).
    const place = () => {
        const rect = root.getBoundingClientRect();
        root.style.left = `${Math.round(Math.min(Math.max(clientX + 12, EDGE), window.innerWidth - rect.width - EDGE))}px`;
        root.style.top = `${Math.round(Math.max(EDGE, Math.min(clientY - 20, window.innerHeight - rect.height - EDGE)))}px`;
    };
    const resizeObserver = new ResizeObserver(place);
    resizeObserver.observe(root);
    stopObserving = () => resizeObserver.disconnect();

    renderAll();
    place();
    field<HTMLInputElement>('floors').focus({ preventScroll: true });
}

export function initBuildingSettings(): void {
    // The scene layer (context menu) and the hotbar open this without importing UI.
    (window as any).openBuildingSettings = openBuildingSettings;
}
