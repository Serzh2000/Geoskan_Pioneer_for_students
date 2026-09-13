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
export function buildLuaProgram({
    headerDefinitions,
    segmentsCode,
    transitionBranches,
    eventBranches
}: LuaProgramParts): string {
    const header = headerDefinitions ? `${headerDefinitions}\n\n` : '';
    return `-- @pioneer-blockly v1
local __state = "__s0"
local __t0 = time()

-- Защита от зависания в цикле без блоков-ожидания: считает итерации, не
-- отдаёт управление — обычный синхронный Lua-цикл здесь никуда не yield'ит.
local __loop_guard_count = 0
local function __loop_guard()
    __loop_guard_count = __loop_guard_count + 1
    if __loop_guard_count > 1000000 then
        error("Похоже, программа зависла в бесконечном цикле")
    end
end

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
