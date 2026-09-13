import { log } from '../shared/logging/logger.js';

export class EventEmitter {
    private listeners: { [event: string]: Array<(...args: any[]) => void> };

    constructor() {
        this.listeners = {};
    }

    on(event: string, callback: (...args: any[]) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event: string, callback: (...args: any[]) => void) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event: string, ...args: any[]) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => cb(...args));
    }
}

export const mceEmitter = new EventEmitter();

/**
 * @enum {number}
 * @description Команды MCE автопилота
 */
export const MCECommands = {
    MCE_PREFLIGHT: 1,
    MCE_TAKEOFF: 2,
    MCE_LANDING: 3,
    ENGINES_ARM: 4,
    ENGINES_DISARM: 5
};

/**
 * @enum {number}
 * @description События автопилота
 */
export const MCEEvents = {
    TAKEOFF_COMPLETE: 6,
    COPTER_LANDED: 7,
    LOW_VOLTAGE1: 13,
    LOW_VOLTAGE2: 14,
    POINT_REACHED: 10,
    ENGINES_STARTED: 11,
    POINT_DECELERATION: 12,
    SYNC_START: 15,
    SHOCK: 16,
    CONTROL_FAIL: 17,
    ENGINE_FAIL: 18
};

export const MCECommandDesc: { [key: number]: string } = {
    [MCECommands.MCE_PREFLIGHT]: 'Предполетная подготовка',
    [MCECommands.ENGINES_DISARM]: 'Отключение двигателей',
    [MCECommands.MCE_LANDING]: 'Посадка',
    [MCECommands.MCE_TAKEOFF]: 'Взлет',
    [MCECommands.ENGINES_ARM]: 'Взвод двигателей'
};

export const MCEEventDesc: { [key: number]: string } = {
    [MCEEvents.ENGINES_STARTED]: 'Двигатели запущены',
    [MCEEvents.COPTER_LANDED]: 'Коптер приземлился',
    [MCEEvents.TAKEOFF_COMPLETE]: 'Взлет завершен',
    [MCEEvents.POINT_REACHED]: 'Точка достигнута',
    [MCEEvents.POINT_DECELERATION]: 'Торможение перед точкой',
    [MCEEvents.LOW_VOLTAGE1]: 'Низкое напряжение 1',
    [MCEEvents.LOW_VOLTAGE2]: 'Низкое напряжение 2',
    [MCEEvents.SYNC_START]: 'Синхронный старт',
    [MCEEvents.SHOCK]: 'Удар',
    [MCEEvents.CONTROL_FAIL]: 'Отказ управления',
    [MCEEvents.ENGINE_FAIL]: 'Отказ двигателя'
};

export function pushCommand(cmdId: number): Promise<void> {
    return new Promise((resolve) => {
        const desc = MCECommandDesc[cmdId] || `Неизвестная команда (${cmdId})`;
        log(`Команда MCE: ${desc}`, 'info');
        
        setTimeout(() => {
            resolve();
        }, 100);
    });
}

