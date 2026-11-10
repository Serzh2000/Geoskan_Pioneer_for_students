/**
 * Примеры ROS 2 (examples/python-onboard/ros2): каждый запускается как программа ученика - через тот же
 * преобразователь __SimAsyncify, что и в браузере, - на Мини 2 и на Базовом с Radxa против поддельного мира.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runRos2, withRos2Python } from './helpers/ros2-runtime.js';

const ROOT = path.resolve(process.cwd(), '..', 'examples', 'python-onboard', 'ros2');
const FILES = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter((name) => name.endsWith('.py')).sort() : [];
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('примеры ROS 2', () => {
    test('набор из 10 примеров с понятными именами', () => {
        expect(FILES.length).toBeGreaterThanOrEqual(8);
        expect(FILES.every((name) => /^ros2_\d\d_[a-z0-9_]+\.py$/.test(name))).toBe(true);
    });

    test.each(FILES)('%s: начинается с комментария-описания, использует rclpy', (file) => {
        const code = read(file);
        expect(code.startsWith('#')).toBe(true);
        expect(code).toMatch(/^import rclpy$/m);
        expect(code).toMatch(/rclpy\.shutdown\(\)/);
    });

    for (const model of ['pioneer-mini2', 'pioneer-basic'] as const) {
        FILES.forEach((file) => {
            withRos2Python(`${file}: выполняется без ошибок (${model})`, () => {
                const run = runRos2(read(file), { model, mode: 'program', seconds: 200, speed: 10 });
                expect(run.result.error).toBeNull();
                // Программы, которые поднимают дрон, должны садиться и глушить моторы.
                if (/takeoff/.test(read(file))) expect(run.result.fsm).toBe('IDLE');
            });
        });
    }

    withRos2Python('ros2_01: полётный цикл доводит дрон до точки (1, 1, 1) и садит', () => {
        const run = runRos2(read('ros2_01_flight_cycle.py'), { mode: 'program', seconds: 200, speed: 10 });
        expect(run.result.error).toBeNull();
        const goTo = run.result.calls.filter((c) => c[0] === 'go_to');
        expect(goTo).toHaveLength(1);
        expect((goTo[0][1] as number[]).slice(0, 3)).toEqual([1, 1, 1]);
        expect(run.result.calls.map((c) => c[0])).toEqual(['arm', 'takeoff', 'go_to', 'land', 'disarm']);
        expect(run.result.log.some((entry) => entry[1].includes('Взлетели'))).toBe(true);
    });

    withRos2Python('ros2_03: квадрат скоростью - четыре стороны по 1 м и посадка', () => {
        const run = runRos2(read('ros2_03_cmd_vel_square.py'), { mode: 'program', seconds: 300, speed: 10 });
        expect(run.result.error).toBeNull();
        expect(run.result.calls.some((c) => c[0] === 'speed')).toBe(true);
        expect(run.result.calls.map((c) => c[0]).slice(-1)[0]).toBe('land');
        expect(Math.hypot(run.result.pos[0], run.result.pos[1])).toBeLessThan(0.6);
    });

    withRos2Python('ros2_04: светодиоды - красный/зелёный, затем синий, затем выключены', () => {
        const run = runRos2(read('ros2_04_led.py'), { mode: 'program', seconds: 60, speed: 10 });
        expect(run.result.error).toBeNull();
        expect(run.result.leds).toEqual({ '0': [0, 0, 0], '1': [0, 0, 0] });
        const colors = run.result.calls.filter((c) => c[0] === 'led').map((c) => (c[1] as number[]).slice(1));
        expect(colors[0]).toEqual([255, 0, 0]);
        expect(colors).toContainEqual([0, 0, 255]);
    });

    withRos2Python('ros2_05: механический захват у Мини 2, магнитный у Базового', () => {
        const mini = runRos2(read('ros2_05_grab_cargo.py'), { model: 'pioneer-mini2', mode: 'program', speed: 10 });
        expect(mini.out).toEqual(['Захватываем: механический захват', 'Отпускаем: механический захват']);
        const basic = runRos2(read('ros2_05_grab_cargo.py'), { model: 'pioneer-basic', mode: 'program', speed: 10 });
        expect(basic.out).toEqual(['Захватываем: магнитный захват', 'Отпускаем: магнитный захват']);
    });

    withRos2Python('ros2_06: параметры читаются и записываются', () => {
        const run = runRos2(read('ros2_06_params.py'), { mode: 'program', speed: 10 });
        expect(run.out.slice(0, 4)).toEqual(['Высота взлёта: 0.4', 'Записали 0.8: True', 'Теперь: 0.8', 'Несуществующий параметр: None']);
        expect(run.out.filter((line) => line.startsWith('  ')).length).toBe(7);
    });

    withRos2Python('ros2_07: навигация переключается на земле', () => {
        const run = runRos2(read('ros2_07_navigation_system.py'), { mode: 'program', speed: 10 });
        expect(run.out).toEqual(['Сейчас: LPS', 'Переключаем на OPT: готово -> OPT', 'Переключаем на LPS: готово -> LPS']);
    });

    withRos2Python('ros2_08: Ranger виден только у Мини 2', () => {
        const mini = runRos2(read('ros2_08_sensor_logger.py'), { model: 'pioneer-mini2', mode: 'program', speed: 4 });
        expect(mini.result.log.some((e) => e[1].includes('Ranger'))).toBe(true);
        const basic = runRos2(read('ros2_08_sensor_logger.py'), { model: 'pioneer-basic', mode: 'program', speed: 4 });
        expect(basic.result.log.some((e) => e[1].includes('Ranger'))).toBe(false);
        expect(basic.result.log.some((e) => e[1].includes('крен'))).toBe(true);
    });

    withRos2Python('ros2_09: RC-каналы публикуются постоянно', () => {
        const run = runRos2(read('ros2_09_rc_channels.py'), { mode: 'program', speed: 4 });
        expect(run.result.rc).toEqual([1500, 1500, 1500, 1500, 1500, 1500, 1500, 2000]);
        expect(run.result.calls.filter((c) => c[0] === 'rc').length).toBeGreaterThan(5);
    });

    withRos2Python('ros2_10: автомат проходит все состояния и садится', () => {
        const run = runRos2(read('ros2_10_mission_state_machine.py'), { mode: 'program', seconds: 300, speed: 10 });
        expect(run.result.error).toBeNull();
        expect(run.result.calls.map((c) => c[0])).toEqual(['arm', 'takeoff', 'go_to', 'go_to', 'land', 'disarm']);
        const states = run.result.log.map((e) => e[1]).filter((text) => text.includes('состояние:')).map((text) => text.split('состояние: ')[1]);
        expect(states).toEqual(['TAKEOFF', 'WAIT_TAKEOFF', 'FLY', 'FLY', 'WAIT_LAND', 'DONE']);
    });
});
