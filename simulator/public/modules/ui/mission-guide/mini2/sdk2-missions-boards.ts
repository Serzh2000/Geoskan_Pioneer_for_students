import { groundProgram, type Sdk2Mission } from './sdk2-mission-kit.js';

/** Глава 20: то, что снято с настоящих бортов (Мини 2 и Базовый с Radxa), 11–12.11.2026. Только в конец трека: номера старых миссий хранятся в прогрессе. */
const B = { group: 'real-boards', groupTitle: '20. Как устроен настоящий борт' };

const EVENTS_HEAD = 'from pioneer_sdk2 import Pioneer, Event\nimport time\n\npioneer = Pioneer()\n';

export const BOARD_MISSIONS: Sdk2Mission[] = [
    {
        ...B, id: 'sdk2-board-event-codes', title: 'Номера событий автопилота',
        goal: 'Узнать, какие числа стоят за событиями автопилота: на борту событие приходит числом, а SDK превращает его в `Event`.',
        steps: [
            'Автопилот присылает событие числом, а библиотека `pioneer_sdk2` сопоставляет число с названием из перечисления `Event`. Число лежит в `.value`.',
            'Числа не идут подряд по порядку полёта: например, `DISARM` — 12, хотя случается раньше многих других. Ориентироваться нужно по названию, а не по числу.',
            'Вместо `___` впишите название события, которое приходит при достижении точки: `POINT_REACHED`.',
            'Нажмите «Проверить полёт»: взлёт — 8, точка — 6, дизарм — 12. Те же числа печатает настоящий Мини 2.'
        ],
        hint: 'Событие достижения точки по-английски: point reached, в верхнем регистре с подчёркиванием.',
        outcome: 'Вы знаете, что события в SDK — это числа протокола с именами. В программах всегда используют имена `Event.…`, а не числа, но в журналах борта вы увидите именно числа.',
        starter: groundProgram({ head: EVENTS_HEAD, body: 'print("Взлёт завершён:", Event.TAKEOFF_COMPLETE.value)\nprint("Точка достигнута:", Event.___.value)\nprint("Дизарм:", Event.DISARM.value)' }),
        answers: ['POINT_REACHED'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectText('Взлёт завершён:', '8', 'TAKEOFF_COMPLETE — 8.');
            g.expectText('Точка достигнута:', '6', 'POINT_REACHED — 6.');
            g.expectText('Дизарм:', '12', 'DISARM — 12, а не 1.');
        }
    },
    {
        ...B, id: 'sdk2-board-param-names', title: 'Настоящие имена параметров',
        goal: 'Прочитать несколько параметров автопилота по их настоящим именам и убедиться, что опечатка в имени даёт None.',
        steps: [
            'У автопилота около 230 параметров, и имена у них строгие: `Flight_com_maxAltitude` (потолок), `Copter_pos_vMax` (максимальная скорость), `Copter_motorCheckTime` (время проверки моторов).',
            'Имя, которого нет в автопилоте, `get_param` не считает ошибкой: он печатает «Параметр … не найден» и возвращает `None`. Так бывает, например, с именем `Copter_com_takeoffAlt`: настоящий параметр высоты взлёта называется `Flight_com_takeoffAlt`.',
            'Вместо `___` впишите имя параметра максимальной скорости: `Copter_pos_vMax`.',
            'Нажмите «Проверить полёт»: потолок 4.0, скорость 1.0, время проверки 10.0, а по неверному имени — None.'
        ],
        hint: 'Имя начинается с Copter_pos_, а заканчивается на vMax: «v» — скорость, «Max» — максимум.',
        outcome: 'Вы знаете, что параметры читают по точному имени, и проверяете результат на None. Значения в симуляторе взяты у настоящего Мини 2.',
        starter: groundProgram({ body: 'print("Потолок:", pioneer.get_param("Flight_com_maxAltitude"))\nprint("Скорость:", pioneer.get_param("___"))\nprint("Проверка моторов:", pioneer.get_param("Copter_motorCheckTime"))\nprint("С опечаткой:", pioneer.get_param("Copter_com_takeoffAlt"))' }),
        answers: ['Copter_pos_vMax'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectText('Потолок:', '4.0', 'Flight_com_maxAltitude на борту равен 4.');
            g.expectText('Скорость:', '1.0', 'Copter_pos_vMax на борту равен 1.');
            g.expectText('Проверка моторов:', '10.0', 'Copter_motorCheckTime на борту равен 10.');
            g.expectText('С опечаткой:', 'None', 'Параметра Copter_com_takeoffAlt нет: настоящий называется Flight_com_takeoffAlt.');
        }
    }
];
