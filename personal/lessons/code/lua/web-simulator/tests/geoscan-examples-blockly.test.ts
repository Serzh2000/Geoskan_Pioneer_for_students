/**
 * Официальные примеры Geoscan, собранные из блоков Blockly.
 *
 * Для каждого примера из tests/fixtures/geoscan: прочитали, что он делает с
 * дроном, собрали то же самое из блоков, сгенерировали Lua и Python и
 * проверили, что дрон ведёт себя так же, как с оригиналом:
 * - Lua-пример и Lua из блоков — в рантайме симулятора с физикой;
 * - Python-пример и Python из блоков — в CPython на поддельном pioneer_sdk;
 * - Lua и Python из одних и тех же блоков — друг с другом: блоки едины для
 *   обоих языков.
 * Сравниваются взлёт/посадка, точки, курс, груз, ручная скорость и цвета
 * четырёх бортовых светодиодов (helpers/trace-compare.ts).
 */
import fs from 'node:fs';
import * as Blockly from 'blockly';
import { setupLuaSim, type LuaSim, type RunOptions } from './helpers/lua-sim-harness.js';
import { findPython, runPythonScenario, type PythonScenario } from './helpers/python-sdk-harness.js';
import { behaviour, expectSameBehaviour } from './helpers/trace-compare.js';
import { block, program, S, type Input, type Spec } from './helpers/blockly-json.js';

let sim: LuaSim;
let compile: (workspace: Blockly.Workspace, target: 'lua' | 'python') => string;

beforeAll(async () => {
    sim = await setupLuaSim();
    const index = await import('../public/modules/editor/blockly-mode/index.js');
    await import('../public/modules/editor/blockly-mode/blockly-core.js');
    await index.ensureEditorBlocklyDefinitions();
    compile = index.compilePioneerWorkspace;
});

const hasPython = findPython() !== null;
const withPython = hasPython ? test : test.skip;
const LU_EV_LOW_VOLTAGE2 = 14;

function fixture(name: string): string {
    return fs.readFileSync(new URL(`./fixtures/geoscan/${name}`, import.meta.url), 'utf8');
}

function build(main: Spec[], topLevel: Spec[] = []): { lua: string; python: string } {
    const json = program(main, topLevel);
    const generate = (target: 'lua' | 'python') => {
        const workspace = new Blockly.Workspace();
        Blockly.serialization.workspaces.load(json, workspace);
        const code = compile(workspace, target);
        workspace.dispose();
        return code;
    };
    return { lua: generate('lua'), python: generate('python') };
}

// --- кирпичики -----------------------------------------------------------
const preset = (name: string): Spec => ({ type: 'pioneer_colour_preset', fields: { PRESET: name } });
const rgb = (r: Input, g: Input, b: Input): Spec => S.rgb(r, g, b);
const ledAll = (colour: Spec): Spec => S.ledAll(colour);
const math1 = (op: string, value: Input): Input => block({ type: 'math_single', fields: { OP: op }, inputs: { NUM: value } });
const modulo = (a: Input, b: Input): Input => block({ type: 'math_modulo', inputs: { DIVIDEND: a, DIVISOR: b } });
const item = (list: Input, index: Input): Input => block({
    type: 'lists_getIndex', fields: { MODE: 'GET', WHERE: 'FROM_START' }, inputs: { VALUE: list, AT: index }
});
const every = (seconds: number, name: string, body: Spec[]): Spec => ({
    type: 'pioneer_every', fields: { NAME: name }, inputs: { SECONDS: seconds }, statements: { DO: body }
});
const ifElse = (branches: Array<[Input, Spec[]]>, otherwise?: Spec[]): Spec => ({
    type: 'controls_if',
    extraState: { elseIfCount: branches.length - 1, hasElse: Boolean(otherwise) },
    inputs: Object.fromEntries(branches.map(([condition], i) => [`IF${i}`, condition])),
    statements: {
        ...Object.fromEntries(branches.map(([, body], i) => [`DO${i}`, body])),
        ...(otherwise ? { ELSE: otherwise } : {})
    }
});
const sensor = (type: string, fields: Record<string, unknown> = {}): Input => block({ type, fields });
const random = (): Input => block({ type: 'math_random_float' });

function lua(code: string, seconds: number, options?: RunOptions) {
    return sim.run(code, seconds, options);
}

function python(code: string, scenario: PythonScenario) {
    return runPythonScenario(code, scenario);
}

// --------------------------------------------------------------------------

describe('pioneer-lua-example: полёт', () => {
    // Предстарт, белые светодиоды, через 2 с взлёт. Дальше по точкам
    // (0,0,0.7) → (0,1,0.7) → (0.5,1,0.7) → (0.5,0,0.7): перед каждой — смена
    // цвета (красный, зелёный, синий, жёлтый) и пауза 1 с. Потом фиолетовый,
    // пауза 1 с, посадка, после посадки светодиоды гаснут.
    const blocks = () => build([
        ledAll(preset('белый')),
        S.preflight(),
        S.wait(2),
        S.takeoff(),
        S.set('points', [[0, 0, 0.7], [0, 1, 0.7], [0.5, 1, 0.7], [0.5, 0, 0.7]]),
        S.set('colours', [block(preset('красный')), block(preset('зелёный')), block(preset('синий')), block(preset('жёлтый'))]),
        {
            type: 'controls_for',
            fields: { VAR: { variable: 'i' } },
            inputs: { FROM: 1, TO: 4, BY: 1 },
            statements: {
                DO: [
                    { type: 'pioneer_led_all', inputs: { COLOUR: item(S.get('colours'), S.get('i')) } },
                    S.wait(1),
                    S.goTo(
                        item(item(S.get('points'), S.get('i')), 1),
                        item(item(S.get('points'), S.get('i')), 2),
                        item(item(S.get('points'), S.get('i')), 3)
                    )
                ]
            }
        },
        ledAll(rgb(255, 0, 255)),
        S.wait(1),
        S.land(),
        ledAll(preset('выключен'))
    ]);

    test('example_go_to_point.lua: Lua из блоков летает как оригинал', () => {
        expectSameBehaviour(lua(blocks().lua, 40), lua(fixture('lua/example_go_to_point.lua'), 40), 2.5);
    });

    withPython('example_go_to_point.lua: Python из тех же блоков делает то же', () => {
        const { lua: luaCode, python: pythonCode } = blocks();
        expectSameBehaviour(python(pythonCode, { seconds: 40 }), lua(luaCode, 40));
    });

    // Класс Path: взлёт (после — красный), точки (0,0,0.8) синий, (0,1,1)
    // красный, (0.5,1,1), посадка; снова взлёт (синий), (0,0.5,1) красный,
    // посадка.
    const path = () => build([
        S.preflight(), S.wait(1), S.takeoff(),
        ledAll(preset('красный')), S.goTo(0, 0, 0.8),
        ledAll(preset('синий')), S.goTo(0, 1, 1),
        ledAll(preset('красный')), S.goTo(0.5, 1, 1),
        S.land(),
        S.wait(2), S.preflight(), S.wait(1), S.takeoff(),
        ledAll(preset('синий')), S.goTo(0, 0.5, 1),
        ledAll(preset('красный')),
        S.land()
    ]);

    test('example_path.lua: Lua из блоков летает как оригинал', () => {
        expectSameBehaviour(lua(path().lua, 40), lua(fixture('lua/example_path.lua'), 40), 2.5);
    });

    // Одно отличие — намеренное. Python пишется как официальные примеры
    // pioneer_sdk: takeoff() не ждёт конца взлёта, точку автопилот держит сам.
    // Поэтому красный после «Взлететь» в Python горит уже во время набора
    // высоты, а в Lua (ждёт TAKEOFF_COMPLETE) — после, и сразу сменяется
    // синим. Полёт и все остальные цвета совпадают.
    withPython('example_path.lua: Python из тех же блоков делает то же', () => {
        const { lua: luaCode, python: pythonCode } = path();
        const fromPython = behaviour(python(pythonCode, { seconds: 50 }));
        const fromLua = behaviour(lua(luaCode, 40));
        expect(fromPython.failures).toEqual([]);
        expect(fromPython.flight.map((event) => event.what)).toEqual(fromLua.flight.map((event) => event.what));
        fromPython.leds.forEach((sequence, i) => {
            expect(sequence.map((event) => event.what)).toEqual(['255,0,0', ...fromLua.leds[i].map((event) => event.what)]);
        });
    });

    // Каждую секунду смотрим тумблер SwA (8-й канал пульта); включили —
    // предстарт, через 6 с взлёт, дальше четыре точки, перед каждой пауза
    // 5+1 с, и через 5+1 с после последней — посадка.
    test('rc_script_start.lua: Lua из блоков летает как оригинал', () => {
        const code = build([
            { type: 'pioneer_wait_until', inputs: { CONDITION: S.compare('GT', sensor('pioneer_rc_channel', { CHANNEL: '8' }), 0) } },
            S.preflight(),
            S.wait(5),
            S.takeoff(),
            {
                type: 'controls_forEach',
                fields: { VAR: { variable: 'point' } },
                inputs: { LIST: [[0, 1, 1], [0, 0, 1], [0, 1, 1], [0, 0, 1]] },
                statements: {
                    DO: [
                        S.wait(6),
                        S.goTo(item(S.get('point'), 1), item(S.get('point'), 2), item(S.get('point'), 3))
                    ]
                }
            },
            S.wait(6),
            S.land()
        ]).lua;
        const scenario: RunOptions = { onStep: (t, api) => api.setRcSwitch(8, t > 2 && t < 3.2 ? 2000 : 1000) };
        expectSameBehaviour(lua(code, 70, scenario), lua(fixture('lua/rc_script_start.lua'), 70, scenario), 2.5);
    });
});

describe('pioneer-lua-example: светодиоды, таймеры, датчики', () => {
    // Раз в секунду все светодиоды — случайный тусклый цвет (компоненты до
    // 0.1). При LOW_VOLTAGE2 таймер останавливается, через секунду — красный.
    test('example_led_blink.lua (только Lua: событие автопилота)', () => {
        const scaled = () => S.arith('MULTIPLY', random(), 25.5);
        const code = build([], [
            every(1, 'random', [ledAll(rgb(scaled(), scaled(), scaled()))]),
            {
                type: 'pioneer_on_event',
                fields: { EVENT: 'LOW_VOLTAGE2' },
                statements: {
                    DO: [
                        { type: 'pioneer_every_stop', fields: { NAME: 'random' } },
                        { type: 'pioneer_after', inputs: { SECONDS: 1 }, statements: { DO: [ledAll(preset('красный'))] } }
                    ]
                }
            }
        ]).lua;
        const scenario: RunOptions = {
            prelude: 'math.randomseed(7)',
            onStep: (t, api) => { if (Math.abs(t - 4.5) < 0.009) api.triggerEvent(LU_EV_LOW_VOLTAGE2); }
        };
        expectSameBehaviour(lua(code, 8, scenario), lua(fixture('lua/example_led_blink.lua'), 8, scenario), 0.1);
    });

    // pioneer_sdk/examples/pioneer_led_blink.lua: белый вполсилы, через
    // секунду выключить.
    const blink = () => build([ledAll(rgb(127.5, 127.5, 127.5)), S.wait(1), ledAll(preset('выключен'))]);

    test('pioneer_led_blink.lua: Lua из блоков как оригинал', () => {
        expectSameBehaviour(lua(blink().lua, 3), lua(fixture('lua/pioneer_led_blink.lua'), 3), 0.1);
    });

    withPython('pioneer_led_blink.lua: Python из тех же блоков делает то же', () => {
        const { lua: luaCode, python: pythonCode } = blink();
        expectSameBehaviour(python(pythonCode, { seconds: 3 }), lua(luaCode, 3), 0.2);
    });

    // Каждые 0.1 с: |ax| на первый светодиод зелёным, |az| на второй и третий
    // фиолетовым, |ay| на четвёртый синим; яркость — остаток от деления на 10,
    // делённый на 10.
    test('example_get_accel.lua (только Lua: акселерометра нет в pioneer_sdk)', () => {
        const level = (axis: string) => S.arith('MULTIPLY', S.arith('DIVIDE', modulo(math1('ABS', sensor('pioneer_accel', { AXIS: axis })), 10), 10), 255);
        const code = build([], [
            every(0.1, 'accel', [
                S.ledIndex(0, rgb(0, level('X'), 0)),
                S.ledIndex(1, rgb(level('Z'), 0, level('Z'))),
                S.ledIndex(2, rgb(level('Z'), 0, level('Z'))),
                S.ledIndex(3, rgb(0, 0, level('Y')))
            ])
        ]).lua;
        expectSameBehaviour(lua(code, 2), lua(fixture('lua/example_get_accel.lua'), 2), 0.1);
    });

    // Каждые 0.1 с: координата X — на первый светодиод (зелёный при X > 0,
    // жёлтый при X ≤ 0), Y — на четвёртый (синий/фиолетовый), Z — на второй
    // и третий красным; яркость — половина доли от размера зоны 3×2.5×3.3 м.
    // (В оригинале ось определяется сравнением значения с x/y/z — при равных
    // координатах он путает оси; блоки делают то, что задумано.)
    const position = () => {
        const bright = (axis: string, max: number) => S.arith('MULTIPLY', S.arith('DIVIDE', S.arith('MULTIPLY', 0.5, math1('ABS', sensor('pioneer_position', { AXIS: axis }))), max), 255);
        const positive = (axis: string) => S.compare('GT', sensor('pioneer_position', { AXIS: axis }), 0);
        return build([], [
            every(0.1, 'position', [
                ifElse([[positive('X'), [S.ledIndex(0, rgb(0, bright('X', 3), 0))]]], [S.ledIndex(0, rgb(bright('X', 3), bright('X', 3), 0))]),
                ifElse([[positive('Y'), [S.ledIndex(3, rgb(0, 0, bright('Y', 2.5)))]]], [S.ledIndex(3, rgb(bright('Y', 2.5), 0, bright('Y', 2.5)))]),
                S.ledIndex(1, rgb(bright('Z', 3.3), 0, 0)),
                S.ledIndex(2, rgb(bright('Z', 3.3), 0, 0))
            ])
        ]);
    };
    const placeDrone: RunOptions = { onStep: (_t, api) => { api.drone.pos.x = 1.5; api.drone.pos.y = -1; } };

    test('example_get_position.lua: Lua из блоков как оригинал', () => {
        expectSameBehaviour(lua(position().lua, 2, placeDrone), lua(fixture('lua/example_get_position.lua'), 2, placeDrone), 0.1);
    });

    withPython('example_get_position.lua: Python из тех же блоков делает то же', () => {
        const { lua: luaCode, python: pythonCode } = position();
        expectSameBehaviour(python(pythonCode, { seconds: 2, pos: [1.5, -1, 0] }), lua(luaCode, 2, placeDrone));
    });

    // Каждые 0.1 с тумблер SwA: вверх (-1) — магнит включить и зелёный, вниз
    // (+1) — выключить и красный, нет сигнала — мигать синим (5 тиков
    // горит, 1 не горит).
    test('example_cargo.lua (только Lua: пульт)', () => {
        const ch8 = sensor('pioneer_rc_channel', { CHANNEL: '8' });
        const code = build([S.set('blink', 0)], [
            every(0.1, 'cargo', [
                ifElse([
                    [S.compare('LT', ch8, 0), [{ type: 'pioneer_cargo', fields: { ACTION: 'GRAB' } }, ledAll(preset('зелёный'))]],
                    [S.compare('GT', ch8, 0), [{ type: 'pioneer_cargo', fields: { ACTION: 'RELEASE' } }, ledAll(preset('красный'))]]
                ], [
                    ifElse([[S.compare('LT', S.get('blink'), 5), [ledAll(preset('синий')), S.set('blink', S.arith('ADD', S.get('blink'), 1))]]],
                        [ledAll(preset('выключен')), S.set('blink', 0)])
                ])
            ])
        ]).lua;
        const scenario: RunOptions = { onStep: (t, api) => api.setRcSwitch(8, t < 1 ? 1500 : t < 2 ? 1000 : 2000) };
        expectSameBehaviour(lua(code, 3, scenario), lua(fixture('lua/example_cargo.lua'), 3, scenario), 0.1);
    });

    // Снимок (красный, пока снимаем), 2 с паузы, 10 с видео (зелёный).
    // Камеру в Node не запустить — проверяем, что код собирается, и что вызовы
    // камеры идут в том же порядке, что в оригинале.
    test('take_photo_video.lua: те же вызовы камеры в том же порядке', () => {
        const code = build([
            ledAll(preset('красный')),
            { type: 'pioneer_camera_take_photo' },
            ledAll(preset('выключен')),
            S.wait(2),
            ledAll(preset('зелёный')),
            { type: 'pioneer_camera_record', fields: { ACTION: 'START' } },
            S.wait(10),
            { type: 'pioneer_camera_record', fields: { ACTION: 'STOP' } },
            ledAll(preset('выключен'))
        ]).lua;
        const cameraCalls = (source: string) => Array.from(source.matchAll(/camera\.(request\w+|check\w+)\(\)( ~?==? -1)?/g)).map((match) => match[1]);
        const expected = ['requestMakeShot', 'checkRequestShot', 'requestRecordStart', 'checkRequestRecord', 'requestRecordStop', 'checkRequestRecord'];
        expect(cameraCalls(code)).toEqual(expected);
        expect(cameraCalls(fixture('lua/take_photo_video.lua'))).toEqual(expected);
        expect(code).not.toContain('== 1');
    });
});

describe('pioneer_sdk examples', () => {
    // Раз в 0.1 с высота по дальномеру: ≤0.25 — красный, ≤0.5 — зелёный,
    // ≤0.75 — синий, выше — белый.
    const height = () => {
        const tof = sensor('pioneer_distance');
        return build([], [
            every(0.1, 'height', [
                S.set('tof', tof),
                ifElse([
                    [S.compare('LTE', S.get('tof'), 0.25), [ledAll(preset('красный'))]],
                    [S.compare('LTE', S.get('tof'), 0.5), [ledAll(preset('зелёный'))]],
                    [S.compare('LTE', S.get('tof'), 0.75), [ledAll(preset('синий'))]]
                ], [ledAll(preset('белый'))])
            ])
        ]);
    };
    const tofProfile: PythonScenario = { seconds: 4, tof: [[0, 0.1], [1, 0.3], [2, 0.6], [3, 1]] };

    withPython('LED_hight_change.py: Python из блоков как оригинал', () => {
        expectSameBehaviour(python(height().python, tofProfile), python(fixture('python/LED_hight_change.py'), tofProfile), 0.5);
    });

    withPython('LED_hight_change.py: Lua из тех же блоков делает то же (дрон на земле — красный)', () => {
        const { lua: luaCode, python: pythonCode } = height();
        expectSameBehaviour(lua(luaCode, 2), python(pythonCode, { seconds: 2, tof: [[0, 0]] }));
    });

    // Взлёт, десять точек по окружности радиуса 0.6 м на высоте 1 м, в каждой
    // курс по направлению на точку (шаг 36°), потом посадка.
    const circle = () => build([
        S.preflight(),
        S.takeoff(),
        S.set('angle', 0),
        S.repeat(10, [
            S.set('angle', S.arith('ADD', S.get('angle'), 36)),
            {
                type: 'pioneer_go_to_yaw',
                inputs: {
                    X: S.arith('MULTIPLY', 0.6, block({ type: 'math_trig', fields: { OP: 'COS' }, inputs: { NUM: S.get('angle') } })),
                    Y: S.arith('MULTIPLY', 0.6, block({ type: 'math_trig', fields: { OP: 'SIN' }, inputs: { NUM: S.get('angle') } })),
                    Z: 1,
                    YAW: S.get('angle')
                }
            }
        ]),
        S.land()
    ]);

    withPython('circle_flight.py: Python из блоков как оригинал', () => {
        expectSameBehaviour(python(circle().python, { seconds: 40 }), python(fixture('python/circle_flight.py'), { seconds: 40 }));
    });

    withPython('circle_flight.py: Lua из тех же блоков (цикл с ожиданием) делает то же', () => {
        const { lua: luaCode, python: pythonCode } = circle();
        expectSameBehaviour(lua(luaCode, 60), python(pythonCode, { seconds: 40 }));
    });

    // 3 с пауза, взлёт, 3 с, две секунды «вправо» 1 м/с (команда каждые
    // 0.05 с), 4 с, три секунды «вперёд», 4 с, посадка. Только Python: в Lua
    // API нет управления скоростью.
    withPython('manual_speed.py: Python из блоков как оригинал', () => {
        const pushFor = (seconds: number, vx: number, vy: number): Spec[] => [
            S.set('t', sensor('pioneer_time')),
            {
                type: 'controls_whileUntil',
                fields: { MODE: 'WHILE' },
                inputs: { BOOL: S.compare('LT', S.arith('MINUS', sensor('pioneer_time'), S.get('t')), seconds) },
                statements: {
                    DO: [
                        { type: 'pioneer_set_manual_speed', inputs: { VX: vx, VY: vy, VZ: 0, YAW_RATE: 0 } },
                        S.wait(0.05)
                    ]
                }
            }
        ];
        const code = build([
            S.wait(3),
            S.preflight(),
            S.takeoff(),
            S.wait(3),
            ...pushFor(2, 0, 1),
            S.wait(4),
            ...pushFor(3, 1, 0),
            S.wait(4),
            S.land()
        ]).python;
        expectSameBehaviour(python(code, { seconds: 30 }), python(fixture('python/manual_speed.py'), { seconds: 30 }), 3.5);
    });
});
