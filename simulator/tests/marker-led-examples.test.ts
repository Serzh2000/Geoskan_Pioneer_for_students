import fs from 'node:fs';
import path from 'node:path';
import { findPython, runPythonScenario } from './helpers/python-sdk-harness.js';

/*
 * Примеры, которые красят светодиоды по меткам в кадре нижней камеры (examples-python-sdk2):
 *  - 22_marker_field_led.py - полёт с клавиатуры (виртуальный пульт) над полем ArUco;
 *  - 23_apriltag_field_leds.py - поле AprilTag 12 x 12, дрон ведут с настоящего пульта (pioneer_sdk2, Radxa);
 *  - aruco_examples/13_apriltag_field_leds.py - то же для pioneer_sdk: компьютер по Wi-Fi, камера ESP32.
 * Книга на них не ссылается, поэтому lessons-book-examples.test.ts их не запускает - проверяем здесь на поддельном
 * pioneer_sdk2 (helpers/python/run_onboard.py): метки и нажатия клавиш идут по расписанию сценария.
 */
const EXAMPLES = path.resolve('examples-python-sdk2');
const SDK1_EXAMPLES = path.resolve('examples-python', 'aruco_examples');
const withPython = findPython() ? test : test.skip;

function run(file: string, scenario: Parameters<typeof runPythonScenario>[1]): string[] {
    const code = fs.readFileSync(path.join(EXAMPLES, file), 'utf8');
    return runPythonScenario(code, scenario, 'onboard').map((event) => event.what);
}

function runSdk1(file: string, scenario: Parameters<typeof runPythonScenario>[1]): string[] {
    const code = fs.readFileSync(path.join(SDK1_EXAMPLES, file), 'utf8');
    return runPythonScenario(code, scenario, 'sdk').map((event) => event.what);
}

/** Все ожидаемые события встречаются в трассе в этом порядке (между ними могут быть другие). */
function inOrder(names: string[], expected: Array<string | RegExp>): { missing: string[] } {
    let i = 0;
    for (const want of expected) {
        const found = names.findIndex((name, index) => index >= i && (want instanceof RegExp ? want.test(name) : name === want));
        if (found < 0) return { missing: expected.slice(expected.indexOf(want)).map(String) };
        i = found + 1;
    }
    return { missing: [] };
}

describe('22_marker_field_led.py: полёт с клавиатуры, светодиоды по ArUco', () => {
    withPython('W и D двигают стики, метки красят светодиоды, Esc сажает дрон и гасит светодиоды', () => {
        const names = run('22_marker_field_led.py', {
            seconds: 60,
            markers: [[8, 10, 7], [14, 16, 7], [20, 22, 12]],
            keys: [[5, 'w'], [5.3, 'w'], [5.6, 'w'], [6, 'd'], [30, 27]]
        });
        expect({ ...inOrder(names, ['camera OPT', 'param Copter_man_rcMode0=6', 'arm', 'takeoff', 'goto 0,0,1.5', 'rc pitch', 'rc roll+pitch', 'rc neutral',
            'led 0 1,1,1', 'led 0 1,0,1', 'land', 'led 0 0,0,0', 'param Copter_man_rcMode0=0', 'exit']), errors: names.filter((n) => n.startsWith('error')) })
            .toEqual({ missing: [], errors: [] });
    });

    withPython('номера 3 и 11 дали бы один цвет палитры: второй маркер получает следующий, а не цвет предыдущего', () => {
        const names = run('22_marker_field_led.py', { seconds: 40, markers: [[8, 10, 3], [14, 16, 11]], keys: [[25, 27]] });
        expect(inOrder(names, ['arm', 'takeoff', 'led 0 1,0.8,0', 'led 0 1,0,1', 'land', 'led 0 0,0,0', 'exit'])).toEqual({ missing: [] });
    });
});

describe('23_apriltag_field_leds.py: поле AprilTag 12 x 12, дрон ведут с пульта', () => {
    withPython('метка красит светодиоды и называет клетку поля; та же метка цвет не меняет; полёт не трогает', () => {
        const names = run('23_apriltag_field_leds.py', { seconds: 30, markers: [[3, 5, 10], [8, 10, 10], [12, 14, 25]] });
        expect(inOrder(names, ['camera OPT', /^print Поле AprilTag DICT_APRILTAG_36h11/, 'led 0 0,0,1', 'print Метка 10: строка 0, столбец 10',
            'led 0 0,1,0', 'print Метка 25: строка 2, столбец 1'])).toEqual({ missing: [] });
        // Дрон ведёт настоящий пульт: никаких arm, takeoff, land и команд скорости или пульта от скрипта.
        expect(names.filter((n) => /^(arm|takeoff|land|disarm|goto|speed|rc |ignored rc)/.test(n))).toEqual([]);
        // Метка 10 попала в кадр дважды, но цвет сменился один раз (и один раз на метку 25).
        expect(names.filter((n) => n.startsWith('led 0 '))).toEqual(['led 0 0,0,1', 'led 0 0,1,0']);
    });

    withPython('цвет не повторяет предыдущий, метка за пределами поля называется честно', () => {
        const names = run('23_apriltag_field_leds.py', { seconds: 30, markers: [[3, 5, 3], [8, 10, 11], [14, 16, 200]] });
        expect(inOrder(names, ['led 0 1,0.8,0', 'print Метка 3: строка 0, столбец 3', 'led 0 1,0,1', 'print Метка 11: строка 0, столбец 11',
            'led 0 1,0,0', 'print Метка 200 (вне поля 12 x 12)'])).toEqual({ missing: [] });
    });

    withPython('одиночный кадр с меткой (мерцание) цвет не меняет: нужно CONFIRM_FRAMES кадров подряд', () => {
        const names = run('23_apriltag_field_leds.py', { seconds: 20, markers: [[5, 5.02, 4]] });
        expect(names.filter((n) => n.startsWith('led '))).toEqual([]);
    });
});

describe('25_marker_led_on.py: метка 6 x 6 в кадре - светодиоды горят, метки нет - погасли', () => {
    withPython('горят пока метка в кадре и гаснут после потери; полёт не трогает; одиночный кадр не зажигает', () => {
        const names = run('25_marker_led_on.py', { seconds: 30, markers: [[3, 6, 5], [12, 14, 8], [20, 20.02, 9]] });
        // метка 5 - голубой, метка 8 - зелёный (палитра по номеру % 7)
        expect(inOrder(names, ['camera OPT', 'led 0 0,1,1', 'led 0 0,0,0', 'led 0 0,1,0', 'led 0 0,0,0'])).toEqual({ missing: [] });
        expect(names.filter((n) => /^(arm|takeoff|land|disarm|goto|speed|rc |ignored rc)/.test(n))).toEqual([]);
        expect(names.filter((n) => n.startsWith('led 0 0,1,0'))).toHaveLength(1);   // метка 9 мелькнула один кадр - не в счёт
    });

    withPython('сменился номер метки - сменился цвет, без выключения между ними', () => {
        const names = run('25_marker_led_on.py', { seconds: 30, markers: [[3, 6, 1], [6.1, 9, 2]] });
        const leds = names.filter((n) => n.startsWith('led 0 '));
        expect(leds.slice(0, 2)).toEqual(['led 0 0,1,0', 'led 0 0,0,1']);   // 1 - зелёный, 2 - синий
    });
});

describe('aruco_examples/13_apriltag_field_leds.py: то же для pioneer_sdk (компьютер, Wi-Fi, камера ESP32)', () => {
    withPython('метка красит светодиоды (0..255) и называет клетку поля; та же метка цвет не меняет; полёт не трогает', () => {
        const names = runSdk1('13_apriltag_field_leds.py', { seconds: 30, markers: [[3, 5, 10], [8, 10, 10], [12, 14, 25]] });
        expect(inOrder(names, [/^print Поле AprilTag DICT_APRILTAG_36h11/, 'led 0 0,0,255', 'print Метка 10: строка 0, столбец 10',
            'led 0 0,255,0', 'print Метка 25: строка 2, столбец 1'])).toEqual({ missing: [] });
        expect(names.filter((n) => /^(takeoff|land|arm|disarm|goto|yaw|speed)/.test(n))).toEqual([]);
        expect(names.filter((n) => n.startsWith('led 0 '))).toEqual(['led 0 0,0,255', 'led 0 0,255,0']);
    });

    withPython('цвет не повторяет предыдущий; метка за пределами поля называется честно; одиночный кадр цвет не меняет', () => {
        const names = runSdk1('13_apriltag_field_leds.py', { seconds: 30, markers: [[3, 5, 3], [8, 10, 11], [14, 16, 200], [20, 20.02, 4]] });
        expect(inOrder(names, ['led 0 255,204,0', 'print Метка 3: строка 0, столбец 3', 'led 0 255,0,255', 'print Метка 11: строка 0, столбец 11',
            'led 0 255,0,0', 'print Метка 200 (вне поля 12 x 12)'])).toEqual({ missing: [] });
        expect(names.filter((n) => n.startsWith('led 0 '))).toHaveLength(3);
    });
});
