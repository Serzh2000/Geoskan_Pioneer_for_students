/**
 * Главы 14–20 (уроки 111–145): методы pioneer_sdk без уроков раньше (Python) и функции Lua API (датчики, таймеры, цвет,
 * GPS, камера, mailbox, периферия). Для каждого урока: эталонное решение проходит проверку, заготовка с пропуском нет,
 * типичная ошибка даёт замечание.
 */
import { getSdkPythonAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/sdk-python.js';
import { getLuaExtrasAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/lua-extras.js';
import { gradeSdkPythonAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/sdk-python.js';
import { gradeLuaExtrasAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/lua-extras.js';
import { executeAcademyLua, executeAcademyPython } from './academy-runtime-harness.js';

const pythonLessons = getSdkPythonAcademyPractices();
const luaLessons = getLuaExtrasAcademyPractices();
const LUA_FLIGHTS = [127, 128, 129, 130, 138];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

const runPython = (number: number, code: string) => {
    const outcome = executeAcademyPython(code);
    return { outcome, evaluation: gradeSdkPythonAcademy(number, outcome.samples, outcome.events) };
};
const runLua = (number: number, code: string) => {
    const outcome = executeAcademyLua(code, { flight: LUA_FLIGHTS.includes(number) });
    return { outcome, evaluation: gradeLuaExtrasAcademy(number, outcome.samples, outcome.events) };
};
const errors = (evaluation: { diagnostics: Array<{ kind: string; title: string }> }) => evaluation.diagnostics.filter(item => item.kind === 'error').map(item => item.title);

test('в главах 14–16 уроки Python 111–124, в главах 17–20 уроки Lua 125–145', () => {
    expect(pythonLessons.map(lesson => lesson.academy!.number)).toEqual(range(111, 124));
    expect(luaLessons.map(lesson => lesson.academy!.number)).toEqual(range(125, 145));
});

describe.each(range(111, 124))('Python-урок %i', number => {
    const lesson = pythonLessons.find(item => item.academy!.number === number)!;
    test('эталонное решение проходит проверку', () => {
        const { outcome, evaluation } = runPython(number, lesson.solutionCode);
        expect({ error: outcome.error, errors: errors(evaluation) }).toEqual({ error: null, errors: [] });
        expect(evaluation.solved).toBe(true);
    });
    test('заготовка с пропуском не засчитывается', () => {
        expect(lesson.starterCode).toContain('___');
        expect(runPython(number, lesson.starterCode).evaluation.solved).toBe(false);
    });
});

describe.each(range(125, 145))('Lua-урок %i', number => {
    const lesson = luaLessons.find(item => item.academy!.number === number)!;
    test('эталонное решение проходит проверку', () => {
        const { outcome, evaluation } = runLua(number, lesson.solutionCode);
        expect({ error: outcome.error, errors: errors(evaluation) }).toEqual({ error: null, errors: [] });
        expect(evaluation.solved).toBe(true);
    });
    test('заготовка с пропуском не засчитывается', () => {
        expect(lesson.starterCode).toContain('___');
        expect(runLua(number, lesson.starterCode).evaluation.solved).toBe(false);
    });
});

// Типичные ошибки: подмена метода, неверный аргумент, пропуск шага. [номер, что заменить, на что]
const pythonMistakes: Array<[number, string, string]> = [
    [111, 'get_yaw', 'get_battery_status'],
    [112, 'go_to_local_point_body_fixed(1, 0, 0, 0)', 'go_to_local_point_body_fixed(0, 1, 0, 0)'],
    [112, 'go_to_local_point_body_fixed(1, 0, 0, 0)', 'go_to_local_point_body_fixed(3, 0, 0, 0)'],
    [113, 'set_manual_speed_body_fixed(0.5, 0, 0, 0)', 'set_manual_speed_body_fixed(0.05, 0, 0, 0)'],
    [113, 'set_manual_speed_body_fixed(0.5, 0, 0, 0)', 'set_manual_speed_body_fixed(0, 0.5, 0, 0)'],
    [114, 'pioneer.disarm()', 'pass'],
    [118, 'camera.get_frame()', 'b""'],
    [119, 'stream.stop()', 'pass'],
    [120, 'print("Каналы приняты:", ok)', 'print("Каналы приняты:", False)'],
    [121, 'pioneer.lua_script_upload(script)', 'pass'],
    [122, 'lua_script_control("Start")', 'lua_script_control("Stop")'],
    [123, 'try_get_ap_status', 'try_get_sta_status'],
    [124, 'pioneer.sta_disconnect()', 'pass']
];
test.each(pythonMistakes)('Python: ошибка в уроке %i («%s» → «%s») не засчитывается', (number, from, to) => {
    const lesson = pythonLessons.find(item => item.academy!.number === number)!;
    expect(lesson.solutionCode).toContain(from);
    const { evaluation } = runPython(number, lesson.solutionCode.replace(from, to));
    expect({ number, solved: evaluation.solved, hasMessage: evaluation.diagnostics.every(item => item.title && item.reason && item.fix) }).toEqual({ number, solved: false, hasMessage: true });
});

test('Python 116 и 117: чтение оптического датчика на земле даёт замечание, а не зачёт', () => {
    for (const number of [116, 117]) {
        const code = `from pioneer_sdk import Pioneer\nimport time\npioneer = Pioneer(simulator=True)\nflow_x, flow_y, quality = pioneer.get_optical_flow()\nprint("Поток:", flow_x, flow_y)\nprint("Расстояние:", 0.4)\nprint("Качество:", quality)\nprint("Опыт завершён")`;
        const { evaluation } = runPython(number, code);
        expect({ number, solved: evaluation.solved }).toEqual({ number, solved: false });
    }
});

test('Python 115: порядок и ответы команд захвата проверяются', () => {
    const lesson = pythonLessons.find(item => item.academy!.number === 115)!;
    const swapped = 'from pioneer_sdk import Pioneer\npioneer = Pioneer(simulator=True)\nprint("Отпускание:", pioneer.cargo_release())\nprint("Захват:", pioneer.cargo_grab())\nprint("Опыт завершён")';
    expect(runPython(115, swapped).evaluation.solved).toBe(false);
    expect(runPython(115, lesson.solutionCode).evaluation.solved).toBe(true);
});

const luaMistakes: Array<[number, string, string]> = [
    [125, 'Sensors.accel()', 'Sensors.gyro()'],
    [126, 'Sensors.gyro()', 'Sensors.accel()'],
    [127, 'ap.updateYaw(math.pi / 2)', ''],
    [128, 'ap.updateYaw(math.pi / 2)', ''],
    [129, 'Sensors.altitude()', '99'],
    [130, 'ap.goToLocalPoint(2, 0, 1)', ''],
    [131, 'Sensors.rc()', 'Sensors.accel()'],
    [132, 'timer:stop()', 'count = count'],
    [133, 'started + 2', 'started + 5'],
    [134, 'globalNow + 2', 'globalNow + 5'],
    [136, 'boardNumber', '"x"'],
    [137, 'fromHSV(120, 100, 100)', 'fromHSV(240, 100, 100)'],
    [138, '600859810 + 200', '600859810 + 100'],
    [139, 'print("Результат: "..status)', 'print("Результат: 1")'],
    [140, 'camera.checkRequestRecord())', '1)'],
    [141, 'setHullNumber(7)', 'setHullNumber(8)'],
    [142, 'mailbox.send(me, "привет")', 'mailbox.send(me + 5, "привет")'],
    [143, 'pin:reset()', 'pin:set()'],
    [144, 'port:read(5)', 'port:bytesToRead()'],
    [145, 'bus:exchange("hello", 5)', 'bus:write("hello", 5)']
];
test.each(luaMistakes)('Lua: ошибка в уроке %i («%s» → «%s») не засчитывается', (number, from, to) => {
    const lesson = luaLessons.find(item => item.academy!.number === number)!;
    expect(lesson.solutionCode).toContain(from);
    const { evaluation } = runLua(number, lesson.solutionCode.replace(from, to));
    expect({ number, solved: evaluation.solved, hasMessage: evaluation.diagnostics.every(item => item.title && item.reason && item.fix) }).toEqual({ number, solved: false, hasMessage: true });
});

test('Lua 135: время запуска и номер борта в симуляторе читаются так, как описано в уроке', () => {
    const lesson = luaLessons.find(item => item.academy!.number === 135)!;
    const { outcome, evaluation } = runLua(135, lesson.solutionCode);
    expect(outcome.events.filter(event => event.kind === 'print').map(event => event.text).slice(0, 1)).toEqual(['Время запуска: 0']);
    expect(evaluation.solved).toBe(true);
});

test('у каждого нового урока есть объяснение, шаги, подсказка и два варианта ответа', () => {
    for (const lesson of [...pythonLessons, ...luaLessons]) {
        const number = lesson.academy!.number;
        expect({ number, summary: lesson.summary.length > 200 }).toEqual({ number, summary: true });
        expect({ number, steps: (lesson.taskSteps?.length ?? 0) >= 3 }).toEqual({ number, steps: true });
        expect(lesson.academy!.teaching.choices).toHaveLength(2);
        expect(lesson.academy!.hints[0].length).toBeGreaterThan(10);
        expect(lesson.academy!.doneMessage).toBe('Опыт завершён');
    }
});

test('тексты уроков не смешивают языки', () => {
    const joined = (lesson: (typeof luaLessons)[number]) => [lesson.goal, lesson.builderHint, lesson.expectedOutcome, lesson.academy!.experiment, lesson.academy!.teaching.question,
        ...lesson.academy!.teaching.choices.map(choice => choice.text), ...(lesson.taskSteps || [])].join('\n');
    for (const lesson of luaLessons) expect({ n: lesson.academy!.number, bad: /pioneer\.|time\.sleep|Python|import |\bNone\b/.test(joined(lesson)) }).toEqual({ n: lesson.academy!.number, bad: false });
    for (const lesson of pythonLessons) {
        // Уроки 121 и 122 про скрипты Lua на борту: слово Lua в них по делу.
        const pattern = [121, 122].includes(lesson.academy!.number) ? /\bap\.|Timer\.|Sensors\.|Ledbar|\bnil\b|Ev\./ : /\bap\.|Timer\.|Sensors\.|Ledbar|\bLua\b|\bnil\b|Ev\./;
        expect({ n: lesson.academy!.number, bad: pattern.test(joined(lesson)) }).toEqual({ n: lesson.academy!.number, bad: false });
    }
});

describe('нумерация миссий и id уроков', () => {
    // Импорт внутри теста: quests.ts тянет за собой интерфейс, и ему нужен общий загрузчик модулей Jest.
    const load = async () => (await import('../public/modules/learning/quests.js')).buildAcademyQuests;
    test('id уроков 1–110 не сдвинулись, новые идут в конце', async () => {
        const build = await load();
        const python = build('python');
        expect(python).toHaveLength(124);
        expect(python.map(quest => quest.id)).toEqual(Array.from({ length: 124 }, (_, i) => `academy-${String(i + 1).padStart(3, '0')}`));
        expect(python[108].lesson!.academy!.number).toBe(109);
        expect(python[123].lesson!.academy!.number).toBe(124);
    });
    test('в линии Lua миссии 1–72 прежние, затем уроки 125–145 подряд с номерами миссий 73–93', async () => {
        const build = await load();
        const lua = build('lua');
        expect(lua).toHaveLength(93);
        expect(lua.map(quest => quest.number)).toEqual(Array.from({ length: 93 }, (_, i) => i + 1));
        expect(lua.slice(0, 72).map(quest => quest.id)).toEqual(Array.from({ length: 72 }, (_, i) => `academy-${String(i + 1).padStart(3, '0')}`));
        expect(lua[72].id).toBe('academy-125');
        expect(lua[92].id).toBe('academy-145');
        expect(lua.some(quest => quest.lesson!.academy!.number > 72 && quest.lesson!.academy!.number < 125)).toBe(false);
    });
    test('isAcademyPracticeReady следует каталогу, а не числу 72', async () => {
        const { isAcademyPracticeReady } = await import('../public/modules/ui/mission-guide/academy/practices/index.js');
        expect([1, 72].map(n => [isAcademyPracticeReady(n, 'lua'), isAcademyPracticeReady(n, 'python')])).toEqual([[true, true], [true, true]]);
        expect([73, 110, 111, 124].map(n => [isAcademyPracticeReady(n, 'lua'), isAcademyPracticeReady(n, 'python')])).toEqual([[false, true], [false, true], [false, true], [false, true]]);
        expect([125, 145].map(n => [isAcademyPracticeReady(n, 'lua'), isAcademyPracticeReady(n, 'python')])).toEqual([[true, false], [true, false]]);
    });
});
