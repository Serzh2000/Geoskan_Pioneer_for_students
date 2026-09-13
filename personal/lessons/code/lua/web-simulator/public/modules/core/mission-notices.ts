/**
 * Шина уведомлений о состоянии миссии. Ядро симулятора (physics/lua/autopilot)
 * не должно статически зависеть от app/-слоя (UI-тостов, DOM) — вместо прямого
 * вызова showXNotice() оно эмитит событие через emitX(...), а app/script-execution-notice.ts
 * подписывается на них один раз при старте (см. wireMissionNotices()).
 * Это даёт физике/автопилоту/Lua-рантайму работать headless (в тестах — без
 * регистрации обработчиков emit-функции просто no-op).
 */
import type { ScriptLanguage } from './state.js';

export type MissionNoticeHandlers = {
    scriptFailure: (language: ScriptLanguage, error: unknown) => void;
    missionGamepadOverride: () => void;
    missingCallbackMission: (apiName?: string) => void;
    earlyRoute: () => void;
    simultaneousCommands: (labels: string[]) => void;
    genericNotice: (title: string, message: string, level: 'warn' | 'error') => void;
};

let handlers: Partial<MissionNoticeHandlers> = {};

export function onMissionNotices(next: MissionNoticeHandlers): void {
    handlers = next;
}

export function emitScriptFailure(language: ScriptLanguage, error: unknown): void {
    handlers.scriptFailure?.(language, error);
}

export function emitMissionGamepadOverride(): void {
    handlers.missionGamepadOverride?.();
}

export function emitMissingCallbackMission(apiName?: string): void {
    handlers.missingCallbackMission?.(apiName);
}

export function emitEarlyRoute(): void {
    handlers.earlyRoute?.();
}

export function emitSimultaneousCommands(labels: string[]): void {
    handlers.simultaneousCommands?.(labels);
}

export function emitGenericNotice(title: string, message: string, level: 'warn' | 'error'): void {
    handlers.genericNotice?.(title, message, level);
}
