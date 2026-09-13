import * as Blockly from 'blockly';

// Однострочные вызовы-маркеры, которыми блоки модели ожидания (flight.ts:
// preflight/takeoff/go_to/land, time.ts: pioneer_wait) заканчивают
// СОБСТВЕННЫЙ сгенерированный код. Это не настоящие Lua-функции — в готовый
// скрипт они никогда не попадают: buildLuaFsmSections() вырезает их из
// текста блока и превращает в переход между состояниями конечного автомата
// (§4.3 плана, пересмотрено 2026-09-13 — FSM вместо корутины, см. §2.1).
const WAIT_EVENT_MARKER = '__wait_event';
const WAIT_SECONDS_MARKER = '__wait_seconds';

type MarkerExtraction = { argument: string; plainCode: string };

// Вырезает вызов marker(...) из хвоста сгенерированного блоком текста.
// Скобки считаем вручную, а не простым регэкспом "до последней )": аргумент
// __wait_seconds(...) — это valueToCode() произвольного выражения ученика и
// сам может содержать скобки, например __wait_seconds((a + b) * 2).
function extractMarker(code: string, marker: string): MarkerExtraction | null {
    const prefix = `${marker}(`;
    const markerStart = code.indexOf(prefix);
    if (markerStart === -1) return null;

    let depth = 0;
    let closeIndex = -1;
    for (let i = markerStart + prefix.length - 1; i < code.length; i += 1) {
        if (code[i] === '(') depth += 1;
        else if (code[i] === ')') {
            depth -= 1;
            if (depth === 0) {
                closeIndex = i;
                break;
            }
        }
    }
    if (closeIndex === -1) {
        throw new Error(`${marker}(...): не найдена закрывающая скобка в сгенерированном коде блока`);
    }

    const after = code.slice(closeIndex + 1);
    if (after.trim() !== '') {
        // Блоки модели ожидания в blocks/flight.ts и blocks/time.ts обязаны
        // печатать маркер последней строкой — иначе непонятно, где заканчивается
        // "код сегмента" и начинается "переход" (см. §4.3 плана).
        throw new Error(`${marker}(...) должен быть последним вызовом в коде блока-ожидания`);
    }

    return {
        argument: code.slice(markerStart + prefix.length, closeIndex),
        plainCode: code.slice(0, markerStart)
    };
}

type LuaSegment = { name: string; body: string };
type LuaTransition = { fromState: string; event: string; toState: string };

export type LuaFsmSections = {
    // action["__sN"] = function() ... end, одна запись на состояние.
    segmentsCode: string;
    // Ветки-переходы по событию: если текущее состояние — sN и пришло
    // нужное событие, переключиться на sN+1 и запустить его. Печатаются
    // внутри callback(event) (см. lua-runtime.ts).
    transitionBranches: string;
};

// Разрезает цепочку блоков под pioneer_start на состояния конечного автомата
// (§4.3 плана): каждый блок-ожидание завершает текущее состояние переходом
// в следующее. Это НЕ generator.blockToCode(startBlock) без opt_thisOnly —
// тот сам обходит всю цепочку через getNextBlock() и склеивает её в одну
// строку, не умея остановиться посередине ради границы состояния. Здесь
// цепочка обходится вручную; такой обход нужен только на этом верхнем
// уровне — всё, что вложено в цикл или "если", по-прежнему идёт через
// штатный generator.blockToCode(), и там же блоки ожидания принудительно
// отключены (см. wait-in-loop-guard.ts), чтобы маркер не утёк в их код.
export function buildLuaFsmSections(
    generator: Blockly.CodeGenerator,
    firstBlock: Blockly.Block | null
): LuaFsmSections {
    const segments: LuaSegment[] = [];
    const transitions: LuaTransition[] = [];
    let buffer = '';
    let stateIndex = 0;
    const stateName = (index: number) => `__s${index}`;

    let block = firstBlock;
    while (block) {
        const raw = generator.blockToCode(block, true);
        const code = typeof raw === 'string' ? raw : raw[0];

        const eventMarker = extractMarker(code, WAIT_EVENT_MARKER);
        if (eventMarker) {
            const match = /^Ev\.(\w+)$/.exec(eventMarker.argument.trim());
            if (!match) {
                throw new Error(
                    `__wait_event(...) ожидает аргумент вида Ev.NAME, получено "${eventMarker.argument}"`
                );
            }
            buffer += eventMarker.plainCode;
            const fromState = stateName(stateIndex);
            segments.push({ name: fromState, body: buffer });
            stateIndex += 1;
            transitions.push({ fromState, event: match[1], toState: stateName(stateIndex) });
            buffer = '';
            block = block.getNextBlock();
            continue;
        }

        const secondsMarker = extractMarker(code, WAIT_SECONDS_MARKER);
        if (secondsMarker) {
            buffer += secondsMarker.plainCode;
            const fromState = stateName(stateIndex);
            const toState = stateName(stateIndex + 1);
            // Timer.callLater — прямо внутри сегмента (§4.3 плана): переход по
            // времени не требует ветки в callback(event), в отличие от
            // __wait_event. Печатаем МНОГОСТРОЧНО (не всё в одну строку) —
            // так script-execution-notice/lua-validation.ts (stripLuaManagedBlocks)
            // корректно распознаёт и целиком вырезает этот отложенный колбэк
            // при поиске "нескольких команд миссии подряд", как и любой другой
            // Timer.callLater(function() ... end) в ручном скрипте.
            buffer += `Timer.callLater(${secondsMarker.argument}, function()\n`
                + `    if __state == "${fromState}" then\n`
                + `        __state = "${toState}"\n`
                + '        __advance()\n'
                + '    end\n'
                + 'end)\n';
            segments.push({ name: fromState, body: buffer });
            stateIndex += 1;
            buffer = '';
            block = block.getNextBlock();
            continue;
        }

        buffer += code;
        block = block.getNextBlock();
    }

    // Хвост без блока-ожидания (включая полностью пустую цепочку) — тоже
    // отдельный сегмент: на его имя может указывать переход из предыдущего
    // состояния, а для пустого pioneer_start это просто
    // action["__s0"] = function() end (терминальное состояние, как в
    // референсе TRIK из §2.1 плана — там оно тоже объявлено пустым).
    segments.push({ name: stateName(stateIndex), body: buffer });

    const segmentsCode = segments
        .map(({ name, body }) => `action["${name}"] = function()\n${generator.prefixLines(body, generator.INDENT)}end\n`)
        .join('');

    const transitionBranches = transitions
        .map(({ fromState, event, toState }) =>
            `${generator.INDENT}if __state == "${fromState}" and event == Ev.${event} then __state = "${toState}"; __advance() end\n`)
        .join('');

    return { segmentsCode, transitionBranches };
}
