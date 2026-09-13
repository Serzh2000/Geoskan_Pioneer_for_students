// Lua-рантайм для pioneer_*-блоков (§4.3 плана, ПЕРЕСМОТРЕНО 2026-09-13, см.
// §2.1): тело pioneer_start компилируется в конечный автомат по состояниям
// (FSM), как в официальных примерах Geoskan и в генераторе TRIK Studio —
// action["__sN"] = function() ... end, callback(event) переключает __state
// и вызывает __advance(). Корутины НЕ используются вообще: ни один реальный
// скрипт (свой или из TRIK Studio) их не использует, официальная документация
// прямо не рекомендует sleep(), а sleep()/coroutine.yield() рантайма
// симулятора (timers.ts:99-117) в принципе ломает вложенную пользовательскую
// корутину — см. §2 плана. Сегменты и переходы собирает targets/lua-fsm.ts.
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
function usesMarker(marker: string, ...sources: string[]): boolean {
    return sources.some((source) => source.includes(marker));
}

export function buildLuaProgram({
    headerDefinitions,
    segmentsCode,
    transitionBranches,
    eventBranches
}: LuaProgramParts): string {
    const header = headerDefinitions ? `${headerDefinitions}\n\n` : '';
    const needsClock = usesMarker('__t0', headerDefinitions, segmentsCode, eventBranches, transitionBranches);
    const needsLoopGuard = usesMarker('__loop_guard(', headerDefinitions, segmentsCode, eventBranches, transitionBranches);

    const clockLine = needsClock ? 'local __t0 = time()\n' : '';
    const loopGuard = needsLoopGuard
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

    return `-- @pioneer-blockly v1
local __state = "__s0"
${clockLine}${loopGuard}
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
