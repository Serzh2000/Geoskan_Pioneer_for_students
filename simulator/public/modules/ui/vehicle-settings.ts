import type * as THREE from 'three';
import { MARKER_DICTIONARY_OPTIONS } from '../environment/obstacles/marker-dictionaries.js';
import {
    normalizeVehicleConfig,
    rebuildVehicle,
    type VehicleConfig
} from '../environment/obstacles/vehicles.js';
import { getLinearFeatureCurve } from '../environment/obstacles.js';
import { envGroup } from '../environment/index.js';
import { isRouteFor, resetVehicle } from '../vehicles/engine.js';
import { updateObjectSelectionVisuals } from '../scene/interaction/input.js';
import { selectedObject } from '../scene/core/scene-init.js';

/*
 * Settings popover for a car or train (same look and behaviour as the
 * marker popover in marker-settings.ts, whose .mset styles it reuses):
 * opened from the vehicle's right-click menu and right after placing one.
 * Changes apply live; "Отменить"/Esc restores the settings it opened with.
 */

const EDGE = 12;
const APPLY_DELAY_MS = 150;

let closeActive: ((keep: boolean) => void) | null = null;

function escapeHtml(text: string) {
    return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function routesFor(config: VehicleConfig) {
    const routes: THREE.Object3D[] = [];
    envGroup?.traverse((node) => {
        if (node.userData?.supportsPoints && isRouteFor(node, config)) routes.push(node);
    });
    const label = config.kind === 'train' ? 'Рельсы' : 'Дорога';
    return routes.map((route, index) => ({
        id: route.uuid,
        label: `${label} ${index + 1} · ${getLinearFeatureCurve(route).getLength().toFixed(0)} м${route.userData.closed ? ', кольцо' : ''}`
    }));
}

function options(list: Array<[string, string]>, value: string) {
    return list.map(([v, label]) => `<option value="${v}"${v === value ? ' selected' : ''}>${label}</option>`).join('');
}

export function openVehicleSettings(vehicle: THREE.Object3D, clientX: number, clientY: number): void {
    if (!vehicle?.userData?.isVehicle) return;
    closeActive?.(true);

    const initial = structuredClone(vehicle.userData.vehicle) as VehicleConfig;
    const isTrain = initial.kind === 'train';
    const routes = routesFor(initial);
    const noRoute = !routes.length;

    const root = document.createElement('div');
    root.className = 'mset mset--vehicle';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', `Настройки: ${initial.name}`);
    root.innerHTML = `
        <div class="mset__head">
            <div class="mset__title">${isTrain ? 'Поезд' : 'Автомобиль'}</div>
            <div class="mset__subtitle">Изменения сразу видны на сцене</div>
        </div>
        <div class="mset__grid">
            <label class="mset__field mset__field--wide"><span>Название (для кода)</span>
                <input type="text" data-key="name" value="${escapeHtml(initial.name)}" maxlength="40" spellcheck="false"></label>
            <label class="mset__field mset__field--wide"><span>${isTrain ? 'Рельсы' : 'Дорога'}</span>
                <select data-key="routeId"${noRoute ? ' disabled' : ''}>${noRoute
                    ? `<option>Нет ${isTrain ? 'рельсов' : 'дорог'} на сцене</option>`
                    : options(routes.map((r) => [r.id, r.label]), initial.routeId ?? '')}</select></label>
            <label class="mset__field"><span>Скорость, м/с</span>
                <input type="number" data-key="speed" value="${initial.speed}" min="0" max="15" step="0.1"></label>
            <label class="mset__field"><span>Разгон, м/с²</span>
                <input type="number" data-key="accel" value="${initial.accel}" min="0.1" max="10" step="0.1"></label>
            <label class="mset__field"><span>Движение</span><select data-key="mode">${options([
                ['loop', 'По кругу'],
                ['pingpong', 'Туда-обратно'],
                ['once', 'До конца и стоп']
            ], initial.mode)}</select></label>
            <label class="mset__field"><span>Направление</span><select data-key="direction">${options([
                ['1', 'По ходу прокладки'],
                ['-1', 'Обратно']
            ], String(initial.direction))}</select></label>
            <label class="mset__field mset__field--wide"><span>Старт на маршруте: <output data-out="startOffset">${Math.round(initial.startOffset * 100)}%</output></span>
                <input type="range" data-key="startOffset" min="0" max="100" step="1" value="${Math.round(initial.startOffset * 100)}"></label>
            ${isTrain ? `<label class="mset__field"><span>Вагонов</span>
                <input type="number" data-key="wagons" value="${initial.wagons}" min="0" max="6" step="1"></label>` : ''}
            <label class="mset__check mset__field--wide"><input type="checkbox" data-key="autoStart"${initial.autoStart ? ' checked' : ''}> Поехать при запуске программы</label>

            <div class="mset__section mset__field--wide">Маркер на крыше</div>
            <label class="mset__check mset__field--wide"><input type="checkbox" data-key="markerEnabled"${initial.marker.enabled ? ' checked' : ''}> Есть маркер</label>
            <label class="mset__field" data-marker-field><span>Тип</span><select data-key="markerKind">${options([
                ['ArUco', 'ArUco'],
                ['AprilTag', 'AprilTag']
            ], initial.marker.kind)}</select></label>
            <label class="mset__field" data-marker-field><span>ID</span>
                <input type="number" data-key="markerId" value="${escapeHtml(initial.marker.id)}" min="0" step="1"></label>
            <label class="mset__field" data-marker-field><span>Словарь</span><select data-key="markerDictionary"></select></label>
            <label class="mset__field" data-marker-field><span>Размер, м</span>
                <input type="number" data-key="markerSize" value="${initial.marker.size}" min="0.3" max="2" step="0.05"></label>
        </div>
        <p class="mset__summary" aria-live="polite"></p>
        <div class="mset__actions">
            <button type="button" class="mset__btn mset__cancel">Отменить</button>
            <button type="button" class="mset__btn mset__btn--primary mset__done">Готово</button>
        </div>`;
    document.body.appendChild(root);

    const field = <T extends HTMLElement>(key: string) => root.querySelector<T>(`[data-key="${key}"]`)!;
    const summary = root.querySelector<HTMLElement>('.mset__summary')!;
    const markerKindSelect = field<HTMLSelectElement>('markerKind');
    const dictionarySelect = field<HTMLSelectElement>('markerDictionary');

    const fillDictionaries = (kind: string, value?: string) => {
        const mode = kind === 'AprilTag' ? 'apriltag' : 'aruco';
        const list = MARKER_DICTIONARY_OPTIONS[mode];
        dictionarySelect.innerHTML = options(list.map((o) => [o.id, o.label]), value && list.some((o) => o.id === value) ? value : list[0].id);
    };
    fillDictionaries(initial.marker.kind, initial.marker.dictionary);

    const read = (): VehicleConfig => normalizeVehicleConfig(initial.kind, {
        ...initial,
        name: field<HTMLInputElement>('name').value.trim() || initial.name,
        routeId: noRoute ? initial.routeId : field<HTMLSelectElement>('routeId').value,
        speed: Number(field<HTMLInputElement>('speed').value),
        accel: Number(field<HTMLInputElement>('accel').value),
        mode: field<HTMLSelectElement>('mode').value as VehicleConfig['mode'],
        direction: field<HTMLSelectElement>('direction').value === '-1' ? -1 : 1,
        startOffset: Number(field<HTMLInputElement>('startOffset').value) / 100,
        wagons: isTrain ? Number(field<HTMLInputElement>('wagons').value) : 0,
        autoStart: field<HTMLInputElement>('autoStart').checked,
        marker: {
            enabled: field<HTMLInputElement>('markerEnabled').checked,
            kind: markerKindSelect.value === 'AprilTag' ? 'AprilTag' : 'ArUco',
            dictionary: dictionarySelect.value,
            id: String(Math.max(0, Math.round(Number(field<HTMLInputElement>('markerId').value) || 0))),
            size: Number(field<HTMLInputElement>('markerSize').value)
        }
    });

    const renderSummary = (config: VehicleConfig) => {
        root.querySelector('[data-out="startOffset"]')!.textContent = `${Math.round(config.startOffset * 100)}%`;
        root.querySelectorAll<HTMLElement>('[data-marker-field]').forEach((el) => { el.hidden = !config.marker.enabled; });
        const kmh = (config.speed * 3.6).toFixed(1).replace('.', ',');
        const route = routes.find((r) => r.id === config.routeId);
        summary.classList.toggle('is-warning', !route);
        summary.textContent = !route
            ? `Нет маршрута: ${isTrain ? 'проложите рельсы' : 'проложите дорогу'} и выберите их здесь.`
            : `${config.speed.toString().replace('.', ',')} м/с ≈ ${kmh} км/ч. В коде: «${config.name}».`;
    };

    const apply = (config: VehicleConfig) => {
        const before = vehicle.userData.vehicle as VehicleConfig;
        const structural = before.wagons !== config.wagons || JSON.stringify(before.marker) !== JSON.stringify(config.marker);
        vehicle.userData.vehicle = config;
        vehicle.name = config.name;
        if (structural) rebuildVehicle(vehicle);
        resetVehicle(vehicle);
        if (selectedObject === vehicle) updateObjectSelectionVisuals(vehicle, true);
        (window as any).updateSceneManager?.();
    };

    let timer = 0;
    const onChange = (event: Event) => {
        if ((event.target as HTMLElement).dataset.key === 'markerKind') fillDictionaries(markerKindSelect.value);
        const config = read();
        renderSummary(config);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => apply(read()), APPLY_DELAY_MS);
    };
    root.addEventListener('input', onChange);
    root.addEventListener('change', onChange);

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
        apply(keep ? read() : initial);
        document.removeEventListener('pointerdown', onOutside, true);
        document.removeEventListener('keydown', onKey, true);
        root.remove();
        closeActive = null;
    }

    root.querySelector('.mset__done')!.addEventListener('click', () => close(true));
    root.querySelector('.mset__cancel')!.addEventListener('click', () => close(false));
    window.setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
    document.addEventListener('keydown', onKey, true);
    closeActive = close;

    renderSummary(read());
    const rect = root.getBoundingClientRect();
    root.style.left = `${Math.round(Math.min(Math.max(clientX + 12, EDGE), window.innerWidth - rect.width - EDGE))}px`;
    root.style.top = `${Math.round(Math.min(Math.max(clientY - 20, EDGE), window.innerHeight - rect.height - EDGE))}px`;
    field<HTMLInputElement>('speed').focus({ preventScroll: true });
}

export function initVehicleSettings(): void {
    // The scene layer (context menu) and the hotbar open this without importing UI.
    (window as any).openVehicleSettings = openVehicleSettings;
}
