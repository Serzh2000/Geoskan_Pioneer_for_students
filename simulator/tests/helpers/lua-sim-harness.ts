import { jest } from '@jest/globals';

/**
 * Гоняет Lua-скрипт в настоящем рантайме симулятора (Fengari + физика) и
 * записывает то, что видно снаружи: переходы автопилота, точки, куда дрон
 * полетел, цвета первых четырёх светодиодов (они есть на любой плате — и у
 * Lua Ledbar, и у Python led_control) и магнит захвата груза.
 *
 * Сравнивать по такой трассе можно программы, написанные совсем по-разному:
 * официальный пример Geoscan и его копию, собранную из блоков.
 */
export type SimEvent = { t: number; what: string };

// Сценарий вокруг программы: что делает «мир» на каждом шаге (переключить
// тумблер пульта, прислать событие низкого заряда, сдвинуть дрон).
export type ScenarioApi = {
    drone: ReturnType<typeof import('../../public/modules/core/state.js').createDroneState>;
    triggerEvent(eventId: number): void;
    setRcSwitch(channel: number, pwm: number | null): void;
};

export type RunOptions = {
    onStep?: (t: number, api: ScenarioApi) => void;
    // Код перед программой: например, math.randomseed для программ со случайными цветами.
    prelude?: string;
};

export type LuaSim = {
    run(script: string, seconds: number, options?: RunOptions): SimEvent[];
};

const TRACKED_LEDS = 4;

// Одна строка — номера строк в ошибках программы сдвигаются всего на единицу.
const GOTO_TRACE_PRELUDE = '__harness_gotos = {} do local g = ap.goToLocalPoint; ap.goToLocalPoint = function(x, y, z, t) '
    + '__harness_gotos[#__harness_gotos + 1] = {time(), x, y, z}; return g(x, y, z, t) end end';
const STEP = 1 / 60;

let simPromise: Promise<LuaSim> | null = null;

export function setupLuaSim(): Promise<LuaSim> {
    if (!simPromise) simPromise = createLuaSim();
    return simPromise;
}

async function createLuaSim(): Promise<LuaSim> {
    const g = globalThis as Record<string, unknown>;
    g.window ??= {};
    g.document ??= {
        getElementById: () => null,
        createElement: () => ({ append: () => {}, appendChild: () => {} })
    };
    // @ts-expect-error The underlying Lua VM has no TypeScript declarations.
    const fengari = await import('fengari');
    jest.unstable_mockModule('fengari-web', () => fengari);
    const state = await import('../../public/modules/core/state.js');
    const runtime = await import('../../public/modules/lua/runtime.js');
    const { updatePhysics } = await import('../../public/modules/physics/index.js');
    const drone = state.createDroneState('lua_sim_harness', 'Lua harness');

    return {
        run(script: string, seconds: number, options: RunOptions = {}): SimEvent[] {
            runtime.stopLuaScript(drone.id);
            state.resetRuntimeStatePreservePose(drone.id);
            drone.pos = { x: 0, y: 0, z: 0 };
            drone.vel = { x: 0, y: 0, z: 0 };
            drone.orientation = { roll: 0, pitch: 0, yaw: 0 };
            drone.target_pos = { x: 0, y: 0, z: 0 };
            drone.target_yaw = 0;
            drone.fsmState = 'IDLE';
            drone.status = 'IDLE';
            drone.magnetGripper.active = false;

            const events: SimEvent[] = [];
            let lastFsm: string = drone.fsmState;
            let gotosSeen = 0;
            let lastYaw = drone.target_yaw;
            let lastMagnet = false;
            const lastLeds = Array.from({ length: TRACKED_LEDS }, () => '0,0,0');
            const record = (what: string) => events.push({ t: Math.round(drone.current_time * 100) / 100, what });
            // Точки пишет сама программа (обёртка ap.goToLocalPoint в прологе,
            // см. GOTO_TRACE_PRELUDE): за один шаг физики дрон может получить
            // и достичь несколько точек, и по состоянию автомата их не видно.
            const pullGotos = () => {
                const L = drone.luaState;
                if (!L) return;
                const lua = fengari.lua;
                lua.lua_getglobal(L, fengari.to_luastring('__harness_gotos'));
                const count = lua.lua_istable(L, -1) ? lua.lua_rawlen(L, -1) : 0;
                for (let i = gotosSeen + 1; i <= count; i += 1) {
                    lua.lua_rawgeti(L, -1, i);
                    const values = [1, 2, 3, 4].map((k) => {
                        lua.lua_rawgeti(L, -1, k);
                        const value = lua.lua_tonumber(L, -1);
                        lua.lua_pop(L, 1);
                        return value;
                    });
                    lua.lua_pop(L, 1);
                    const target = values.slice(1).map((value) => Math.round(value * 100) / 100).join(',');
                    events.push({ t: Math.round(values[0] * 100) / 100, what: `goto ${target}` });
                }
                gotosSeen = Math.max(gotosSeen, count);
                lua.lua_pop(L, 1);
            };
            const observe = () => {
                if (drone.fsmState !== lastFsm) {
                    lastFsm = drone.fsmState;
                    record(`fsm ${lastFsm}`);
                }
                pullGotos();
                if (Math.abs(drone.target_yaw - lastYaw) > 1e-3) {
                    lastYaw = drone.target_yaw;
                    record(`yaw ${Math.round(lastYaw * 1000) / 1000}`);
                }
                if (drone.magnetGripper.active !== lastMagnet) {
                    lastMagnet = drone.magnetGripper.active;
                    record(`cargo ${lastMagnet ? 'grab' : 'release'}`);
                }
                for (let i = 0; i < TRACKED_LEDS; i += 1) {
                    const led = drone.leds[i];
                    const colour = [led.r, led.g, led.b].map((value) => Math.round(value)).join(',');
                    if (colour !== lastLeds[i]) {
                        lastLeds[i] = colour;
                        record(`led ${i} ${colour}`);
                    }
                }
            };

            const api: ScenarioApi = {
                drone,
                triggerEvent: (eventId) => runtime.triggerLuaCallback(drone.id, eventId),
                setRcSwitch: (channel, pwm) => {
                    state.simSettings.gamepadConnected = pwm !== null;
                    if (pwm !== null) drone.rcChannels[channel - 1] = pwm;
                }
            };
            drone.rcChannels = [1500, 1500, 1000, 1500, 1000, 1000, 1000, 1000];
            state.simSettings.gamepadConnected = false;

            drone.running = true;
            drone.status = 'РАБОТАЕТ';
            runtime.runLuaScript(drone.id, `${GOTO_TRACE_PRELUDE}\n${options.prelude ?? ''}\n${script}`);
            observe();
            for (let step = 0; step < seconds / STEP; step += 1) {
                options.onStep?.(drone.current_time, api);
                updatePhysics(STEP);
                observe();
                if (!drone.running) {
                    record(`stopped ${drone.luaDiagnostics.lastFailureReason ?? ''}`.trim());
                    break;
                }
            }
            runtime.stopLuaScript(drone.id);
            state.simSettings.gamepadConnected = false;
            return events;
        }
    };
}

// Только то, что видно на коптере, без времени — для сравнения порядка.
export function eventNames(events: SimEvent[]): string[] {
    return events.map((event) => event.what);
}
