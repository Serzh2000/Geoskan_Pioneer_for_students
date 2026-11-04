/**
 * Режим приложения: стартовый экран, свободный режим, режим обучения.
 * Выбранный режим запоминается; состояние отражается на <body data-app-mode>, чтобы стили могли прятать
 * лишнее (в обучении нет окна «Учебник»).
 */
export type AppMode = 'start' | 'free' | 'learning';

export const APP_MODE_STORAGE_KEY = 'pioneer:app-mode:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type Listener = (mode: AppMode, previous: AppMode) => void;

let current: AppMode = 'start';
const listeners = new Set<Listener>();

export function getAppMode(): AppMode {
    return current;
}

/** Последний выбранный режим (free | learning); null — выбора ещё не было. */
export function loadLastMode(storage: StorageLike | null): 'free' | 'learning' | null {
    try {
        const value = storage?.getItem(APP_MODE_STORAGE_KEY);
        return value === 'free' || value === 'learning' ? value : null;
    } catch {
        return null;
    }
}

export function saveLastMode(storage: StorageLike | null, mode: 'free' | 'learning'): void {
    try {
        storage?.setItem(APP_MODE_STORAGE_KEY, mode);
    } catch {
        // Без хранилища выбор живёт до перезагрузки.
    }
}

export function onAppModeChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setAppMode(mode: AppMode, storage: StorageLike | null = null): void {
    if (mode === current) return;
    const previous = current;
    current = mode;
    if (mode !== 'start') saveLastMode(storage, mode);
    if (typeof document !== 'undefined') document.body.dataset.appMode = mode;
    listeners.forEach((listener) => listener(mode, previous));
}
