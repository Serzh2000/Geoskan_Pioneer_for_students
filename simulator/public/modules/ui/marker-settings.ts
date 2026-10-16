import type * as THREE from 'three';
import { MARKER_DICTIONARIES, MARKER_DICTIONARY_OPTIONS, type MarkerDictionaryId } from '../environment/obstacles/marker-dictionaries.js';
import type { MarkerMapOptions } from '../environment/obstacles.js';
import { updateMarkerObjectSettings } from '../scene/objects/object-manager.js';

/*
 * Settings popover for one ArUco/AprilTag marker or marker map, opened from
 * the object's right-click menu - and right after placing one from the
 * viewport hotbar, so its values get asked for instead of silently
 * defaulting. Changes apply live (the marker in the scene updates as you
 * type); "Отменить"/Esc restores what was there when the popover opened,
 * "Готово" or a click elsewhere keeps the changes.
 */

type MarkerMode = 'aruco' | 'apriltag';

const DEFAULT_MAP: Required<Omit<MarkerMapOptions, 'rotationDeg' | 'anchor'>> = {
    rows: 5,
    columns: 5,
    startId: 0,
    idStep: 1,
    markerSize: 1.05,
    gapX: 0.2,
    gapY: 0.2,
    traversal: 'row-major',
    startCorner: 'top-left',
    snake: false
};

const EDGE = 12;
const APPLY_DELAY_MS = 180;

let closeActive: ((keep: boolean) => void) | null = null;

function modeOf(object: THREE.Object3D): MarkerMode {
    const kind = object.userData?.isMarkerMap ? object.userData.markerMapKind : object.userData?.markerKind;
    return kind === 'AprilTag' ? 'apriltag' : 'aruco';
}

export function isConfigurableMarker(object: THREE.Object3D | null | undefined): boolean {
    if (!object) return false;
    const data = object.userData || {};
    return !!data.isMarkerMap || data.markerKind === 'ArUco' || data.markerKind === 'AprilTag';
}

function dictionarySelect(mode: MarkerMode, value: string) {
    const options = MARKER_DICTIONARY_OPTIONS[mode]
        .map((option) => `<option value="${option.id}"${option.id === value ? ' selected' : ''}>${option.label}</option>`)
        .join('');
    return `<label class="mset__field mset__field--wide"><span>Словарь</span><select data-key="dictionary">${options}</select></label>`;
}

function numberField(key: string, label: string, value: number, attrs: string) {
    return `<label class="mset__field"><span>${label}</span><input type="number" data-key="${key}" value="${value}" ${attrs} inputmode="decimal"></label>`;
}

export function openMarkerSettings(object: THREE.Object3D, clientX: number, clientY: number): void {
    if (!isConfigurableMarker(object)) return;
    closeActive?.(true);

    const isMap = !!object.userData.isMarkerMap;
    const mode = modeOf(object);
    const kindLabel = mode === 'apriltag' ? 'AprilTag' : 'ArUco';
    const initial = {
        dictionary: String(object.userData.markerDictionary || MARKER_DICTIONARY_OPTIONS[mode][0].id),
        value: String(object.userData.value ?? '0'),
        map: { ...DEFAULT_MAP, ...(object.userData.markerMapConfig || {}) } as typeof DEFAULT_MAP & MarkerMapOptions
    };

    const root = document.createElement('div');
    root.className = 'mset';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', isMap ? `Настройки карты ${kindLabel}` : `Настройки маркера ${kindLabel}`);
    root.innerHTML = `
        <div class="mset__head">
            <div class="mset__title">${isMap ? `${kindLabel} карта` : `${kindLabel} маркер`}</div>
            <div class="mset__subtitle">Изменения сразу видны на сцене</div>
        </div>
        <div class="mset__grid">
            ${dictionarySelect(mode, initial.dictionary)}
            ${isMap ? `
                ${numberField('rows', 'Строк', initial.map.rows, 'min="1" max="20" step="1"')}
                ${numberField('columns', 'Столбцов', initial.map.columns, 'min="1" max="20" step="1"')}
                ${numberField('startId', 'Первый ID', initial.map.startId, 'min="0" step="1"')}
                ${numberField('idStep', 'Шаг ID', initial.map.idStep, 'min="1" max="1000" step="1"')}
                ${numberField('markerSize', 'Размер маркера, м', initial.map.markerSize, 'min="0.2" max="5" step="0.05"')}
                ${numberField('gap', 'Зазор, м', initial.map.gapX, 'min="0" max="10" step="0.05"')}
                <label class="mset__field"><span>Нумерация</span><select data-key="traversal">
                    <option value="row-major"${initial.map.traversal === 'row-major' ? ' selected' : ''}>По строкам</option>
                    <option value="column-major"${initial.map.traversal === 'column-major' ? ' selected' : ''}>По столбцам</option>
                </select></label>
                <label class="mset__field"><span>Первый маркер</span><select data-key="startCorner">
                    <option value="top-left">Сверху слева</option>
                    <option value="top-right">Сверху справа</option>
                    <option value="bottom-left">Снизу слева</option>
                    <option value="bottom-right">Снизу справа</option>
                </select></label>
                <label class="mset__check mset__field--wide"><input type="checkbox" data-key="snake"${initial.map.snake ? ' checked' : ''}> Змейкой — каждая следующая строка в обратную сторону</label>
            ` : `
                ${numberField('value', 'ID маркера', Number(initial.value) || 0, 'min="0" step="1"')}
            `}
        </div>
        <p class="mset__summary" aria-live="polite"></p>
        <div class="mset__actions">
            <button type="button" class="mset__btn mset__cancel">Отменить</button>
            <button type="button" class="mset__btn mset__btn--primary mset__done">Готово</button>
        </div>`;
    document.body.appendChild(root);

    const field = <T extends HTMLElement>(key: string) => root.querySelector<T>(`[data-key="${key}"]`);
    const startCornerSelect = field<HTMLSelectElement>('startCorner');
    if (startCornerSelect) startCornerSelect.value = initial.map.startCorner;
    const summary = root.querySelector<HTMLElement>('.mset__summary')!;

    const read = () => {
        const dictionary = (field<HTMLSelectElement>('dictionary')?.value || initial.dictionary) as MarkerDictionaryId;
        const num = (key: string, fallback: number) => {
            const parsed = Number(field<HTMLInputElement>(key)?.value);
            return Number.isFinite(parsed) ? parsed : fallback;
        };
        if (!isMap) return { dictionary, value: String(Math.max(0, Math.round(num('value', 0)))) };
        const gap = num('gap', initial.map.gapX);
        return {
            dictionary,
            map: {
                rows: num('rows', initial.map.rows),
                columns: num('columns', initial.map.columns),
                startId: num('startId', initial.map.startId),
                idStep: num('idStep', initial.map.idStep),
                markerSize: num('markerSize', initial.map.markerSize),
                gapX: gap,
                gapY: gap,
                traversal: field<HTMLSelectElement>('traversal')?.value === 'column-major' ? 'column-major' : 'row-major',
                startCorner: (field<HTMLSelectElement>('startCorner')?.value || 'top-left') as MarkerMapOptions['startCorner'],
                snake: !!field<HTMLInputElement>('snake')?.checked
            } as MarkerMapOptions
        };
    };

    // What the chosen dictionary allows, so an out-of-range ID isn't a
    // silent surprise (single IDs are clamped, map IDs wrap around).
    const renderSummary = () => {
        const current = read();
        const count = MARKER_DICTIONARIES[current.dictionary]?.markerCount ?? 0;
        if (!isMap) {
            const id = Number(current.value);
            summary.textContent = id > count - 1
                ? `В этом словаре ID от 0 до ${count - 1} — будет использован ${count - 1}.`
                : `В этом словаре ID от 0 до ${count - 1}.`;
            summary.classList.toggle('is-warning', id > count - 1);
            return;
        }
        const map = current.map!;
        const rows = Math.min(20, Math.max(1, Math.round(map.rows ?? 1)));
        const columns = Math.min(20, Math.max(1, Math.round(map.columns ?? 1)));
        const total = rows * columns;
        const first = Math.max(0, Math.round(map.startId ?? 0));
        const last = first + Math.max(1, Math.round(map.idStep ?? 1)) * (total - 1);
        const wraps = last > count - 1;
        summary.textContent = `${total} маркеров, ID ${first}–${last}`
            + (wraps ? ` (словарь до ${count - 1} — дальше нумерация пойдёт по кругу)` : '');
        summary.classList.toggle('is-warning', wraps);
    };

    let applyTimer = 0;
    const apply = () => {
        const current = read();
        updateMarkerObjectSettings(object, isMap
            ? { markerDictionary: current.dictionary, markerMap: current.map }
            : { markerDictionary: current.dictionary, value: current.value });
    };
    const scheduleApply = () => {
        renderSummary();
        window.clearTimeout(applyTimer);
        applyTimer = window.setTimeout(apply, APPLY_DELAY_MS);
    };
    root.addEventListener('input', scheduleApply);
    root.addEventListener('change', scheduleApply);

    const onOutside = (event: PointerEvent) => {
        if (!root.contains(event.target as Node)) close(true);
    };
    const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            close(false);
        } else if (event.key === 'Enter' && (event.target as HTMLElement)?.tagName === 'INPUT') {
            event.preventDefault();
            close(true);
        }
    };

    function close(keep: boolean) {
        window.clearTimeout(applyTimer);
        if (keep) {
            apply();
        } else {
            updateMarkerObjectSettings(object, isMap
                ? { markerDictionary: initial.dictionary, markerMap: initial.map }
                : { markerDictionary: initial.dictionary, value: initial.value });
        }
        document.removeEventListener('pointerdown', onOutside, true);
        document.removeEventListener('keydown', onKey, true);
        root.remove();
        closeActive = null;
    }

    root.querySelector('.mset__done')!.addEventListener('click', () => close(true));
    root.querySelector('.mset__cancel')!.addEventListener('click', () => close(false));
    // Registered on the next tick so the click that opened us doesn't close us.
    window.setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
    document.addEventListener('keydown', onKey, true);
    closeActive = close;

    renderSummary();
    const rect = root.getBoundingClientRect();
    root.style.left = `${Math.round(Math.min(Math.max(clientX + 12, EDGE), window.innerWidth - rect.width - EDGE))}px`;
    root.style.top = `${Math.round(Math.min(Math.max(clientY - 20, EDGE), window.innerHeight - rect.height - EDGE))}px`;
    (root.querySelector<HTMLElement>(isMap ? '[data-key="rows"]' : '[data-key="value"]'))?.focus({ preventScroll: true });
}

export function initMarkerSettings(): void {
    // The scene layer opens this from its context menu without importing UI.
    (window as any).openMarkerSettings = openMarkerSettings;
}
