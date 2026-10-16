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
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setupLuaSim, type LuaSim, type RunOptions, type SimEvent } from './helpers/lua-sim-harness.js';
import { findPython, runPythonScenario, type PythonScenario } from './helpers/python-sdk-harness.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const TEX = path.join(REPO, 'book', 'tex');
const CODE = path.join(REPO, 'examples');
const available = fs.existsSync(path.join(TEX, 'main.tex')) && fs.existsSync(CODE);
const describeBook = available ? describe : describe.skip;

type CodeRef = { chapter: string; file: string; language: string };

function chapterFiles(): string[] {
    const main = fs.readFileSync(path.join(TEX, 'main.tex'), 'utf8');
    return [...main.matchAll(/^\s*\\input\{([^}]+)\}/gm)]
        .map((match) => match[1])
        .filter((name) => name.startsWith('chapters/'))
        .map((name) => (name.endsWith('.tex') ? name : `${name}.tex`));
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
    'variables_intro.lua': { seconds: 1, prints: ['number\tstring\tboolean\ttable'] },
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
    'missions_engines_arm.lua': { seconds: 5, trace: ['fsm PREFLIGHT'] },
    'mission_takeoff_landing.lua': { seconds: 40, trace: [...TAKEOFF, 'fsm FLYING_HOVER', ...LANDED] },
    'missions_straight_flight.lua': { seconds: 40, trace: [...TAKEOFF, 'goto 1,0,0.8', ...LANDED] },
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

function expectSubsequence(events: SimEvent[], expected: string[]) {
    const names = events.map((event) => event.what);
    let i = 0;
    for (const name of names) if (i < expected.length && name === expected[i]) i += 1;
    expect({ missing: expected.slice(i), trace: names }).toEqual({ missing: [], trace: names });
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

type PythonExpectation =
    | { mode: 'run'; stdout: string[] }
    | { mode: 'sdk'; scenario: PythonScenario; trace: string[]; landedBeforeDisarm?: boolean }
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
    'ex1_forward.py': { mode: 'sdk', scenario: { seconds: 40 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'land'] },
    'ex2_forward_turn_return.py': { mode: 'sdk', scenario: { seconds: 60 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'yaw 3.142', 'goto 0,0,1', 'land'] },
    'ex3_forward_turn_return.py': { mode: 'sdk', scenario: { seconds: 60 }, trace: [...PY_TAKEOFF, 'goto 1,0,1', 'yaw 3.142', 'goto 0,0,1', 'land'] },
    'GET_dist_sensor_data.py': { mode: 'sdk', scenario: { seconds: 5 }, trace: [] },
    'go_to_local_point.py': { mode: 'sdk', scenario: { seconds: 60 }, trace: [...PY_TAKEOFF, 'goto 0,0,1', 'goto 0,1,1', 'goto 1,1,1', 'land'] }
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
        if (expectation.mode === 'compile') {
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
