import * as Blockly from 'blockly';
import { Order } from 'blockly/lua';
import { isWaitBlockType } from '../wait-in-loop-guard.js';

// Автомат для программ, где блок-ожидание стоит внутри «если» или цикла.
//
// Линейная цепочка (targets/lua-fsm.ts) режет программу на шаги только на
// верхнем уровне: всё, что внутри цикла или «если», там собирает штатный
// generator.blockToCode() в один кусок Lua, и ожиданию внутри негде
// закончить шаг. Официальные примеры Geoscan так и пишут полёт по точкам —
// счётчик точки плюс callback(event) (example_go_to_point.lua), то есть цикл,
// развёрнутый в автомат вручную. Здесь то же самое делает компилятор:
//
// - каждое состояние — функция action["__sN"]; она либо возвращает имя
//   состояния, куда перейти сразу (ветка «если», проверка цикла), либо
//   заводит ожидание (событие, таймер, опрос) и возвращает nil;
// - __advance() — «трамплин»: крутит немедленные переходы циклом, а не
//   рекурсией, поэтому цикл из тысячи итераций не переполняет стек;
// - «если» с ожиданием внутри превращается в развилку на состояния веток,
//   которые сходятся в общее состояние после «если»;
// - цикл — в состояние-проверку, тело возвращается в неё же; «прервать» и
//   «следующая итерация» — переходы на выход и на проверку.
//
// Переменные Blockly в Lua глобальные, поэтому между функциями состояний они
// живут без дополнительной обвязки. Служебное состояние циклов (счётчик
// «повторить N раз», граница и шаг «для») — в таблице __loop.

const WAIT_EVENT_MARKER = '__wait_event';
const WAIT_SECONDS_MARKER = '__wait_seconds';
const WAIT_POLL_MARKER = '__wait_poll';
const POLL_INTERVAL_SECONDS = '0.05';

const LOOP_TYPES = new Set(['controls_repeat_ext', 'controls_repeat', 'controls_whileUntil', 'controls_for', 'controls_forEach']);
const CONTAINER_TYPES = new Set([...LOOP_TYPES, 'controls_if', 'controls_ifelse']);
const FLOW_TYPE = 'controls_flow_statements';

type Marker = { kind: 'event' | 'timer' | 'poll'; argument: string; plainCode: string };

type LoopContext = { breakTo: string; continueTo: string };

export type LuaStructuredSections = {
    mode: 'structured';
    segmentsCode: string;
    transitionBranches: string;
};

function findMarker(code: string): Marker | null {
    const markers: Array<[string, Marker['kind']]> = [
        [WAIT_EVENT_MARKER, 'event'],
        [WAIT_SECONDS_MARKER, 'timer'],
        [WAIT_POLL_MARKER, 'poll']
    ];
    for (const [marker, kind] of markers) {
        const prefix = `${marker}(`;
        const start = code.indexOf(prefix);
        if (start === -1) continue;
        let depth = 0;
        for (let i = start + prefix.length - 1; i < code.length; i += 1) {
            if (code[i] === '(') depth += 1;
            else if (code[i] === ')') {
                depth -= 1;
                if (depth === 0) {
                    return { kind, argument: code.slice(start + prefix.length, i), plainCode: code.slice(0, start) };
                }
            }
        }
        throw new Error(`${marker}(...): не найдена закрывающая скобка в сгенерированном коде блока`);
    }
    return null;
}

function isActiveWait(block: Blockly.Block): boolean {
    return isWaitBlockType(block.type) && block.isEnabled();
}

function containsWait(block: Blockly.Block): boolean {
    return block.getDescendants(false).some((descendant) => isActiveWait(descendant));
}

// «Прервать цикл» внутри блока, который сам не цикл, адресован внешнему
// циклу. Если этот внешний цикл разворачивается в автомат, то и блок с
// break внутри надо разворачивать: штатный код напечатал бы break/goto
// прямо в функции состояния, где никакого цикла Lua уже нет.
function containsEscapingFlow(block: Blockly.Block): boolean {
    if (LOOP_TYPES.has(block.type)) return false;
    return block.getDescendants(false).some((descendant) => {
        if (descendant.type !== FLOW_TYPE || !descendant.isEnabled()) return false;
        let parent = descendant.getSurroundParent();
        while (parent && parent !== block) {
            if (LOOP_TYPES.has(parent.type)) return false;
            parent = parent.getSurroundParent();
        }
        return true;
    });
}

function needsStructure(block: Blockly.Block, loops: LoopContext[]): boolean {
    if (!block.isEnabled()) return false;
    if (block.type === FLOW_TYPE) return loops.length > 0;
    if (!CONTAINER_TYPES.has(block.type)) return false;
    return containsWait(block) || (loops.length > 0 && containsEscapingFlow(block));
}

// Нужна ли вообще эта схема: хотя бы одно ожидание стоит внутри «если» или
// цикла основной цепочки. Иначе остаётся линейный автомат из lua-fsm.ts —
// его вывод для таких программ не меняется ни на байт.
export function chainNeedsStructure(firstBlock: Blockly.Block | null): boolean {
    for (let block = firstBlock; block; block = block.getNextBlock()) {
        if (needsStructure(block, [])) return true;
    }
    return false;
}

function statementCode(generator: Blockly.CodeGenerator, block: Blockly.Block): string {
    const code = generator.blockToCode(block, true);
    return typeof code === 'string' ? code : code[0];
}

class StructuredLuaCompiler {
    private readonly codeByState = new Map<string, string>();
    private readonly order: string[] = [];
    private readonly branches: string[] = [];
    private stateCount = 0;
    private loopCount = 0;

    constructor(private readonly generator: Blockly.CodeGenerator) {}

    newState(): string {
        const name = `__s${this.stateCount}`;
        this.stateCount += 1;
        this.codeByState.set(name, '');
        this.order.push(name);
        return name;
    }

    private append(state: string, code: string): void {
        this.codeByState.set(state, (this.codeByState.get(state) ?? '') + code);
    }

    private jump(state: string, target: string): void {
        this.append(state, `return "${target}"\n`);
    }

    // Компилирует цепочку, начиная с блока first, в состояние entry. Если exit
    // задан, последняя команда цепочки — переход в него; null — терминальный
    // хвост программы.
    compileChain(first: Blockly.Block | null, entry: string, exit: string | null, loops: LoopContext[]): void {
        let current = entry;
        for (let block = first; block; block = block.getNextBlock()) {
            if (!block.isEnabled()) continue;
            if (isActiveWait(block)) {
                current = this.compileWait(block, current);
            } else if (needsStructure(block, loops)) {
                current = this.compileStructure(block, current, loops);
            } else {
                this.append(current, statementCode(this.generator, block));
            }
        }
        if (exit) this.jump(current, exit);
    }

    private compileWait(block: Blockly.Block, current: string): string {
        const code = statementCode(this.generator, block);
        const marker = findMarker(code);
        if (!marker) {
            this.append(current, code);
            return current;
        }
        this.append(current, marker.plainCode);
        const next = this.newState();
        if (marker.kind === 'event') {
            const match = /^Ev\.(\w+)$/.exec(marker.argument.trim());
            if (!match) throw new Error(`__wait_event(...) ожидает аргумент вида Ev.NAME, получено "${marker.argument}"`);
            this.branches.push(
                `${this.generator.INDENT}if __state == "${current}" and event == Ev.${match[1]} `
                + `then __state = "${next}"; __advance(); return end\n`
            );
        } else if (marker.kind === 'timer') {
            this.append(current, `Timer.callLater(${marker.argument}, function()\n`
                + `    if __state == "${current}" then\n`
                + `        __state = "${next}"\n`
                + '        __advance()\n'
                + '    end\n'
                + 'end)\n');
        } else {
            const poll = `__poll_${current.slice(2)}`;
            this.append(current, `local function ${poll}()\n`
                + `    if __state ~= "${current}" then return end\n`
                + `    if ${marker.argument} then\n`
                + `        __state = "${next}"\n`
                + '        __advance()\n'
                + '    else\n'
                + `        Timer.callLater(${POLL_INTERVAL_SECONDS}, ${poll})\n`
                + '    end\n'
                + 'end\n'
                + `Timer.callLater(${POLL_INTERVAL_SECONDS}, ${poll})\n`);
        }
        return next;
    }

    private value(block: Blockly.Block, name: string, fallback: string): string {
        return this.generator.valueToCode(block, name, Order.NONE) || fallback;
    }

    private variable(block: Blockly.Block): string {
        return this.generator.getVariableName(block.getFieldValue('VAR'));
    }

    private compileStructure(block: Blockly.Block, current: string, loops: LoopContext[]): string {
        switch (block.type) {
            case FLOW_TYPE: {
                const loop = loops[loops.length - 1];
                this.jump(current, block.getFieldValue('FLOW') === 'BREAK' ? loop.breakTo : loop.continueTo);
                // После return в Lua-блоке ничего стоять не может: всё, что
                // Blockly позволит поставить дальше, уходит в недостижимое
                // состояние.
                return this.newState();
            }
            case 'controls_if':
            case 'controls_ifelse':
                return this.compileIf(block, current, loops);
            default:
                return this.compileLoop(block, current, loops);
        }
    }

    private branchTarget(first: Blockly.Block | null, join: string, loops: LoopContext[]): string {
        if (!first) return join;
        const state = this.newState();
        this.compileChain(first, state, join, loops);
        return state;
    }

    private compileIf(block: Blockly.Block, current: string, loops: LoopContext[]): string {
        const join = this.newState();
        let code = '';
        for (let n = 0; block.getInput(`IF${n}`); n += 1) {
            const condition = this.value(block, `IF${n}`, 'false');
            const target = this.branchTarget(block.getInputTargetBlock(`DO${n}`), join, loops);
            code += `${n === 0 ? 'if' : 'elseif'} ${condition} then\n    return "${target}"\n`;
        }
        const elseTarget = block.getInput('ELSE')
            ? this.branchTarget(block.getInputTargetBlock('ELSE'), join, loops)
            : join;
        code += `else\n    return "${elseTarget}"\nend\n`;
        this.append(current, code);
        return join;
    }

    private compileLoop(block: Blockly.Block, current: string, loops: LoopContext[]): string {
        const id = this.loopCount;
        this.loopCount += 1;
        const slot = `__loop[${id}]`;
        const check = this.newState();
        const exit = this.newState();
        const body = block.getInputTargetBlock('DO');

        // Состояние, куда возвращается тело и куда ведёт «следующая итерация».
        // У «для» это шаг счётчика, у остальных — сама проверка.
        let continueTo = check;
        let checkCode: string;
        let enterCode: string;
        let bodyPrelude = '';

        if (block.type === 'controls_repeat_ext' || block.type === 'controls_repeat') {
            const times = block.type === 'controls_repeat'
                ? String(Number(block.getFieldValue('TIMES')) || 0)
                : this.value(block, 'TIMES', '0');
            enterCode = `${slot} = {i = 0, n = ${times}}\n`;
            checkCode = `if ${slot}.i < ${slot}.n then\n    ${slot}.i = ${slot}.i + 1\n    return "BODY"\nend\nreturn "${exit}"\n`;
        } else if (block.type === 'controls_whileUntil') {
            const condition = this.value(block, 'BOOL', 'false');
            const test = block.getFieldValue('MODE') === 'UNTIL' ? `not (${condition})` : condition;
            enterCode = '';
            checkCode = `if ${test} then\n    return "BODY"\nend\nreturn "${exit}"\n`;
        } else if (block.type === 'controls_for') {
            const variable = this.variable(block);
            const from = this.value(block, 'FROM', '0');
            const to = this.value(block, 'TO', '0');
            const by = this.value(block, 'BY', '1');
            // Шаг как у штатного Lua-генератора Blockly: по модулю, со знаком
            // по направлению от FROM к TO.
            enterCode = `${variable} = ${from}\n${slot} = {to = ${to}, by = math.abs(${by})}\n`
                + `if ${variable} > ${slot}.to then ${slot}.by = -${slot}.by end\n`;
            checkCode = `if (${slot}.by >= 0 and ${variable} <= ${slot}.to) or (${slot}.by < 0 and ${variable} >= ${slot}.to) then\n    return "BODY"\nend\nreturn "${exit}"\n`;
            continueTo = this.newState();
            this.append(continueTo, `${variable} = ${variable} + ${slot}.by\nreturn "${check}"\n`);
        } else {
            // controls_forEach
            const variable = this.variable(block);
            const list = this.value(block, 'LIST', '{}');
            enterCode = `${slot} = {list = ${list}, i = 0}\n`;
            checkCode = `if ${slot}.i < #${slot}.list then\n    ${slot}.i = ${slot}.i + 1\n    return "BODY"\nend\nreturn "${exit}"\n`;
            bodyPrelude = `${variable} = ${slot}.list[${slot}.i]\n`;
        }

        const bodyState = this.newState();
        this.append(bodyState, bodyPrelude);
        this.compileChain(body, bodyState, continueTo, [...loops, { breakTo: exit, continueTo }]);
        this.append(check, checkCode.replace('"BODY"', `"${bodyState}"`));
        this.append(current, `${enterCode}return "${check}"\n`);
        return exit;
    }

    render(): LuaStructuredSections {
        const indent = this.generator.INDENT;
        const segmentsCode = this.order
            .map((name) => {
                const body = this.codeByState.get(name) ?? '';
                return `action["${name}"] = function()\n${this.generator.prefixLines(body, indent)}end\n`;
            })
            .join('');
        return { mode: 'structured', segmentsCode, transitionBranches: this.branches.join('') };
    }
}

export function buildStructuredLuaSections(
    generator: Blockly.CodeGenerator,
    firstBlock: Blockly.Block | null
): LuaStructuredSections {
    const compiler = new StructuredLuaCompiler(generator);
    const entry = compiler.newState();
    compiler.compileChain(firstBlock, entry, null, []);
    return compiler.render();
}
