/** Справочник Python и эмуляция pioneer_sdk должны совпадать: каждый публичный метод Pioneer описан, и наоборот. */
import fs from 'fs';
import { pythonApiDocs } from '../public/modules/docs/python-api-docs.js';

const source = fs.readFileSync('public/modules/python/pioneer-sdk-module.ts', 'utf8');

function classBody(name: string): string {
    const start = source.indexOf(`\nclass ${name}`);
    expect(start).toBeGreaterThan(-1);
    const next = source.indexOf('\nclass ', start + 5);
    return source.slice(start, next === -1 ? undefined : next);
}

const publicMethods = (body: string) => [...body.matchAll(/^ {4}(?:async )?def ([a-z][a-z0-9_]*)\(/gm)].map((match) => match[1]);

/** Методы настоящего pioneer_sdk 0.5.3 (piosdk.py, camera.py, mavsub/wifi.py), которые должны быть в симуляторе. */
const REAL_SDK_PIONEER = [
    'arm', 'disarm', 'takeoff', 'land', 'lua_script_upload', 'lua_script_control', 'led_control', 'reboot_board',
    'go_to_local_point', 'go_to_local_point_body_fixed', 'set_manual_speed', 'set_manual_speed_body_fixed', 'point_reached',
    'get_local_position_lps', 'get_dist_sensor_data', 'get_optical_data', 'get_battery_status', 'get_preflight_state',
    'get_autopilot_state', 'get_autopilot_version', 'send_rc_channels', 'raspberry_poweroff', 'raspberry_reboot',
    'raspberry_led_custom', 'raspberry_start_capture', 'raspberry_stop_capture', 'log', 'set_logger', 'set_log_connection',
    'connected', 'close_connection',
    'receive_wifi_config_ap', 'send_sta_connect', 'send_sta_disconnect', 'send_ap_ssid', 'send_ap_password', 'ap_set_ssid',
    'ap_set_password', 'sta_connect', 'sta_disconnect', 'try_get_sta_status', 'try_get_ap_status'
];
const REAL_SDK_CAMERA = ['connect', 'disconnect', 'get_frame', 'get_cv_frame'];

describe('pioneer_sdk: эмуляция и справочник', () => {
    const pioneer = publicMethods(classBody('Pioneer'));

    test.each(REAL_SDK_PIONEER)('метод настоящего SDK %s есть в симуляторе', (name) => {
        expect(pioneer).toContain(name);
    });

    test.each(REAL_SDK_CAMERA)('Camera.%s есть в симуляторе и в справочнике', (name) => {
        expect(publicMethods(classBody('Camera'))).toContain(name);
        expect(pythonApiDocs[`Camera.${name}`]).toBeDefined();
    });

    test('каждый публичный метод Pioneer описан в справочнике', () => {
        const missing = pioneer.filter((name) => !pythonApiDocs[`Pioneer.${name}`]);
        expect(missing).toEqual([]);
    });

    test('в справочнике нет методов Pioneer, которых нет в симуляторе', () => {
        const documented = Object.keys(pythonApiDocs).filter((key) => key.startsWith('Pioneer.')).map((key) => key.slice('Pioneer.'.length));
        expect(documented.filter((name) => !pioneer.includes(name))).toEqual([]);
    });

    test('у каждой записи справочника есть описание, сигнатура и пример', () => {
        for (const [key, doc] of Object.entries(pythonApiDocs)) {
            expect({ key, ok: Boolean(doc.desc && doc.syntax && doc.example) }).toEqual({ key, ok: true });
        }
    });
});
