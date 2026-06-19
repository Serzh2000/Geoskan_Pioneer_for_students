import type { ApiDoc } from './api-docs-types.js';

export const luaApiDocsEvents: Record<string, ApiDoc> = {
    'Ev.MCE_PREFLIGHT': {
        desc: 'Событие, отправляемое автопилоту: предполетная подготовка, запуск двигателей и подготовка к взлету.',
        syntax: 'Ev.MCE_PREFLIGHT',
        params: '-',
        returns: 'число (ID события)',
        example: 'ap.push(Ev.MCE_PREFLIGHT)',
        aliases: ['предстарт', 'предполетная подготовка', 'preflight'],
        direction: 'to-autopilot'
    },
    'Ev.MCE_TAKEOFF': {
        desc: 'Событие, отправляемое автопилоту: команда на взлет.',
        syntax: 'Ev.MCE_TAKEOFF',
        params: '-',
        returns: 'число',
        example: 'ap.push(Ev.MCE_TAKEOFF)',
        aliases: ['взлет', 'взлететь', 'takeoff', 'старт'],
        direction: 'to-autopilot'
    },
    'Ev.MCE_LANDING': {
        desc: 'Событие, отправляемое автопилоту: команда на посадку.',
        syntax: 'Ev.MCE_LANDING',
        params: '-',
        returns: 'число',
        example: 'ap.push(Ev.MCE_LANDING)',
        aliases: ['посадка', 'приземление', 'сесть', 'land', 'landing'],
        direction: 'to-autopilot'
    },
    'Ev.ENGINES_ARM': {
        desc: 'Событие, отправляемое автопилоту: завести двигатели.',
        syntax: 'Ev.ENGINES_ARM',
        params: '-',
        returns: 'число',
        example: 'ap.push(Ev.ENGINES_ARM)',
        aliases: ['запуск двигателей', 'арминг', 'arm'],
        direction: 'to-autopilot'
    },
    'Ev.ENGINES_DISARM': {
        desc: 'Событие, отправляемое автопилоту: отключить двигатели.',
        syntax: 'Ev.ENGINES_DISARM',
        params: '-',
        returns: 'число',
        example: 'ap.push(Ev.ENGINES_DISARM)',
        aliases: ['выключить двигатели', 'разармить', 'disarm'],
        direction: 'to-autopilot'
    },
    'Ev.TAKEOFF_COMPLETE': {
        desc: 'Событие, принимаемое от автопилота: взлет завершен, коптер достиг высоты взлета.',
        syntax: 'Ev.TAKEOFF_COMPLETE',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.TAKEOFF_COMPLETE then ...',
        aliases: ['взлет завершен', 'достиг высоты взлета', 'takeoff complete'],
        direction: 'from-autopilot'
    },
    'Ev.COPTER_LANDED': {
        desc: 'Событие, принимаемое от автопилота: коптер приземлился.',
        syntax: 'Ev.COPTER_LANDED',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.COPTER_LANDED then ...',
        aliases: ['посадка завершена', 'приземлился', 'сел', 'landed'],
        direction: 'from-autopilot'
    },
    'Ev.LOW_VOLTAGE1': {
        desc: 'Событие, принимаемое от автопилота: низкое напряжение 1, предупреждение.',
        syntax: 'Ev.LOW_VOLTAGE1',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.LOW_VOLTAGE1 then ...',
        aliases: ['низкий заряд', 'низкое напряжение', 'battery warning'],
        direction: 'from-autopilot'
    },
    'Ev.LOW_VOLTAGE2': {
        desc: 'Событие, принимаемое от автопилота: низкое напряжение 2, критическое состояние.',
        syntax: 'Ev.LOW_VOLTAGE2',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.LOW_VOLTAGE2 then ...',
        aliases: ['критический заряд', 'критическое напряжение', 'battery critical'],
        direction: 'from-autopilot'
    },
    'Ev.POINT_REACHED': {
        desc: 'Событие, принимаемое от автопилота: коптер достиг точки маршрута.',
        syntax: 'Ev.POINT_REACHED',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.POINT_REACHED then ...',
        aliases: ['точка достигнута', 'долетел до точки', 'прибыл в точку', 'point reached'],
        direction: 'from-autopilot'
    },
    'Ev.ENGINES_STARTED': {
        desc: 'Событие, принимаемое от автопилота: двигатели запущены.',
        syntax: 'Ev.ENGINES_STARTED',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.ENGINES_STARTED then ...',
        aliases: ['двигатели запущены', 'motors started'],
        direction: 'from-autopilot'
    },
    'Ev.POINT_DECELERATION': {
        desc: 'Событие, принимаемое от автопилота: началось торможение перед точкой.',
        syntax: 'Ev.POINT_DECELERATION',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.POINT_DECELERATION then ...',
        aliases: ['торможение перед точкой', 'замедление', 'deceleration'],
        direction: 'from-autopilot'
    },
    'Ev.SYNC_START': {
        desc: 'Событие, принимаемое от автопилота: синхронный старт.',
        syntax: 'Ev.SYNC_START',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.SYNC_START then ...',
        aliases: ['синхронный старт', 'sync start'],
        direction: 'from-autopilot'
    },
    'Ev.SHOCK': {
        desc: 'Событие, принимаемое от автопилота: удар или жесткое столкновение.',
        syntax: 'Ev.SHOCK',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.SHOCK then ...',
        aliases: ['удар', 'столкновение', 'авария', 'shock'],
        direction: 'from-autopilot'
    },
    'Ev.CONTROL_FAIL': {
        desc: 'Событие, принимаемое от автопилота: отказ управления.',
        syntax: 'Ev.CONTROL_FAIL',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.CONTROL_FAIL then ...',
        aliases: ['потеря управления', 'ошибка управления', 'control fail'],
        direction: 'from-autopilot'
    },
    'Ev.ENGINE_FAIL': {
        desc: 'Событие, принимаемое от автопилота: отказ двигателя.',
        syntax: 'Ev.ENGINE_FAIL',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.ENGINE_FAIL then ...',
        aliases: ['отказ мотора', 'поломка двигателя', 'engine fail'],
        direction: 'from-autopilot'
    }
};
