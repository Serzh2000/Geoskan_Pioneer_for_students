// Python-рантайм для pioneer_*-блоков (§4.4 плана): все команды pioneer_sdk
// неблокирующие, поэтому последовательность строится опросом состояния —
// без корутин, в отличие от Lua-таргета (targets/lua-runtime.ts).
//
// [пересмотрено 2026-09-14] Раньше здесь был фиксированный пролог с четырьмя
// именованными обёртками (_pioneer_wait_armed/_takeoff/_landed/_point) и
// хардкодом `import math` / `_pioneer_t0 = time.time()`, печатавшимися в
// КАЖДОЙ программе независимо от того, какие блоки реально на холсте
// (ученику показывали 4 функции ожидания даже для одной команды "взлететь").
// Теперь единственный по-настоящему общий кусок — сам опрос-примитив
// `_pioneer_wait(condition, timeout, message)`; конкретные условия ожидания
// (ARMED/MISSION/DISARMED/point_reached) блоки полёта (blocks/flight.ts)
// подставляют инлайном прямо в месте вызова, а `_pioneer_wait`, `import math`
// и `_pioneer_t0` попадают в headerDefinitions через generator.definitions_
// только когда их реально использует хотя бы один блок на холсте — тем же
// приёмом, что уже был у LED/position-хелперов (blocks/leds.ts, blocks/sensors.ts).
export type PythonProgramParts = {
    // Хелперы pioneer_*-блоков (definitions_), добавляются только при использовании.
    headerDefinitions: string;
    // Код цепочки pioneer_start (без отступа — тело идёт на верхнем уровне модуля).
    body: string;
};

export function buildPythonProgram({ headerDefinitions, body }: PythonProgramParts): string {
    const sections = [
        '# @pioneer-blockly v1\nfrom pioneer_sdk import Pioneer\nimport time',
        'pioneer = Pioneer(simulator=True)'
    ];
    if (headerDefinitions) sections.push(headerDefinitions);
    if (body) sections.push(body.replace(/\n+$/, ''));
    sections.push('pioneer.close_connection()');
    return `${sections.join('\n\n')}\n`;
}
