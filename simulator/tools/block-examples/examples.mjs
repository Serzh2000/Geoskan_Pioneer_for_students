/**
 * Каталог примеров для блочного редактора. Каждый пример — программа из
 * блоков Pioneer (общих для Lua и Python) плюс то, что она обязана сделать
 * в полёте: по этому описанию tests/block-examples.test.ts проверяет пример
 * в симуляторе (Lua) и на поддельном pioneer_sdk (Python).
 *
 *   group    папка в examples-blocks/ (она же группа в списке примеров)
 *   name     имя файла без .json
 *   comment  пояснение, которое показывается пузырьком у «Начала программы»
 *   main     () => блоки главной цепочки
 *   top      () => отдельные верхние блоки (функции)
 *   points   точки, в которые дрон обязан слетать, по порядку
 *   lands    программа заканчивается посадкой
 *   targets  где пример работает (по умолчанию — Lua и Python)
 *   seconds  сколько секунд симулировать
 */
import {
    after, add, battery, call, cargo, change, compare, define, disarm, elapsed, every, everyStop, forEach, forRange,
    get, goTo, goToYaw, hsv, ifElse, item, join, land, ledAll, ledIndex, modulo, mul, onEvent, photo, position, preflight,
    preset, print, randomInt, repeat, rgb, set, setYaw, sub, takeoff, trig, wait, waitUntil, whileDo
} from './dsl.mjs';

const R = (n) => Math.round(n * 100) / 100;
const OFF = '0,0,0';
const cycle = (times, ...colours) => Array.from({ length: times }, () => colours).flat();
// Цвет HSV (тон в градусах, S и V в процентах) в 0..255, как считают оба генератора.
const hsvColour = (h, sat = 100, val = 100) => {
    const s = sat / 100;
    const v = val / 100;
    const f = (n) => {
        const k = (n + h / 60) % 6;
        return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return [f(5), f(3), f(1)].map((x) => Math.round(x * 255)).join(',');
};
const ex = [];
const example = (spec) => ex.push({ targets: ['lua', 'python'], seconds: 120, lands: true, ...spec });

// ---------------------------------------------------------------- 01 Первые шаги
const START = '01_start';

example({
    group: START, name: '01_takeoff_land',
    comment: 'Самая короткая программа: моторы, взлёт, посадка.',
    main: () => [preflight(), takeoff(), land()],
    points: []
});

example({
    group: START, name: '02_hover',
    comment: 'Взлететь, повисеть 5 секунд и сесть. Блок «Ждать» не двигает дрон — он просто держит паузу.',
    main: () => [preflight(), takeoff(), wait(5), land()],
    points: []
});

example({
    group: START, name: '03_fly_up',
    comment: 'Подняться на высоту 1.5 м, подождать и сесть. Z — это высота над полом.',
    main: () => [preflight(), takeoff(), goTo(0, 0, 1.5), wait(2), land()],
    points: [[0, 0, 1.5]]
});

example({
    group: START, name: '04_forward_and_back',
    comment: 'Лететь вперёд на 1 м вдоль оси X и вернуться в точку старта.',
    main: () => [preflight(), takeoff(), goTo(1, 0, 1), wait(1), goTo(0, 0, 1), land()],
    points: [[1, 0, 1], [0, 0, 1]]
});

example({
    group: START, name: '05_disarm_after_landing',
    comment: 'После посадки отдельным блоком выключаем моторы.',
    main: () => [preflight(), takeoff(), goTo(0.5, 0.5, 1), land(), wait(2), disarm()],
    points: [[0.5, 0.5, 1]]
});

example({
    group: START, name: '06_turn_around',
    comment: 'Повернуться на месте: сначала курс 90°, потом 180°, потом обратно на 0°. Курс — в градусах.',
    main: () => [
        preflight(), takeoff(), goTo(0, 0, 1),
        setYaw(90), wait(2), setYaw(180), wait(2), setYaw(0), wait(2),
        land()
    ],
    points: [[0, 0, 1]]
});

// ---------------------------------------------------------------- 02 Фигуры и маршруты
const FLIGHT = '02_flight';

example({
    group: FLIGHT, name: '01_square',
    comment: 'Квадрат со стороной 1 м на высоте 1 м: четыре точки подряд, последняя — старт.',
    main: () => [
        preflight(), takeoff(),
        goTo(1, 0, 1), goTo(1, 1, 1), goTo(0, 1, 1), goTo(0, 0, 1),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '02_square_twice',
    comment: 'Квадрат два раза подряд. Блок «Повторить» вокруг четырёх точек — вместо копирования блоков.',
    main: () => [
        preflight(), takeoff(),
        repeat(2, [goTo(1, 0, 1), goTo(1, 1, 1), goTo(0, 1, 1), goTo(0, 0, 1)]),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '03_triangle',
    comment: 'Треугольник: три точки и возврат в старт.',
    main: () => [
        preflight(), takeoff(),
        goTo(1, 0, 1), goTo(0.5, 1, 1), goTo(0, 0, 1),
        land()
    ],
    points: [[1, 0, 1], [0.5, 1, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '04_rectangle',
    comment: 'Прямоугольник 2 м на 1 м.',
    main: () => [
        preflight(), takeoff(),
        goTo(2, 0, 1), goTo(2, 1, 1), goTo(0, 1, 1), goTo(0, 0, 1),
        land()
    ],
    points: [[2, 0, 1], [2, 1, 1], [0, 1, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '05_diamond',
    comment: 'Ромб: летим по вершинам, лежащим на осях.',
    main: () => [
        preflight(), takeoff(),
        goTo(1, 0, 1), goTo(2, 1, 1), goTo(1, 2, 1), goTo(0, 1, 1), goTo(1, 0, 1), goTo(0, 0, 1),
        land()
    ],
    points: [[1, 0, 1], [2, 1, 1], [1, 2, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '06_cross',
    comment: 'Крест: от центра в каждую из четырёх сторон и обратно.',
    main: () => [
        preflight(), takeoff(), goTo(0, 0, 1),
        goTo(1, 0, 1), goTo(0, 0, 1),
        goTo(0, 1, 1), goTo(0, 0, 1),
        goTo(-1, 0, 1), goTo(0, 0, 1),
        goTo(0, -1, 1), goTo(0, 0, 1),
        land()
    ],
    points: [[0, 0, 1], [1, 0, 1], [0, 0, 1], [0, 1, 1], [0, 0, 1], [-1, 0, 1], [0, 0, 1], [0, -1, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '07_staircase',
    comment: 'Лесенка: переменная i пробегает от 1 до 4, и каждый шаг дрон уходит вперёд на 0.5 м и поднимается на 0.25 м.',
    main: () => [
        preflight(), takeoff(),
        forRange('i', 1, 4, 1, [goTo(mul(get('i'), 0.5), 0, add(0.5, mul(get('i'), 0.25)))]),
        land()
    ],
    points: [1, 2, 3, 4].map((i) => [R(i * 0.5), 0, R(0.5 + i * 0.25)])
});

example({
    group: FLIGHT, name: '08_zigzag',
    comment: 'Змейка: вперёд на 0.5 м, потом поочерёдно вправо и влево. Остаток от деления на 2 выбирает сторону.',
    main: () => [
        preflight(), takeoff(),
        forRange('i', 1, 4, 1, [
            ifElse([[compare('EQ', modulo(get('i'), 2), 1), [goTo(mul(get('i'), 0.5), 1, 1)]]], [goTo(mul(get('i'), 0.5), 0, 1)])
        ]),
        land()
    ],
    points: [[0.5, 1, 1], [1, 0, 1], [1.5, 1, 1], [2, 0, 1]]
});

example({
    group: FLIGHT, name: '09_points_list',
    comment: 'Маршрут — список точек. Цикл «для каждого элемента» берёт точку p и достаёт из неё X, Y и Z.',
    main: () => [
        set('route', [[1, 0, 1], [1, 1, 1.5], [0, 1, 1], [0, 0, 1]]),
        preflight(), takeoff(),
        forEach('p', get('route'), [goTo(item(get('p'), 1), item(get('p'), 2), item(get('p'), 3))]),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1.5], [0, 1, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '10_circle',
    comment: 'Круг радиусом 1 м вокруг точки (1; 0): 12 точек через каждые 30°. Синус и косинус считают координаты.',
    main: () => [
        preflight(), takeoff(), goTo(0, 0, 1),
        forRange('a', 30, 360, 30, [
            goTo(sub(1, trig('COS', get('a'))), trig('SIN', get('a')), 1)
        ]),
        land()
    ],
    points: [[0, 0, 1], ...Array.from({ length: 12 }, (_, k) => {
        const a = ((k + 1) * 30 * Math.PI) / 180;
        return [R(1 - Math.cos(a)), R(Math.sin(a)), 1];
    })]
});

example({
    group: FLIGHT, name: '11_spiral_up',
    comment: 'Спираль вверх: круг радиусом 0.7 м, а высота растёт на каждом шаге.',
    main: () => [
        preflight(), takeoff(), goTo(0.7, 0, 0.8),
        forRange('a', 45, 360, 45, [
            goTo(mul(0.7, trig('COS', get('a'))), mul(0.7, trig('SIN', get('a'))), add(0.8, mul(get('a'), 0.004)))
        ]),
        land()
    ],
    points: [[0.7, 0, 0.8], ...Array.from({ length: 8 }, (_, k) => {
        const deg = (k + 1) * 45;
        const a = (deg * Math.PI) / 180;
        return [R(0.7 * Math.cos(a)), R(0.7 * Math.sin(a)), R(0.8 + deg * 0.004)];
    })]
});

example({
    group: FLIGHT, name: '12_turn_while_flying',
    comment: 'Полёт с поворотом: блок «Лететь в точку… курс» сам разворачивает дрон носом по направлению движения.',
    main: () => [
        preflight(), takeoff(),
        goToYaw(1, 0, 1, 0), goToYaw(1, 1, 1, 90), goToYaw(0, 1, 1, 180), goToYaw(0, 0, 1, 270),
        setYaw(0),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]
});

example({
    group: FLIGHT, name: '13_grid_scan',
    comment: 'Сканирование площадки «змейкой» по сетке: вложенные циклы — строки по Y, точки по X.',
    main: () => [
        preflight(), takeoff(),
        forRange('row', 0, 2, 1, [
            ifElse(
                [[compare('EQ', modulo(get('row'), 2), 0), [goTo(0, mul(get('row'), 0.5), 1), goTo(1, mul(get('row'), 0.5), 1)]]],
                [goTo(1, mul(get('row'), 0.5), 1), goTo(0, mul(get('row'), 0.5), 1)]
            )
        ]),
        goTo(0, 0, 1),
        land()
    ],
    points: [[0, 0, 1], [1, 0, 1], [1, 0.5, 1], [0, 0.5, 1], [0, 1, 1], [1, 1, 1], [0, 0, 1]]
});

// ---------------------------------------------------------------- 03 Светодиоды
const LEDS = '03_leds';

example({
    group: LEDS, name: '01_colour_presets',
    led: ['255,0,0', '0,255,0', '0,0,255', '255,255,255', OFF],
    comment: 'Готовые цвета: все светодиоды по очереди красные, зелёные, синие, белые, потом выключены.',
    main: () => [
        ledAll(preset('красный')), wait(1),
        ledAll(preset('зелёный')), wait(1),
        ledAll(preset('синий')), wait(1),
        ledAll(preset('белый')), wait(1),
        ledAll(preset('выключен'))
    ],
    points: [], lands: false, seconds: 10
});

example({
    group: LEDS, name: '02_rgb_mix',
    led: ['255,128,0', '160,0,255', '0,220,200', OFF],
    comment: 'Свой цвет из красной, зелёной и синей составляющих (0–255): оранжевый, фиолетовый, бирюзовый.',
    main: () => [
        ledAll(rgb(255, 128, 0)), wait(1),
        ledAll(rgb(160, 0, 255)), wait(1),
        ledAll(rgb(0, 220, 200)), wait(1),
        ledAll(preset('выключен'))
    ],
    points: [], lands: false, seconds: 10
});

example({
    group: LEDS, name: '03_traffic_light',
    led: [...cycle(3, '255,0,0', '255,255,0', '0,255,0'), OFF],
    comment: 'Светофор: красный, жёлтый, зелёный. Три цикла по три секунды.',
    main: () => [
        repeat(3, [
            ledAll(preset('красный')), wait(3),
            ledAll(preset('жёлтый')), wait(1),
            ledAll(preset('зелёный')), wait(3)
        ]),
        ledAll(preset('выключен'))
    ],
    points: [], lands: false, seconds: 30
});

example({
    group: LEDS, name: '04_blink',
    led: cycle(5, '255,255,255', OFF),
    comment: 'Мигалка: пять раз включить и выключить белый свет с паузой в полсекунды.',
    main: () => [
        repeat(5, [ledAll(preset('белый')), wait(0.5), ledAll(preset('выключен')), wait(0.5)])
    ],
    points: [], lands: false, seconds: 15
});

example({
    group: LEDS, name: '05_running_light',
    led: cycle(2, '0,255,0', OFF),
    comment: 'Бегущий огонёк: цикл по номерам светодиодов от 0 до 3 зажигает по одному и гасит предыдущий.',
    main: () => [
        ledAll(preset('выключен')),
        repeat(2, [
            forRange('n', 0, 3, 1, [
                ledIndex(get('n'), preset('зелёный')), wait(0.4), ledIndex(get('n'), preset('выключен'))
            ])
        ])
    ],
    points: [], lands: false, seconds: 15
});

example({
    group: LEDS, name: '06_rainbow',
    led: [0, 60, 120, 180, 240, 300].map((h) => hsvColour(h)).concat(OFF),
    comment: 'Радуга: цвет задаётся оттенком (тон от 0 до 360°), цикл перебирает тон с шагом 60°.',
    main: () => [
        forRange('h', 0, 300, 60, [ledAll(hsv(get('h'), 100, 100)), wait(0.8)]),
        ledAll(preset('выключен'))
    ],
    points: [], lands: false, seconds: 15
});

example({
    group: LEDS, name: '07_police',
    led: [...cycle(4, '255,0,0', '0,0,255'), OFF],
    comment: 'Мигалка спецслужб: первая пара светодиодов красная, вторая синяя — и наоборот.',
    main: () => [
        repeat(4, [
            ledIndex(0, preset('красный')), ledIndex(1, preset('красный')),
            ledIndex(2, preset('синий')), ledIndex(3, preset('синий')), wait(0.3),
            ledIndex(0, preset('синий')), ledIndex(1, preset('синий')),
            ledIndex(2, preset('красный')), ledIndex(3, preset('красный')), wait(0.3)
        ]),
        ledAll(preset('выключен'))
    ],
    points: [], lands: false, seconds: 15
});

example({
    group: LEDS, name: '08_flight_colours',
    led: ['255,255,255', '0,255,0', '255,255,0', '255,0,0', OFF],
    comment: 'Цвет по этапу полёта: белый на земле, зелёный при взлёте, жёлтый на маршруте, красный на посадке.',
    main: () => [
        ledAll(preset('белый')), preflight(),
        ledAll(preset('зелёный')), takeoff(),
        ledAll(preset('жёлтый')), goTo(1, 0, 1), goTo(1, 1, 1),
        ledAll(preset('красный')), land(),
        ledAll(preset('выключен'))
    ],
    points: [[1, 0, 1], [1, 1, 1]]
});

// ---------------------------------------------------------------- 04 Переменные, условия, циклы
const LOGIC = '04_logic';

example({
    group: LOGIC, name: '01_variable_height',
    comment: 'Высота полёта лежит в переменной h. Поменяйте число в одном месте — изменятся все точки.',
    main: () => [
        set('h', 1.5),
        preflight(), takeoff(),
        goTo(1, 0, get('h')), goTo(1, 1, get('h')), goTo(0, 0, get('h')),
        land()
    ],
    points: [[1, 0, 1.5], [1, 1, 1.5], [0, 0, 1.5]]
});

example({
    group: LOGIC, name: '02_side_length',
    comment: 'Квадрат со стороной s (переменная). Сторона меняется одним числом.',
    main: () => [
        set('s', 1.5),
        preflight(), takeoff(),
        goTo(get('s'), 0, 1), goTo(get('s'), get('s'), 1), goTo(0, get('s'), 1), goTo(0, 0, 1),
        land()
    ],
    points: [[1.5, 0, 1], [1.5, 1.5, 1], [0, 1.5, 1], [0, 0, 1]]
});

example({
    group: LOGIC, name: '03_if_else',
    led: ['0,255,0'],
    comment: 'Условие «если — иначе»: проверяем число ступенек n. Если больше трёх — летим далеко, иначе близко.',
    main: () => [
        set('n', 5),
        preflight(), takeoff(),
        ifElse([[compare('GT', get('n'), 3), [goTo(2, 0, 1), ledAll(preset('зелёный'))]]], [goTo(1, 0, 1), ledAll(preset('красный'))]),
        wait(1),
        land()
    ],
    points: [[2, 0, 1]]
});

example({
    group: LOGIC, name: '04_alternate_colours',
    led: cycle(3, '255,0,0', '0,255,0'),
    comment: 'Чередование: в чётных шагах свет зелёный, в нечётных красный. Проверка «остаток от деления на 2 равен 0».',
    main: () => [
        preflight(), takeoff(),
        forRange('i', 1, 6, 1, [
            ifElse([[compare('EQ', modulo(get('i'), 2), 0), [ledAll(preset('зелёный'))]]], [ledAll(preset('красный'))]),
            goTo(mul(get('i'), 0.3), 0, 1)
        ]),
        land()
    ],
    points: [1, 2, 3, 4, 5, 6].map((i) => [R(i * 0.3), 0, 1])
});

example({
    group: LOGIC, name: '05_while_loop',
    comment: 'Цикл «пока»: дрон шагает вперёд по 0.5 м, пока координата x меньше 2.',
    main: () => [
        set('x', 0),
        preflight(), takeoff(),
        whileDo(compare('LT', get('x'), 2), [change('x', 0.5), goTo(get('x'), 0, 1)]),
        land()
    ],
    points: [[0.5, 0, 1], [1, 0, 1], [1.5, 0, 1], [2, 0, 1]]
});

example({
    group: LOGIC, name: '06_signal_function',
    led: ['255,0,0', '0,255,0', '255,0,0', OFF],
    comment: 'Свои функции red, green и off переключают свет. Внутри функций ждать нельзя — паузы остаются в основной программе.',
    main: () => [
        preflight(), takeoff(),
        call('red'), goTo(1, 0, 1),
        call('green'), goTo(1, 1, 1),
        call('red'), wait(1),
        call('off'),
        land()
    ],
    top: () => [
        define('red', [ledAll(preset('красный'))]),
        define('green', [ledAll(preset('зелёный'))]),
        define('off', [ledAll(preset('выключен'))])
    ],
    points: [[1, 0, 1], [1, 1, 1]]
});

example({
    group: LOGIC, name: '07_random_colour',
    comment: 'Случайный цвет: каждая из трёх составляющих — случайное число от 0 до 255.',
    main: () => [
        repeat(5, [ledAll(rgb(randomInt(0, 255), randomInt(0, 255), randomInt(0, 255))), wait(0.5)]),
        ledAll(preset('выключен'))
    ],
    points: [], lands: false, seconds: 15
});

example({
    group: LOGIC, name: '08_wait_until',
    comment: 'Блок «Ждать, пока»: пока дрон не долетел до x > 0.9, свет жёлтый, потом зелёный. Условие проверяется по датчику положения.',
    main: () => [
        preflight(), takeoff(),
        ledAll(preset('жёлтый')),
        goTo(1, 0, 1),
        waitUntil(compare('GT', position('X'), 0.9)),
        ledAll(preset('зелёный')), wait(1),
        land()
    ],
    points: [[1, 0, 1]]
});

example({
    group: LOGIC, name: '09_tower',
    comment: 'Башенка: дрон поднимается на каждый этаж (одно число в переменной) и мигает светом на каждой высоте.',
    main: () => [
        set('floor', 0.5),
        preflight(), takeoff(),
        repeat(4, [
            goTo(0, 0, get('floor')),
            ledAll(rgb(mul(get('floor'), 100), 80, 255)), wait(0.5),
            change('floor', 0.4)
        ]),
        ledAll(preset('выключен')),
        land()
    ],
    points: [[0, 0, 0.5], [0, 0, 0.9], [0, 0, 1.3], [0, 0, 1.7]]
});

// ---------------------------------------------------------------- 05 Датчики и время
const SENSORS = '05_sensors';

example({
    group: SENSORS, name: '01_print_position',
    comment: 'Блок «координата» читает положение дрона. Печатаем X, Y, Z в консоль после каждой точки.',
    main: () => [
        preflight(), takeoff(),
        goTo(1, 0, 1),
        print(join('x = ', position('X'))), print(join('y = ', position('Y'))), print(join('z = ', position('Z'))),
        land()
    ],
    points: [[1, 0, 1]]
});

example({
    group: SENSORS, name: '02_flight_timer',
    comment: 'Секундомер: блок «секунд с начала программы» показывает, как долго длился полёт.',
    main: () => [
        preflight(), takeoff(),
        goTo(1, 0, 1), goTo(1, 1, 1),
        print(join('Прошло секунд: ', elapsed())),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1]]
});

example({
    group: SENSORS, name: '03_battery_check',
    comment: 'Печатаем напряжение батареи перед взлётом и после посадки.',
    main: () => [
        print(join('Батарея до: ', battery())),
        preflight(), takeoff(), goTo(1, 0, 1), land(),
        print(join('Батарея после: ', battery()))
    ],
    points: [[1, 0, 1]]
});

example({
    group: SENSORS, name: '04_height_light',
    comment: 'Цвет по высоте: подъём ступенями; чем выше дрон, тем больше в цвете красного. Высота берётся с датчика.',
    main: () => [
        preflight(), takeoff(),
        forRange('z', 0.5, 2, 0.5, [
            goTo(0, 0, get('z')),
            ledAll(rgb(mul(position('Z'), 120), 50, 200)), wait(0.5)
        ]),
        land()
    ],
    points: [[0, 0, 0.5], [0, 0, 1], [0, 0, 1.5], [0, 0, 2]]
});

example({
    group: SENSORS, name: '05_countdown',
    led: [250, 200, 150, 100, 50].map((r) => `${r},0,0`),
    comment: 'Обратный отсчёт: переменная убывает от 5 до 1 с шагом −1, потом старт.',
    main: () => [
        forRange('t', 5, 1, -1, [print(get('t')), ledAll(rgb(mul(get('t'), 50), 0, 0)), wait(1)]),
        preflight(), takeoff(), land()
    ],
    points: []
});

// ---------------------------------------------------------------- 06 Таймеры и события
const EVENTS = '06_events';

example({
    group: EVENTS, name: '01_blink_timer',
    // Браузерный Python-рантайм симулятора не держит ритм таймера «Каждые N сек»: пример только для Lua.
    targets: ['lua'],
    // Python крутит таймеры настоящими потоками, их темп зависит от загрузки машины: проверяем одно мигание.
    led: cycle(1, '255,0,0', OFF),
    comment: 'Отдельный блок «Каждые 0.5 сек» (рядом с основной программой) мигает светодиодами сам, пока дрон летает. Основная программа о нём не заботится и в конце его останавливает.',
    main: () => [
        set('on', 0),
        preflight(), takeoff(),
        goTo(1, 0, 1), goTo(1, 1, 1), goTo(0, 0, 1),
        everyStop('мигалка'),
        ledAll(preset('выключен')),
        land()
    ],
    top: () => [
        every(0.5, 'мигалка', [
            ifElse([[compare('EQ', get('on'), 0), [ledAll(preset('красный')), set('on', 1)]]], [ledAll(preset('выключен')), set('on', 0)])
        ])
    ],
    points: [[1, 0, 1], [1, 1, 1], [0, 0, 1]]
});

example({
    group: EVENTS, name: '02_after_once',
    led: ['255,0,0', '0,255,0'],
    comment: 'Блок «Через N сек выполнить» срабатывает один раз: через 6 секунд после запуска свет становится зелёным.',
    main: () => [
        ledAll(preset('красный')),
        after(6, [ledAll(preset('зелёный'))]),
        preflight(), takeoff(),
        goTo(1, 0, 1), goTo(1, 1, 1),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1]]
});

example({
    group: EVENTS, name: '03_two_timers',
    // Браузерный Python-рантайм симулятора не держит ритм таймера «Каждые N сек»: пример только для Lua.
    targets: ['lua'],
    led: cycle(1, '0,0,255', OFF),
    comment: 'Два таймера работают одновременно: один мигает нулевым светодиодом, другой — третьим, и у них разный период.',
    main: () => [
        set('a', 0), set('b', 0),
        preflight(), takeoff(),
        goTo(1, 0, 1), goTo(0, 0, 1),
        everyStop('левый'), everyStop('правый'),
        ledAll(preset('выключен')),
        land()
    ],
    top: () => [
        every(0.4, 'левый', [
            ifElse([[compare('EQ', get('a'), 0), [ledIndex(0, preset('синий')), set('a', 1)]]], [ledIndex(0, preset('выключен')), set('a', 0)])
        ]),
        every(0.7, 'правый', [
            ifElse([[compare('EQ', get('b'), 0), [ledIndex(3, preset('жёлтый')), set('b', 1)]]], [ledIndex(3, preset('выключен')), set('b', 0)])
        ])
    ],
    points: [[1, 0, 1], [0, 0, 1]]
});

example({
    group: EVENTS, name: '04_lua_landing_event',
    led: ['255,0,0', '0,255,0'],
    comment: 'Только Lua: блок «Когда событие от автопилота» зажигает зелёный свет, как только дрон сел (событие COPTER_LANDED).',
    main: () => [
        ledAll(preset('красный')),
        preflight(), takeoff(), goTo(1, 0, 1), land(),
        wait(1)
    ],
    top: () => [onEvent('COPTER_LANDED', [ledAll(preset('зелёный'))])],
    targets: ['lua'],
    points: [[1, 0, 1]]
});

// ---------------------------------------------------------------- 07 Мини-проекты
const PROJECTS = '07_projects';

example({
    group: PROJECTS, name: '01_cargo_delivery',
    led: ['255,255,0', '0,255,0'],
    comment: 'Доставка груза: взять груз магнитом, перелететь в точку выгрузки, отпустить и вернуться.',
    main: () => [
        preflight(), takeoff(),
        ledAll(preset('жёлтый')), cargo('GRAB'), wait(1),
        goTo(1.5, 0, 1), goTo(1.5, 1, 1),
        cargo('RELEASE'), ledAll(preset('зелёный')), wait(1),
        goTo(0, 0, 1),
        land()
    ],
    points: [[1.5, 0, 1], [1.5, 1, 1], [0, 0, 1]]
});

example({
    group: PROJECTS, name: '02_patrol',
    led: ['0,255,0', '0,0,255', OFF],
    comment: 'Патруль: два круга по периметру. На первом кругу свет зелёный, на втором — синий. Номер круга хранит переменная.',
    main: () => [
        preflight(), takeoff(),
        forRange('lap', 1, 2, 1, [
            ifElse([[compare('EQ', get('lap'), 1), [ledAll(preset('зелёный'))]]], [ledAll(preset('синий'))]),
            goTo(1, 0, 1), goTo(1, 1, 1), goTo(0, 1, 1), goTo(0, 0, 1)
        ]),
        ledAll(preset('выключен')),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]
});

example({
    group: PROJECTS, name: '03_light_show',
    led: [...cycle(3, ...[0, 100, 200].map((h) => hsvColour(h))), OFF],
    comment: 'Световое шоу: дрон поднимается и на каждой высоте проигрывает радугу, пока не вернётся на землю.',
    main: () => [
        preflight(), takeoff(),
        forRange('level', 1, 3, 1, [
            goTo(0, 0, mul(get('level'), 0.6)),
            forRange('h', 0, 300, 100, [ledAll(hsv(get('h'), 100, 100)), wait(0.3)])
        ]),
        ledAll(preset('выключен')),
        land()
    ],
    points: [[0, 0, 0.6], [0, 0, 1.2], [0, 0, 1.8]]
});

example({
    group: PROJECTS, name: '04_photo_points',
    comment: 'Фотосъёмка по маршруту: в каждой точке дрон зависает и делает снимок.',
    main: () => [
        preflight(), takeoff(),
        goTo(1, 0, 1), photo(), wait(1),
        goTo(1, 1, 1), photo(), wait(1),
        goTo(0, 1, 1), photo(), wait(1),
        goTo(0, 0, 1),
        land()
    ],
    points: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]
});

example({
    group: PROJECTS, name: '05_two_cargo_runs',
    led: ['255,255,0', '0,255,0', '255,255,0', '0,255,0'],
    comment: 'Два рейса: функции grab_cargo и drop_cargo прячут детали работы с грузом, а маршрут остаётся виден в основной программе.',
    main: () => [
        preflight(), takeoff(),
        call('grab_cargo'), wait(1), goTo(1, 0, 1), call('drop_cargo'), wait(1),
        goTo(0, 0, 1),
        call('grab_cargo'), wait(1), goTo(0, 1, 1), call('drop_cargo'), wait(1),
        goTo(0, 0, 1),
        land()
    ],
    top: () => [
        define('grab_cargo', [cargo('GRAB'), ledAll(preset('жёлтый'))]),
        define('drop_cargo', [cargo('RELEASE'), ledAll(preset('зелёный'))])
    ],
    points: [[1, 0, 1], [0, 0, 1], [0, 1, 1], [0, 0, 1]]
});

export const examples = ex;
