/**
 * Программы Bricks в рантайме симулятора: Python, собранный из проектов u01..u10, проходит через
 * преобразователь browser-runtime.ts (await у arm/takeoff/land/sleep) и запускается на настоящем CPython
 * с настоящими библиотеками симулятора pioneer_sdk2, pioneer_rknn и cv2 (поддельный только мост js).
 * Нужны Python 3 с numpy; без них тесты пропускаются.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PIONEER_SDK2_PRELUDE } from '../public/modules/python/pioneer-sdk2-module.js';
import { PIONEER_RKNN_PRELUDE } from '../public/modules/python/pioneer-rknn-module.js';
import { PIONEER_CV_PRELUDE } from '../public/modules/python/pioneer-sdk-cv-prelude.js';
import { findPython } from './helpers/python-sdk-harness.js';
import { BRICKS_PROJECTS, compileBricksProject, compileBricksXml, readBricksFixture } from './helpers/bricks-fixtures.js';

const RUNNER = path.join(process.cwd(), 'tests', 'helpers', 'python', 'run_bricks_runtime.py');
const RUNTIME_SOURCE = fs.readFileSync(path.join(process.cwd(), 'public', 'modules', 'python', 'browser-runtime.ts'), 'utf8');

const python = findPython();
const numpyReady = python ? spawnSync(python, ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0 : false;
const withPython = python && numpyReady ? test : test.skip;

/** Преобразователь рантайма: await-функция и класс __SimAsyncify из шаблона browser-runtime.ts. */
function transformerSource(): string {
    const awaitStart = RUNTIME_SOURCE.indexOf('async def __sim_await');
    const awaitEnd = RUNTIME_SOURCE.indexOf('__sim_source =');
    const classStart = RUNTIME_SOURCE.indexOf('class __SimAsyncify');
    const classEnd = RUNTIME_SOURCE.indexOf('__user_main = __sim_load');
    expect(Math.min(awaitStart, awaitEnd, classStart, classEnd)).toBeGreaterThan(0);
    return `${RUNTIME_SOURCE.slice(awaitStart, awaitEnd)}\n${RUNTIME_SOURCE.slice(classStart, classEnd)}`;
}

type Call = [string, ...unknown[]];
type RunResult = { out: string[]; calls: Call[]; error: string | null };

function runProgram(code: string, config: Record<string, unknown>): RunResult {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bricks-runtime-'));
    try {
        const files: Record<string, string> = {
            'sdk2.py': PIONEER_SDK2_PRELUDE,
            'rknn.py': PIONEER_RKNN_PRELUDE,
            'cv.py': PIONEER_CV_PRELUDE,
            'transformer.py': transformerSource(),
            'program.py': code
        };
        for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text, 'utf8');
        const configPath = path.join(dir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config), 'utf8');
        const result = spawnSync(python!, [RUNNER, dir, configPath], {
            encoding: 'utf8', timeout: 90_000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        const marker = result.stdout.lastIndexOf('@@RESULT@@');
        if (marker === -1) throw new Error(`Python не вернул результат (status ${result.status}, signal ${result.signal}, ${result.error}):\n${result.stdout}\n${result.stderr}`);
        return JSON.parse(result.stdout.slice(marker + '@@RESULT@@'.length).trim()) as RunResult;
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const callsOf = (result: RunResult, name: string) => result.calls.filter((call) => call[0] === name);
const leds = (result: RunResult) => callsOf(result, 'led').map((call) => call[1] as number[]);
const run = (name: string, config: Record<string, unknown>) => runProgram(compileBricksProject(name), config);

const RED = [255, 255, 0, 0];
const GREEN = [255, 0, 255, 0];
const BLUE = [255, 0, 0, 255];
const OFF = [255, 0, 0, 0];

/** Поза «две руки вверх» для YoloPose: плечи, бёдра и запястья с уверенностью, остальное пустое. */
function poseRow(): number[] {
    const points: number[][] = Array.from({ length: 17 }, () => [0, 0, 0]);
    points[5] = [250, 250, 0.9]; points[6] = [350, 250, 0.9];
    points[9] = [250, 100, 0.9]; points[10] = [350, 100, 0.9];
    points[11] = [260, 450, 0.9]; points[12] = [340, 450, 0.9];
    return [200, 80, 400, 470, 0.9, ...points.flat()];
}

describe('Bricks: все 10 программ запускаются в рантайме симулятора', () => {
    withPython('u01: красный, зелёный, синий, выключено; печатает высоту', () => {
        const result = run('u01_svetodiody', { seconds: 10 });
        expect(result.error).toBeNull();
        expect(result.out.slice(0, 2)).toEqual(['Начало программы', 'Высота по дальномеру, м: 0.4']);
        expect(leds(result)).toEqual([RED, GREEN, BLUE, OFF]);
        expect(result.out[result.out.length - 1]).toBe('Конец программы');
    });

    withPython('u02: бегущий огонь три круга по четырём светодиодам', () => {
        const result = run('u02_beguschiy_ogon', { seconds: 20 });
        expect(result.error).toBeNull();
        const single = leds(result).filter((led) => led[0] !== 255);
        expect(single.map((led) => led[0])).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]);
        expect(single[0]).toEqual([0, 255, 170, 0]);
    });

    withPython('u03: десять строк с высотой', () => {
        const result = run('u03_telemetriya', { seconds: 20, tof: 0.5 });
        expect(result.error).toBeNull();
        expect(result.out.filter((line) => line.startsWith('Высота по дальномеру, м: '))).toHaveLength(10);
    });

    withPython('u04: светофор высоты - зелёный, жёлтый, красный', () => {
        const result = run('u04_svetofor_vysoty', { seconds: 8, tof: [[0, 2, 0.3], [2, 4, 0.7], [4, 100, 2]] });
        expect(result.error).toBeNull();
        const colours = leds(result).map((led) => led.join(','));
        expect(colours[0]).toBe(GREEN.join(','));
        expect(colours).toContain([255, 255, 170, 0].join(','));
        expect(colours[colours.length - 1]).toBe(RED.join(','));
    });

    withPython('u05: полёт по квадрату - arm, takeoff, пять точек, land', () => {
        const result = run('u05_polet_kvadrat', { seconds: 30 });
        expect(result.error).toBeNull();
        const names = result.calls.map((call) => call[0]).filter((name) => ['arm', 'takeoff', 'go_to', 'land'].includes(name as string));
        expect(names).toEqual(['arm', 'takeoff', 'go_to', 'go_to', 'go_to', 'go_to', 'go_to', 'land']);
        expect(callsOf(result, 'go_to').map((call) => (call[1] as number[]).slice(0, 3))).toEqual([
            [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]
        ]);
    });

    withPython('u06: сервопривод 15, -45, 0 и два снимка', () => {
        const result = run('u06_foto_ugly', { seconds: 20 });
        expect(result.error).toBeNull();
        expect(callsOf(result, 'tilt').map((call) => call[1])).toEqual([15, -45, 0]);
        expect(callsOf(result, 'imwrite').map((call) => call[1])).toEqual([
            '/mnt/media/photos/ugol_plus15.jpg', '/mnt/media/photos/ugol_minus45.jpg'
        ]);
    });

    withPython('u07: Yolo находит человека, рамка и окно people', () => {
        const result = run('u07_ii_lyudi', { seconds: 6, detect: [[200, 120, 440, 600, 0, 0.9]] });
        expect(result.error).toBeNull();
        expect(callsOf(result, 'rect').length).toBeGreaterThan(0);
        expect(callsOf(result, 'text').map((call) => call[1])).toContain('person');
        expect(callsOf(result, 'imshow').map((call) => call[1])).toContain('people');
    });

    withPython('u08: две руки вверх включают зелёный свет, иначе выключено', () => {
        const result = run('u08_ii_zhest', { seconds: 10, pose: [poseRow()] });
        expect(result.error).toBeNull();
        const colours = leds(result).map((led) => led.join(','));
        expect(colours).toContain(GREEN.join(','));
        expect(colours).toContain(OFF.join(','));
        expect(callsOf(result, 'imshow').map((call) => call[1])).toContain('pose');
    });

    withPython('u09: PaddleOCR печатает найденный текст', () => {
        const result = run('u09_ii_tekst', { seconds: 8, ocr: [[[10, 10, 200, 10, 200, 60, 10, 60], 'Посадочная площадка', 0.95]] });
        expect(result.error).toBeNull();
        expect(result.out).toContain('Посадочная площадка');
        expect(callsOf(result, 'imshow').map((call) => call[1])).toContain('ocr');
    });

    withPython('u10: ArUco - маркер найден и обведён в окне aruco', () => {
        const result = run('u10_aruco', { seconds: 6, markers: [[3, [[100, 100], [200, 100], [200, 200], [100, 200]]]] });
        expect(result.error).toBeNull();
        expect(callsOf(result, 'imshow').map((call) => call[1])).toContain('aruco');
        expect(result.out[result.out.length - 1]).toBe('Конец программы');
    });

    test('в фикстурах те же 10 проектов', () => {
        expect(BRICKS_PROJECTS).toHaveLength(10);
        expect(readBricksFixture(BRICKS_PROJECTS[0], 'xml')).toContain('start_block');
    });
});

describe('Bricks: преобразователь рантайма', () => {
    withPython('bare sleep() из «from time import sleep» ждёт, а не блокирует поток', () => {
        const code = [
            'from time import sleep',
            'print("a")',
            'sleep(0.5)',
            'print("b")'
        ].join('\n');
        const result = runProgram(code, { seconds: 5 });
        expect(result.error).toBeNull();
        expect(result.out).toEqual(['a', 'b']);
    });

    withPython('строковый join не ожидается, чистые функции зовутся из lambda', () => {
        const code = [
            'def twice(x):',
            '    return x * 2',
            'f = lambda v: twice(v) + 1',
            'print(f(4))',
            'print("-".join(["a", "b"]))'
        ].join('\n');
        const result = runProgram(code, { seconds: 5 });
        expect(result.error).toBeNull();
        expect(result.out).toEqual(['9', 'a-b']);
    });

    withPython('функция с sleep остаётся асинхронной и ждётся', () => {
        const code = [
            'from time import sleep',
            'def pause():',
            '    sleep(0.2)',
            '    return 5',
            'print(pause())'
        ].join('\n');
        const result = runProgram(code, { seconds: 5 });
        expect(result.error).toBeNull();
        expect(result.out).toEqual(['5']);
    });
});

describe('Bricks: блоки без образцов в проектах', () => {
    const XML_HEAD = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="start_block" x="10" y="10"><next>';
    const XML_TAIL = '</next></block></xml>';
    const num = (value: number) => `<block type="math_number"><field name="NUM">${value}</field></block>`;

    test('полёт: сместиться, скорость, угол, заглушить двигатели', () => {
        const xml = `${XML_HEAD}<block type="go_local_point_bf"><value name="X">${num(1)}</value><value name="Y">${num(2)}</value>`
            + `<value name="Z">${num(0)}</value><value name="YAW">${num(90)}</value><value name="TIME">${num(0)}</value><next>`
            + `<block type="set_speed_body"><value name="X">${num(0)}</value><value name="Y">${num(1)}</value><value name="Z">${num(0)}</value>`
            + `<value name="W">${num(0)}</value><next><block type="set_yaw"><value name="ANGLE">${num(45)}</value><next>`
            + `<block type="disarm"></block></next></block></next></block></next></block>${XML_TAIL}`;
        const code = compileBricksXml(xml);
        expect(code).toContain('pioneer.go_to_local_point_body_fixed(1,2,0,90,0)');
        expect(code).toContain('pioneer.set_manual_speed_body_fixed(0,1,0,0)');
        expect(code).toContain('pioneer.set_yaw(45)');
        expect(code).toContain('pioneer.disarm()');
    });

    test('модули: захват, Ranger, ориентация', () => {
        const xml = `${XML_HEAD}<block type="grab_open"><value name="SPEED">${num(30)}</value><next>`
            + `<block type="text_print"><value name="TEXT"><block type="ranger_value"><field name="side">2</field>`
            + `<value name="DATA"><block type="ranger_data"></block></value></block></value><next>`
            + `<block type="text_print"><value name="TEXT"><block type="get_orientation"><field name="angle">2</field></block></value></block>`
            + `</next></block></next></block>${XML_TAIL}`;
        const code = compileBricksXml(xml);
        expect(code).toContain('pioneer.grab_open(velocity=30)');
        expect(code).toContain('print(pioneer.get_ranger_data()[2])');
        expect(code).toContain('print(pioneer.get_orientation()[2])');
    });

    withPython('ArUco: координаты и размер объекта по ID', () => {
        const aruco = '<block type="aruco_find"><field name="FAMILY">DICT_4X4_50</field><value name="IMG"><block type="variables_get"><field name="VAR" id="v_img">img</field></block></value></block>';
        const xml = `<xml xmlns="https://developers.google.com/blockly/xml"><variables><variable id="v_img">img</variable><variable id="v_m">markers</variable></variables>`
            + `<block type="start_block" x="10" y="10"><next><block type="variables_set"><field name="VAR" id="v_img">img</field><value name="VALUE"><block type="cam_get_cv_frame"><field name="choice">CameraType.MAIN</field></block></value><next>`
            + `<block type="variables_set"><field name="VAR" id="v_m">markers</field><value name="VALUE">${aruco}</value><next>`
            + `<block type="text_print"><value name="TEXT"><block type="cv_object_coords"><value name="obj"><block type="variables_get"><field name="VAR" id="v_m">markers</field></block></value>`
            + `<field name="mode">center</field><value name="ident">${num(3)}</value></block></value><next>`
            + `<block type="text_print"><value name="TEXT"><block type="cv_object_size"><value name="obj"><block type="variables_get"><field name="VAR" id="v_m">markers</field></block></value>`
            + `<field name="mode">length</field><value name="ident">${num(3)}</value></block></value></block></next></block></next></block></next></block></next></block></xml>`;
        const result = runProgram(compileBricksXml(xml), { seconds: 5, markers: [[3, [[100, 100], [200, 100], [200, 160], [100, 160]]]] });
        expect(result.error).toBeNull();
        expect(result.out.slice(1, 3)).toEqual(['(150, 130)', '100']);
    });
});
