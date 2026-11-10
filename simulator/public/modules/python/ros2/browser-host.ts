import { ensurePyodide } from '../pyodide-loader.js';
import { Ros2Registry, type Ros2Host, type Ros2RegistryOptions } from './registry.js';

/*
 * Хост реестра ROS 2 для браузера: вызывает _ros2_registry.dispatch в Pyodide. Загрузчик ROS 2
 * (prelude.ts) подтягивает эмуляцию при первом import, так что консоль не требует запущенной программы.
 */
export function createBrowserRos2Host(): Ros2Host {
    return {
        async call(fn, args) {
            const pyodide = await ensurePyodide();
            const registry = pyodide.pyimport('_ros2_registry');
            try {
                const reply = await registry.dispatch(fn, JSON.stringify(args));
                return JSON.parse(String(reply));
            } finally {
                registry.destroy?.();
            }
        }
    };
}

/** Реестр ROS 2 дрона для консоли: `createRos2Registry(currentDroneId)`. */
export function createRos2Registry(droneId: string, options?: Ros2RegistryOptions): Ros2Registry {
    return new Ros2Registry(createBrowserRos2Host(), droneId, options);
}
