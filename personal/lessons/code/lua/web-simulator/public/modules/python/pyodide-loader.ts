import { log } from '../shared/logging/logger.js';
import { installPioneerSdkModule } from './pioneer-sdk-module.js';

let pyodideInstance: any = null;
let pyodideLoadPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.async = true;
        el.onload = () => resolve();
        el.onerror = (e) => reject(e);
        document.head.appendChild(el);
    });
}

export async function ensurePyodide(): Promise<any> {
    if (pyodideInstance) return pyodideInstance;
    if (pyodideLoadPromise) return pyodideLoadPromise;

    pyodideLoadPromise = (async () => {
        log('[Python] Загрузка рантайма (Pyodide)...', 'info');
        const pyodideUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/';

        if (!(window as any).loadPyodide) {
            await loadScript(pyodideUrl);
        }

        const loadPyodide = (window as any).loadPyodide;
        pyodideInstance = await loadPyodide({ indexURL });
        await installPioneerSdkModule(pyodideInstance);

        log('[Python] Рантайм готов.', 'success');
        return pyodideInstance;
    })();

    return pyodideLoadPromise;
}
