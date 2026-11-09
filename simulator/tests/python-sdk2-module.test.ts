/**
 * pioneer_sdk2 в симуляторе: настоящий Python-код библиотеки
 * (pioneer-sdk2-module.ts) запускается в CPython против поддельного моста
 * (helpers/python/run_sdk2_module.py). Плюс: каждый публичный метод
 * настоящего pioneer_sdk2 0.11.0 есть в симуляторе и описан в справочнике.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PIONEER_SDK2_PRELUDE } from '../public/modules/python/pioneer-sdk2-module.js';
import { pythonSdk2ApiDocs } from '../public/modules/docs/python-sdk2-api-docs.js';
import { findPython } from './helpers/python-sdk-harness.js';

const RUNNER = path.join(process.cwd(), 'tests', 'helpers', 'python', 'run_sdk2_module.py');

/** Публичные методы класса Pioneer из pioneer_sdk2 0.11.0 (piosdk2.py). */
const REAL_SDK2_PIONEER = [
    'set_logger', 'connect', 'close_connection', 'time', 'uptime', 'flight_time', 'get_battery_status', 'reboot_board',
    'arm', 'disarm', 'land', 'takeoff', 'point_deceleration', 'point_reached',
    'go_to_global_point_relative', 'go_to_global_point', 'go_to_local_point_body_fixed', 'go_to_local_point',
    'set_manual_speed', 'set_manual_speed_body_fixed', 'set_yaw', 'rtl',
    'rc_sdk1_to_sdk2', 'send_rc_channels', 'get_rc_channel', 'set_rc_trigger',
    'get_accel', 'get_gyro', 'get_mag', 'get_altitude', 'get_orientation', 'get_dist_sensor_data',
    'get_local_position_lps', 'get_local_velocity_lps', 'get_local_yaw_lps', 'get_nav_status_lps', 'get_optical_data',
    'get_global_position_gps', 'get_global_velocity_gps', 'get_satellites_count', 'get_nav_status_gps', 'get_ranger_data',
    'get_fly_state', 'subscribe', 'unsubscribe', 'led_control', 'get_param', 'set_param', 'get_nav_system',
    'get_motors_rpm', 'grab_close', 'grab_open', 'grab_stop', 'cargo_set', 'cargo_grab', 'cargo_release'
];

const publicMethods = (body: string) => [...body.matchAll(/^ {4}(?:async )?def ([a-z][a-z0-9_]*)\(/gm)].map((match) => match[1]);
const pioneerClassBody = (() => {
    const start = PIONEER_SDK2_PRELUDE.indexOf('\nclass Pioneer:');
    const end = PIONEER_SDK2_PRELUDE.indexOf('\nCameraType =', start);
    return PIONEER_SDK2_PRELUDE.slice(start, end);
})();

const python = findPython();
const pythonTest = python ? test : test.skip;

/** Выполняет сценарий (корутина main) и возвращает строки вывода без журнала библиотеки. */
function run(scenario: string): string[] {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pioneer-sdk2-'));
    try {
        fs.writeFileSync(path.join(dir, 'prelude.py'), PIONEER_SDK2_PRELUDE, 'utf8');
        fs.writeFileSync(path.join(dir, 'scenario.py'), scenario, 'utf8');
        const result = spawnSync(python!, [RUNNER, path.join(dir, 'prelude.py'), path.join(dir, 'scenario.py')], {
            encoding: 'utf8', timeout: 60_000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        if (result.status !== 0) throw new Error(`Python завершился с ошибкой:\n${result.stdout}\n${result.stderr}`);
        return result.stdout.split(/\r?\n/).filter((line) => line.length > 0);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const PRE = `
import json
async def main():
    P = sdk2.Pioneer
    pioneer = P(logger=False)
    out = lambda *a: print("OUT", *a)
`;

describe('pioneer_sdk2: полнота относительно 0.11.0', () => {
    const implemented = publicMethods(pioneerClassBody);

    test.each(REAL_SDK2_PIONEER)('метод %s есть в симуляторе и описан в справочнике', (name) => {
        expect(implemented).toContain(name);
        expect(pythonSdk2ApiDocs[`Pioneer.${name}`]).toBeDefined();
    });

    test('каждый публичный метод Pioneer описан в справочнике', () => {
        expect(implemented.filter((name) => !pythonSdk2ApiDocs[`Pioneer.${name}`])).toEqual([]);
    });

    test('в справочнике нет методов Pioneer, которых нет в симуляторе', () => {
        const documented = Object.keys(pythonSdk2ApiDocs).filter((key) => key.startsWith('Pioneer.')).map((key) => key.slice('Pioneer.'.length));
        expect(documented.filter((name) => !implemented.includes(name))).toEqual([]);
    });

    test('у каждой записи справочника есть описание, сигнатура и пример', () => {
        for (const [key, doc] of Object.entries(pythonSdk2ApiDocs)) {
            expect({ key, ok: Boolean(doc.desc && doc.syntax && doc.example && doc.insertText) }).toEqual({ key, ok: true });
        }
    });

    test('справочник описывает классы и перечисления пакета', () => {
        for (const key of ['Pioneer', 'Event', 'FlyState', 'NavSystem', 'NavStatus', 'Camera', 'CameraType', 'ImageViewer', 'RecorderControl', 'ServoCamera', 'ServoPriority',
            'RecorderControl.get_camera_recording_configs', 'RecorderControl.start_recording', 'RecorderControl.stop_recording', 'RecorderControl.take_photo']) {
            expect(pythonSdk2ApiDocs[key]).toBeDefined();
        }
    });
});

describe('pioneer_sdk2: поведение на настоящем Python', () => {
    if (!python) test('Python 3 не найден, тесты пропущены', () => undefined);

    pythonTest('RC: rc_sdk1_to_sdk2 считает так же, как оригинал 0.11.0', () => {
        const lines = run(`${PRE}
    out(json.dumps(pioneer.rc_sdk1_to_sdk2()))
    out(json.dumps(pioneer.rc_sdk1_to_sdk2(1500, 1600, 1700, 1800, 1000)))
`);
        // channel_1 = 0 - 3, channel_2 = 0 - 3, channel_3 = channel_1 - 3, channel_4 = channel_2 - 3, режим 2000 -> 1
        expect(lines).toContain('OUT [-3.0, -3.0, -6.0, -6.0, 1]');
        expect(lines).toContain('OUT [1797.0, 1697.0, 1794.0, 1694.0, 0]');
    });

    pythonTest('RC: send_rc_channels возвращает True, get_rc_channel и set_rc_trigger', () => {
        const lines = run(`${PRE}
    import asyncio
    seen = []
    pioneer.set_rc_trigger(lambda value: seen.append(value))
    out("initial", pioneer.get_rc_channel())
    await asyncio.sleep(0.3)
    out("send", pioneer.send_rc_channels(0.5, -1, 0, 0, 1, 0, 1, 2))
    out("channel", pioneer.get_rc_channel())
    await asyncio.sleep(0.3)
    out("seen", json.dumps(seen))
`);
        expect(lines).toContain('OUT initial 0');
        expect(lines).toContain('OUT send True');
        expect(lines).toContain('OUT channel 2');
        // Первое чтение отличается от None - колбэк с 0; затем с новым значением.
        expect(lines).toContain('OUT seen [0, 2]');
    });

    pythonTest('RC: без набора параметров автопилот RC не слушает, с набором - летит', () => {
        const lines = run(`${PRE}
    await pioneer.arm()
    await pioneer.takeoff()
    pioneer.send_rc_channels(1, 0, 0, 0)
    out("without params", len([c for c in calls if c[0] == "speed"]))
    for name, value in {"Copter_man_rcMode0": 6, "Copter_man_rcMode1": 3, "Copter_man_rcMode2": 3,
                        "Copter_flyWithoutRc": 1, "SensorMux_rc": 2}.items():
        out(name, pioneer.set_param(name, value))
    pioneer.send_rc_channels(1, -1, 0, 0)
    speed = [c for c in calls if c[0] == "speed"][-1][1]
    out("speed", json.dumps(speed[:3]))
`);
        expect(lines).toContain('OUT without params 0');
        expect(lines).toContain('OUT Copter_man_rcMode0 True');
        expect(lines).toContain('OUT speed [1.0, 1.0, 0.0]');
    });

    pythonTest('параметры: словарь грузится один раз, неизвестные - None и False, навигация закреплена', () => {
        const lines = run(`${PRE}
    pioneer.set_logger(True)
    out("unknown", pioneer.get_param("No_such_param"))
    out("nav", pioneer.get_param("Flight_com_navSystem"))
    out("set unknown", pioneer.set_param("No_such_param", 1))
    out("set nav", pioneer.set_param("Flight_com_navSystem", 0))
    out("set rc", pioneer.set_param("Copter_flyWithoutRc", 1))
    out("read back", pioneer.get_param("Copter_flyWithoutRc"))
    out("nav system", pioneer.get_nav_system().name)
`);
        expect(lines).toContain('OUT unknown None');
        expect(lines).toContain('OUT nav 1.0');
        expect(lines).toContain('OUT set unknown False');
        expect(lines).toContain('OUT set nav False');
        expect(lines).toContain('OUT set rc True');
        expect(lines).toContain('OUT read back 1.0');
        expect(lines).toContain('OUT nav system LPS');
        expect(lines.filter((line) => line.includes('Загрузка словаря автопилота'))).toHaveLength(1);
        expect(lines).toContain('-> Установка параметра No_such_param не удалась');
        expect(lines).toContain('-> Установка параметра: Copter_flyWithoutRc 1');
    });

    pythonTest('GPS: без модуля возвращается None, полёт по GPS проверяет порядок команд и систему навигации', () => {
        const lines = run(`${PRE}
    out("pos", pioneer.get_global_position_gps())
    out("vel", pioneer.get_global_velocity_gps())
    out("sat", pioneer.get_satellites_count())
    out("status", pioneer.get_nav_status_gps())
    out("nav", pioneer.get_nav_system().name)
    out("on land", pioneer.go_to_global_point(55.0, 37.0, 10.0))
    await pioneer.arm()
    try:
        pioneer.go_to_global_point_relative(0.0001, 0.0001, 1)
    except RuntimeError as e:
        out("armed", "RuntimeError")
    await pioneer.takeoff()
    out("in sky", pioneer.go_to_global_point(55.0, 37.0, 10.0))
    out("in sky relative", pioneer.go_to_global_point_relative(0.0001, 0.0001, 1, 90))
`);
        for (const expected of ['OUT pos None', 'OUT vel None', 'OUT sat None', 'OUT status None', 'OUT nav LPS',
            'OUT on land False', 'OUT armed RuntimeError', 'OUT in sky False', 'OUT in sky relative False']) {
            expect(lines).toContain(expected);
        }
    });

    pythonTest('порядок команд как в piosdk2.py: команда прошлого этапа - False, следующего и чужого - RuntimeError', () => {
        const lines = run(`${PRE}
    try:
        await pioneer.takeoff()
    except RuntimeError:
        out("takeoff on land", "RuntimeError")
    out("arm", await pioneer.arm())
    out("state", pioneer.get_fly_state().name)
    out("arm again", await pioneer.arm())
    try:
        pioneer.go_to_local_point(1, 0, 1)
    except RuntimeError:
        out("go_to armed", "RuntimeError")
    out("takeoff", await pioneer.takeoff())
    out("takeoff again", await pioneer.takeoff())
    try:
        await pioneer.arm()
    except RuntimeError:
        out("arm in sky", "RuntimeError")
    out("state", pioneer.get_fly_state().name)
    out("land", await pioneer.land())
    out("state", pioneer.get_fly_state().name)
`);
        for (const expected of ['OUT takeoff on land RuntimeError', 'OUT arm True', 'OUT state ARMED', 'OUT arm again False',
            'OUT go_to armed RuntimeError', 'OUT takeoff True', 'OUT takeoff again False', 'OUT arm in sky RuntimeError',
            'OUT state IN_SKY', 'OUT land True', 'OUT state ON_LAND']) {
            expect(lines).toContain(expected);
        }
    });

    pythonTest('без контроля порядка (safety_command=False) команды не проверяются', () => {
        const lines = run(`
async def main():
    pioneer = sdk2.Pioneer(logger=False, safety_command=False)
    pioneer.go_to_local_point(1, 0, 1)
    print("OUT sent", len([c for c in calls if c[0] == "go_to"]))
`);
        expect(lines).toContain('OUT sent 1');
    });

    pythonTest('RecorderControl: режимы, запись и фото как в примере 16 сборника', () => {
        const lines = run(`${PRE}
    recorder = sdk2.RecorderControl()
    configs = recorder.get_camera_recording_configs(sdk2.CameraType.MAIN)
    out("configs", json.dumps(configs))
    config = configs[0] if configs else None
    out("stop idle", recorder.stop_recording(sdk2.CameraType.MAIN))
    out("start", recorder.start_recording(sdk2.CameraType.MAIN, config))
    try:
        recorder.start_recording(sdk2.CameraType.MAIN, config)
    except RuntimeError:
        out("twice", "RuntimeError")
    out("photo", recorder.take_photo("point_1.jpg", sdk2.CameraType.MAIN, config))
    for bad in ("", "photo.gif", "photo"):
        try:
            recorder.take_photo(bad)
        except ValueError:
            out("bad name", "ValueError")
    out("stop", recorder.stop_recording(sdk2.CameraType.MAIN))
    out("opt", len(recorder.get_camera_recording_configs(sdk2.CameraType.OPT)))
`);
        expect(lines).toContain('OUT configs [[1280, 720, 30], [640, 360, 30]]');
        for (const expected of ['OUT stop idle False', 'OUT start True', 'OUT twice RuntimeError', 'OUT photo True', 'OUT stop True', 'OUT opt 1']) {
            expect(lines).toContain(expected);
        }
        expect(lines.filter((line) => line === 'OUT bad name ValueError')).toHaveLength(3);
    });

    pythonTest('параметр высоты взлёта из примера 11 читается и временно меняется', () => {
        const lines = run(`${PRE}
    out("before", pioneer.get_param("Copter_com_takeoffAlt"))
    out("set", pioneer.set_param("Copter_com_takeoffAlt", 0.7))
    out("inside", pioneer.get_param("Copter_com_takeoffAlt", update=True))
    pioneer.set_param("Copter_com_takeoffAlt", 0.4)
    out("after", pioneer.get_param("Copter_com_takeoffAlt", update=True))
`);
        for (const expected of ['OUT before 0.4', 'OUT set True', 'OUT inside 0.7', 'OUT after 0.4']) expect(lines).toContain(expected);
    });

    pythonTest('груз, перезагрузка и сервопривод: значения как у борта без этих модулей', () => {
        const lines = run(`${PRE}
    out("cargo_set", pioneer.cargo_set(True))
    out("cargo_grab", pioneer.cargo_grab())
    out("cargo_release", pioneer.cargo_release())
    out("reboot", pioneer.reboot_board())
    servo = sdk2.ServoCamera()
    try:
        servo.set_angle(31)
    except ValueError:
        out("angle", "ValueError")
`);
        for (const expected of ['OUT cargo_set False', 'OUT cargo_grab False', 'OUT cargo_release False', 'OUT reboot False', 'OUT angle ValueError']) {
            expect(lines).toContain(expected);
        }
    });
});
