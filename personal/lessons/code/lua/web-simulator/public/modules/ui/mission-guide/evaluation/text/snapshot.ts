/**
 * Снимок состояния дрона для проверки текстовых (Lua/Python) уроков практикума.
 *
 * В отличие от Blockly-трека (см. `../xml.ts`), тексто-код гоняется через настоящий
 * интерпретатор (Lua или Python), а результат проверяется по фактическому состоянию
 * симулятора — глобальному и языко-независимому (`public/modules/core/state.ts`).
 * Здесь мы делаем плоскую копию нужных полей: `drones[currentDroneId]` продолжает жить
 * и мутироваться симуляцией дальше, поэтому грейдеры не должны держать ссылку на
 * оригинальный объект.
 */
import { currentDroneId, drones } from '../../../../core/state.js';

export interface DroneSnapshot {
    leds: Array<{ r: number; g: number; b: number; w: number }>;
    pos: { x: number; y: number; z: number };
    fsmState: string;
    flightMode: string;
    pointReachedFlag: boolean;
    recentApiCalls: Array<{ api: string; argumentsText: string; fsmState: string }>;
    fsmTransitions: Array<{ from: string; to: string; reason: string }>;
}

/**
 * Возвращает независимую копию состояния текущего дрона либо `null`, если дрона с
 * `currentDroneId` не существует (например, симуляция еще не инициализирована).
 *
 * ВАЖНО: `recentApiCalls`/`fsmTransitions` заполняются только Lua-диагностикой
 * (см. `public/modules/lua/diagnostics/state.ts`). Python-мост
 * (`public/modules/python/pioneer-js-bridge.ts`) их не трогает, поэтому для
 * Python-сценариев эти массивы почти всегда будут пустыми — грейдеры Python-уроков
 * должны опираться только на `leds`, `pos`, `fsmState`, `flightMode`, `pointReachedFlag`.
 */
export function captureDroneSnapshot(): DroneSnapshot | null {
    const drone = drones[currentDroneId];
    if (!drone) return null;

    const leds = Array.isArray(drone.leds)
        ? drone.leds.map((led) => ({
            r: Number(led?.r ?? 0),
            g: Number(led?.g ?? 0),
            b: Number(led?.b ?? 0),
            w: Number(led?.w ?? 0)
        }))
        : [];

    const pos = {
        x: Number(drone.pos?.x ?? 0),
        y: Number(drone.pos?.y ?? 0),
        z: Number(drone.pos?.z ?? 0)
    };

    const recentApiCalls = Array.isArray(drone.luaDiagnostics?.recentApiCalls)
        ? drone.luaDiagnostics.recentApiCalls.map((entry) => ({
            api: String(entry.api),
            argumentsText: String(entry.argumentsText),
            fsmState: String(entry.fsmState)
        }))
        : [];

    const fsmTransitions = Array.isArray(drone.luaDiagnostics?.fsmTransitions)
        ? drone.luaDiagnostics.fsmTransitions.map((entry) => ({
            from: String(entry.from),
            to: String(entry.to),
            reason: String(entry.reason)
        }))
        : [];

    return {
        leds,
        pos,
        fsmState: String(drone.fsmState),
        flightMode: String(drone.flightMode),
        pointReachedFlag: Boolean(drone.pointReachedFlag),
        recentApiCalls,
        fsmTransitions
    };
}
