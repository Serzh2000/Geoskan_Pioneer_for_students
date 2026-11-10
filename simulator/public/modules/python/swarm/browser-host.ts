import { ensurePyodide } from '../pyodide-loader.js';
import { SwarmRegistry, type SwarmHost } from './registry.js';

/*
 * Хост реестра роя для браузера: вызывает _swarm_registry.dispatch в Pyodide. Загрузчик (swarm/prelude.ts)
 * подтягивает эмуляцию при первом import, так что консоль не требует запущенной программы.
 */
export function createBrowserSwarmHost(): SwarmHost {
    return {
        async call(fn, args) {
            const pyodide = await ensurePyodide();
            const registry = pyodide.pyimport('_swarm_registry');
            try {
                const reply = await registry.dispatch(fn, JSON.stringify(args));
                return JSON.parse(String(reply));
            } finally {
                registry.destroy?.();
            }
        }
    };
}

/** Реестр роя для консоли: `createSwarmRegistry(currentDroneId)`. */
export function createSwarmRegistry(droneId: string): SwarmRegistry {
    return new SwarmRegistry(createBrowserSwarmHost(), droneId);
}
