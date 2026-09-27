import * as Blockly from 'blockly';

// definitions_ у Blockly-генератора протектед — прямого типа для внешнего
// доступа нет (см. комментарий в blocks/leds.ts).
export function definitionsOf(gen: Blockly.CodeGenerator): Record<string, string> {
    return (gen as unknown as { definitions_: Record<string, string> }).definitions_;
}

export function numberArg(gen: Blockly.CodeGenerator, block: Blockly.Block, name: string, fallback: string): string {
    return gen.valueToCode(block, name, 0) || fallback;
}

// Метка «программе нужен pioneer_sdk 0.6.1 с Pioneer(simulator=True)»:
// get_yaw() и cargo_*() есть только там (GitFlic) и работают только в режиме
// симулятора. Пустая строка в definitions_ в код не попадает (compile.ts
// отбрасывает пустые записи), а по ключу python-runtime.ts решает, как
// создавать Pioneer. Программы без этих блоков остаются совместимы и с
// pioneer_sdk 0.5.3 с PyPI, у которого нет аргумента simulator.
export const PYTHON_SIMULATOR_SDK_KEY = 'pioneer_sdk_simulator';

export function requirePythonSimulatorSdk(gen: Blockly.CodeGenerator): void {
    definitionsOf(gen)[PYTHON_SIMULATOR_SDK_KEY] = '';
}

export function ensurePythonMathImport(gen: Blockly.CodeGenerator): void {
    definitionsOf(gen).import_math = 'import math';
}

// Фоновые задачи Python: «Каждые N сек» и «Через N сек» — это потоки
// (как Timer.new/Timer.callLater в Lua). Конец программы ждёт их всех
// (python-runtime.ts), иначе скрипт завершился бы раньше своих таймеров, а в
// Lua таймеры живут, пока работает скрипт.
export const PYTHON_THREADS_KEY = 'pioneer_threads';

export function ensurePythonThreads(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    definitions.import_threading = 'import threading';
    if (definitions[PYTHON_THREADS_KEY]) return;
    definitions[PYTHON_THREADS_KEY] = [
        '_pioneer_threads = []',
        '_pioneer_stopped = set()',
        '',
        'def _pioneer_start_thread(target, *args):',
        `${PY_INDENT}thread = threading.Thread(target=target, args=args, daemon=True)`,
        `${PY_INDENT}_pioneer_threads.append(thread)`,
        `${PY_INDENT}thread.start()`
    ].join('\n');
}

// Функции-потоки меняют переменные программы: в Python без `global` это были
// бы новые локальные. Lua-переменные Blockly и так глобальные.
export function pythonGlobalsLine(gen: Blockly.CodeGenerator, block: Blockly.Block): string {
    const names = block.workspace.getVariableMap().getAllVariables().map((variable) => gen.getVariableName(variable.getId()));
    return names.length ? `${gen.INDENT}global ${names.join(', ')}\n` : '';
}

// Новое имя служебной функции: _pioneer_every, _pioneer_every2, ... — по
// порядку генерации, без столкновений с функциями ученика.
export function distinctFunctionName(gen: Blockly.CodeGenerator, base: string): string {
    const nameDb = (gen as unknown as { nameDB_: Blockly.Names }).nameDB_;
    return nameDb.getDistinctName(base, Blockly.Names.NameType.PROCEDURE);
}

// Тело блока-контейнера для Python: пустое тело — `pass`, иначе Python не
// соберёт функцию.
export function pythonBody(gen: Blockly.CodeGenerator, block: Blockly.Block, input: string): string {
    return gen.statementToCode(block, input) || `${gen.INDENT}pass\n`;
}

// Отступ рукописных помощников Python — четыре пробела, как в официальных
// примерах pioneer_sdk. Код из блоков идёт с отступом генератора Blockly
// (gen.INDENT), поэтому им форматируется только то, что обёрнуто вокруг тел
// блоков.
export const PY_INDENT = '    ';
