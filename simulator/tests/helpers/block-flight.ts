import type { SimEvent } from './lua-sim-harness.js';
import { behaviour } from './trace-compare.js';

/**
 * Проверки полёта по трассе симулятора (Lua) или поддельного pioneer_sdk (Python):
 * общие для тестов примеров блоков и уроков учебника.
 */
export type FlightExpectation = {
    points: number[][];
    // цвета нулевого бортового светодиода по порядку (между ними могут быть другие)
    led?: string[];
    lands: boolean;
};

// Повторная команда «лететь в ту же точку» — это поворот на месте: Python-модель
// отправляет её, чтобы сменить курс, а Lua меняет курс отдельной командой.
// Обе записи для зрителя одинаковы, поэтому подряд идущие одинаковые точки схлопываем.
export const goto = (events: SimEvent[]) => events
    .filter((event) => event.what.startsWith('goto '))
    .map((event) => event.what.slice('goto '.length).split(',').map(Number))
    .filter((point, i, all) => i === 0 || point.join() !== all[i - 1].join());

// Lua-трасса симулятора не показывает выключение моторов, Python — показывает.
export const flightNames = (events: SimEvent[]) => {
    let lastPoint = '';
    return behaviour(events).flight
        .map((event) => event.what)
        .filter((what) => {
            if (what === 'disarm') return false;
            if (!what.startsWith('goto ')) return true;
            const repeated = what === lastPoint;
            lastPoint = what;
            return !repeated;
        });
};

// Цвета светодиода 0 без подряд идущих повторов, включая короткие вспышки.
export const ledColours = (events: SimEvent[]) => events
    .filter((event) => event.what.startsWith('led 0 '))
    .map((event) => event.what.slice('led 0 '.length))
    .filter((colour, i, all) => i === 0 || colour !== all[i - 1]);

export function isSubsequence(wanted: string[], actual: string[]): boolean {
    let next = 0;
    for (const item of actual) if (item === wanted[next]) next += 1;
    return next === wanted.length;
}

export function expectFlight(events: SimEvent[], expected: FlightExpectation): void {
    const seen = behaviour(events);
    expect(seen.failures).toEqual([]);
    expect(goto(events)).toEqual(expected.points);
    if (expected.led) {
        const colours = ledColours(events);
        expect({ wanted: expected.led, got: colours, ok: isSubsequence(expected.led, colours) })
            .toEqual({ wanted: expected.led, got: colours, ok: true });
    }
    const commands = seen.flight.map((event) => event.what).filter((what) => ['arm', 'takeoff', 'land'].includes(what));
    if (expected.points.length > 0 || expected.lands) {
        expect(commands).toContain('takeoff');
    }
    if (expected.lands) {
        expect(commands[commands.length - 1]).toBe('land');
        // посадка — последнее, что делает дрон: после неё ни одной новой точки
        const landedAt = seen.flight.findIndex((event) => event.what === 'land');
        expect(seen.flight.slice(landedAt).some((event) => event.what.startsWith('goto'))).toBe(false);
    }
}


// Камера в этом стенде — заглушка: настоящий кадр рисует браузер (canvas), а
// здесь проверяется программа, а не съёмка.
export const LUA_CAMERA_STUB = 'camera.requestMakeShot = function() end camera.checkRequestShot = function() return 0 end';
export const PYTHON_CAMERA_STUB = [
    'import sys, types',
    '_js = types.ModuleType("js"); _js.pioneer_camera_save_photo = lambda camera_id: None; sys.modules["js"] = _js',
    'import pioneer_sdk',
    'class _StubCamera:',
    '    _id = 0',
    '    def __init__(self, *args, **kwargs): pass',
    '    def get_frame(self): return b"frame"',
    'pioneer_sdk.Camera = _StubCamera',
    ''
].join('\n');


export const luaPrelude = 'math.randomseed(1) ' + LUA_CAMERA_STUB;
export const withStubs = (code: string) => PYTHON_CAMERA_STUB + code;
