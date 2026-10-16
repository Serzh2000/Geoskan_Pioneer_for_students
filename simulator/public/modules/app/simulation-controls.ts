type SimulationControlHandlers = {
    start: () => void | Promise<void>;
    stop: () => void;
    reset: () => void;
};

let registeredHandlers: SimulationControlHandlers | null = null;

export function configureSimulationControls(handlers: SimulationControlHandlers): void {
    registeredHandlers = handlers;
}

export async function restartAndRunSimulation(): Promise<void> {
    if (!registeredHandlers) {
        console.warn('[SimulationControls] Handlers are not configured yet.');
        return;
    }

    registeredHandlers.reset();
    await registeredHandlers.start();
}

export function resetSimulationState(): void {
    if (!registeredHandlers) {
        console.warn('[SimulationControls] Handlers are not configured yet.');
        return;
    }

    registeredHandlers.reset();
}
