// Lua-рантайм для pioneer_*-блоков (§4.3 плана, ПЕРЕСМОТРЕНО 2026-09-13, см.
// §2.1): тело pioneer_start компилируется в конечный автомат по состояниям
// (FSM), как в официальных примерах Geoskan и в генераторе TRIK Studio —
// action["__sN"] = function() ... end, callback(event) переключает __state
// и вызывает __advance(). Корутины НЕ используются вообще: ни один реальный
// скрипт (свой или из TRIK Studio) их не использует, официальная документация
// прямо не рекомендует sleep(), а sleep()/coroutine.yield() рантайма
// симулятора (timers.ts:99-117) в принципе ломает вложенную пользовательскую
// корутину — см. §2 плана. Сегменты и переходы собирает targets/lua-fsm.ts.
//
// [пересмотрено 2026-09-14] Здесь ДВА сборщика программы, а не один:
// buildFlatLuaProgram() для линейной цепочки без повторяющихся событий
// (buildLuaSections() возвращает mode: 'flat') и buildLuaProgram() — полный
// FSM для всего остального. Плоский вариант — это то, что владелец увидел в
// рукописных примерах: таблица состояний, __state и __advance() там не нужны
// вообще, потому что пришедшее событие само однозначно указывает следующий
// шаг. Полный FSM остаётся обязательным, как только имя события повторяется
// (две pioneer_go_to подряд ждут один и тот же Ev.POINT_REACHED) — см.
// targets/lua-fsm.ts, isFlatEligible().
export type LuaProgramParts = {
    // definitions_ (LED/position-хелперы блоков, пользовательские функции
    // procedures_def*) — печатаются один раз, до объявления состояний.
    headerDefinitions: string;
    // action["__sN"] = function() ... end, по одной записи на состояние —
    // собирает targets/lua-fsm.ts (buildLuaFsmSections).
    segmentsCode: string;
    // Ветки-переходы по событию вида `if __state == "__sN" and event == Ev.X
    // then __state = "__sN+1"; __advance() end` — по одной на блок ожидания
    // события (preflight/takeoff/go_to/land).
    transitionBranches: string;
    // Ветки pioneer_on_event (фаза 5): побочные обработчики событий, не
    // двигают __state и не должны получить свой forward-reference (см. ниже).
    eventBranches: string;
};

// __advance() объявлена в тексте прогрраммы ДО таблицы action[...], а не
// после неё, как в черновике плана (§4.3): сегменты состояний сами вызывают
// __advance() из своего Timer.callLater-перехода (pioneer_wait, см.
// targets/lua-fsm.ts), а Lua резолвит имя локальной переменной как upvalue
// только начиная с точки её объявления в исходном тексте. Объяви __advance
// после action[...] — и эти вызовы стали бы обращением к одноимённой
// глобальной переменной (nil), потому что на момент создания замыкания
// локальная __advance ещё не существовала бы.
// Пустая программа (пустой pioneer_start) не должна тащить за собой то, чем
// не пользуется — тот же принцип, что для LED/position-хелперов и
// Python-хелперов ожидания (см. §4.4 плана): __t0 нужен только блоку
// pioneer_time, __loop_guard — только когда в коде реально есть цикл
// (INFINITE_LOOP_TRAP печатает вызов __loop_guard() только внутри тела
// controls_repeat_ext/controls_whileUntil/controls_for, см. compile.ts).
// Проверяем по тексту, а не по типам блоков на холсте: цикл или pioneer_time
// может быть спрятан внутри пользовательской функции (headerDefinitions) или
// ветки pioneer_on_event (eventBranches), а не только в основной цепочке.
function usesMarker(marker: string, sources: string[]): boolean {
    return sources.some((source) => source.includes(marker));
}

// Общая для обоих сборщиков часть пролога: то, что печатается только при
// фактическом использовании. Порядок строк (сначала __t0, потом __loop_guard)
// совпадает с исходным шаблоном FSM — вывод FSM-режима от этого выделения в
// отдельную функцию не меняется ни на байт.
function buildConditionalPreamble(sources: string[]): string {
    const clockLine = usesMarker('__t0', sources) ? 'local __t0 = time()\n' : '';
    const loopGuard = usesMarker('__loop_guard(', sources)
        ? '\n-- Защита от зависания в цикле без блоков-ожидания: считает итерации, не\n'
            + '-- отдаёт управление — обычный синхронный Lua-цикл здесь никуда не yield\'ит.\n'
            + 'local __loop_guard_count = 0\n'
            + 'local function __loop_guard()\n'
            + '    __loop_guard_count = __loop_guard_count + 1\n'
            + '    if __loop_guard_count > 1000000 then\n'
            + '        error("Похоже, программа зависла в бесконечном цикле")\n'
            + '    end\n'
            + 'end\n'
        : '';
    return `${clockLine}${loopGuard}`;
}

export function buildLuaProgram({
    headerDefinitions,
    segmentsCode,
    transitionBranches,
    eventBranches
}: LuaProgramParts): string {
    const header = headerDefinitions ? `${headerDefinitions}\n\n` : '';
    const preamble = buildConditionalPreamble([
        headerDefinitions, segmentsCode, eventBranches, transitionBranches
    ]);

    return `-- @pioneer-blockly v1
local __state = "__s0"
${preamble}
local action = {}

local function __advance()
    local current = action[__state]
    if current ~= nil then current() end
end

${header}${segmentsCode}
function callback(event)
${eventBranches}${transitionBranches}end

__advance()
`;
}

export type LuaFlatProgramParts = {
    // То же, что и у FSM-варианта: definitions_ блоков и пользовательские
    // функции.
    headerDefinitions: string;
    // Код первого шага — он выполняется сразу при запуске скрипта, поэтому
    // печатается на верхнем уровне, без обёртки в action[...]/__advance().
    topLevelCode: string;
    // Плоские соседние ветки `if event == Ev.X then ... end`, по одной на
    // блок-ожидание события (targets/lua-fsm.ts).
    callbackBranches: string;
    // Ветки pioneer_on_event — как и в FSM-режиме, независимые побочные
    // обработчики, печатаются первыми.
    eventBranches: string;
};

// Плоская программа (§4.3 плана, дополнено 2026-09-14): ни __state, ни
// таблицы action, ни __advance() — как в рукописных примерах Geoskan.
// Условный пролог (__t0/__loop_guard) работает здесь тем же способом, что и в
// FSM-варианте: по текстовому поиску маркера. function callback(event)
// печатаем ВСЕГДА, даже с пустым телом: mission-guard.ts пропускает больше
// одной команды миссии только скриптам, в которых он видит `function
// callback(`, — программа вроде «повернуться на курс + выключить моторы»
// (переходов нет вовсе, а команд две) без этого объявления упёрлась бы в
// лимит рантайма.
export function buildFlatLuaProgram({
    headerDefinitions,
    topLevelCode,
    callbackBranches,
    eventBranches
}: LuaFlatProgramParts): string {
    const header = headerDefinitions ? `${headerDefinitions}\n\n` : '';
    const preamble = buildConditionalPreamble([
        headerDefinitions, topLevelCode, eventBranches, callbackBranches
    ]);
    const preambleBlock = preamble ? `${preamble}\n` : '';

    return `-- @pioneer-blockly v1
${preambleBlock}${header}${topLevelCode}
function callback(event)
${eventBranches}${callbackBranches}end
`;
}
