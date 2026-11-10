/**
 * Миссии треков «Мини 2» идут на дроне Пионер Мини 2, остальные — на Базовом. Эти функции переключают дрон сами:
 * выбирают подходящий из уже стоящих на сцене или добавляют новый теми же кнопками панели «Рой», что нажимает человек.
 * Программы и Lua-скрипты других дронов не трогаются.
 */
import { currentDroneId, drones } from '../core/state.js';
import { droneModelProfile, type DroneModelId } from '../core/drone-models.js';

function selectDrone(id: string): boolean {
    const row = document.querySelector<HTMLElement>(`.pk-row[data-drone-id="${CSS.escape(id)}"]`);
    if (!row) return false;
    row.click();
    return currentDroneId === id;
}

/** Делает текущим дрон нужной модели. Возвращает, получилось ли (в тестах и без панели «Рой» — нет). */
export function ensureDroneModel(model: DroneModelId): boolean {
    if (droneModelProfile(drones[currentDroneId]?.model).id === model) return true;
    const existing = Object.values(drones).find((drone) => droneModelProfile(drone.model).id === model && !drone.running);
    if (existing && selectDrone(existing.id)) return true;
    // Дрон на сцене один и стоит на площадке: меняем его модель на месте, как переключатель в шапке редактора,
    // иначе новый дрон появится в стороне, а на площадке останется дрон не той модели.
    const current = drones[currentDroneId];
    if (current && !current.running && Object.keys(drones).length === 1) {
        window.dispatchEvent(new CustomEvent('drone-model-request', { detail: { model } }));
        if (droneModelProfile(drones[currentDroneId]?.model).id === model) return true;
    }
    const add = document.getElementById(model === 'pioneer-mini2' ? 'add-mini2-btn' : 'add-drone-btn');
    if (add) add.click();
    return droneModelProfile(drones[currentDroneId]?.model).id === model;
}

export const ensureMini2Drone = (): boolean => ensureDroneModel('pioneer-mini2');
export const ensureBasicDrone = (): boolean => ensureDroneModel('pioneer-basic');
