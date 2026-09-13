import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { pythonGenerator } from 'blockly/python';
import { PIONEER_ON_EVENT_TYPE, PIONEER_START_TYPE } from '../constants.js';
import type { PioneerTarget } from './types.js';

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

export type PioneerCompiledSource = {
    headerDefinitions: string;
    body: string;
    eventBranches: string;
};

// Фаза 1/2: собирает только цепочку под pioneer_start + определения функций,
// без обвязки-рантайма (корутина для Lua, Pioneer()-пролог для Python) —
// её добавляют targets/lua-runtime.ts и targets/python-runtime.ts в фазе 2/4.
export function compilePioneerSource(workspace: Blockly.Workspace, target: PioneerTarget): PioneerCompiledSource {
    const generator = getGenerator(target);
    generator.init(workspace);

    const topBlocks = workspace.getTopBlocks(true).filter((block) => !block.isInsertionMarker());
    const startBlocks = topBlocks.filter((block) => block.type === PIONEER_START_TYPE);
    const eventBlocks = topBlocks.filter((block) => block.type === PIONEER_ON_EVENT_TYPE);
    const otherBlocks = topBlocks.filter(
        (block) => block.type !== PIONEER_START_TYPE && block.type !== PIONEER_ON_EVENT_TYPE
    );

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
    const body = mainBlock ? statementCode(generator, mainBlock) : '';
    const procedureCode = procedureBlocks
        .map((block) => statementCode(generator, block))
        .filter(Boolean)
        .join('\n');
    const eventBranches = eventBlocks
        .map((block) => statementCode(generator, block))
        .filter(Boolean)
        .join('\n');

    const definitionsText = collectDefinitionsText(generator);
    const headerDefinitions = [definitionsText, procedureCode].filter(Boolean).join('\n\n');

    return { headerDefinitions, body, eventBranches };
}

// Временная реализация фазы 1: без рантайм-пролога, только маркер и тело.
// Полностью заменяется в фазе 2 на сборку через targets/lua-runtime.ts и
// targets/python-runtime.ts (корутина для Lua, Pioneer()-обвязка для Python).
export function compilePioneerWorkspace(workspace: Blockly.Workspace, target: PioneerTarget): string {
    const marker = target === 'lua' ? '-- @pioneer-blockly v1' : '# @pioneer-blockly v1';
    const { headerDefinitions, body } = compilePioneerSource(workspace, target);
    return [marker, headerDefinitions, body].filter(Boolean).join('\n\n');
}
