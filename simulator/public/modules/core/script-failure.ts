import { emitScriptFailure } from './mission-notices.js';
import type { DroneState, ScriptLanguage } from './state-types.js';

/**
 * Shared "a script run just died" wrapper used by every Lua/Python runtime
 * failure path: marks the drone as stopped with the error status, then
 * emits the script-failure notice. Callers are still responsible for
 * building the language-specific error object (createLuaRuntimeFailureError,
 * createScriptFailureError, etc.) and passing it in here.
 */
export function failScriptRun(drone: DroneState, language: ScriptLanguage, error: unknown): void {
    drone.running = false;
    drone.status = 'ОШИБКА';
    emitScriptFailure(language, error);
}
