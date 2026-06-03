/* eslint-disable @typescript-eslint/no-explicit-any */
import { drones } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import { installPioneerSdkModule } from './pioneer-sdk-module.js';
import { cancelledRuns, lastManualSpeedUpdateMs, localOriginByDrone } from './runtime-shared.js';
import { createScriptFailureError, showScriptFailureNotice } from '../app/script-execution-notice.js';

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

async function ensurePyodide(): Promise<any> {
    if (pyodideInstance) return pyodideInstance;
    if (pyodideLoadPromise) return pyodideLoadPromise;

    pyodideLoadPromise = (async () => {
        log('[Python] Загрузка рантайма (Pyodide)...', 'info');
        // Загружаем Pyodide с CDN.
        // Важно: в нашем проекте нет статического bundling для WASM, поэтому используем script tag.
        const pyodideUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/';

        // Уже мог быть загружен.
        if (!(window as any).loadPyodide) {
            await loadScript(pyodideUrl);
        }

        const loadPyodide = (window as any).loadPyodide;
        pyodideInstance = await loadPyodide({ indexURL });

        // Определяем JS<->Python bridge: pioneer_sdk (минимальный набор).
        // Модуль должен существовать до выполнения пользовательского кода.
        await installPioneerSdkModule(pyodideInstance);

        log('[Python] Рантайм готов.', 'success');
        return pyodideInstance;
    })();

    return pyodideLoadPromise;
}
type ActivePythonRun = {
    promise: Promise<any>;
};

const activeRuns: Record<string, ActivePythonRun> = {};

async function validatePythonSyntax(pyodide: any, code: string): Promise<void> {
    const payloadJson = pyodide.runPython(`
import json
source = ${JSON.stringify(code)}
try:
    compile(source, "<user-script>", "exec")
    json.dumps({"ok": True})
except SyntaxError as e:
    json.dumps({
        "ok": False,
        "message": e.msg or "invalid syntax",
        "line": e.lineno,
        "column": e.offset,
        "details": (e.text or "").strip()
    })
`);
    const payload = JSON.parse(String(payloadJson));
    if (payload?.ok) return;

    throw createScriptFailureError('syntax', payload?.message || 'invalid syntax', {
        line: typeof payload?.line === 'number' ? payload.line : null,
        column: typeof payload?.column === 'number' ? payload.column : null,
        details: payload?.details || null
    });
}

export async function initPythonRuntime(): Promise<void> {
    await ensurePyodide();
}

export async function runPythonScript(droneId: string, code: string): Promise<void> {
    const pyodide = await ensurePyodide();
    if (!drones[droneId]) return;

    cancelledRuns[droneId] = false;
    lastManualSpeedUpdateMs[droneId] = 0;
    localOriginByDrone[droneId] = { x: drones[droneId].pos.x, y: drones[droneId].pos.y, z: drones[droneId].pos.z };

    (window as any).SIM_DRONE_ID = droneId;

    const normalizedUserCode = (code || '')
        .replace(/\r\n/g, '\n');

    await validatePythonSyntax(pyodide, normalizedUserCode);

    // Минимальная трансформация под web-runtime:
    // - запускаем код внутри async функции
    // - заменяем time.sleep(x) -> await asyncio.sleep(x)
    // Это позволяет не "убивать" UI, т.к. sleep становится кооперативным.
    const transformedUserCode = normalizedUserCode
        .replace(/\btime\.sleep\s*\(/g, 'await asyncio.sleep(');

    const indentedUserCode = transformedUserCode
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');

    // Исполняем в async контексте, чтобы await asyncio.sleep(...) работал.
    const wrapped = `
import asyncio, builtins, js

__sim_original_print = builtins.print

def __sim_print(*args, **kwargs):
    sep = kwargs.get("sep", " ")
    end = kwargs.get("end", "\\n")
    text = sep.join(str(arg) for arg in args)
    if end and end != "\\n":
        text += end.rstrip("\\n")
    js.pioneer_print(js.SIM_DRONE_ID, text)
    return __sim_original_print(*args, **kwargs)

builtins.print = __sim_print

async def __user_main():
${indentedUserCode}

try:
    await __user_main()
except Exception as e:
    # Если нас остановили — молча выходим.
    if str(e).find('PYTHON_CANCELLED') >= 0:
        pass
    else:
        raise
`;

    const promise = pyodide.runPythonAsync(wrapped);
    activeRuns[droneId] = { promise };

    promise.then(() => {
        if (activeRuns[droneId]) {
            drones[droneId].running = false;
        }
    }).catch((e: any) => {
        // Если пользователь нажал Stop — JS bridge выбросит PYTHON_CANCELLED.
        const msg = e instanceof Error ? e.message : String(e);
        log(`Python run error (${droneId}): ${msg}`, 'error');
        if (msg.includes('PYTHON_CANCELLED')) {
            return;
        }
        if (drones[droneId]) {
            drones[droneId].running = false;
            drones[droneId].status = 'ОШИБКА';
        }
        showScriptFailureNotice('python', createScriptFailureError('runtime', msg));
    });
}

export function stopPythonScript(droneId: string): void {
    cancelledRuns[droneId] = true;
    const d = drones[droneId];
    if (d) {
        d.running = false;
        d.status = 'ОСТАНОВЛЕН';
        d.pendingLocalPoint = false;
        d.pointReachedFlag = false;
    }
}

