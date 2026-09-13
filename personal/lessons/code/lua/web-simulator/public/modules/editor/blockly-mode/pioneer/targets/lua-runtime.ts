// Lua-рантайм для pioneer_*-блоков (§4.3 плана): тело pioneer_start исполняется
// в coroutine, ожидание события/времени делает yield, а Timer.callLater и
// callback(event) возобновляют её через __resume(). sleep() рантайма
// симулятора здесь НЕ используется — он сам сделан через lua_yield и ломает
// возобновление вложенной корутины (см. §2 плана, timers.ts:99-117).
export type LuaProgramParts = {
    // Пользовательские функции (procedures_def*) и хелперы блоков (LED и т.п.),
    // добавленные через definitions_ — печатаются один раз, до __main().
    headerDefinitions: string;
    // Код цепочки pioneer_start, уже с отступом под тело __main().
    body: string;
    // Ветки pioneer_on_event (фаза 5), уже с отступом под тело callback().
    eventBranches: string;
};

export function buildLuaProgram({ headerDefinitions, body, eventBranches }: LuaProgramParts): string {
    const header = headerDefinitions ? `${headerDefinitions}\n\n` : '';
    return `-- @pioneer-blockly v1
local __co = nil
local __waiting_event = nil
local __t0 = time()

local function __resume()
    if __co == nil or coroutine.status(__co) ~= "suspended" then return end
    local ok, err = coroutine.resume(__co)
    if not ok then error(err) end
end

local function __wait_event(ev)
    __waiting_event = ev
    coroutine.yield()
end

local function __wait_seconds(t)
    Timer.callLater(t, __resume)
    coroutine.yield()
end

local function __tick() __wait_seconds(0.05) end

${header}local function __main()
${body}end

function callback(event)
${eventBranches}    if __waiting_event ~= nil and event == __waiting_event then
        __waiting_event = nil
        __resume()
    end
end

__co = coroutine.create(__main)
__resume()
`;
}
