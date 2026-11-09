/*
 * Явный переключатель «Базовый / Мини 2» в шапке редактора. Модель решает,
 * какие языки и какая Python-библиотека доступны (pioneer_sdk или
 * pioneer_sdk2), поэтому её видно там, где пишут код, а не только в панели
 * «Рой». Саму смену делает менеджер дронов: переключатель шлёт запрос
 * `drone-model-request` и перерисовывается по `drone-model-changed`.
 */
import { currentDroneId, drones } from '../../core/state.js';
import { DRONE_MODELS, droneModelProfile, type DroneModelId } from '../../core/drone-models.js';

export const DRONE_MODEL_REQUEST_EVENT = 'drone-model-request';
export const DRONE_MODEL_CHANGED_EVENT = 'drone-model-changed';

export function initEditorModelSwitch(): void {
    const seg = document.getElementById('editor-model-seg');
    if (!seg) return;

    const render = () => {
        const drone = drones[currentDroneId];
        const model = droneModelProfile(drone?.model).id;
        seg.querySelectorAll<HTMLButtonElement>('[data-editor-drone-model]').forEach((button) => {
            const active = button.dataset.editorDroneModel === model;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-checked', active ? 'true' : 'false');
            // Во время полёта модель не меняют: сначала остановите программу.
            button.disabled = !drone || (!active && drone.running);
            if (!active && drone?.running) button.title = 'Остановите программу, чтобы сменить модель';
        });
        seg.dataset.model = model;
    };

    seg.addEventListener('click', (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-editor-drone-model]');
        const model = button?.dataset.editorDroneModel;
        if (!button || button.disabled || !model || !(model in DRONE_MODELS)) return;
        window.dispatchEvent(new CustomEvent<{ model: DroneModelId }>(DRONE_MODEL_REQUEST_EVENT, { detail: { model: model as DroneModelId } }));
    });

    window.addEventListener(DRONE_MODEL_CHANGED_EVENT, render);
    render();
}
