import type { ApiDoc } from './api-docs-types.js';

export const luaApiEventLabels: Record<string, string> = {
    MCE_PREFLIGHT: 'предполётная подготовка',
    MCE_TAKEOFF: 'взлёт',
    MCE_LANDING: 'посадка',
    ENGINES_ARM: 'запустить моторы',
    ENGINES_DISARM: 'выключить моторы',
    TAKEOFF_COMPLETE: 'взлёт завершён',
    COPTER_LANDED: 'коптер приземлился',
    LOW_VOLTAGE1: 'низкий заряд',
    LOW_VOLTAGE2: 'критический заряд',
    POINT_REACHED: 'точка достигнута',
    ENGINES_STARTED: 'моторы запущены',
    POINT_DECELERATION: 'замедление перед точкой',
    SYNC_START: 'синхронный старт',
    SHOCK: 'удар или столкновение',
    CONTROL_FAIL: 'потеря управления',
    ENGINE_FAIL: 'отказ двигателя'
};

export const luaApiDocsEvents: Record<string, ApiDoc> = {
    'Ev.MCE_PREFLIGHT': {
        desc: 'Отправить автопилоту: «Подготовка к полёту» — проверка систем, запуск двигателей, готовность к взлёту. Это команда (отправляется автопилоту), а не событие — не приходит в callback(event).',
        syntax: 'Ev.MCE_PREFLIGHT',
        params: '-',
        returns: 'число (ID команды)',
        example: 'ap.push(Ev.MCE_PREFLIGHT)',
        aliases: ['предстарт', 'предполетная подготовка', 'preflight'],
        direction: 'to-autopilot'
    },
    'Ev.MCE_TAKEOFF': {
        desc: 'Отправить автопилоту: «Взлёт» — команда на взлёт. Это команда (отправляется автопилоту), а не событие.',
        syntax: 'Ev.MCE_TAKEOFF',
        params: '-',
        returns: 'число (ID команды)',
        example: 'ap.push(Ev.MCE_TAKEOFF)',
        aliases: ['взлет', 'взлететь', 'takeoff', 'старт'],
        direction: 'to-autopilot'
    },
    'Ev.MCE_LANDING': {
        desc: 'Отправить автопилоту: «Посадка» — команда на посадку. Это команда (отправляется автопилоту), а не событие.',
        syntax: 'Ev.MCE_LANDING',
        params: '-',
        returns: 'число (ID команды)',
        example: 'ap.push(Ev.MCE_LANDING)',
        aliases: ['посадка', 'приземление', 'сесть', 'land', 'landing'],
        direction: 'to-autopilot'
    },
    'Ev.ENGINES_ARM': {
        desc: 'Отправить автопилоту: «Завести двигатели» (арминг). Это команда (отправляется автопилоту), а не событие.',
        syntax: 'Ev.ENGINES_ARM',
        params: '-',
        returns: 'число (ID команды)',
        example: 'ap.push(Ev.ENGINES_ARM)',
        aliases: ['запуск двигателей', 'арминг', 'arm'],
        direction: 'to-autopilot'
    },
    'Ev.ENGINES_DISARM': {
        desc: 'Отправить автопилоту: «Выключить двигатели» (разарминг). Это команда (отправляется автопилоту), а не событие.',
        syntax: 'Ev.ENGINES_DISARM',
        params: '-',
        returns: 'число (ID команды)',
        example: 'ap.push(Ev.ENGINES_DISARM)',
        aliases: ['выключить двигатели', 'разармить', 'disarm'],
        direction: 'to-autopilot'
    },
    'Ev.TAKEOFF_COMPLETE': {
        desc: 'Если пришло событие от автопилота: «Взлёт завершён» — коптер достиг заданной высоты взлёта.',
        syntax: 'Ev.TAKEOFF_COMPLETE',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.TAKEOFF_COMPLETE then ...',
        aliases: ['взлет завершен', 'достиг высоты взлета', 'takeoff complete'],
        direction: 'from-autopilot'
    },
    'Ev.COPTER_LANDED': {
        desc: 'Если пришло событие от автопилота: «Коптер приземлился» — посадка завершена.',
        syntax: 'Ev.COPTER_LANDED',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.COPTER_LANDED then ...',
        aliases: ['посадка завершена', 'приземлился', 'сел', 'landed'],
        direction: 'from-autopilot'
    },
    'Ev.LOW_VOLTAGE1': {
        desc: 'Если пришло событие от автопилота: «Низкий заряд (предупреждение)» — напряжение ниже порога 1, нужно вернуться или приземлиться.',
        syntax: 'Ev.LOW_VOLTAGE1',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.LOW_VOLTAGE1 then ...',
        aliases: ['низкий заряд', 'низкое напряжение', 'battery warning'],
        direction: 'from-autopilot'
    },
    'Ev.LOW_VOLTAGE2': {
        desc: 'Если пришло событие от автопилота: «Критический заряд» — напряжение ниже порога 2, критическая ситуация, срочно садиться.',
        syntax: 'Ev.LOW_VOLTAGE2',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.LOW_VOLTAGE2 then ...',
        aliases: ['критический заряд', 'критическое напряжение', 'battery critical'],
        direction: 'from-autopilot'
    },
    'Ev.POINT_REACHED': {
        desc: 'Если пришло событие от автопилота: «Точка достигнута» — коптер прилетел в заданную точку маршрута.',
        syntax: 'Ev.POINT_REACHED',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.POINT_REACHED then ...',
        aliases: ['точка достигнута', 'долетел до точки', 'прибыл в точку', 'point reached'],
        direction: 'from-autopilot'
    },
    'Ev.ENGINES_STARTED': {
        desc: 'Если пришло событие от автопилота: «Двигатели запущены» — двигатели вращаются, коптер готов к управлению.',
        syntax: 'Ev.ENGINES_STARTED',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.ENGINES_STARTED then ...',
        aliases: ['двигатели запущены', 'motors started'],
        direction: 'from-autopilot'
    },
    'Ev.POINT_DECELERATION': {
        desc: 'Если пришло событие от автопилота: «Замедление перед точкой» — началось торможение при приближении к цели.',
        syntax: 'Ev.POINT_DECELERATION',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.POINT_DECELERATION then ...',
        aliases: ['торможение перед точкой', 'замедление', 'deceleration'],
        direction: 'from-autopilot'
    },
    'Ev.SYNC_START': {
        desc: 'Если пришло событие от автопилота: «Синхронный старт» — начало совместного полёта/миссии.',
        syntax: 'Ev.SYNC_START',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.SYNC_START then ...',
        aliases: ['синхронный старт', 'sync start'],
        direction: 'from-autopilot'
    },
    'Ev.SHOCK': {
        desc: 'Если пришло событие от автопилота: «Удар или столкновение» — зафиксировано резкое воздействие на корпус.',
        syntax: 'Ev.SHOCK',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.SHOCK then ...',
        aliases: ['удар', 'столкновение', 'авария', 'shock'],
        direction: 'from-autopilot'
    },
    'Ev.CONTROL_FAIL': {
        desc: 'Если пришло событие от автопилота: «Потеря управления» — система управления не отвечает.',
        syntax: 'Ev.CONTROL_FAIL',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.CONTROL_FAIL then ...',
        aliases: ['потеря управления', 'ошибка управления', 'control fail'],
        direction: 'from-autopilot'
    },
    'Ev.ENGINE_FAIL': {
        desc: 'Если пришло событие от автопилота: «Отказ двигателя» — один или несколько двигателей отказали.',
        syntax: 'Ev.ENGINE_FAIL',
        params: '-',
        returns: 'число',
        example: 'if event == Ev.ENGINE_FAIL then ...',
        aliases: ['отказ мотора', 'поломка двигателя', 'engine fail'],
        direction: 'from-autopilot'
    }
};
