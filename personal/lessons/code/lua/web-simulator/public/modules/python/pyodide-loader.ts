import { log } from '../shared/logging/logger.js';
import { installPioneerSdkModule } from './pioneer-sdk-module.js';

let pyodideInstance: any = null;
let pyodideLoadPromise: Promise<any> | null = null;
let numpyLoadPromise: Promise<boolean> | null = null;

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

// numpy — это несколько мегабайт wasm-пакета, поэтому он не входит в стартовую загрузку
// рантайма: тянем его только под скрипты, которым он реально нужен (кадры камеры), и один
// раз на страницу. Недоступность numpy не должна ронять скрипт — Camera.get_cv_frame умеет
// отдать те же пиксели своим классом, поэтому наружу уходит просто false.
export async function ensureNumpyLoaded(): Promise<boolean> {
    if (numpyLoadPromise) return numpyLoadPromise;

    numpyLoadPromise = (async () => {
        const pyodide = await ensurePyodide();
        try {
            log('[Python] Загрузка numpy для кадров камеры...', 'info');
            await pyodide.loadPackage('numpy');
            log('[Python] numpy готов.', 'success');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log(`[Python] numpy недоступен (${message}), кадр камеры будет в упрощённом формате.`, 'warn');
            numpyLoadPromise = null;
            return false;
        }
    })();

    return numpyLoadPromise;
}
