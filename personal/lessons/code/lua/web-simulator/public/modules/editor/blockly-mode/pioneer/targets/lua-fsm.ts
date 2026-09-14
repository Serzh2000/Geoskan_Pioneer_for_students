import * as Blockly from 'blockly';

// Однострочные вызовы-маркеры, которыми блоки модели ожидания (flight.ts:
// preflight/takeoff/go_to/land, time.ts: pioneer_wait, camera.ts:
// pioneer_camera_take_photo) заканчивают СОБСТВЕННЫЙ сгенерированный код. Это
// не настоящие Lua-функции — в готовый скрипт они никогда не попадают:
// splitLuaChain() вырезает их из текста блока и превращает в переход между
// шагами программы (§4.3 плана, пересмотрено 2026-09-13 — FSM вместо
// корутины, см. §2.1).
//
// Третий маркер, __wait_poll, добавлен 2026-09-14 вместе с блоком «Сделать
// снимок»: камера симулятора (modules/lua/hardware/camera.ts) НЕ шлёт события
// автопилота (Ev.*) и не укладывается в фиксированную задержку — она отдаёт
// готовность отдельной проверкой camera.checkRequestShot(), которая станет
// истинной через неизвестное короткое время (следующий requestAnimationFrame
// плюс кодирование PNG). Аргумент маркера — готовое булево Lua-выражение,
// которое переход опрашивает до истинности.
const WAIT_EVENT_MARKER = '__wait_event';
const WAIT_SECONDS_MARKER = '__wait_seconds';
const WAIT_POLL_MARKER = '__wait_poll';

// Интервал опроса для перехода kind: 'poll'. 0.05 с — тот же порядок, что у
// Python-хелпера _pioneer_position (blocks/sensors.ts, time.sleep(0.05)):
// снимок готов уже через один-два кадра, поэтому ждать дольше незачем, а
// чаще — бессмысленно, потому что до следующего requestAnimationFrame
// (~16 мс) условие всё равно не изменится. Более длинный интервал 0.1 из
// pollWhile() (blocks/flight.ts) здесь не нужен: там он защищает от двух
// команд автопилота в одном тике симулятора, а requestMakeShot() командой
// автопилота не является и в recordTickCommand не попадает.
const POLL_INTERVAL_SECONDS = '0.05';

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

// Переход между соседними сегментами: ожидание события от автопилота,
// ожидание времени (pioneer_wait) или опрос условия (pioneer_camera_take_photo).
// Разделение важно для проверки пригодности к плоскому режиму: повторяться
// безопасно могут таймер и опрос — у каждого из них своё независимое
// замыкание Timer.callLater, и только событие создаёт неоднозначность.
type LuaTransition =
    | { kind: 'event'; event: string }
    | { kind: 'timer'; seconds: string }
    | { kind: 'poll'; checkExpr: string };

// Инвариант: segments.length === transitions.length + 1. transitions[i]
// соединяет segments[i] и segments[i + 1]; последний сегмент терминальный,
// после него переходов нет (он может быть и пустым — если программа
// заканчивается блоком-ожиданием).
type LuaChain = { segments: string[]; transitions: LuaTransition[] };

const stateName = (index: number) => `__s${index}`;
// Имя замыкания-опроса привязано к номеру шага, а не к типу блока: два
// «Сделать снимок» подряд дают __poll_s0 и __poll_s1, и вложенное объявление
// второго внутри тела первого (плоский режим) не затеняет первое.
const pollName = (index: number) => `__poll_s${index}`;

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

        const pollMarker = extractMarker(code, WAIT_POLL_MARKER);
        if (pollMarker) {
            segments.push(buffer + pollMarker.plainCode);
            transitions.push({ kind: 'poll', checkExpr: pollMarker.argument });
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

// Переход-опрос внутри сегмента FSM: как и таймер, печатается прямо в теле
// состояния и не требует ветки в callback(event) — камера никаких Ev.* не
// шлёт. Отличие от таймера ровно одно: время до готовности неизвестно,
// поэтому замыкание перезаводит само себя, пока условие ложно. Проверка
// `__state ~= fromState` обязательна и здесь, и в первой строке: без неё
// брошенный опрос (программу успели увести дальше, например веткой
// pioneer_on_event) остался бы в очереди таймеров навсегда.
function fsmPollTransition(checkExpr: string, index: number): string {
    const from = stateName(index);
    const to = stateName(index + 1);
    const poll = pollName(index);
    return `local function ${poll}()\n`
        + `    if __state ~= "${from}" then return end\n`
        + `    if ${checkExpr} then\n`
        + `        __state = "${to}"\n`
        + '        __advance()\n'
        + '    else\n'
        + `        Timer.callLater(${POLL_INTERVAL_SECONDS}, ${poll})\n`
        + '    end\n'
        + 'end\n'
        + `Timer.callLater(${POLL_INTERVAL_SECONDS}, ${poll})\n`;
}

// Хвост сегмента FSM, который блок-ожидание дописывает себе сам. Ветку в
// callback(event) получает только 'event' — у него хвоста в теле состояния нет.
function fsmTransitionTail(transition: LuaTransition | undefined, index: number): string {
    if (!transition) return '';
    if (transition.kind === 'timer') {
        return fsmTimerTransition(transition.seconds, stateName(index), stateName(index + 1));
    }
    if (transition.kind === 'poll') {
        return fsmPollTransition(transition.checkExpr, index);
    }
    return '';
}

function renderFsmSections(generator: Blockly.CodeGenerator, chain: LuaChain): LuaFsmSections {
    const segmentsCode = chain.segments
        .map((body, index) => {
            const full = body + fsmTransitionTail(chain.transitions[index], index);
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
// только у Timer.callLater и у замыкания-опроса: второй таймер физически
// нельзя завести до того, как выполнится тело первого, и точно так же
// следующий шаг не может начаться раньше, чем условие опроса станет истинным.
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

        // Опрос вкладывает продолжение по той же причине, что и таймер:
        // следующий шаг физически не может начаться раньше, чем условие
        // станет истинным. Проверки __state здесь нет и быть не может — в
        // плоском режиме его не существует вовсе (§4.3 плана): раз ветки
        // callback однозначны, то и брошенных замыканий не бывает.
        if (transition.kind === 'poll') {
            const poll = pollName(index);
            return `${body}local function ${poll}()\n`
                + `    if ${transition.checkExpr} then\n`
                + `${indentLuaBlock(indentLuaBlock(renderFrom(index + 1)))}`
                + '    else\n'
                + `        Timer.callLater(${POLL_INTERVAL_SECONDS}, ${poll})\n`
                + '    end\n'
                + 'end\n'
                + `Timer.callLater(${POLL_INTERVAL_SECONDS}, ${poll})\n`;
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
// отдельное замыкание Timer.callLater, их сколько угодно. Переходы-опросы
// (pioneer_camera_take_photo) — тоже: у каждого своё замыкание __poll_sN со
// своим именем, а условие проверяется прямо в нём, а не по общему на всю
// программу имени события. Оба вида фильтром ниже не отбираются вовсе.
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
