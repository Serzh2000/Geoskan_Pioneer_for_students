// Python-рантайм для pioneer_*-блоков (§4.4 плана): все команды pioneer_sdk
// неблокирующие, поэтому последовательность строится опросом состояния —
// без корутин, в отличие от Lua-таргета (targets/lua-runtime.ts).
export type PythonProgramParts = {
    // LED/position-хелперы (definitions_), добавляются только при использовании блока.
    headerDefinitions: string;
    // Код цепочки pioneer_start (без отступа — тело идёт на верхнем уровне модуля).
    body: string;
};

// Условия для _pioneer_wait_armed/_takeoff/_landed взяты из маппинга
// get_autopilot_state() в pioneer-js-bridge.ts (~стр. 205): PREFLIGHT -> ARMED,
// (FLYING_HOVER|FLYING_MOVING) -> MISSION, IDLE -> DISARMED. Так что "взлёт
// завершён" — это переход в MISSION, а не в отдельное состояние TAKEOFF.
const WAIT_HELPERS = `def _pioneer_wait(condition, timeout, message):
    started = time.time()
    while not condition():
        if time.time() - started > timeout:
            raise RuntimeError(message)
        time.sleep(0.05)

def _pioneer_wait_point():
    _pioneer_wait(pioneer.point_reached, 60, 'Дрон не долетел до точки за 60 секунд')

def _pioneer_wait_armed():
    _pioneer_wait(lambda: pioneer.get_autopilot_state() == 'ARMED', 15, 'Моторы не запустились за 15 секунд')

def _pioneer_wait_takeoff():
    _pioneer_wait(lambda: pioneer.get_autopilot_state() == 'MISSION', 30, 'Дрон не взлетел за 30 секунд')

def _pioneer_wait_landed():
    _pioneer_wait(lambda: pioneer.get_autopilot_state() == 'DISARMED', 30, 'Дрон не приземлился за 30 секунд')`;

export function buildPythonProgram({ headerDefinitions, body }: PythonProgramParts): string {
    const sections = [
        '# @pioneer-blockly v1\nfrom pioneer_sdk import Pioneer\nimport time\nimport math',
        'pioneer = Pioneer(simulator=True)\n_pioneer_t0 = time.time()',
        WAIT_HELPERS
    ];
    if (headerDefinitions) sections.push(headerDefinitions);
    if (body) sections.push(body.replace(/\n+$/, ''));
    sections.push('pioneer.close_connection()');
    return `${sections.join('\n\n')}\n`;
}
