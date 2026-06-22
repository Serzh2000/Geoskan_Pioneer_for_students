import { drones } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import { installPioneerSdkModule } from './pioneer-sdk-module.js';
import { disposeLocalPythonRunState, runLocalPythonScript, stopLocalPythonScript } from './local-runtime.js';
import {
    cancelledRuns,
    cleanupPythonRuntimeState,
    lastManualSpeedUpdateMs,
    localOriginByDrone,
    resetPythonDroneBindings
} from './runtime-shared.js';
import { createScriptFailureError, showScriptFailureNotice } from '../app/script-execution-notice.js';
import { ensureDronePythonConnectionSettings } from '../core/state.js';

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
    token: symbol;
    promise: Promise<any>;
};

const activeRuns: Record<string, ActivePythonRun> = {};

function clearActivePythonRun(droneId: string, token?: symbol) {
    const activeRun = activeRuns[droneId];
    if (!activeRun) return;
    if (token && activeRun.token !== token) return;
    delete activeRuns[droneId];
}

export function disposePythonRunState(droneId: string): void {
    clearActivePythonRun(droneId);
    disposeLocalPythonRunState(droneId);
    cleanupPythonRuntimeState(droneId);
}

async function validatePythonSyntax(pyodide: any, code: string): Promise<void> {
    const payloadJson = pyodide.runPython(`
import json
source = ${JSON.stringify(code)}
try:
    compile(source, "<user-script>", "exec")
    __sim_validation_result = json.dumps({"ok": True})
except SyntaxError as e:
    __sim_validation_result = json.dumps({
        "ok": False,
        "message": e.msg or "invalid syntax",
        "line": e.lineno,
        "column": e.offset,
        "details": (e.text or "").strip()
    })
__sim_validation_result
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
    const connection = ensureDronePythonConnectionSettings(droneId);
    if (connection.executionTarget === 'local') {
        await runLocalPythonScript(droneId, code);
        return;
    }

    const pyodide = await ensurePyodide();
    if (!drones[droneId]) return;

    cancelledRuns[droneId] = false;
    lastManualSpeedUpdateMs[droneId] = 0;
    localOriginByDrone[droneId] = { x: drones[droneId].pos.x, y: drones[droneId].pos.y, z: drones[droneId].pos.z };
    resetPythonDroneBindings(droneId);

    (window as any).SIM_DRONE_ID = droneId;

    const normalizedUserCode = (code || '')
        .replace(/\r\n/g, '\n');

    await validatePythonSyntax(pyodide, normalizedUserCode);

    const wrapped = `
import ast, asyncio, builtins, js

if not hasattr(builtins, "__sim_base_print"):
    builtins.__sim_base_print = builtins.print
if not hasattr(builtins, "__sim_base_input"):
    builtins.__sim_base_input = builtins.input

def __sim_print(*args, **kwargs):
    sep = kwargs.get("sep", " ")
    end = kwargs.get("end", "\\n")
    text = sep.join(str(arg) for arg in args)
    if end and end != "\\n":
        text += end.rstrip("\\n")
    js.pioneer_print(js.SIM_DRONE_ID, text)
    return builtins.__sim_base_print(*args, **kwargs)

def __sim_input(prompt=""):
    return js.pioneer_input(prompt)

builtins.print = __sim_print
builtins.input = __sim_input

__sim_source = ${JSON.stringify(normalizedUserCode)}

class __SimAsyncify(ast.NodeTransformer):
    def __init__(self):
        self.user_functions = set()
        self.user_methods = set()
        self.awaitable_attrs = {"start", "join", "wait", "stop"}

    def collect(self, tree):
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.user_functions.add(node.name)
            elif isinstance(node, ast.ClassDef):
                for part in node.body:
                    if isinstance(part, (ast.FunctionDef, ast.AsyncFunctionDef)) and part.name != "__init__":
                        self.user_methods.add(part.name)

    def visit_FunctionDef(self, node):
        node = self.generic_visit(node)
        if node.name == "__init__":
            return node
        return ast.AsyncFunctionDef(
            name=node.name,
            args=node.args,
            body=node.body,
            decorator_list=node.decorator_list,
            returns=node.returns,
            type_comment=node.type_comment,
            type_params=getattr(node, "type_params", [])
        )

    def visit_While(self, node):
        node = self.generic_visit(node)
        node.body.insert(0, ast.Expr(
            value=ast.Await(
                value=ast.Call(
                    func=ast.Attribute(value=ast.Name(id="asyncio", ctx=ast.Load()), attr="sleep", ctx=ast.Load()),
                    args=[ast.Constant(value=0.001)],
                    keywords=[]
                )
            )
        ))
        return node

    def visit_Call(self, node):
        if (
            isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "time"
            and node.func.attr == "sleep"
        ):
            awaited_sleep = ast.Call(
                func=ast.Attribute(value=ast.Name(id="asyncio", ctx=ast.Load()), attr="sleep", ctx=ast.Load()),
                args=[self.visit(arg) for arg in node.args],
                keywords=[ast.keyword(arg=kw.arg, value=self.visit(kw.value)) for kw in node.keywords]
            )
            return ast.Await(value=awaited_sleep)

        node = self.generic_visit(node)
        should_await = False
        if isinstance(node.func, ast.Name) and node.func.id in self.user_functions:
            should_await = True
        elif isinstance(node.func, ast.Attribute) and (
            node.func.attr in self.user_methods
            or node.func.attr in self.awaitable_attrs
        ):
            should_await = True

        if should_await:
            return ast.Await(value=node)
        return node

__sim_tree = ast.parse(__sim_source, "<user-script>", "exec")
__sim_transformer = __SimAsyncify()
__sim_transformer.collect(__sim_tree)
__sim_body = __sim_transformer.visit(__sim_tree).body
__sim_module = ast.Module(
    body=[
        ast.AsyncFunctionDef(
            name="__user_main",
            args=ast.arguments(posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]),
            body=__sim_body if __sim_body else [ast.Pass()],
            decorator_list=[]
        )
    ],
    type_ignores=[]
)
ast.fix_missing_locations(__sim_module)
exec(compile(__sim_module, "<user-script>", "exec"), globals(), globals())

try:
    await __user_main()
except Exception as e:
    # Если нас остановили — молча выходим.
    if str(e).find('PYTHON_CANCELLED') >= 0:
        pass
    else:
        raise
finally:
    builtins.print = builtins.__sim_base_print
    builtins.input = builtins.__sim_base_input
`;

    const promise = pyodide.runPythonAsync(wrapped);
    const token = Symbol(`python-run:${droneId}`);
    activeRuns[droneId] = { token, promise };

    promise.then(() => {
        if (activeRuns[droneId]?.token === token && drones[droneId]) {
            drones[droneId].running = false;
        }
        clearActivePythonRun(droneId, token);
    }).catch((e: any) => {
        // Если пользователь нажал Stop — JS bridge выбросит PYTHON_CANCELLED.
        const msg = e instanceof Error ? e.message : String(e);
        log(`Python run error (${droneId}): ${msg}`, 'error');
        if (msg.includes('PYTHON_CANCELLED')) {
            clearActivePythonRun(droneId, token);
            return;
        }
        if (activeRuns[droneId]?.token === token && drones[droneId]) {
            drones[droneId].running = false;
            drones[droneId].status = 'ОШИБКА';
        }
        clearActivePythonRun(droneId, token);
        showScriptFailureNotice('python', createScriptFailureError('runtime', msg));
    });
}

export function stopPythonScript(droneId: string): void {
    const connection = ensureDronePythonConnectionSettings(droneId);
    if (connection.executionTarget === 'local') {
        stopLocalPythonScript(droneId);
        const drone = drones[droneId];
        if (drone) {
            drone.running = false;
            drone.status = 'ОСТАНОВЛЕН';
            drone.pendingLocalPoint = false;
            drone.pendingLocalPointSource = null;
            drone.pendingLocalPointTarget = null;
            drone.pointReachedFlag = false;
        }
        return;
    }

    const hasActiveRun = Boolean(activeRuns[droneId]);
    cancelledRuns[droneId] = true;
    const d = drones[droneId];
    if (d) {
        d.running = false;
        d.status = 'ОСТАНОВЛЕН';
        d.pendingLocalPoint = false;
        d.pendingLocalPointSource = null;
        d.pendingLocalPointTarget = null;
        d.pointReachedFlag = false;
    }
    if (!hasActiveRun) {
        disposePythonRunState(droneId);
    }
}

