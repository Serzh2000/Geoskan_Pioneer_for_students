import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { pythonGenerator } from 'blockly/python';
import { PIONEER_ON_EVENT_TYPE, PIONEER_START_TYPE } from '../constants.js';
import type { PioneerTarget } from './types.js';
import { buildFlatLuaProgram, buildLuaProgram } from './lua-runtime.js';
import { buildLuaSections, indentLuaBlock, type LuaSections } from './lua-fsm.js';
import { buildPythonProgram } from './python-runtime.js';

// Имена рантайма (см. targets/lua-runtime.ts, targets/lua-fsm.ts) резервируем,
// чтобы генератор переменных Blockly (my_variable, my_variable2, ...) не мог
// случайно сгенерировать пользовательскую переменную с тем же именем.
// Корутинных имён (__co, __resume, coroutine, ...) здесь больше нет — FSM
// их не использует вовсе (§2.1, §4.3 плана). __wait_event/__wait_seconds
// оставлены в списке на всякий случай: в готовый Lua они не попадают (это
// только маркеры для lua-fsm.ts на этапе сборки), но лучше не рисковать
// совпадением с именем маркера, если пользовательский код где-то его
// процитирует как текст.
const LUA_RESERVED_WORDS = [
    '__state', '__t0', '__loop_guard', '__loop_guard_count', 'action',
    '__advance', 'current', '__wait_event', '__wait_seconds', 'ap', 'Ev',
    'Timer', 'Sensors', 'Ledbar', 'leds', 'callback', 'time'
].join(',');

// procedures_defnoreturn/procedures_defreturn — единственные блоки-сироты,
// которые всё равно должны попасть в код (см. §4.2 плана, шаг 2): они не
// подключены к pioneer_start, но их код нужен, если где-то есть вызов.
const PROCEDURE_DEFINITION_TYPES = new Set(['procedures_defnoreturn', 'procedures_defreturn']);

// См. комментарий в registry.ts: LuaGenerator/PythonGenerator структурно не
// Blockly.CodeGenerator из-за контравариантности forBlock, а нужен только
// общий базовый интерфейс (init/blockToCode/valueToCode/definitions_ и т.д.).
function getGenerator(target: PioneerTarget): Blockly.CodeGenerator {
    return (target === 'lua' ? luaGenerator : pythonGenerator) as unknown as Blockly.CodeGenerator;
}

// blockToCode для statement-блока всегда возвращает string, но у типов
// Blockly в сигнатуре есть и кортеж (для value-блоков) — здесь его не бывает.
function statementCode(generator: Blockly.CodeGenerator, block: Blockly.Block): string {
    const code = generator.blockToCode(block);
    return typeof code === 'string' ? code : code[0];
}

function collectDefinitionsText(generator: Blockly.CodeGenerator): string {
    const definitions = (generator as unknown as { definitions_: Record<string, string> }).definitions_;
    return Object.keys(definitions)
        .sort()
        .map((key) => definitions[key])
        .filter(Boolean)
        .join('\n\n');
}

type TopLevelParts = {
    generator: Blockly.CodeGenerator;
    // Первый блок, подключённый ПОД pioneer_start (не сам pioneer_start —
    // его генератор всегда возвращает '' в обоих таргетах, см. blocks/program.ts).
    firstBodyBlock: Blockly.Block | null;
    eventBlocks: Blockly.Block[];
    procedureBlocks: Blockly.Block[];
};

// Общая часть для Lua и Python (§4.2 плана, шаг 2): находит цепочку под
// pioneer_start, блоки pioneer_on_event и блоки-сироты procedures_def*,
// заодно расставляет предупреждения об отключённых от старта блоках.
// Собственно генерацию кода (плоскую для Python, разбивку на состояния для
// Lua) делают вызывающие функции ниже — она слишком по-разному устроена для
// двух таргетов, чтобы иметь общую реализацию.
function collectTopLevelParts(workspace: Blockly.Workspace, target: PioneerTarget): TopLevelParts {
    const generator = getGenerator(target);
    generator.init(workspace);
    if (target === 'lua') {
        generator.addReservedWords(LUA_RESERVED_WORDS);
    }

    const topBlocks = workspace.getTopBlocks(true).filter((block) => !block.isInsertionMarker());
    const startBlocks = topBlocks.filter((block) => block.type === PIONEER_START_TYPE);
    const eventBlocks = topBlocks.filter((block) => block.type === PIONEER_ON_EVENT_TYPE);
    const otherBlocks = topBlocks.filter(
        (block) => block.type !== PIONEER_START_TYPE && block.type !== PIONEER_ON_EVENT_TYPE
    );

    // Снимаем предупреждение со ВСЕХ блоков перед перерасчётом, а не только с
    // тех, что сейчас в otherBlocks: иначе оно "прилипает". Пример бага —
    // блок math_number подключили к пустому входу X у pioneer_go_to, пока не
    // подключён он был top-level и получил это предупреждение; после
    // подключения он больше не top-level и в otherBlocks не попадает, но
    // никто и не вызывал setWarningText(null) для него — предупреждение
    // оставалось висеть на уже подключённом блоке. compile.ts — единственное
    // место в pioneer_*, где вообще используется setWarningText (проверено
    // грепом), так что чистить его у всех блоков безопасно — других
    // предупреждений оно не затronет.
    workspace.getAllBlocks(false).forEach((block) => block.setWarningText(null));

    startBlocks.forEach((block, index) => {
        block.setWarningText(
            index === 0 ? null : 'Несколько блоков «Начало программы»: используется только первый.'
        );
    });

    const procedureBlocks: Blockly.Block[] = [];
    otherBlocks.forEach((block) => {
        if (PROCEDURE_DEFINITION_TYPES.has(block.type)) {
            block.setWarningText(null);
            procedureBlocks.push(block);
        } else {
            block.setWarningText('Блок не подключён к «Начало программы».');
        }
    });

    const mainBlock = startBlocks[0] ?? null;
    return {
        generator,
        firstBodyBlock: mainBlock ? mainBlock.getNextBlock() : null,
        eventBlocks,
        procedureBlocks
    };
}

function buildHeaderDefinitions(generator: Blockly.CodeGenerator, procedureBlocks: Blockly.Block[]): string {
    const procedureCode = procedureBlocks
        .map((block) => statementCode(generator, block))
        .filter(Boolean)
        .join('\n');
    const definitionsText = collectDefinitionsText(generator);
    return [definitionsText, procedureCode].filter(Boolean).join('\n\n');
}

export type PioneerLuaCompiledSource = {
    headerDefinitions: string;
    // Ветки pioneer_on_event — без внешнего отступа: его добавляет уже
    // конкретный сборщик программы, у плоского и FSM-варианта он разный.
    eventBranches: string;
    // Либо плоские ветки callback, либо таблица состояний — что именно,
    // решает targets/lua-fsm.ts по повторам имён событий.
    sections: LuaSections;
};

// Lua: тело pioneer_start разбивается на шаги по блокам-ожиданиям (§4.3
// плана) — см. targets/lua-fsm.ts. Ветки pioneer_on_event по-прежнему получаем
// штатным statementCode() — это не часть цепочки шагов, а независимые побочные
// обработчики (см. events.ts), одинаковые в обоих режимах.
export function compilePioneerLuaSource(workspace: Blockly.Workspace): PioneerLuaCompiledSource {
    const { generator, firstBodyBlock, eventBlocks, procedureBlocks } = collectTopLevelParts(workspace, 'lua');

    const sections = buildLuaSections(generator, firstBodyBlock);
    const eventBranches = eventBlocks
        .map((block) => statementCode(generator, block))
        .filter(Boolean)
        .join('\n');

    return {
        headerDefinitions: buildHeaderDefinitions(generator, procedureBlocks),
        eventBranches,
        sections
    };
}

export type PioneerPythonCompiledSource = {
    headerDefinitions: string;
    body: string;
};

// Python: обычная плоская последовательность — ожидание здесь блокирующий
// опрос (targets/python-runtime.ts), а не переключение состояний, поэтому
// штатного generator.blockToCode(), обходящего всю цепочку самостоятельно,
// вполне достаточно (в отличие от Lua-таргета).
export function compilePioneerPythonSource(workspace: Blockly.Workspace): PioneerPythonCompiledSource {
    const { generator, firstBodyBlock, procedureBlocks } = collectTopLevelParts(workspace, 'python');
    const body = firstBodyBlock ? statementCode(generator, firstBodyBlock) : '';

    return { headerDefinitions: buildHeaderDefinitions(generator, procedureBlocks), body };
}

// Ловушка на случай бесконечного цикла без блоков-ожидания (§4.2 плана): для
// Lua — счётчик итераций __loop_guard() (targets/lua-runtime.ts; FSM не
// использует yield/корутину, поэтому "отдать управление" тут не вариант —
// см. §2.1 плана), для Python — обычный квант времени. Ставится только на
// время компиляции и снимается сразу после, чтобы не задеть сторонние вызовы
// generator.workspaceToCode() (стандартные тесты controls_repeat_ext/
// controls_for и т.п. в blockly-codegen.test.ts).
function withInfiniteLoopTrap<T>(generator: Blockly.CodeGenerator, trap: string, run: () => T): T {
    const previous = generator.INFINITE_LOOP_TRAP;
    generator.INFINITE_LOOP_TRAP = trap;
    try {
        return run();
    } finally {
        generator.INFINITE_LOOP_TRAP = previous;
    }
}

export function compilePioneerWorkspace(workspace: Blockly.Workspace, target: PioneerTarget): string {
    const generator = getGenerator(target);
    const trap = target === 'lua' ? '__loop_guard()\n' : 'time.sleep(0.01)\n';

    if (target === 'lua') {
        const { headerDefinitions, eventBranches, sections } = withInfiniteLoopTrap(
            generator,
            trap,
            () => compilePioneerLuaSource(workspace)
        );
        if (sections.mode === 'flat') {
            return buildFlatLuaProgram({
                headerDefinitions,
                topLevelCode: sections.topLevelCode,
                callbackBranches: sections.callbackBranches,
                // В плоском режиме всё тело callback живёт на одном отступе
                // в четыре пробела (как в рукописных примерах Geoskan), поэтому
                // и ветки pioneer_on_event сдвигаем тем же хелпером, а не
                // generator.INDENT — сам их текст при этом не меняется.
                eventBranches: indentLuaBlock(eventBranches)
            });
        }
        return buildLuaProgram({
            headerDefinitions,
            segmentsCode: sections.segmentsCode,
            transitionBranches: sections.transitionBranches,
            eventBranches: generator.prefixLines(eventBranches, generator.INDENT)
        });
    }

    const { headerDefinitions, body } = withInfiniteLoopTrap(
        generator,
        trap,
        () => compilePioneerPythonSource(workspace)
    );
    return buildPythonProgram({ headerDefinitions, body });
}
