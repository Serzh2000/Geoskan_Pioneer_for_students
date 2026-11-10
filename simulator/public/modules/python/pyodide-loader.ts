import { log } from '../shared/logging/logger.js';
import { installPioneerSdkModule } from './pioneer-sdk-module.js';

let pyodideInstance: any = null;
let pyodideLoadPromise: Promise<any> | null = null;
let numpyLoadPromise: Promise<boolean> | null = null;

/** Рантайм Python уже загружен: первый запуск программы тянет Pyodide (десятки мегабайт) и занимает до минуты. */
export const isPyodideReady = (): boolean => pyodideInstance !== null;

export async function ensurePyodide(): Promise<any> {
    if (pyodideInstance) return pyodideInstance;
    if (pyodideLoadPromise) return pyodideLoadPromise;

    pyodideLoadPromise = (async () => {
        log('[Python] Загрузка рантайма (Pyodide)...', 'info');
        // Сначала своя копия рядом с приложением (public/vendor/pyodide, её кладёт scripts/fetch-pyodide.cjs): работает без
        // интернета и быстрее. Если её нет или она не открылась, берём CDN.
        const sources = [
            new URL('vendor/pyodide/', document.baseURI).href,
            'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
        ];
        let lastError: unknown = null;
        for (const indexURL of sources) {
            try {
                // ES-модуль, а не тег script: dev-сервер Vite дописывает в классические .js из public свой import и ломает их.
                const { loadPyodide } = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`);
                if (typeof loadPyodide !== 'function') throw new Error(`${indexURL}pyodide.mjs не загрузился`);
                pyodideInstance = await loadPyodide({ indexURL });
                break;
            } catch (error) {
                lastError = error;
                console.warn(`[Python] Источник ${indexURL} недоступен, пробую следующий.`, error);
            }
        }
        if (!pyodideInstance) throw lastError instanceof Error ? lastError : new Error('Pyodide недоступен');

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
