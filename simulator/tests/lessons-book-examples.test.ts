/**
 * Примеры из учебника (book/tex, сборка — book/build.bat).
 *
 * Книга вставляет код только из файлов examples/ через окружения
 * \begin{codefile} и \begin{codefiletitle}. Этот набор читает main.tex, собирает
 * все такие ссылки и прогоняет каждый файл:
 * - Lua — в настоящем рантайме симулятора (Fengari + физика + автопилот):
 *   программа не должна падать, предстартовый валидатор не должен ругаться,
 *   а полётные примеры должны взлететь, пройти свои точки и сесть;
 * - примеры по основам Python — в CPython как есть, по выводу;
 * - примеры с pioneer_sdk — на поддельном SDK (helpers/python/run_scenario.py);
 * - примеры, которым нужен настоящий дрон с камерой (cv2, mediapipe), хотя бы
 *   компилируются.
 * Если дерево уроков не выкачано (деплой одной папки simulator), набор пропускается.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setupLuaSim, type LuaSim, type RunOptions, type SimEvent } from './helpers/lua-sim-harness.js';
import { findPython, runPythonScenario, type PythonScenario } from './helpers/python-sdk-harness.js';
import { runRos2 } from './helpers/ros2-runtime.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const TEX = path.join(REPO, 'book', 'tex');
const CODE = path.join(REPO, 'examples');
const available = fs.existsSync(path.join(TEX, 'main.tex')) && fs.existsSync(CODE);
const describeBook = available ? describe : describe.skip;

type CodeRef = { chapter: string; file: string; language: string };

/** Главы из main.tex и вложенные \input (03_bricks.tex сам подключает 03a_bricks_projects.tex). */
function chapterFiles(): string[] {
    const found: string[] = [];
    const visit = (file: string) => {
        const source = fs.readFileSync(path.join(TEX, file), 'utf8');
        for (const match of source.matchAll(/^\s*\\input\{([^}]+)\}/gm)) {
            const name = match[1].endsWith('.tex') ? match[1] : `${match[1]}.tex`;
            if (!name.startsWith('chapters/') || found.includes(name)) continue;
            found.push(name);
            visit(name);
        }
    };
    visit('main.tex');
    return found;
}

function collectCodeRefs(): CodeRef[] {
    const refs: CodeRef[] = [];
    const pattern = /\\begin\{(codefile|codefiletitle)\}(?:\[(\w+)\])?\{([^}]*)\}(?:\{([^}]*)\})?/g;
    for (const chapter of chapterFiles()) {
        const source = fs.readFileSync(path.join(TEX, chapter), 'utf8');
        for (const match of source.matchAll(pattern)) {
            const file = match[1] === 'codefiletitle' ? match[4] : match[3];
            if (!file) continue;
            refs.push({ chapter, file, language: match[2] ?? (file.endsWith('.lua') ? 'lua' : 'python') });
        }
    }
    return refs;
}

const refs = available ? collectCodeRefs() : [];
const unique = (files: CodeRef[]) => [...new Map(files.map((ref) => [ref.file, ref])).values()];
const luaRefs = unique(refs.filter((ref) => ref.file.endsWith('.lua')));
const pythonRefs = unique(refs.filter((ref) => ref.file.endsWith('.py')));
const otherRefs = unique(refs.filter((ref) => !ref.file.endsWith('.lua') && !ref.file.endsWith('.py')));

// --------------------------------------------------------------------------
// Lua

const EV = { TAKEOFF_COMPLETE: 6, COPTER_LANDED: 7, POINT_REACHED: 10, LOW_VOLTAGE2: 14, SHOCK: 16 };

type LuaExpectation = {
    /** Сколько секунд модельного времени гонять программу (по умолчанию 45). */
    seconds?: number;
    /** Что должно случиться, по порядку (подпоследовательность трассы). */
    trace?: string[];
    /** Что программа должна напечатать, по порядку. */
    prints?: string[];
    /** Пример специально показывает ошибку: валидатор обязан её найти, запускать нельзя. */
    deliberatelyBlocking?: boolean;
    /** Что делает «мир» во время полёта: события автопилота, тумблеры пульта. */
    onStep?: RunOptions['onStep'];
    prelude?: string;
};

const fire = (at: number, eventId: number): RunOptions['onStep'] => {
    let done = false;
    return (t, api) => {
        if (!done && t >= at) {
            done = true;
            api.triggerEvent(eventId);
        }
    };
};

const square = ['goto -0.5,-0.5,0.9', 'goto 0.5,-0.5,0.9', 'goto 0.5,0.5,0.9', 'goto -0.5,0.5,0.9'];
const LANDED = ['fsm LANDING_PROCESS', 'fsm IDLE'];
const TAKEOFF = ['fsm PREFLIGHT', 'fsm TAKEOFF_PROCESS'];

const LUA_EXPECTATIONS: Record<string, LuaExpectation> = {
    // --- первая программа и язык ---------------------------------------------
    'getting_started_hello.lua': { seconds: 1, prints: ['Системы в норме. Привет, Пионер!'] },
    'lua_intro_basics.lua': { seconds: 1, prints: ['10\tLua\t3'] },
    'lua_strings_concat.lua': { seconds: 1, prints: ['высота, м: 2', '7\tPioneer!'] },
    'variables_intro.lua': { seconds: 1, prints: ['number\tstring\tboolean\ttable', '2\t1'] },
    'lua_variables_tables.lua': { seconds: 1, prints: ['3\t40\t4'] },
    'lua_arithmetic_ops.lua': { seconds: 1, prints: ['14\t1\t8.0', 'true\ttrue', '4\t5.0'] },
    'lua_logic_ops.lua': { seconds: 1, prints: ['true\t1\ttrue', 'true\ttrue'] },
    'lua_conditions_if.lua': { seconds: 1, prints: ['positive', 'zero', 'negative'] },
    'lua_conditions_check.lua': { seconds: 1, prints: ['84', 'нет данных'] },
    'loops_sum.lua': { seconds: 1, prints: ['55'] },
    'loops_while.lua': { seconds: 1, prints: ['5', '0'] },
    'loops_iterators.lua': { seconds: 1, prints: ['20\t40\t60', '2\t3'] },
    'lua_functions.lua': { seconds: 1, prints: ['1.5', '2.0', 'red\tzero'] },
    'lua_platform_infinite_loop.lua': { deliberatelyBlocking: true },
    // --- светодиоды ----------------------------------------------------------
    'leds_basic_green.lua': { seconds: 1, trace: ['led 0 0,255,0', 'led 3 0,255,0'] },
    'leds_sleep.lua': { seconds: 3, trace: ['led 0 255,0,0', 'led 0 0,255,0', 'led 0 0,0,0'] },
    'leds_api_change_color.lua': { seconds: 1, trace: ['led 0 255,255,0', 'led 3 255,255,0'] },
    'leds_addressing_research.lua': { seconds: 1, trace: ['led 0 255,0,0'] },
    'leds_timers_blink.lua': { seconds: 3, trace: ['led 0 255,0,0', 'led 0 0,0,0', 'led 0 255,0,0'] },
    'leds_timers_delayed.lua': { seconds: 4, trace: ['led 0 0,0,255'] },
    'leds_timers_callback_delayed.lua': { seconds: 4, onStep: fire(1, EV.LOW_VOLTAGE2), trace: ['led 0 255,0,0'] },
    'leds_events_landed.lua': { seconds: 3, onStep: fire(1, EV.COPTER_LANDED), trace: ['led 0 255,255,255', 'led 0 0,0,0'] },
    'leds_events_preflight.lua': { seconds: 3, trace: ['fsm PREFLIGHT', 'led 0 0,255,0'], prints: ['этап: ожидание', 'этап: готовность'] },
    'leds_events_low_voltage.lua': {
        seconds: 5, onStep: fire(2, EV.LOW_VOLTAGE2),
        trace: ['led 0 0,255,0', 'led 0 0,0,0', 'led 0 255,0,0']
    },
    'leds_traffic_light.lua': {
        seconds: 7, trace: ['led 0 255,0,0', 'led 0 255,255,0', 'led 0 0,255,0', 'led 0 255,0,0']
    },
    'leds_random_color_example.lua': { seconds: 3, onStep: fire(1.5, EV.LOW_VOLTAGE2), trace: ['led 0 255,0,0'] },
    // Внутри одного тика трасса пишет сначала автомат и точки, потом светодиоды,
    // поэтому цвет, включённый вместе с командой, стоит после неё.
    'leds_mission_stages.lua': {
        seconds: 60,
        trace: ['led 0 255,255,255', 'fsm TAKEOFF_PROCESS', 'goto 0,0.5,0.8', 'led 0 0,255,0', 'led 0 0,0,255', 'fsm IDLE', 'led 0 0,0,0']
    },
    // --- миссии --------------------------------------------------------------
    'missions_engines_arm.lua': { seconds: 3, trace: ['fsm PREFLIGHT'], prints: ['Моторы запущены'] },
    'mission_takeoff_landing.lua': { seconds: 40, trace: [...TAKEOFF, 'fsm FLYING_HOVER', ...LANDED] },
    'missions_straight_flight.lua': { seconds: 40, trace: [...TAKEOFF, 'goto 1,0,0.8', ...LANDED] },
    'missions_telemetry.lua': { seconds: 60, trace: [...TAKEOFF, 'goto 2,0,1', ...LANDED] },
    'missions_points_flight.lua': {
        seconds: 60, trace: [...TAKEOFF, 'goto 0,0.5,0.8', 'goto 0.5,0.5,0.8', 'goto 0.5,0,0.8', 'goto 0,0,0.8', ...LANDED]
    },
    'missions_triangle_flight.lua': { seconds: 60, trace: [...TAKEOFF, 'goto 0.6,0,0.9', 'goto -0.3,0.52,0.9', 'goto -0.3,-0.52,0.9', ...LANDED] },
    'missions_square_flight.lua': { seconds: 60, trace: [...TAKEOFF, ...square, ...LANDED] },
    'missions_circle_timer.lua': { seconds: 60, trace: [...TAKEOFF, 'goto 1,0,1', 'goto 0,0,1', ...LANDED] },
    'missions_circle_yaw_timer.lua': { seconds: 60, trace: [...TAKEOFF, 'goto 0,0,0.7', ...LANDED] },
    'missions_lesson12_circle_points.lua': {
        seconds: 90,
        trace: ['led 0 255,0,0', 'led 0 255,255,255', 'fsm TAKEOFF_PROCESS', 'goto 0.43,0.25,0.8', 'led 0 0,255,0',
            'goto 0.5,0,0.8', 'led 0 0,0,255', 'fsm IDLE', 'led 0 0,0,0']
    },
    'missions_lesson14_circle.lua': {
        seconds: 90,
        trace: ['led 0 255,255,255', 'fsm TAKEOFF_PROCESS', 'goto 0.5,0,0.8', 'led 0 255,255,0', 'led 0 255,0,255',
            'goto 0,0,0.8', 'led 0 0,0,255', 'fsm IDLE', 'led 0 0,0,0']
    },
    'missions_rc_initiation.lua': {
        seconds: 90,
        onStep: (t, api) => { if (t >= 1 && t < 3) api.setRcSwitch(8, 2000); else if (t >= 3) api.setRcSwitch(8, 1000); },
        trace: [...TAKEOFF, 'goto 0,2,1', 'goto 0,1,1', 'goto 0,2,1', 'goto 0,1,1', ...LANDED]
    },
    'missions_local_points_leds.lua': {
        seconds: 60, trace: ['led 0 255,255,255', 'fsm TAKEOFF_PROCESS', 'goto -0.6,0.3,0.2', 'goto 0.6,0.3,0.2', 'goto 0,0,0.5', 'goto 0.6,-0.3,0.2', ...LANDED]
    },
    'missions_failsafe.lua': {
        seconds: 40, onStep: fire(12, EV.LOW_VOLTAGE2), trace: [...TAKEOFF, 'goto 1,0,1', 'led 0 255,0,0', 'fsm IDLE']
    }
};

/** Строка - точное совпадение события, RegExp - для событий со временем, датой или именем файла. */
type TraceItem = string | RegExp;
const matches = (item: TraceItem, name: string) => (typeof item === 'string' ? name === item : item.test(name));

function expectSubsequence(events: SimEvent[], expected: TraceItem[]) {
    const names = events.map((event) => event.what);
    let i = 0;
    for (const name of names) if (i < expected.length && matches(expected[i], name)) i += 1;
    expect({ missing: expected.slice(i).map(String), trace: names }).toEqual({ missing: [], trace: names });
}

// Логгер симулятора без страницы ничего не пишет, поэтому print перехватываем
// на стороне Lua: строки копятся в глобальной таблице, которую тест читает
// на каждом шаге физики.
const PRINT_PRELUDE = '__harness_prints = {} print = function(...) local parts = {} '
    + 'for i = 1, select("#", ...) do parts[i] = tostring((select(i, ...))) end '
    + '__harness_prints[#__harness_prints + 1] = table.concat(parts, "\\t") end';

describeBook('примеры из книги: Lua в симуляторе', () => {
    let sim: LuaSim;
    let collectLuaIssues: (code: string) => string[];
    let collectLuaBlockingIssues: (code: string) => string[];
    let fengari: any;

    beforeAll(async () => {
        sim = await setupLuaSim();
        ({ collectLuaIssues, collectLuaBlockingIssues } = await import('../public/modules/app/script-execution-notice/lua-validation.js'));
        // @ts-expect-error The underlying Lua VM has no TypeScript declarations.
        fengari = await import('fengari');
    });

    function readPrints(L: unknown): string[] {
        const { lua, to_luastring, to_jsstring } = fengari;
        lua.lua_getglobal(L, to_luastring('__harness_prints'));
        const count = lua.lua_istable(L, -1) ? lua.lua_rawlen(L, -1) : 0;
        const lines: string[] = [];
        for (let i = 1; i <= count; i += 1) {
            lua.lua_rawgeti(L, -1, i);
            lines.push(to_jsstring(lua.lua_tostring(L, -1)));
            lua.lua_pop(L, 1);
        }
        lua.lua_pop(L, 1);
        return lines;
    }

    test('книга ссылается только на существующие файлы', () => {
        const missing = refs.filter((ref) => !fs.existsSync(path.join(CODE, ref.file))).map((ref) => `${ref.chapter}: ${ref.file}`);
        expect(missing).toEqual([]);
    });

    test('у каждого Lua-примера есть описание ожидаемого поведения', () => {
        const unknown = luaRefs.map((ref) => path.basename(ref.file)).filter((name) => !(name in LUA_EXPECTATIONS));
        expect(unknown).toEqual([]);
    });

    test.each(luaRefs.map((ref) => [ref.file, ref.chapter]))('%s (%s)', (file) => {
        const code = fs.readFileSync(path.join(CODE, file), 'utf8');
        const expectation = LUA_EXPECTATIONS[path.basename(file)] ?? {};
        if (expectation.deliberatelyBlocking) {
            expect(collectLuaBlockingIssues(code)).not.toEqual([]);
            return;
        }
        expect(collectLuaBlockingIssues(code)).toEqual([]);
        expect(collectLuaIssues(code)).toEqual([]);
        let prints: string[] = [];
        const events = sim.run(code, expectation.seconds ?? 45, {
            prelude: `${PRINT_PRELUDE}\n${expectation.prelude ?? ''}`,
            onStep: (t, api) => {
                if (api.drone.luaState) prints = readPrints(api.drone.luaState);
                expectation.onStep?.(t, api);
            }
        });
        const failures = events.filter((event) => event.what.startsWith('stopped')).map((event) => event.what);
        expect({ failures, trace: events.map((event) => event.what) }).toEqual({ failures: [], trace: events.map((event) => event.what) });
        if (expectation.trace) expectSubsequence(events, expectation.trace);
        if (expectation.prints) expect(prints).toEqual(expectation.prints);
    }, 60_000);

    // Аварийные ветки автомата, которые основной прогон не задевает.
    test('missions_failsafe.lua: разряд во время взлёта — посадка сразу после взлёта, без маршрута', () => {
        const code = fs.readFileSync(path.join(CODE, 'lua/06_missions/missions_failsafe.lua'), 'utf8');
        const events = sim.run(code, 30, { onStep: fire(1.3, EV.LOW_VOLTAGE2) });
        const names = events.map((event) => event.what);
        expect(names.filter((name) => name.startsWith('stopped'))).toEqual([]);
        expect(names.filter((name) => name.startsWith('goto'))).toEqual([]);
        expectSubsequence(events, ['fsm TAKEOFF_PROCESS', 'led 0 255,0,0', 'fsm LANDING_PROCESS', 'fsm IDLE']);
    }, 60_000);

    test('missions_failsafe.lua: повторный разряд во время посадки не останавливает программу', () => {
        const code = fs.readFileSync(path.join(CODE, 'lua/06_missions/missions_failsafe.lua'), 'utf8');
        const first = fire(12, EV.LOW_VOLTAGE2);
        const second = fire(12.5, EV.LOW_VOLTAGE2);
        const events = sim.run(code, 40, { onStep: (t, api) => { first?.(t, api); second?.(t, api); } });
        const names = events.map((event) => event.what);
        expect(names.filter((name) => name.startsWith('stopped'))).toEqual([]);
        expectSubsequence(events, ['goto 1,0,1', 'fsm LANDING_PROCESS', 'fsm IDLE']);
    }, 60_000);
});

// --------------------------------------------------------------------------
// Python

/** Один запуск бортовой программы на поддельных pioneer_sdk2 / pioneer_rknn. */
type OnboardRun = {
    scenario: PythonScenario;
    /** Что должно случиться, по порядку (подпоследовательность трассы). */
    trace: TraceItem[];
    /** Что обязано встретиться где угодно (порядок зависит от скорости запуска). */
    require?: TraceItem[];
    /** Чего в трассе быть не должно. */
    forbid?: TraceItem[];
    /** Ошибка, которую программа поднимает по замыслу примера (иначе любая error/ignored - провал). */
    allowError?: RegExp;
};

type PythonExpectation =
    | { mode: 'run'; stdout: string[] }
    | { mode: 'sdk'; scenario: PythonScenario; trace: string[]; landedBeforeDisarm?: boolean }
    | { mode: 'onboard'; runs: OnboardRun[] }
    // Программа для компьютера: строит график по CSV из примера 10 (нужен matplotlib).
    | { mode: 'plot' }
    // Тело программы Bricks: должно входить в Python, который сам Bricks сгенерировал по проекту (tests/fixtures/bricks).
    // whole - файл целиком (с импортами и finally).
    | { mode: 'bricks'; project: string; whole?: boolean }
    // Только на борту: нужна настоящая камера / нейросеть / OpenCV; на поддельных библиотеках проверяется лишь синтаксис.
    | { mode: 'boardOnly'; reason: string }
    // ROS 2 (часть V): программа ученика на эмуляции rclpy и ros_pioneer_node (helpers/ros2-runtime.ts).
    // out - строки print по порядку; log - подстроки журнала узлов; landed - дрон в конце на земле (FSM IDLE).
    | { mode: 'ros2'; seconds?: number; out?: string[]; log?: string[]; landed?: boolean }
    // Рой (часть V): примеры из двух файлов запускаются на нескольких дронах; здесь только синтаксис,
    // поведение проверяет tests/swarm-examples.test.ts (те же файлы, виртуальная сеть и несколько дронов).
    | { mode: 'swarm' }
    | { mode: 'compile' };

const PY_TAKEOFF = ['arm', 'takeoff'];
const PYTHON_EXPECTATIONS: Record<string, PythonExpectation> = {
    '01_hello_world.py': { mode: 'run', stdout: ['Hello, World!'] },
    '02_variables.py': { mode: 'run', stdout: ['Дрон: Pioneer', "<class 'float'>"] },
    '03_arithmetic.py': { mode: 'run', stdout: ['Целочисленное деление: 3', 'Возведение в степень: 1000'] },
    '04_logic.py': { mode: 'run', stdout: ['Низкий заряд? False', 'Готов к полету? True'] },
    '05_branching.py': { mode: 'run', stdout: ['Еду прямо'] },
    '06_loops.py': { mode: 'run', stdout: ['Мигание №5: ВЫКЛ', 'Посадка!'] },
    '07_functions.py': { mode: 'run', stdout: ['равна 25', 'Статус батареи 3.6В: Low'] },
    '08_drone_connect.py': { mode: 'sdk', scenario: { seconds: 10 }, trace: [] },
    '09_01_arm_disarm.py': { mode: 'sdk', scenario: { seconds: 10 }, trace: ['arm', 'disarm'] },
    '09_02_takeoff_land.py': { mode: 'sdk', scenario: { seconds: 30 }, trace: [...PY_TAKEOFF, 'land', 'disarm'], landedBeforeDisarm: true },
    'LED_hight_change.py': {
        mode: 'sdk', scenario: { seconds: 12, tof: [[0, 0.1], [3, 0.4], [6, 0.6], [9, 0.9]] },
        trace: ['led 0 255,0,0', 'led 0 0,255,0', 'led 0 0,0,255', 'led 0 255,255,255']
    },
    '10_01_forward_back.py': { mode: 'sdk', scenario: { seconds: 40 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'goto 0,0,1', 'land'], landedBeforeDisarm: true },
    '10_02_square.py': {
        mode: 'sdk', scenario: { seconds: 60 },
        trace: [...PY_TAKEOFF, 'goto 1,0,1', 'goto 1,1,1', 'goto 0,1,1', 'goto 0,0,1', 'land'], landedBeforeDisarm: true
    },
    '10_03_circle_math.py': {
        mode: 'sdk', scenario: { seconds: 90 },
        trace: [...PY_TAKEOFF, 'goto 0.5,0,1', 'goto 0.43,0.25,1', 'goto 0,0.5,1', 'goto 0.5,0,1', 'land'], landedBeforeDisarm: true
    },
    '10_04_manual_speed.py': {
        mode: 'sdk', scenario: { seconds: 30 },
        trace: [...PY_TAKEOFF, 'speed 0.5,0,0', 'speed 0,0,0', 'speed 0,0.5,0', 'speed 0,0,0', 'speed 0,0,0.3', 'speed 0,0,0', 'land', 'disarm'],
        landedBeforeDisarm: true
    },
    // Ожидание состояния с тайм-аутом: красный, подтверждение ARMED, зелёный, взлёт, посадка до DISARMED.
    '10_05_wait_state.py': {
        mode: 'sdk', scenario: { seconds: 30 },
        trace: ['led 0 255,0,0', 'arm', 'led 0 0,255,0', 'takeoff', 'land', 'led 0 0,0,0', 'disarm'], landedBeforeDisarm: true
    },
    '10_06_measure_error.py': { mode: 'sdk', scenario: { seconds: 40 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'land', 'disarm'], landedBeforeDisarm: true },
    // Поддельная камера кадров не отдаёт: проверяется, что ветка «нет кадра» не падает и дрон садится.
    '13_01_first_frame.py': { mode: 'sdk', scenario: { seconds: 40 }, trace: [...PY_TAKEOFF, 'goto 0,0,3', 'land', 'disarm'], landedBeforeDisarm: true },
    'ex1_forward.py': { mode: 'sdk', scenario: { seconds: 40 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'land'] },
    'ex2_forward_turn_return.py': { mode: 'sdk', scenario: { seconds: 60 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'yaw 3.142', 'goto 0,0,1', 'land'] },
    'ex3_forward_turn_return.py': { mode: 'sdk', scenario: { seconds: 60 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'yaw 3.142', 'goto 0,0,1', 'land'] },
    'GET_dist_sensor_data.py': { mode: 'sdk', scenario: { seconds: 5 }, trace: [] },
    'go_to_local_point.py': { mode: 'sdk', scenario: { seconds: 60 }, trace: [...PY_TAKEOFF, 'goto 0,0,1', 'goto 0,1,1', 'goto 1,1,1', 'land'] },

    // Бортовые программы: pioneer_sdk2 и pioneer_rknn (helpers/python/run_onboard.py).
    'sdk2_01_connect.py': {
        mode: 'onboard',
        runs: [{ scenario: { seconds: 10 }, trace: ['print Батарея: 7.90 В, 31.0 °C', 'led 0 0,1,0', 'led 0 1,0.5,0', 'led 0 0,0,0', 'led 3 0,0,0', 'exit'] }]
    },
    'sdk2_02_takeoff_land.py': {
        mode: 'onboard',
        runs: [
            { scenario: { seconds: 20 }, trace: [...PY_TAKEOFF, 'print В воздухе', 'land', 'print Сели', 'disarm', 'exit'] },
            { scenario: { seconds: 20, armFails: true }, trace: ['arm', 'disarm', 'exit Моторы не запустились'] }
        ]
    },
    'sdk2_03_square.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 60 },
            trace: [...PY_TAKEOFF, 'goto 1,0,1', 'goto 1,1,1', 'yaw 90', 'goto 0,1,1', 'yaw 180', 'goto 0,0,1', 'yaw -90', 'yaw 0', 'land', 'disarm', 'exit']
        }]
    },
    'sdk2_04_events.py': {
        mode: 'onboard',
        runs: [
            {
                scenario: { seconds: 90 },
                trace: [...PY_TAKEOFF, 'print Событие: TAKEOFF_COMPLETE', 'goto 1,0,1', 'goto 0,0,1', 'goto 1,0,1', 'goto 0,0,1', 'goto 1,0,1', 'goto 0,0,1', 'land', 'disarm', 'exit']
            },
            {
                scenario: { seconds: 90, lowVoltageAt: 10 },
                trace: [...PY_TAKEOFF, 'goto 0,0,1', 'event LOW_VOLTAGE1', 'print Батарея садится - возвращаемся', 'led 0 1,0,0', 'goto 0,0,1', 'land', 'disarm', 'exit']
            }
        ]
    },
    'sdk2_05_manual_speed.py': {
        mode: 'onboard',
        runs: [{ scenario: { seconds: 30 }, trace: [...PY_TAKEOFF, 'speed 0.5,0,0,0', 'speed 0,0.5,0,0', 'speed 0,0,0.3,0', 'speed 0,0,0,0.5', 'land', 'disarm', 'exit'] }]
    },
    'sdk2_06_camera_stream.py': { mode: 'onboard', runs: [{ scenario: { seconds: 3 }, trace: ['camera MAIN', 'show stream'] }] },
    'sdk2_07_servo_camera.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 30 },
            trace: [...PY_TAKEOFF, 'servo 0', 'servo -45', 'text angle -45', 'servo -80', 'text angle -80', 'servo 0', 'land', 'disarm', 'exit']
        }]
    },
    // --- SDK 2: главы «Полёт», «Датчики», «Исполнительные устройства», «Камера», «Проект» ----------
    '02_led_effects.py': {
        mode: 'onboard',
        // Радуга, бегущий синий огонь, «дыхание» оранжевым (пик 1,0.4,0) и гашение в finally.
        runs: [{ scenario: { seconds: 40 }, trace: ['led 0 1,0,0', 'led 1 0.5,1,0', 'led 3 0,0,1', 'led 0 1,0.4,0', 'led 0 0,0,0', 'exit'] }]
    },
    '03_arm_disarm_safe.py': {
        mode: 'onboard',
        runs: [
            {
                scenario: { seconds: 30 },
                trace: ['print Текущее состояние: ON_LAND', 'led 0 1,0,0', 'led 0 0,0,0', 'led 0 1,0,0', 'led 0 0,0,0', 'led 0 1,0,0', 'led 0 0,0,0',
                    'arm', 'led 0 0,1,0', 'print Состояние после arm(): ARMED', 'disarm', 'led 0 0,0,0', 'exit'],
                forbid: ['takeoff']
            },
            // Моторы не запустились: программа сама поднимает RuntimeError, finally ничего не выключает (ARMED нет).
            {
                scenario: { seconds: 30, armFails: true },
                trace: ['arm', 'disarm', 'error RuntimeError: Двигатели не запустились'],
                allowError: /^error RuntimeError: Двигатели не запустились$/
            }
        ]
    },
    '04_takeoff_hover_land.py': {
        mode: 'onboard',
        runs: [
            { scenario: { seconds: 40 }, trace: [...PY_TAKEOFF, 'goto 0,0,1', 'print Зависли на высоте: 1.0', 'land', 'exit'] },
            { scenario: { seconds: 30, armFails: true }, trace: ['arm', 'disarm', 'print Ошибка: arm() не выполнен', 'exit'], forbid: ['takeoff', 'land'] }
        ]
    },
    '05_square_mission.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 80 },
            trace: [...PY_TAKEOFF,
                'print Точка 1/5: x=0.0, y=0.0, z=1.0', 'goto 0,0,1',
                'print Точка 2/5: x=1.0, y=0.0, z=1.0', 'goto 1,0,1',
                'print Точка 3/5: x=1.0, y=1.0, z=1.0', 'goto 1,1,1',
                'print Точка 4/5: x=0.0, y=1.0, z=1.0', 'goto 0,1,1',
                'print Точка 5/5: x=0.0, y=0.0, z=1.0', 'goto 0,0,1',
                'land', 'led 0 0,0,0', 'exit']
        }]
    },
    // Смещения от корпуса: подъём на 0.5 м, потом четыре раза «шаг вперёд на 0.8 м, поворот на 90°».
    '06_body_fixed_moves.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 60 },
            trace: [...PY_TAKEOFF, 'body 0,0,0.5',
                ...[1, 2, 3, 4].flatMap(() => ['body 0,0.8,0', 'body 0,0,0', 'turn 90']), 'land', 'exit']
        }]
    },
    // Круг из 12 отрезков: курс каждый раз «из точки в центр», в конце возврат в центр с курсом 0.
    '07_circle_face_center.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 150 },
            trace: [...PY_TAKEOFF, 'goto 0.8,0,1.2', 'yaw 180',
                'print  1: x=+0.69 y=+0.40 yaw=-150.0°', 'goto 0.69,0.4,1.2', 'yaw -150',
                'print  3: x=+0.00 y=+0.80 yaw= -90.0°', 'goto 0,0.8,1.2', 'yaw -90',
                'print  6: x=-0.80 y=+0.00 yaw=  -0.0°', 'goto -0.8,0,1.2', 'yaw 0',
                'print  9: x=-0.00 y=-0.80 yaw= +90.0°', 'goto 0,-0.8,1.2', 'yaw 90',
                'print 12: x=+0.80 y=-0.00 yaw=+180.0°', 'goto 0.8,0,1.2', 'yaw 180',
                'goto 0,0,1.2', 'yaw 0', 'land', 'exit']
        }]
    },
    '08_manual_speed.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 40 },
            trace: [...PY_TAKEOFF, 'speed 0,0,0.3,0', 'speed 0,0,0,0', 'speed 0,0.3,0,0', 'speed 0,0,0,0', 'speed 0,0,0,0.8', 'speed 0,0,0,0',
                'speed 0,0.3,0,0.5', 'speed 0,0,0,0', 'speed 0,0,-0.3,0', 'speed 0,0,0,0', 'land', 'exit']
        }]
    },
    // Каждое событие автопилота красит светодиоды в свой цвет; обработчик работает в потоке библиотеки.
    '09_events.py': {
        mode: 'onboard',
        runs: [
            {
                scenario: { seconds: 60 },
                trace: ['arm', /^print \[\d\d:\d\d:\d\d\] событие: Event\.ENGINES_STARTED$/, 'led 0 1,0.4,0',
                    'takeoff', /^print \[\d\d:\d\d:\d\d\] событие: Event\.TAKEOFF_COMPLETE$/, 'led 0 0,1,0',
                    'goto 0,0,1', /^print .* событие: Event\.POINT_REACHED$/, 'led 0 0,1,1',
                    'goto 1,0,1', /^print .* событие: Event\.POINT_DECELERATION$/, 'led 0 0,0,1', /^print .* событие: Event\.POINT_REACHED$/, 'led 0 0,1,1',
                    'goto 0,0,1', /^print .* событие: Event\.POINT_REACHED$/,
                    'land', /^print .* событие: Event\.COPTER_LANDED$/, 'led 0 1,0,1', 'led 0 0,0,0', 'exit']
            },
            {
                scenario: { seconds: 60, lowVoltageAt: 4 },
                trace: [...PY_TAKEOFF, 'event LOW_VOLTAGE1', /^print .* событие: Event\.LOW_VOLTAGE1$/, 'led 0 1,0,0', 'land', 'exit']
            }
        ]
    },
    'sdk2_08_sensors.py': {
        mode: 'onboard',
        // Датчики читаются на земле: ни одной полётной команды. Ranger не подключён - пять None - строка «нет данных».
        runs: [{
            scenario: { seconds: 20 },
            trace: ['print --- замер 1 ---', 'print ускорение (ax, ay, az): (0.0, 0.0, 9.81)', 'print гироскоп, рад/с: (0.0, 0.0, 0.0)',
                'print магнитометр: (0.2, 0.0, -0.45)', 'print крен, тангаж, курс, град: (0.0, 0.0, 0.0)', 'print высота, м: 0.0',
                'print дальномер вниз, м: 0.0', 'print оптический поток (fx, fy, дальность): (0.0, 0.0, 0.0)',
                'print позиция LPS, м: (0.0, 0.0, 0.0)', 'print скорость LPS, м/с: (0.0, 0.0, 0.0)',
                'print Ranger: справа, слева, спереди, сзади, снизу: нет данных', 'print обороты моторов: [0.0, 0.0, 0.0, 0.0]',
                'print --- замер 3 ---', 'print обороты моторов: [0.0, 0.0, 0.0, 0.0]', 'exit'],
            forbid: [/^(arm|takeoff|goto|land|disarm)/]
        }]
    },
    'sdk2_09_safe_start.py': {
        mode: 'onboard',
        runs: [
            {
                scenario: { seconds: 40 },
                trace: ['print Навигация: LPS', 'print Статус LPS: OK', 'print Состояние: ON_LAND', 'arm', 'print Состояние: ARMED',
                    'takeoff', 'print Состояние: IN_SKY', 'goto 1,0,1', 'print Начали тормозить перед точкой',
                    /^print Прилетели, полёт идёт [\d.]+ с$/, 'land', 'print Состояние: ON_LAND', 'disarm', 'exit']
            },
            // Навигация не готова: до arm() дело не доходит.
            {
                scenario: { seconds: 20, navNotReady: true },
                trace: ['print Навигация: LPS', 'print Статус LPS: CANNOT', 'disarm', 'exit Навигация не готова, взлёт отменён'],
                forbid: ['arm', 'takeoff']
            }
        ]
    },
    // Фоновый логгер пишет CSV в текущую папку: заголовок и имя файла с датой видны по следу в папке запуска.
    '10_telemetry_logger.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 60 },
            trace: [...PY_TAKEOFF, 'goto 0,0,1', 'goto 1,0,1', 'goto 1,1,1', 'goto 0,0,1', 'land',
                /^print Лог сохранён: flight_\d{8}_\d{6}\.csv$/, 'exit', /^file flight_\d{8}_\d{6}\.csv t,state,x,y,z,range,roll,pitch,yaw$/]
        }]
    },
    // Запускается на компьютере по CSV из примера 10 (matplotlib); без matplotlib - только синтаксис.
    '10b_plot_log.py': { mode: 'plot' },
    '11_params_context.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 10 },
            trace: ['print Высота взлёта сейчас: 0.4', 'param Flight_com_takeoffAlt=0.7', 'print Flight_com_takeoffAlt: 0.4 -> 0.7',
                'print Внутри блока: 0.7', 'param Flight_com_takeoffAlt=0.4', 'print Flight_com_takeoffAlt: восстановлено 0.4',
                'print После блока : 0.4', 'exit']
        }]
    },
    // Виртуальный пульт: набор параметров, затем плавные стики по очереди; в конце параметры возвращаются.
    '12_rc_ramp.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 60 },
            trace: ['param Copter_man_rcMode0=6', 'param Copter_man_rcMode1=3', 'param Copter_man_rcMode2=3', 'param Copter_flyWithoutRc=1', 'param SensorMux_rc=2',
                ...PY_TAKEOFF, 'rc neutral', 'rc pitch', 'rc neutral', 'rc yaw', 'rc neutral', 'rc roll', 'rc neutral', 'land',
                'param Copter_man_rcMode0=0', 'param Copter_man_rcMode1=0', 'param Copter_man_rcMode2=0', 'param Copter_flyWithoutRc=0', 'param SensorMux_rc=0', 'exit']
        }]
    },
    // Бесконечный цикл: дежурный режим мигает синим, тумблер SWA=2 включает зелёный и телеметрию, 0 - обратно.
    '13_rc_trigger_modes.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 24, rc8: [[6, 2], [14, 0]] },
            trace: ['print Начальное значение 8 канала: 0', 'led 0 0,0,1', 'led 0 0,0,0', 'led 0 0,0,1',
                'print Тумблер SWA = 2 -> режим active', 'led 0 0,1,0', 'print высота: 0.0',
                'print Тумблер SWA = 0 -> режим standby', 'led 0 0,0,1', 'led 0 0,0,0']
        }]
    },
    // Бесконечный цикл по кадрам: подложка и строки телеметрии рисуются до отправки кадра в поток osd.
    '14_camera_osd.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 6 },
            trace: ['camera MAIN', 'print Окно просмотра: http://10.42.0.1:8889/osd/', 'rect 5,5-330,120', /^text STATE +ON_LAND$/,
                /^text RANGE +0\.00 m$/, /^text BATT +\(7\.9, 31\.0\)$/, 'show osd']
        }]
    },
    '14a_camera_stream.py': { mode: 'onboard', runs: [{ scenario: { seconds: 40 }, trace: ['camera MAIN', 'show video', 'exit'] }] },
    // Шесть углов сервопривода: на каждом снимок tilt_<угол>.jpg, в конце контактный лист и возврат сервопривода в 0.
    '15_servo_panorama.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 40 },
            trace: ['camera MAIN',
                ...[30, 10, -10, -30, -50, -80].flatMap((angle) => {
                    const signed = `${angle > 0 ? '+' : ''}${angle}`;
                    return [`servo ${angle}`, `imwrite tilt_${signed}.jpg`, `print Снимок под углом ${angle}`];
                }),
                'imwrite tilt_sheet.jpg', 'print Сохранён tilt_sheet.jpg', 'servo 0', 'exit']
        }]
    },
    // Запись видео идёт на протяжении всего полёта, фото - в трёх точках; stop_recording в finally.
    '16_recorder_mission.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 60 },
            trace: ['print Режимы записи основной камеры:', 'print   [0] (1280, 720, 30)', 'print   [1] (640, 360, 30)', 'rec start MAIN',
                ...PY_TAKEOFF,
                'goto 1,0,1.2', /^photo point_1_\d{6}\.jpg$/, 'goto 1,1,1.2', /^photo point_2_\d{6}\.jpg$/, 'goto 0,1,1.2', /^photo point_3_\d{6}\.jpg$/,
                'goto 0,0,1.2', 'land', 'rec stop MAIN', 'exit']
        }]
    },
    // Захват: открыть и закрыть на земле, перелёт A -> B, снижение, сброс, возврат.
    '17_delivery_grab.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 60 },
            trace: ['grab open', 'led 0 1,0.4,0', 'print Вложите груз, через 5 секунд захват закроется', 'grab close', 'led 0 0,1,0', ...PY_TAKEOFF,
                'goto 0,0,1', 'goto 1.5,0.5,1', 'goto 1.5,0.5,0.4', 'led 0 0,0,1', 'grab open', 'print Груз доставлен',
                'goto 1.5,0.5,1', 'goto 0,0,1', 'land', 'led 0 0,0,0', 'exit']
        }]
    },
    // Нужны настоящая камера и OpenCV с HSV-масками и ArUco - на поддельных библиотеках содержательно не проверить.
    '18_color_tracking_yaw.py': { mode: 'boardOnly', reason: 'цвет в HSV и контуры cv2 на живом кадре' },
    '19_aruco_distance.py': { mode: 'boardOnly', reason: 'cv2.aruco, solvePnP и калибровка data.yml с настоящей камеры' },
    '20_aruco_follow.py': { mode: 'boardOnly', reason: 'cv2.aruco, solvePnP и калибровка data.yml с настоящей камеры' },
    // Итоговый проект: 2 круга по периметру со снимками; при LOW_VOLTAGE1 - аварийное завершение с rtl.
    '21_patrol_project.py': {
        mode: 'onboard',
        runs: [
            {
                scenario: { seconds: 150 },
                trace: ['camera MAIN', 'servo -30', ...PY_TAKEOFF,
                    ...[1, 2].flatMap((lap) => [[0, 0], [2, 0], [2, 2], [0, 2]].flatMap(([x, y], n) =>
                        ['led 0 0,0,1', `goto ${x},${y},1.5`, 'led 0 0,1,0', new RegExp(`^imwrite patrol_\\d{8}_\\d{6}[\\\\/]lap${lap}_p${n + 1}\\.jpg$`)])),
                    'goto 0,0,1.5', 'land', 'servo 0', 'exit', /^dir patrol_\d{8}_\d{6}$/]
            },
            {
                scenario: { seconds: 150, lowVoltageAt: 20 },
                trace: [...PY_TAKEOFF, 'event LOW_VOLTAGE1', 'print Ошибка: Миссия прервана: Event.LOW_VOLTAGE1',
                    'print АВАРИЙНОЕ ЗАВЕРШЕНИЕ: Event.LOW_VOLTAGE1', 'led 0 1,0,0', 'rtl', 'land', 'servo 0', 'exit']
            }
        ]
    },
    // --- Bricks: тело программы из книги - часть Python, который сам Bricks сгенерировал по проекту -----
    'u01_svetodiody.py': { mode: 'bricks', project: 'u01_svetodiody' },
    'u02_beguschiy_ogon.py': { mode: 'bricks', project: 'u02_beguschiy_ogon' },
    'u03_telemetriya.py': { mode: 'bricks', project: 'u03_telemetriya' },
    'full_u03_telemetriya.py': { mode: 'bricks', project: 'u03_telemetriya', whole: true },
    'u04_svetofor_vysoty.py': { mode: 'bricks', project: 'u04_svetofor_vysoty' },
    'u05_polet_kvadrat.py': { mode: 'bricks', project: 'u05_polet_kvadrat' },
    'u06_foto_ugly.py': { mode: 'bricks', project: 'u06_foto_ugly' },
    'u07_ii_lyudi.py': { mode: 'bricks', project: 'u07_ii_lyudi' },
    'u08_ii_zhest.py': { mode: 'bricks', project: 'u08_ii_zhest' },
    'u09_ii_tekst.py': { mode: 'bricks', project: 'u09_ii_tekst' },
    'u10_aruco.py': { mode: 'bricks', project: 'u10_aruco' },

    // --- ROS 2 (rclpy, gs_core): examples/python-onboard/ros2 ------------------------------------
    'ros2_01_flight_cycle.py': { mode: 'ros2', seconds: 200, log: ['Взлетели', 'Сели'], landed: true },
    'ros2_02_telemetry.py': { mode: 'ros2', log: ['высота', 'позиция', 'АКБ'] },
    'ros2_03_cmd_vel_square.py': { mode: 'ros2', seconds: 300, landed: true },
    'ros2_04_led.py': { mode: 'ros2', seconds: 60, log: ['шаг 0', 'шаг 3'] },
    'ros2_05_grab_cargo.py': { mode: 'ros2', out: ['Захватываем: механический захват', 'Отпускаем: механический захват'] },
    'ros2_06_params.py': { mode: 'ros2', out: ['Высота взлёта: 0.4', 'Записали 0.8: True', 'Теперь: 0.8', 'Несуществующий параметр: None'] },
    'ros2_07_navigation_system.py': { mode: 'ros2', out: ['Сейчас: LPS', 'Переключаем на OPT: готово -> OPT', 'Переключаем на LPS: готово -> LPS'] },
    'ros2_08_sensor_logger.py': { mode: 'ros2', log: ['крен', 'Ranger'] },
    'ros2_09_rc_channels.py': { mode: 'ros2', log: ['rc/trigger'] },
    'ros2_10_mission_state_machine.py': { mode: 'ros2', seconds: 300, log: ['состояние: FLY', 'состояние: DONE', 'миссия закончена'], landed: true },

    // --- Рой (pioneer_swarm): examples/python-onboard/swarm --------------------------------------
    'swarm_01_who_is_here.py': { mode: 'swarm' },
    'swarm_02_ping_pong_ping.py': { mode: 'swarm' },
    'swarm_02_ping_pong_pong.py': { mode: 'swarm' },
    'swarm_03_broadcast_receiver.py': { mode: 'swarm' },
    'swarm_03_broadcast_sender.py': { mode: 'swarm' },
    'swarm_04_neighbour_telemetry.py': { mode: 'swarm' },
    'swarm_05_follow_follower.py': { mode: 'swarm' },
    'swarm_05_follow_leader.py': { mode: 'swarm' },
    'swarm_06_sync_takeoff_commander.py': { mode: 'swarm' },
    'swarm_06_sync_takeoff_wingman.py': { mode: 'swarm' },
    'swarm_07_led_show_conductor.py': { mode: 'swarm' },
    'swarm_07_led_show_player.py': { mode: 'swarm' },
    'swarm_08_formation_follower.py': { mode: 'swarm' },
    'swarm_09_rescue_rescuer.py': { mode: 'swarm' },
    'swarm_09_rescue_searcher.py': { mode: 'swarm' },
    'swarm_10_monitor.py': { mode: 'swarm' },

    // --- pioneer_rknn ---------------------------------------------------------------------------
    'rknn_01_models.py': { mode: 'onboard', runs: [{ scenario: { seconds: 3 }, trace: ['print Модели на дроне:', 'exit'] }] },
    'rknn_02_detect.py': {
        mode: 'onboard',
        runs: [{ scenario: { seconds: 4, yolo: [[1, 3, 0, 0.87]] }, trace: ['model yolov8n', 'camera MAIN', 'rect 200,90-440,450', 'text person 0.87'], require: ['show stream'] }]
    },
    'rknn_03_pose_signal.py': {
        mode: 'onboard',
        runs: [{
            scenario: { seconds: 14, pose: [[1, 6, 'up'], [6, 11, 'down']] },
            trace: ['model yolov8n-pose', 'led 0 1,0,0', 'print Руки подняты', 'led 0 0,1,0', 'led 0 1,0,0']
        }]
    },
    'rknn_04_ocr.py': {
        mode: 'onboard',
        runs: [{ scenario: { seconds: 5, ocr: [[1, 2, 'ПОСАДКА 3', 0.9], [3, 4, 'шум', 0.3]] }, trace: ['camera MAIN', 'print Вижу текст: ПОСАДКА 3'] }]
    },
    'rknn_05_search_person.py': {
        mode: 'onboard',
        runs: [
            {
                scenario: { seconds: 30, yolo: [[8, 20, 0, 0.8]] },
                trace: [...PY_TAKEOFF, 'speed 0,0,0,0.3', 'speed 0,0,0,0', 'print Человек найден', 'led 0 0,1,0', 'land', 'disarm', 'release', 'exit']
            },
            {
                // Один кадр с человеком - ещё не находка: нужно CONFIRM кадров подряд.
                scenario: { seconds: 60, yolo: [[8, 8.05, 0, 0.8]] },
                trace: [...PY_TAKEOFF, 'speed 0,0,0,0.3', 'print Никого не нашли', 'led 0 1,0,0', 'land', 'disarm', 'release', 'exit']
            }
        ]
    }
};

const python = findPython();
const withPython = python ? test : test.skip;

describeBook('примеры из книги: Python', () => {
    test('у каждого Python-примера есть описание ожидаемого поведения', () => {
        const unknown = pythonRefs.map((ref) => path.basename(ref.file)).filter((name) => !(name in PYTHON_EXPECTATIONS));
        // Примерам для настоящего дрона с камерой хватает проверки синтаксиса.
        const cameraOnly = /aruco|camera|advanced_navigation|HumanTracking|group_flight/;
        expect(unknown.filter((name) => !cameraOnly.test(pythonRefs.find((ref) => ref.file.endsWith(name))!.file))).toEqual([]);
    });

    test('файлы данных, которые показывает книга, существуют', () => {
        expect(otherRefs.filter((ref) => !fs.existsSync(path.join(CODE, ref.file)))).toEqual([]);
    });

    withPython.each(pythonRefs.map((ref) => [ref.file, ref.chapter]))('%s (%s)', (file) => {
        const full = path.join(CODE, file);
        const expectation = PYTHON_EXPECTATIONS[path.basename(file)] ?? { mode: 'compile' as const };
        if (expectation.mode === 'ros2') {
            const run = runRos2(fs.readFileSync(full, 'utf8'), { mode: 'program', seconds: expectation.seconds ?? 120, speed: 10 });
            expect(run.result.error).toBeNull();
            for (const line of expectation.out ?? []) expect(run.out).toContain(line);
            const journal = run.result.log.map((entry) => entry[1]);
            for (const part of expectation.log ?? []) expect(journal.some((text) => text.includes(part))).toBe(true);
            if (expectation.landed) expect(run.result.fsm).toBe('IDLE');
            return;
        }
        if (expectation.mode === 'compile' || expectation.mode === 'boardOnly' || expectation.mode === 'swarm') {
            const result = spawnSync(python!, ['-I', '-m', 'py_compile', full], { encoding: 'utf8', timeout: 30_000 });
            expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
            return;
        }
        if (expectation.mode === 'run') {
            // -I не читает переменные окружения, поэтому кодировку вывода задаём флагом.
            const result = spawnSync(python!, ['-I', '-X', 'utf8', full], { encoding: 'utf8', timeout: 60_000 });
            expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
            for (const line of expectation.stdout) expect(result.stdout).toContain(line);
            return;
        }
        if (expectation.mode === 'onboard') {
            for (const run of expectation.runs) {
                const events = runPythonScenario(fs.readFileSync(full, 'utf8'), run.scenario, 'onboard');
                const names = events.map((event) => event.what);
                // ignored - команда не того этапа полёта: SDK 2 молча её пропустил.
                const problems = names.filter((name) => (name.startsWith('error') || name.startsWith('ignored')) && !run.allowError?.test(name));
                expect({ problems, trace: names }).toEqual({ problems: [], trace: names });
                expectSubsequence(events, run.trace);
                const absent = (run.require ?? []).filter((item) => !names.some((name) => matches(item, name))).map(String);
                expect({ absent, trace: names }).toEqual({ absent: [], trace: names });
                const forbidden = names.filter((name) => run.forbid?.some((item) => matches(item, name)));
                expect({ forbidden, trace: names }).toEqual({ forbidden: [], trace: names });
            }
            return;
        }
        if (expectation.mode === 'plot') {
            const hasMatplotlib = spawnSync(python!, ['-c', 'import matplotlib'], { encoding: 'utf8' }).status === 0;
            if (!hasMatplotlib) {
                const result = spawnSync(python!, ['-I', '-m', 'py_compile', full], { encoding: 'utf8', timeout: 30_000 });
                expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
                return;
            }
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pioneer-plot-'));
            try {
                const csv = path.join(dir, 'flight.csv');
                fs.writeFileSync(csv, [
                    't,state,x,y,z,range,roll,pitch,yaw', '0.0,ON_LAND,None,None,None,0.0,0,0,0', '0.2,IN_SKY,0.0,0.0,1.0,1.0,0,0,0',
                    '0.4,IN_SKY,1.0,0.0,1.0,1.0,0,0,0', '0.6,IN_SKY,1.0,1.0,1.0,1.0,0,0,0'
                ].join('\n'), 'utf8');
                const result = spawnSync(python!, ['-X', 'utf8', full, csv], {
                    encoding: 'utf8', timeout: 60_000, cwd: dir, env: { ...process.env, MPLBACKEND: 'Agg', PYTHONWARNINGS: 'ignore' }
                });
                expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
                // Строка без координат ("None") пропущена, график сохранён рядом с логом.
                expect(fs.existsSync(path.join(dir, 'flight.png'))).toBe(true);
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            return;
        }
        if (expectation.mode === 'bricks') {
            // Книга показывает тело программы так, как его выдал Bricks (отступы внутри try не важны).
            // Что XML проекта из examples/ собирается в тот же Python, проверяет tests/bricks-examples.test.ts,
            // а что этот Python работает в рантайме симулятора - tests/bricks-runtime.test.ts.
            const lines = (code: string) => code.replace(/\r\n/g, '\n').replace(/\n\s*,/g, ',').split('\n').map((line) => line.trim()).filter(Boolean);
            const generated = lines(fs.readFileSync(path.join(HERE, 'fixtures', 'bricks', `${expectation.project}.py`), 'utf8'));
            const shown = lines(fs.readFileSync(full, 'utf8'));
            if (expectation.whole) expect(shown).toEqual(generated);
            else expect(generated.join('\n')).toContain(shown.join('\n'));
            return;
        }
        // Примеры лежат рядом со своими модулями (grader.py); поддельный SDK
        // запускает копию из временной папки, поэтому путь к оригиналу добавляем сами.
        const source = `import sys; sys.path.insert(0, ${JSON.stringify(path.dirname(full))})\n` + fs.readFileSync(full, 'utf8');
        const events = runPythonScenario(source, expectation.scenario);
        const names = events.map((event) => event.what);
        expect({ errors: names.filter((name) => name.startsWith('error')), trace: names }).toEqual({ errors: [], trace: names });
        expectSubsequence(events, expectation.trace);
        if (expectation.landedBeforeDisarm) {
            // Модель дрона садится 2 с; disarm раньше — это выключение моторов в воздухе.
            const land = events.find((event) => event.what === 'land');
            const disarm = events.find((event) => event.what === 'disarm');
            if (land && disarm) expect(disarm.t - land.t).toBeGreaterThanOrEqual(2);
        }
    }, 120_000);
});
