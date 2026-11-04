/**
 * Режим приложения: свободный симулятор или режим обучения.
 * Симулятор всегда открывается свободным; в обучение ведёт кнопка «Обучение» в боковой панели.
 * Состояние отражается на <body data-app-mode>, чтобы стили могли прятать лишнее.
 */
export type AppMode = 'free' | 'learning';

type Listener = (mode: AppMode, previous: AppMode) => void;

let current: AppMode = 'free';
const listeners = new Set<Listener>();

export function getAppMode(): AppMode {
    return current;
}

export function onAppModeChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setAppMode(mode: AppMode): void {
    if (mode === current) return;
    const previous = current;
    current = mode;
    if (typeof document !== 'undefined') document.body.dataset.appMode = mode;
    listeners.forEach((listener) => listener(mode, previous));
}
