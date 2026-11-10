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
import { droneModelProfile, droneSdk } from '../core/drone-models.js';

// Программа с rclpy: раннер доучивает spin / call / Rate.sleep ждать (см. __SimAsyncify ниже).
const ROS2_SOURCE = /^[ \t]*(?:from|import)[ \t]+rclpy\b/m;

// get_cv_frame собирает настоящий numpy-массив, но подгрузить пакет можно только из async-кода,
// а сам вызов в скрипте синхронный. Поэтому решение принимается по исходнику до запуска.

const NUMPY_DEPENDENT_SOURCE = /\bnumpy\b|\bget_cv_frame\b|\bpioneer_rknn\b/;

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
const SDK_IMPORT = /^[ \t]*(?:from|import)[ \t]+(pioneer_sdk2?|pioneer_rknn|pioneer_swarm|rclpy|std_msgs|std_srvs|geometry_msgs|sensor_msgs|builtin_interfaces|gs_interfaces|gs_core)\b/gm;
// ROS 2 (rclpy и пакеты сообщений gs_core) - часть pioneer_sdk2: доступен там же, где SDK2.
const ROS2_LIBRARIES = new Set(['rclpy', 'std_msgs', 'std_srvs', 'geometry_msgs', 'sensor_msgs', 'builtin_interfaces', 'gs_interfaces', 'gs_core']);

export function checkPythonSdkForDrone(droneId: string, code: string): void {
    const profile = droneModelProfile(drones[droneId]?.model);
    const sdk = droneSdk(drones[droneId]);
    for (const match of code.matchAll(SDK_IMPORT)) {
        const library = match[1];
        // pioneer_rknn (нейросети на борту) идёт в комплекте с pioneer_sdk2 и есть только у Мини 2.
        const isRos2 = ROS2_LIBRARIES.has(library);
        // Swarm Kit (pioneer_swarm) - тоже часть SDK2: swarm-server есть на Мини 2 и на Базовом с Radxa.
        const isSwarm = library === 'pioneer_swarm';
        const allowed = isRos2 || isSwarm
            ? sdk === 'pioneer_sdk2'
            : library === 'pioneer_rknn'
                ? sdk === 'pioneer_sdk2' && profile.id === 'pioneer-mini2'
                : library === sdk;
        if (allowed) continue;
        const line = code.slice(0, match.index ?? 0).split('\n').length;
        const message = isSwarm
            ? `Для дрона «${drones[droneId]?.name ?? profile.title}» выбран язык «Python · SDK1», а в программе pioneer_swarm (Swarm Kit). `
                + 'Рой Swarm Kit входит в «Python · SDK2»: выберите его в панели «Рой» (у Пионера Базового для этого нужна Radxa Zero 3W).'
            : isRos2
            ? `Для дрона «${drones[droneId]?.name ?? profile.title}» выбран язык «Python · SDK1», а в программе ${library} (ROS 2). `
                + 'ROS 2 входит в «Python · SDK2»: выберите его в панели «Рой» (у Пионера Базового для этого нужна Radxa Zero 3W) или используйте pioneer_sdk.'
            : library === 'pioneer_rknn'
            ? `pioneer_rknn - библиотека Пионера Мини 2 (нейросети на борту). Для дрона «${profile.title}» её нет: добавьте дрон «Пионер Мини 2» на панели «Рой».`
            : `Для дрона «${drones[droneId]?.name ?? profile.title}» выбран язык «Python · ${sdk === 'pioneer_sdk2' ? 'SDK2' : 'SDK1'}», а в программе ${library}. `
                + `Подключите ${sdk}: from ${sdk} import Pioneer - или выберите другой язык в панели «Рой».`;
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

let runSerial = 0;

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

    // Имена с номером запуска: глобальные переменные Pyodide общие, а программы нескольких дронов идут одновременно.
    const tasksName = `__sim_tasks_${++runSerial}`;
    const usesRos2 = ROS2_SOURCE.test(normalizedUserCode);
    const wrapped = `
import ast, asyncio, builtins, inspect, js, sys

# Дрон этой программы: до первого ожидания (там создаются Pioneer() и PioneerSwarmUnit()) идёт тот же участок кода,
# поэтому программа другого дрона, запущенная следом, не подменит идентификатор.
js.SIM_DRONE_ID = ${JSON.stringify(droneId)}

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
    # Печать идёт на дрон своей программы (а не на тот, что запущен последним): так рядом работают программы нескольких дронов.
    __sim_frame = sys._getframe(1)
    __sim_owner = None
    while __sim_frame is not None and not __sim_owner:
        __sim_owner = __sim_frame.f_globals.get("__sim_drone_id")
        __sim_frame = __sim_frame.f_back
    js.pioneer_print(__sim_owner or js.SIM_DRONE_ID, text)
    return builtins.__sim_base_print(*args, **kwargs)

def __sim_input(prompt=""):
    return js.pioneer_input(prompt)

builtins.print = __sim_print
builtins.input = __sim_input
# Свой список фоновых задач: когда рядом работают программы нескольких дронов, конец одной не должен гасить задачи другой.
${tasksName} = []
builtins.__sim_bg_tasks = ${tasksName}

async def __sim_await(value):
    # arm/takeoff/land/get_cv_frame: у pioneer_sdk2 они ждут события автопилота
    # или следующего кадра (корутина), у pioneer_sdk возвращают результат сразу.
    if inspect.isawaitable(value):
        return await value
    return value

__sim_source = ${JSON.stringify(normalizedUserCode)}
__sim_ros = ${usesRos2 ? 'True' : 'False'}

class __SimAsyncify(ast.NodeTransformer):
    def __init__(self):
        self.user_functions = set()
        self.user_methods = set()
        # Функции без ожиданий внутри остаются обычными: их зовут из lambda и генераторов списков
        # (там await недопустим), например вспомогательные функции блоков Bricks.
        self.sync_functions = set()
        # from time import sleep: sleep(1) без префикса time.
        self.sleep_names = set()
        self.awaitable_attrs = {"start", "join", "wait", "stop"}
        # get_telemetry_from_unit (pioneer_swarm) ждёт телеметрию соседа в симулируемом времени.
        self.maybe_awaitable_attrs = {"arm", "takeoff", "land", "get_cv_frame", "get_telemetry_from_unit"}
        if globals().get("__sim_ros"):
            # rclpy: spin*, ожидание сервиса, синхронный call, Rate.sleep и Clock.sleep_for ждут время симуляции.
            self.maybe_awaitable_attrs |= {"spin", "spin_once", "spin_some", "spin_until_future_complete", "wait_for_service", "call", "sleep", "sleep_for"}

    def collect(self, tree):
        functions = {}
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.user_functions.add(node.name)
                functions[node.name] = node
            elif isinstance(node, ast.ClassDef):
                for part in node.body:
                    if isinstance(part, (ast.FunctionDef, ast.AsyncFunctionDef)) and part.name != "__init__":
                        self.user_methods.add(part.name)
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module == "time":
                for alias in node.names:
                    if alias.name == "sleep":
                        self.sleep_names.add(alias.asname or alias.name)
        awaiting = set(name for name, node in functions.items() if isinstance(node, ast.AsyncFunctionDef))
        changed = True
        while changed:
            changed = False
            for name, node in functions.items():
                if name not in awaiting and self.needs_async(node, awaiting):
                    awaiting.add(name)
                    changed = True
        self.sync_functions = set(functions) - awaiting
        self.user_functions -= self.sync_functions

    def is_str_receiver(self, node):
        return isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Constant)

    def needs_async(self, function, awaiting):
        for node in ast.walk(function):
            if isinstance(node, ast.While):
                return True
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            if isinstance(func, ast.Name) and (func.id in self.sleep_names or func.id in awaiting):
                return True
            if isinstance(func, ast.Attribute) and not self.is_str_receiver(node):
                if isinstance(func.value, ast.Name) and func.value.id == "time" and func.attr == "sleep":
                    return True
                if func.attr in self.user_methods or func.attr in self.awaitable_attrs or func.attr in self.maybe_awaitable_attrs:
                    return True
        return False

    def visit_FunctionDef(self, node):
        node = self.generic_visit(node)
        if node.name == "__init__" or node.name in self.sync_functions:
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

        if isinstance(node.func, ast.Name) and node.func.id in self.sleep_names:
            return ast.Await(value=ast.Call(
                func=ast.Attribute(value=ast.Name(id="asyncio", ctx=ast.Load()), attr="sleep", ctx=ast.Load()),
                args=[self.visit(arg) for arg in node.args],
                keywords=[ast.keyword(arg=kw.arg, value=self.visit(kw.value)) for kw in node.keywords]
            ))

        node = self.generic_visit(node)
        should_await = False
        if isinstance(node.func, ast.Name) and node.func.id in self.user_functions:
            should_await = True
        elif isinstance(node.func, ast.Attribute) and node.func.attr in self.user_methods:
            should_await = True

        if should_await:
            return ast.Await(value=node)
        # Метод библиотеки может быть и корутиной (Thread.join у SDK), и обычной функцией (str.join):
        # решает __sim_await на месте. Имя с двумя подчёркиваниями на конце: внутри класса
        # (метод ученика) обычное __имя компилятор исказил бы.
        if (
            isinstance(node.func, ast.Attribute)
            and not self.is_str_receiver(node)
            and (node.func.attr in self.awaitable_attrs or node.func.attr in self.maybe_awaitable_attrs)
        ):
            return ast.Await(value=ast.Call(func=ast.Name(id="__sim_await__", ctx=ast.Load()), args=[node], keywords=[]))
        return node

class __SimDropAnnotations(ast.NodeTransformer):
    # \`x: int = 1\` на верхнем уровне нельзя совмещать с \`global x\`: это обычное присваивание.
    # Вложенные функции, классы и lambda не трогаем: у них своя область видимости.
    def visit_FunctionDef(self, node):
        return node

    visit_AsyncFunctionDef = visit_FunctionDef
    visit_ClassDef = visit_FunctionDef
    visit_Lambda = visit_FunctionDef

    def visit_AnnAssign(self, node):
        if not isinstance(node.target, ast.Name):
            return node
        if node.value is None:
            return ast.copy_location(ast.Pass(), node)
        return ast.copy_location(ast.Assign(targets=[node.target], value=node.value), node)

def __sim_load(code_text):
    # Программа выполняется как обычный скрипт: её переменные верхнего уровня - глобальные переменные
    # собственного словаря (так их видит и меняет \`global x\` в функциях и обработчиках событий).
    # Тело программы лежит в корутине __user_main только ради await; все имена, которые оно связывает,
    # объявлены в ней global, поэтому локальных переменных у __user_main нет.
    import symtable
    tree = ast.parse(code_text, "<user-script>", "exec")
    top_names = sorted(
        sym.get_name() for sym in symtable.symtable(code_text, "<user-script>", "exec").get_symbols()
        if sym.is_local() and not sym.get_name().startswith("__sim_")
    )
    tree = __SimDropAnnotations().visit(tree)
    transformer = __SimAsyncify()
    transformer.collect(tree)
    body = transformer.visit(tree).body
    if top_names:
        body.insert(0, ast.Global(names=top_names))
    module = ast.Module(
        body=[
            ast.AsyncFunctionDef(
                name="__user_main",
                args=ast.arguments(posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]),
                body=body if body else [ast.Pass()],
                decorator_list=[]
            )
        ],
        type_ignores=[]
    )
    ast.fix_missing_locations(module)
    # __sim_drone_id: дрон этой программы; по нему pioneer_swarm привязывает юнит, даже если позже стартовала программа другого дрона.
    user_globals = {"__name__": "__main__", "__builtins__": builtins, "asyncio": asyncio, "__sim_await": __sim_await, "__sim_await__": __sim_await,
                    "__sim_drone_id": str(getattr(__import__("sys").modules.get("js"), "SIM_DRONE_ID", ""))}
    exec(compile(module, "<user-script>", "exec"), user_globals)
    return user_globals["__user_main"]

__user_main = __sim_load(__sim_source)
# Счётчик работающих программ: печать и input возвращаются на место, когда кончилась последняя, а не первая из них.
builtins.__sim_runs = getattr(builtins, "__sim_runs", 0) + 1

try:
    await __user_main()
except Exception as e:
    if str(e).find('PYTHON_CANCELLED') >= 0:
        pass
    else:
        raise
finally:
    # Фоновые задачи библиотек (поток событий pioneer_sdk2) живут, пока живёт программа.
    for __sim_task in ${tasksName}:
        __sim_task.cancel()
    if builtins.__sim_bg_tasks is ${tasksName}:
        builtins.__sim_bg_tasks = []
    del ${tasksName}
    if ${usesRos2 ? 'True' : 'False'}:
        # Узлы ученика исчезают вместе с программой; ros_pioneer_node остаётся.
        import sys as __sim_sys
        __sim_rclpy = __sim_sys.modules.get("rclpy")
        if __sim_rclpy is not None:
            __sim_rclpy._sim_cleanup()
    # Объекты PioneerSwarmUnit этой программы закрываются; swarm-server дрона остаётся в сети.
    import sys as __sim_sys_swarm
    __sim_swarm = __sim_sys_swarm.modules.get("pioneer_swarm")
    if __sim_swarm is not None:
        __sim_swarm._sim_cleanup(${JSON.stringify(droneId)})
    builtins.__sim_runs = max(0, builtins.__sim_runs - 1)
    if builtins.__sim_runs == 0:
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
