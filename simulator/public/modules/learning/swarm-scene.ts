/**
 * Сцена для миссий роя (трек «Мини 2 · SDK2», главы 18–19): рядом с дроном ученика стоят дроны-соседи Пионер Мини 2.
 * Их создают те же кнопки панели «Рой», что нажимает человек; запоминаются только созданные миссиями дроны, чтобы
 * не трогать дроны и программы ученика. Программа соседа стартует перед программой ученика (см. `setBeforeStartHook`).
 * После сброса все дроны стоят в начале координат, поэтому соседи сами уходят от старта своей программой.
 */
import { currentDroneId, drones } from '../core/state.js';
import { runPythonScript, stopPythonScript } from '../python/index.js';
import { hasActiveBrowserPythonRun } from '../python/browser-runtime.js';
import { resetRuntimeStatePreservePose } from '../core/state.js';
import { selectDrone } from './mini2-drone.js';

export type SwarmNeighbour = { code?: string };

/** Дроны, добавленные миссиями роя, по порядку создания. */
const missionDrones: string[] = [];

const alive = () => missionDrones.filter((id) => drones[id]);

function addMini2(): string | null {
    const before = new Set(Object.keys(drones));
    document.getElementById('add-mini2-btn')?.click();
    return Object.keys(drones).find((id) => !before.has(id)) ?? null;
}

function removeDrone(id: string): void {
    const row = document.querySelector<HTMLElement>(`.pk-row[data-drone-id="${CSS.escape(id)}"]`);
    row?.querySelector<HTMLElement>('[data-action="delete"]')?.click();
    row?.querySelector<HTMLElement>('[data-action="delete-confirm"]')?.click();
    const again = document.querySelector<HTMLElement>(`.pk-row[data-drone-id="${CSS.escape(id)}"]`);
    again?.querySelector<HTMLElement>('[data-action="delete-confirm"]')?.click();
}

/**
 * Приводит число дронов-соседей, созданных миссиями, к `count` и оставляет выбранным дрон ученика.
 * Возвращает, получилось ли (без панели «Рой», например в тестах, — нет).
 */
export function syncSwarmNeighbours(count: number): boolean {
    const student = currentDroneId;
    // Дрон, выбранный учеником, соседом быть не может (бывает, когда миссия выбрала для него уже стоявший на сцене дрон).
    const own = missionDrones.indexOf(student);
    if (own >= 0) missionDrones.splice(own, 1);
    for (let guard = 0; alive().length < count && guard < count + 2; guard += 1) {
        const id = addMini2();
        if (!id) break;
        missionDrones.push(id);
    }
    // Лишних, созданных ранее миссиями, убираем: список соседей должен совпадать с тем, что описывает миссия.
    for (const id of alive().slice(count)) removeDrone(id);
    for (let index = missionDrones.length - 1; index >= 0; index -= 1) if (!drones[missionDrones[index]]) missionDrones.splice(index, 1);
    if (drones[student] && currentDroneId !== student) selectDrone(student);
    return alive().length >= count;
}

/** Запускает программы соседей (по порядку созданных миссией дронов) и даёт им начать до программы ученика. */
export async function startNeighbourPrograms(neighbours: SwarmNeighbour[]): Promise<void> {
    const ids = alive();
    let started = 0;
    for (let index = 0; index < neighbours.length; index += 1) {
        const code = neighbours[index].code;
        const drone = drones[ids[index]];
        if (!code || !drone || drone.id === currentDroneId) continue;
        drone.pythonScript = code;
        stopPythonScript(drone.id);
        // Прошлая программа соседа закрывает его объекты роя в конце: новая должна стартовать после неё, а не вместе.
        for (let wait = 0; wait < 60 && hasActiveBrowserPythonRun(drone.id); wait += 1) await new Promise((resolve) => window.setTimeout(resolve, 50));
        resetRuntimeStatePreservePose(drone.id);
        drone.running = true;
        drone.status = 'РАБОТАЕТ';
        try {
            await runPythonScript(drone.id, code);
            started += 1;
            // Следующая программа стартует после того, как эта создала свои объекты Pioneer и PioneerSwarmUnit.
            await new Promise((resolve) => window.setTimeout(resolve, 150));
        } catch (error) {
            drone.running = false;
            drone.status = 'ОШИБКА';
            console.error('[learning] swarm neighbour', error);
        }
    }
    // Программа соседа создаёт объекты Pioneer и PioneerSwarmUnit в первых строках: даём им отработать, пока дрон ученика не стартовал.
    if (started) await new Promise((resolve) => window.setTimeout(resolve, 400));
}
