import { log } from '../shared/logging/logger.js';

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

export const MCECommandDesc: { [key: number]: string } = {
    [MCECommands.MCE_PREFLIGHT]: 'Предполетная подготовка',
    [MCECommands.ENGINES_DISARM]: 'Отключение двигателей',
    [MCECommands.MCE_LANDING]: 'Посадка',
    [MCECommands.MCE_TAKEOFF]: 'Взлет',
    [MCECommands.ENGINES_ARM]: 'Взвод двигателей'
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

