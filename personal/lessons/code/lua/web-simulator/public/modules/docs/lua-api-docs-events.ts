import type { ApiDoc } from './api-docs-types.js';

export const luaApiDocsEvents: Record<string, ApiDoc> = {
    'Ev.MCE_PREFLIGHT': { desc: 'Предполетная подготовка. Запустить двигатели и провести подготовку', syntax: 'Ev.MCE_PREFLIGHT', params: '-', returns: 'число (ID события)', example: 'ap.push(Ev.MCE_PREFLIGHT)' },
    'Ev.MCE_TAKEOFF': { desc: 'Отправить на взлет', syntax: 'Ev.MCE_TAKEOFF', params: '-', returns: 'число', example: 'ap.push(Ev.MCE_TAKEOFF)' },
    'Ev.MCE_LANDING': { desc: 'Отправить на посадку', syntax: 'Ev.MCE_LANDING', params: '-', returns: 'число', example: 'ap.push(Ev.MCE_LANDING)' },
    'Ev.ENGINES_ARM': { desc: 'Завести двигатели', syntax: 'Ev.ENGINES_ARM', params: '-', returns: 'число', example: 'ap.push(Ev.ENGINES_ARM)' },
    'Ev.ENGINES_DISARM': { desc: 'Отключить двигатели', syntax: 'Ev.ENGINES_DISARM', params: '-', returns: 'число', example: 'ap.push(Ev.ENGINES_DISARM)' },
    'Ev.TAKEOFF_COMPLETE': { desc: 'Взлет завершен', syntax: 'Ev.TAKEOFF_COMPLETE', params: '-', returns: 'число', example: 'if event == Ev.TAKEOFF_COMPLETE then ...' },
    'Ev.COPTER_LANDED': { desc: 'Коптер приземлился', syntax: 'Ev.COPTER_LANDED', params: '-', returns: 'число', example: 'if event == Ev.COPTER_LANDED then ...' },
    'Ev.LOW_VOLTAGE1': { desc: 'Низкое напряжение 1 (предупреждение)', syntax: 'Ev.LOW_VOLTAGE1', params: '-', returns: 'число', example: 'if event == Ev.LOW_VOLTAGE1 then ...' },
    'Ev.LOW_VOLTAGE2': { desc: 'Низкое напряжение 2 (критическое)', syntax: 'Ev.LOW_VOLTAGE2', params: '-', returns: 'число', example: 'if event == Ev.LOW_VOLTAGE2 then ...' },
    'Ev.POINT_REACHED': { desc: 'Точка достигнута', syntax: 'Ev.POINT_REACHED', params: '-', returns: 'число', example: 'if event == Ev.POINT_REACHED then ...' },
    'Ev.ENGINES_STARTED': { desc: 'Двигатели запущены', syntax: 'Ev.ENGINES_STARTED', params: '-', returns: 'число', example: 'if event == Ev.ENGINES_STARTED then ...' },
    'Ev.POINT_DECELERATION': { desc: 'Торможение перед точкой', syntax: 'Ev.POINT_DECELERATION', params: '-', returns: 'число', example: 'if event == Ev.POINT_DECELERATION then ...' },
    'Ev.SYNC_START': { desc: 'Синхронный старт', syntax: 'Ev.SYNC_START', params: '-', returns: 'число', example: 'if event == Ev.SYNC_START then ...' },
    'Ev.SHOCK': { desc: 'Удар', syntax: 'Ev.SHOCK', params: '-', returns: 'число', example: 'if event == Ev.SHOCK then ...' },
    'Ev.CONTROL_FAIL': { desc: 'Отказ управления', syntax: 'Ev.CONTROL_FAIL', params: '-', returns: 'число', example: 'if event == Ev.CONTROL_FAIL then ...' },
    'Ev.ENGINE_FAIL': { desc: 'Отказ двигателя', syntax: 'Ev.ENGINE_FAIL', params: '-', returns: 'число', example: 'if event == Ev.ENGINE_FAIL then ...' }
};
