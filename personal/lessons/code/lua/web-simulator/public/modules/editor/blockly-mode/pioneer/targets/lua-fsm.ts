import * as Blockly from 'blockly';

// Однострочные вызовы-маркеры, которыми блоки модели ожидания (flight.ts:
// preflight/takeoff/go_to/land, time.ts: pioneer_wait) заканчивают
// СОБСТВЕННЫЙ сгенерированный код. Это не настоящие Lua-функции — в готовый
// скрипт они никогда не попадают: splitLuaChain() вырезает их из текста блока
// и превращает в переход между шагами программы (§4.3 плана, пересмотрено
// 2026-09-13 — FSM вместо корутины, см. §2.1).
const WAIT_EVENT_MARKER = '__wait_event';
const WAIT_SECONDS_MARKER = '__wait_seconds';

// Отступ вложенности для плоского режима — четыре пробела, как в официальных
// примерах Geoskan и в референсе TRIK (§2.1 плана), а не generator.INDENT
// (у Blockly это два пробела). Плоский callback сравнивают глазами с
// рукописными скриптами, поэтому здесь важен именно их отступ; FSM-режим
// оставлен на generator.INDENT, чтобы его вывод не менялся вообще.
const FLAT_INDENT = '    ';

// Сдвигает готовый блок кода на один уровень вложенности. Пустую строку
// возвращаем как есть: generator.prefixLines('') выдал бы одинокий отступ, и
// у ветки с пустым телом (терминальный шаг — последний блок-ожидание, после
// которого в программе ничего нет) между `then` и `end` появился бы мусорный
// пробельный хвост. Внутренние пустые строки тоже не трогаем — иначе в коде
// остаются строки из одних пробелов.
export function indentLuaBlock(code: string): string {
    if (!code) return '';
    return code.replace(/^(?!$)/gm, FLAT_INDENT);
}

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

// Переход между соседними сегментами: либо ожидание события от автопилота,
// либо ожидание времени (pioneer_wait). Разделение важно для проверки
// пригодности к плоскому режиму: повторяться безопасно может только таймер,
// у каждого из них своё независимое замыкание Timer.callLater.
type LuaTransition =
    | { kind: 'event'; event: string }
    | { kind: 'timer'; seconds: string };

// Инвариант: segments.length === transitions.length + 1. transitions[i]
// соединяет segments[i] и segments[i + 1]; последний сегмент терминальный,
// после него переходов нет (он может быть и пустым — если программа
// заканчивается блоком-ожиданием).
type LuaChain = { segments: string[]; transitions: LuaTransition[] };

const stateName = (index: number) => `__s${index}`;

// Разрезает цепочку блоков под pioneer_start на сегменты по блокам-ожиданиям.
// Это НЕ generator.blockToCode(startBlock) без opt_thisOnly — тот сам обходит
// всю цепочку через getNextBlock() и склеивает её в одну строку, не умея
// остановиться посередине ради границы шага. Здесь цепочка обходится вручную;
// такой обход нужен только на этом верхнем уровне — всё, что вложено в цикл
// или "если", по-прежнему идёт через штатный generator.blockToCode(), и там же
// блоки ожидания принудительно отключены (см. wait-in-loop-guard.ts), чтобы
// маркер не утёк в их код.
function splitLuaChain(generator: Blockly.CodeGenerator, firstBlock: Blockly.Block | null): LuaChain {
    const segments: string[] = [];
    const transitions: LuaTransition[] = [];
    let buffer = '';

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
            segments.push(buffer + eventMarker.plainCode);
            transitions.push({ kind: 'event', event: match[1] });
            buffer = '';
            block = block.getNextBlock();
            continue;
        }

        const secondsMarker = extractMarker(code, WAIT_SECONDS_MARKER);
        if (secondsMarker) {
            segments.push(buffer + secondsMarker.plainCode);
            transitions.push({ kind: 'timer', seconds: secondsMarker.argument });
            buffer = '';
            block = block.getNextBlock();
            continue;
        }

        buffer += code;
        block = block.getNextBlock();
    }

    // Хвост без блока-ожидания (включая полностью пустую цепочку) — тоже
    // отдельный сегмент: на него указывает переход из предыдущего шага, а для
    // пустого pioneer_start это просто пустое терминальное состояние, как в
    // референсе TRIK из §2.1 плана (там оно тоже объявлено пустым).
    segments.push(buffer);
    return { segments, transitions };
}

export type LuaFsmSections = {
    mode: 'fsm';
    // action["__sN"] = function() ... end, одна запись на состояние.
    segmentsCode: string;
    // Ветки-переходы по событию: если текущее состояние — sN и пришло
    // нужное событие, переключиться на sN+1 и запустить его. Печатаются
    // внутри callback(event) (см. lua-runtime.ts).
    transitionBranches: string;
};

export type LuaFlatSections = {
    mode: 'flat';
    // Код, который выполняется сразу при запуске скрипта (первый сегмент).
    topLevelCode: string;
    // Плоские соседние ветки `if event == Ev.X then ... end` для callback —
    // уже с отступом тела callback.
    callbackBranches: string;
};

export type LuaSections = LuaFsmSections | LuaFlatSections;

// Переход по времени внутри сегмента FSM: Timer.callLater печатаем прямо в
// теле состояния (§4.3 плана) — ожидание времени не требует ветки в
// callback(event), в отличие от события. Печатаем МНОГОСТРОЧНО (не всё в одну
// строку) — так script-execution-notice/lua-validation.ts
// (stripLuaManagedBlocks) корректно распознаёт и целиком вырезает этот
// отложенный колбэк при поиске "нескольких команд миссии подряд", как и любой
// другой Timer.callLater(function() ... end) в ручном скрипте.
function fsmTimerTransition(seconds: string, fromState: string, toState: string): string {
    return `Timer.callLater(${seconds}, function()\n`
        + `    if __state == "${fromState}" then\n`
        + `        __state = "${toState}"\n`
        + '        __advance()\n'
        + '    end\n'
        + 'end)\n';
}

function renderFsmSections(generator: Blockly.CodeGenerator, chain: LuaChain): LuaFsmSections {
    const segmentsCode = chain.segments
        .map((body, index) => {
            const transition = chain.transitions[index];
            const full = transition && transition.kind === 'timer'
                ? body + fsmTimerTransition(transition.seconds, stateName(index), stateName(index + 1))
                : body;
            return `action["${stateName(index)}"] = function()\n${generator.prefixLines(full, generator.INDENT)}end\n`;
        })
        .join('');

    const transitionBranches = chain.transitions
        .map((transition, index) => (transition.kind === 'event'
            ? `${generator.INDENT}if __state == "${stateName(index)}" and event == Ev.${transition.event} `
                + `then __state = "${stateName(index + 1)}"; __advance() end\n`
            : ''))
        .join('');

    return { mode: 'fsm', segmentsCode, transitionBranches };
}

// Плоский режим: вместо таблицы состояний — независимые соседние ветки
// `if event == Ev.X then <продолжение> end` внутри callback(event). Никакого
// __state здесь нет и не нужно: раз имя события во всей программе встречается
// ровно один раз, само событие однозначно говорит, какой шаг выполнять
// дальше — «на каком шаге мы сейчас» запоминать не требуется. Ровно так
// написаны рукописные примеры Geoskan (§2.1 плана). Вложенность появляется
// только у Timer.callLater: второй таймер физически нельзя завести до того,
// как выполнится тело первого.
function renderFlatSections(chain: LuaChain): LuaFlatSections {
    const branches: string[] = [];

    const renderFrom = (index: number): string => {
        const body = chain.segments[index];
        const transition = chain.transitions[index];
        if (!transition) return body;

        if (transition.kind === 'timer') {
            return `${body}Timer.callLater(${transition.seconds}, function()\n`
                + `${indentLuaBlock(renderFrom(index + 1))}end)\n`;
        }

        // Место под ветку занимаем ДО рекурсии: renderFrom(index + 1) сам
        // допишет в branches ветки более поздних шагов, а порядок веток в
        // callback должен совпадать с порядком блоков на холсте (иначе
        // читается задом наперёд). Тело же ветки — это продолжение после
        // события, а не код текущего шага: текущий шаг возвращается наружу и
        // выполняется прямо сейчас.
        const slot = branches.length;
        branches.push('');
        branches[slot] = `if event == Ev.${transition.event} then\n${indentLuaBlock(renderFrom(index + 1))}end\n`;
        return body;
    };

    const topLevelCode = renderFrom(0);
    return {
        mode: 'flat',
        topLevelCode,
        callbackBranches: branches.map((branch) => indentLuaBlock(branch)).join('')
    };
}

// Плоский режим безопасен ровно тогда, когда имена событий не повторяются:
// две подряд идущие pioneer_go_to обе ждут Ev.POINT_REACHED, и плоская ветка
// `if event == Ev.POINT_REACHED then <вторая точка> end` сработала бы уже на
// достижении ПЕРВОЙ точки — отличить «первый раз» от «второго» без __state
// невозможно. Переходы по времени не мешают: каждый pioneer_wait — своё
// отдельное замыкание Timer.callLater, их сколько угодно.
function isFlatEligible(transitions: LuaTransition[]): boolean {
    const events = transitions.filter((transition) => transition.kind === 'event').map((transition) => transition.event);
    return new Set(events).size === events.length;
}

export function buildLuaSections(
    generator: Blockly.CodeGenerator,
    firstBlock: Blockly.Block | null
): LuaSections {
    const chain = splitLuaChain(generator, firstBlock);
    return isFlatEligible(chain.transitions)
        ? renderFlatSections(chain)
        : renderFsmSections(generator, chain);
}
