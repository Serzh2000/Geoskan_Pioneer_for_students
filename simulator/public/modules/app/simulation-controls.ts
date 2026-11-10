type SimulationControlHandlers = {
    start: () => void | Promise<void>;
    stop: () => void;
    reset: () => void;
};

let registeredHandlers: SimulationControlHandlers | null = null;

export function configureSimulationControls(handlers: SimulationControlHandlers): void {
    registeredHandlers = handlers;
}

/** Между сбросом и запуском выбранного дрона: режим обучения запускает здесь программы дронов-соседей (миссии роя). */
let beforeStartHook: (() => Promise<void> | void) | null = null;

export function setBeforeStartHook(hook: (() => Promise<void> | void) | null): void {
    beforeStartHook = hook;
}

export async function restartAndRunSimulation(): Promise<void> {
    if (!registeredHandlers) {
        console.warn('[SimulationControls] Handlers are not configured yet.');
        return;
    }

    registeredHandlers.reset();
    try { await beforeStartHook?.(); } catch (error) { console.error('[SimulationControls] before-start hook failed', error); }
    await registeredHandlers.start();
}
