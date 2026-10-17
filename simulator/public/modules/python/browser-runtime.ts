import { drones } from '../core/state.js';
import { markLearningRunStarted } from '../core/learning-journal.js';
import { log } from '../shared/logging/logger.js';
import { createScriptFailureError } from '../app/script-execution-notice.js';
import { emitScriptFailure } from '../core/mission-notices.js';
import { failScriptRun } from '../core/script-failure.js';
import {
    cancelledRuns,
    cleanupPythonRuntimeState,
    lastManualSpeedUpdateMs,
    resetPythonDroneBindings
} from './runtime-shared.js';
import { ensureNumpyLoaded, ensurePyodide } from './pyodide-loader.js';
import { droneModelProfile } from '../core/drone-models.js';

// get_cv_frame собирает настоящий numpy-массив, но подгрузить пакет можно только из async-кода,
// а сам вызов в скрипте синхронный. Поэтому решение принимается по исходнику до запуска.
const NUMPY_DEPENDENT_SOURCE = /\bnumpy\b|\bget_cv_frame\b/;

type ActivePythonRun = {
    token: symbol;
    promise: Promise<any>;
};

const activeRuns: Record<string, ActivePythonRun> = {};

function clearActivePythonRun(droneId: string, token?: symbol): void {
    const activeRun = activeRuns[droneId];
    if (!activeRun) return;
    if (token && activeRun.token !== token) return;
    delete activeRuns[droneId];
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

// Пионер Мини 2 программируется только через pioneer_sdk2, Базовый - через
// pioneer_sdk. Импорт чужой библиотеки ловится до запуска, с номером строки.
const SDK_IMPORT = /^[ \t]*(?:from|import)[ \t]+(pioneer_sdk2?)\b/gm;

export function checkPythonSdkForDrone(droneId: string, code: string): void {
    const profile = droneModelProfile(drones[droneId]?.model);
    for (const match of code.matchAll(SDK_IMPORT)) {
        const library = match[1];
        if (library === profile.pythonSdk) continue;
        const line = code.slice(0, match.index ?? 0).split('\n').length;
        const message = profile.pythonSdk === 'pioneer_sdk2'
            ? `${profile.title} программируется через pioneer_sdk2: from pioneer_sdk2 import Pioneer`
            : `${library} - библиотека Пионера Мини 2. Для дрона «${profile.title}» используйте pioneer_sdk или добавьте дрон «Пионер Мини 2».`;
        throw createScriptFailureError('runtime', message, { line, column: null, details: match[0].trim() });
    }
}

export function hasActiveBrowserPythonRun(droneId: string): boolean {
    return Boolean(activeRuns[droneId]);
}

export function cancelBrowserPythonRun(droneId: string): void {
    cancelledRuns[droneId] = true;
}

export function disposeBrowserPythonRunState(droneId: string): void {
    clearActivePythonRun(droneId);
    cleanupPythonRuntimeState(droneId);
}

export async function runBrowserPythonScript(droneId: string, code: string): Promise<void> {
    const pyodide = await ensurePyodide();
    if (!drones[droneId]) return;

    cancelledRuns[droneId] = false;
    lastManualSpeedUpdateMs[droneId] = 0;
    resetPythonDroneBindings(droneId);

    (window as any).SIM_DRONE_ID = droneId;

    const normalizedUserCode = (code || '').replace(/\r\n/g, '\n');
    await validatePythonSyntax(pyodide, normalizedUserCode);
    checkPythonSdkForDrone(droneId, normalizedUserCode);

    if (NUMPY_DEPENDENT_SOURCE.test(normalizedUserCode)) {
        await ensureNumpyLoaded();
    }

    const wrapped = `
import ast, asyncio, builtins, inspect, js

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
builtins.__sim_bg_tasks = []

async def __sim_await(value):
    # arm/takeoff/land/get_cv_frame: у pioneer_sdk2 они ждут события автопилота
    # или следующего кадра (корутина), у pioneer_sdk возвращают результат сразу.
    if inspect.isawaitable(value):
        return await value
    return value

__sim_source = ${JSON.stringify(normalizedUserCode)}

class __SimAsyncify(ast.NodeTransformer):
    def __init__(self):
        self.user_functions = set()
        self.user_methods = set()
        self.awaitable_attrs = {"start", "join", "wait", "stop"}
        self.maybe_awaitable_attrs = {"arm", "takeoff", "land", "get_cv_frame"}

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
        if isinstance(node.func, ast.Attribute) and node.func.attr in self.maybe_awaitable_attrs:
            return ast.Await(value=ast.Call(func=ast.Name(id="__sim_await", ctx=ast.Load()), args=[node], keywords=[]))
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
    if str(e).find('PYTHON_CANCELLED') >= 0:
        pass
    else:
        raise
finally:
    # Фоновые задачи библиотек (поток событий pioneer_sdk2) живут, пока живёт программа.
    for __sim_task in builtins.__sim_bg_tasks:
        __sim_task.cancel()
    builtins.__sim_bg_tasks = []
    builtins.print = builtins.__sim_base_print
    builtins.input = builtins.__sim_base_input
`;

    markLearningRunStarted(droneId, drones[droneId].current_time);
    const promise = pyodide.runPythonAsync(wrapped);
    const token = Symbol(`python-run:${droneId}`);
    activeRuns[droneId] = { token, promise };

    promise.then(() => {
        if (activeRuns[droneId]?.token === token && drones[droneId]) {
            drones[droneId].running = false;
        }
        clearActivePythonRun(droneId, token);
    }).catch((e: any) => {
        const msg = e instanceof Error ? e.message : String(e);
        log(`Python run error (${droneId}): ${msg}`, 'info');
        if (msg.includes('PYTHON_CANCELLED')) {
            clearActivePythonRun(droneId, token);
            return;
        }
        const failureError = createScriptFailureError('runtime', msg);
        if (activeRuns[droneId]?.token === token && drones[droneId]) {
            failScriptRun(drones[droneId], 'python', failureError);
        } else {
            emitScriptFailure('python', failureError);
        }
        clearActivePythonRun(droneId, token);
    });
}
