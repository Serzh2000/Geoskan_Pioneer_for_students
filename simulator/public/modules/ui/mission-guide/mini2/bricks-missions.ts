import { bricksType } from '../../../editor/blockly-mode/bricks/constants.js';
import type { GuideEvaluation } from '../types.js';
import type { LearningEvent } from '../../../core/learning-journal.js';
import type { DroneSample } from '../evaluation/text/trace.js';
import { Sdk2Grader, type Sdk2Check } from './sdk2-grade.js';
import {
    compare, distance, forRange, frame, getVar, goPoint, ifElse, join, landing, ledAll, ledIndex, preflight, print,
    project, repeat, servo, setVar, sleep, speedStart, stmt, takeOff, text, waitPoint, block, num, editorBlockTypes, type Stmt
} from './bricks-xml-kit.js';

/**
 * Миссии трека «Мини 2 · Bricks»: блоки Pioneer Bricks, дрон Пионер Мини 2.
 * Ученик собирает программу из блоков; проверка двойная: состав блоков (обязательные блоки и их число) и результат
 * в полёте (те же примитивы, что у трека SDK2: журнал запуска и снимки дрона). Программа Bricks сама печатает
 * «Конец программы» в блоке finally: по этой строке проверка узнаёт, что программа закончилась.
 */
export const BRICKS_DONE_MESSAGE = 'Конец программы';

export type BricksMission = {
    id: string;
    group: string;
    groupTitle: string;
    title: string;
    goal: string;
    steps: string[];
    hint: string;
    outcome: string;
    /** Проект Bricks, с которого начинается миссия. */
    starterXml: string;
    /** Эталон: проект Bricks, который проходит проверку. */
    solutionXml: string;
    /** Блоки, без которых миссия не засчитывается: [тип блока в редакторе, имя для ученика]. */
    requires: Array<[string, string]>;
    /** Сколько таких блоков нужно как минимум (по умолчанию один). */
    minCounts?: Record<string, number>;
    waitMs: number;
    scene?: 'markers';
    /** Миссия с полётом: проверка заканчивается, когда дрон сел. */
    flight: boolean;
    check: Sdk2Check;
};

const T = (native: string) => bricksType(native);
const G1 = { group: 'first', groupTitle: '01. Первые блоки' };
const G2 = { group: 'leds', groupTitle: '02. Светодиоды' };
const G3 = { group: 'loops', groupTitle: '03. Циклы и переменные' };
const G4 = { group: 'data', groupTitle: '04. Данные и условия' };
const G5 = { group: 'points', groupTitle: '05. Полёт по точкам и скорости' };
const G6 = { group: 'camera', groupTitle: '06. Камера и сервопривод' };
const G7 = { group: 'aruco', groupTitle: '07. Метки ArUco' };
const G8 = { group: 'project', groupTitle: '08. Итоговый проект' };

const FLIGHT_BASE: Stmt[] = [preflight, takeOff, landing];
const point = (x: number, y: number, z: number): Stmt[] => [goPoint(x, y, z), waitPoint];

export const BRICKS_MISSIONS: BricksMission[] = [
    {
        ...G1, id: 'bricks-first-flight', title: 'Первый полёт', flight: true,
        goal: 'Собрать из трёх блоков самую короткую программу полёта: подготовка, взлёт, посадка.',
        steps: [
            'Блок «Начало программы» уже стоит на поле: программа выполняется сверху вниз от него. Все команды крепятся под него друг за другом.',
            'Откройте категорию «Полёт» и перетащите «Предполётная подготовка» под «Начало программы»: она запускает двигатели.',
            'Добавьте под него «Взлет», а следом «Посадка». Блоки сами защёлкиваются друг под другом.',
            'Нажмите «Проверить полёт»: дрон запустит моторы, взлетит и сядет.'
        ],
        hint: 'Порядок важен: подготовка → взлёт → посадка. Блок «Взлет» лежит в категории «Полёт», первым же столбцом.',
        outcome: 'Вы собрали и запустили первую программу на блоках. Остальные миссии добавляют блоки между взлётом и посадкой.',
        starterXml: project('first_flight', []), solutionXml: project('first_flight', FLIGHT_BASE),
        requires: [[T('preflight'), 'Предполётная подготовка'], [T('take_off'), 'Взлет'], [T('landing'), 'Посадка']],
        waitMs: 90000,
        check: (g) => g.basics(true).armOnce().takeoff().landing()
    },
    {
        ...G1, id: 'bricks-hover', title: 'Зависнуть на три секунды', flight: true,
        goal: 'Заставить дрон повисеть в воздухе: блок «Заснуть» между взлётом и посадкой.',
        steps: [
            'Команды выполняются сразу одна за другой. Чтобы дрон успел повисеть, между взлётом и посадкой нужна пауза.',
            'Блок «Заснуть на … секунд» лежит в категории «Прочее». Поставьте его между «Взлет» и «Посадка».',
            'Впишите в него число 3.',
            'Нажмите «Проверить полёт»: дрон висит около трёх секунд.'
        ],
        hint: 'Если блок вставлен после «Посадка», дрон сядет сразу. Перетащите его так, чтобы он оказался между «Взлет» и «Посадка».',
        outcome: 'Пауза — самый простой способ растянуть действие во времени.',
        starterXml: project('hover', FLIGHT_BASE), solutionXml: project('hover', [preflight, takeOff, sleep(3), landing]),
        requires: [[T('preflight'), 'Предполётная подготовка'], [T('take_off'), 'Взлет'], [T('sleep'), 'Заснуть'], [T('landing'), 'Посадка']],
        waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            if (g.takeoffDone && g.landStart && g.airTime() < 2.5) g.fail('Дрон не повис', `В воздухе дрон провёл ${g.airTime().toFixed(1)} с, а нужно около трёх.`, 'Поставьте «Заснуть на 3 секунд» между блоками «Взлет» и «Посадка».');
        }
    },
    {
        ...G2, id: 'bricks-led-colors', title: 'Красный, зелёный, синий', flight: false,
        goal: 'Показать на светодиодах три цвета по очереди и погасить их. Дрон остаётся на земле.',
        steps: [
            'Блок «Установить цвет всех светодиодов на …» берёт цвет из блока «Цвет»: щёлкните по цветному квадрату и выберите оттенок. Чёрный цвет — светодиоды выключены.',
            'В программе уже есть красный цвет на секунду. Добавьте под ним зелёный на секунду и синий на секунду.',
            'Последним блоком поставьте тот же «Установить цвет» с чёрным цветом.',
            'Нажмите «Проверить полёт»: красный, зелёный, синий, выключено.'
        ],
        hint: 'Копируйте пару «Установить цвет» + «Заснуть» (Ctrl+C, Ctrl+V) и меняйте только цвет. Красный #ff0000, зелёный #00ff00, синий #0000ff, чёрный #000000.',
        outcome: 'Подсветка управляется блоками «Цвет». Паузы нужны, чтобы цвет успели увидеть.',
        starterXml: project('led_colors', [ledAll('#ff0000'), sleep(1)]),
        solutionXml: project('led_colors', [ledAll('#ff0000'), sleep(1), ledAll('#00ff00'), sleep(1), ledAll('#0000ff'), sleep(1), ledAll('#000000')]),
        requires: [[T('led_all'), 'Установить цвет всех светодиодов'], [T('field-colour'), 'Цвет'], [T('sleep'), 'Заснуть']],
        minCounts: { [T('led_all')]: 4 }, waitMs: 40000,
        check: (g) => {
            g.basics(false).noArm();
            const sequence = g.ledSequence(0).join(',');
            if (sequence !== 'red,green,blue,off') g.fail('Цвета не по порядку', `Светодиод показал: ${sequence || 'ничего'}. Нужно: red, green, blue, off.`, 'Красный → зелёный → синий → чёрный, с паузой в секунду между цветами.');
            const changes = g.ledChanges(0);
            if (changes.slice(1, 3).some((change, i) => change.time - changes[i].time < 0.5)) g.fail('Цвета меняются слишком быстро', 'Между цветами должна быть пауза хотя бы в секунду.', 'Поставьте «Заснуть на 1 секунд» после каждого цвета.');
        }
    },
    {
        ...G2, id: 'bricks-led-index', title: 'Левый и правый светодиод', flight: false,
        goal: 'Управлять светодиодами по отдельности: у Мини 2 два светодиода, 0 — левый и 1 — правый.',
        steps: [
            'Блок «Установить цвет … на светодиод с номером …» включает один светодиод. Номера: 0 — левый, 1 — правый.',
            'Сделайте левый красным, подождите секунду, затем правый синим и подождите ещё секунду.',
            'Погасите всё блоком «Установить цвет всех светодиодов» с чёрным цветом.',
            'Нажмите «Проверить полёт»: слева красный, справа синий, потом оба гаснут.'
        ],
        hint: 'Номер светодиода — число в правом разъёме блока. Для левого — 0, для правого — 1.',
        outcome: 'Вы различаете светодиоды по номерам. Так делают указатели поворота и бегущий огонь.',
        starterXml: project('led_index', []),
        solutionXml: project('led_index', [ledIndex('#ff0000', num(0)), sleep(1), ledIndex('#0000ff', num(1)), sleep(1), ledAll('#000000')]),
        requires: [[T('led_index'), 'Установить цвет на светодиод с номером'], [T('led_all'), 'Установить цвет всех светодиодов']],
        minCounts: { [T('led_index')]: 2 }, waitMs: 40000,
        check: (g) => {
            g.basics(false).noArm();
            const left = g.ledSequence(0);
            const right = g.ledSequence(1);
            if (left[0] !== 'red') g.fail('Левый светодиод не красный', `Левый показал: ${left.join(', ') || 'ничего'}.`, 'Светодиод с номером 0 — красный.');
            if (right[0] !== 'blue') g.fail('Правый светодиод не синий', `Правый показал: ${right.join(', ') || 'ничего'}.`, 'Светодиод с номером 1 — синий.');
            if (left[left.length - 1] !== 'off' || right[right.length - 1] !== 'off') g.fail('Светодиоды не погашены', 'В конце оба должны быть выключены.', 'Завершите программу чёрным цветом для всех светодиодов.');
        }
    },
    {
        ...G3, id: 'bricks-repeat', title: 'Мигание циклом', flight: false,
        goal: 'Помигать жёлтым три раза, не собирая одно и то же трижды: блок «Повторить».',
        steps: [
            'Блок «Повторить … раз» из категории «Циклы» выполняет всё, что внутри него, нужное число раз.',
            'Внутрь положите: жёлтый цвет всех светодиодов, «Заснуть на 0.4», чёрный цвет всех светодиодов, «Заснуть на 0.4».',
            'Поставьте в «Повторить» число 3.',
            'Нажмите «Проверить полёт»: три заметные вспышки.'
        ],
        hint: 'Жёлтый — #ffff00. Блоки внутри «Повторить» защёлкиваются в его вырез, а не под него.',
        outcome: 'Цикл заменил шесть одинаковых блоков одним. Это главный приём упрощения программ.',
        starterXml: project('repeat', []),
        solutionXml: project('repeat', [repeat(3, [ledAll('#ffff00'), sleep(0.4), ledAll('#000000'), sleep(0.4)])]),
        requires: [['controls_repeat_ext', 'Повторить'], [T('led_all'), 'Установить цвет всех светодиодов'], [T('sleep'), 'Заснуть']],
        waitMs: 40000,
        check: (g) => {
            g.basics(false).noArm();
            const changes = g.ledChanges(0);
            const flashes = changes.map((change, i) => (change.color === 'yellow' ? (changes[i + 1] ? changes[i + 1].time - change.time : 0) : -1)).filter((value) => value >= 0);
            if (flashes.length !== 3) g.fail('Вспышек не три', `Жёлтых вспышек — ${flashes.length}.`, 'Число в блоке «Повторить» — 3.');
            else if (flashes.some((value) => value < 0.25)) g.fail('Вспышки слишком короткие', 'Вспышка короче 0.25 секунды.', 'После жёлтого цвета поставьте «Заснуть на 0.4».');
        }
    },
    {
        ...G3, id: 'bricks-chase', title: 'Бегущий огонь', flight: false,
        goal: 'Перебирать светодиоды циклом со счётчиком: огонь бежит с левого на правый и обратно.',
        steps: [
            'Блок «Цикл со счётчиком» (категория «Циклы») подставляет в переменную `i` числа от начала до конца: у нас 0 и 1.',
            'Внутри: все светодиоды чёрные, затем цвет оранжевый на светодиод с номером `i` (блок переменной `i` берётся из категории «Переменные»), затем пауза 0.3.',
            'Оберните цикл со счётчиком блоком «Повторить 2 раз», а в конце погасите все светодиоды.',
            'Нажмите «Проверить полёт»: огонь бежит 0, 1, 0, 1.'
        ],
        hint: 'Оранжевый — #ffaa00. Переменную `i` создайте в категории «Переменные» и подставьте блоком «i» в номер светодиода. Чёрный перед оранжевым нужен, чтобы погасить предыдущий.',
        outcome: 'Счётчик цикла дал номер светодиода: одна и та же команда работает для каждого светодиода.',
        starterXml: project('chase', [], ['i']),
        solutionXml: project('chase', [repeat(2, [forRange('i', 0, 1, [ledAll('#000000'), ledIndex('#ffaa00', getVar('i')), sleep(0.3)])]), ledAll('#000000')], ['i']),
        requires: [['controls_repeat_ext', 'Повторить'], ['controls_for', 'Цикл со счётчиком'], ['variables_get', 'Переменная i'], [T('led_index'), 'Установить цвет на светодиод с номером']],
        waitMs: 40000,
        check: (g) => {
            g.basics(false).noArm();
            const order = g.ledChanges().filter((change) => change.color === 'orange').map((change) => change.led).join(',');
            if (order !== '0,1,0,1') g.fail('Огонь бежит не так', `Оранжевый зажигался на светодиодах: ${order || 'нигде'}. Нужно 0, 1, 0, 1.`, 'Внешний цикл повторяет 2 раза, внутренний — со счётчиком от 0 до 1.');
            const last = g.ledChanges().filter((change) => change.color !== 'off').length;
            if (last === 0) g.fail('Огонь не зажигался', 'Не видно оранжевого цвета.', 'Цвет #ffaa00 на светодиод с номером i.');
        }
    },
    {
        ...G4, id: 'bricks-print-height', title: 'Печать высоты', flight: true,
        goal: 'Взлететь на метр и напечатать высоту по дальномеру: данные датчика попадают в журнал.',
        steps: [
            'Блок «Получить данные от датчика расстояния» (категория «Модули») отдаёт высоту над землёй в метрах. Блок «Напечатать» (категория «Текст») выводит значение в журнал.',
            'Чтобы напечатать подпись и число вместе, соедините их блоком «Создать текст из»: сначала текст «Высота: », затем блок датчика.',
            'Порядок: подготовка, взлёт, «Лететь в локальные координаты» 0, 0, 1 и «Ожидать достижения точки», печать высоты, посадка.',
            'Нажмите «Проверить полёт»: в журнале строка «Высота: 1…».'
        ],
        hint: 'Блок «Лететь в локальные координаты» не ждёт прилёта — после него обязательно «Ожидать достижения точки». Иначе высота будет напечатана раньше времени.',
        outcome: 'Вы вывели в журнал измерение датчика. Так начинается любой отладочный вывод и телеметрия.',
        starterXml: project('print_height', [preflight, takeOff, landing]),
        solutionXml: project('print_height', [preflight, takeOff, ...point(0, 0, 1), print(join(text('Высота: '), distance())), landing]),
        requires: [[T('go_local_point'), 'Лететь в локальные координаты'], [T('waiting_for_point'), 'Ожидать достижения точки'], ['text_print', 'Напечатать'], ['text_join', 'Создать текст из'], [T('get_dist_sensor_data'), 'Получить данные от датчика расстояния']],
        waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[0, 0, 1]]);
            g.expectNumber('Высота:', 0.7, 1.3, 'Печатайте значение датчика расстояния после прилёта в точку.');
        }
    },
    {
        ...G4, id: 'bricks-ranger', title: 'Дальномер Ranger', flight: true,
        goal: 'Прочитать показание нижнего дальномера модуля Ranger и сравнить с высотой.',
        steps: [
            'Модуль Ranger — пять дальномеров: справа, слева, спереди, сзади и снизу. Блок «Получить данные от модуля Ranger» отдаёт все пять показаний.',
            'Блок «Получить значение дальномера … из данных» выбирает одно показание. Выберите «Нижний».',
            'Взлетите на метр, напечатайте «Снизу: » и показание, сядьте.',
            'Нажмите «Проверить полёт»: «Снизу» около метра.'
        ],
        hint: 'Блок значения стоит внутри «Создать текст из» вместе с подписью. В поле «из данных» вставьте блок «Получить данные от модуля Ranger».',
        outcome: 'Один модуль даёт пять расстояний. По переднему и боковым дальномерам дрон может облетать препятствия, а нижний дублирует высоту.',
        starterXml: project('ranger', [preflight, takeOff, landing]),
        solutionXml: project('ranger', [preflight, takeOff, ...point(0, 0, 1),
            print(join(text('Снизу: '), block('ranger_value', { fields: { side: '4' }, values: { DATA: block('ranger_data') } }))), landing]),
        requires: [[T('ranger_value'), 'Получить значение дальномера'], [T('ranger_data'), 'Получить данные от модуля Ranger'], ['text_print', 'Напечатать'], [T('waiting_for_point'), 'Ожидать достижения точки']],
        waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[0, 0, 1]]);
            g.expectNumber('Снизу:', 0.7, 1.3, 'Выберите «Нижний» дальномер и печатайте его после прилёта в точку на высоте 1 м.');
        }
    },
    {
        ...G4, id: 'bricks-altitude-light', title: 'Светофор высоты', flight: true,
        goal: 'Показывать высоту цветом: ниже полутора метров — зелёный, выше — красный. Условие «если … иначе».',
        steps: [
            'Блок «если … иначе» (категория «Логика») выбирает одну из двух веток. Условие собирается блоком сравнения: «высота < 1.5».',
            'После взлёта дрон висит на высоте около метра: зажгите зелёный, если высота меньше 1.5, иначе красный; подождите секунду.',
            'Поднимитесь до 2 м («Лететь в локальные координаты» 0, 0, 2 и «Ожидать достижения точки») и сделайте то же самое: теперь загорится красный. Затем посадка.',
            'Нажмите «Проверить полёт»: сначала зелёный, затем красный.'
        ],
        hint: 'Условие — блок «Логика → =» со знаком «<», слева датчик расстояния, справа число 1.5. Блок «если» можно скопировать целиком.',
        outcome: 'Условие превратило измерение в решение. Светофор высоты — основа предупреждений: «слишком низко», «слишком высоко».',
        starterXml: project('altitude_light', [preflight, takeOff, landing]),
        solutionXml: (() => {
            const light = ifElse(compare('LT', distance(), num(1.5)), [ledAll('#00ff00')], [ledAll('#ff0000')]);
            return project('altitude_light', [preflight, takeOff, light, sleep(1), ...point(0, 0, 2), light, sleep(1), landing]);
        })(),
        requires: [['controls_if', 'Если … иначе'], ['logic_compare', 'Сравнение'], [T('get_dist_sensor_data'), 'Получить данные от датчика расстояния'], [T('led_all'), 'Установить цвет всех светодиодов']],
        minCounts: { controls_if: 2 }, waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[0, 0, 2]]);
            const colors = g.ledSequence(0).filter((color) => color !== 'off');
            if (colors[0] !== 'green' || colors[colors.length - 1] !== 'red') g.fail('Светофор показал не то', `Цвета: ${colors.join(', ') || 'нет'}. Нужно: зелёный на высоте около метра, красный на двух метрах.`, 'Условие «высота < 1.5» → зелёный, иначе красный; блок «если» нужен после взлёта и после подъёма на 2 м.');
        }
    },
    {
        ...G5, id: 'bricks-go-point', title: 'Лететь в точку', flight: true,
        goal: 'Отправить дрон в точку координатами и дождаться прилёта.',
        steps: [
            'Блок «Лететь в локальные координаты X Y Z» задаёт точку в метрах относительно старта. Угол поворота и время можно оставить нулями.',
            'Блок «Ожидать достижения точки» нужен сразу после: без него следующая команда отменит эту.',
            'Постройте: подготовка, взлёт, точка (1.5; 0.5; 1), ожидание точки, точка (0; 0; 1), ожидание точки, посадка.',
            'Нажмите «Проверить полёт»: дрон долетает до первой точки, возвращается и садится.'
        ],
        hint: 'После каждого «Лететь…» ставьте «Ожидать достижения точки». Координаты — три первых числа блока: X, Y, Z.',
        outcome: 'Связка «лететь + ждать» — кирпичик любого маршрута.',
        starterXml: project('go_point', FLIGHT_BASE),
        solutionXml: project('go_point', [preflight, takeOff, ...point(1.5, 0.5, 1), ...point(0, 0, 1), landing]),
        requires: [[T('go_local_point'), 'Лететь в локальные координаты'], [T('waiting_for_point'), 'Ожидать достижения точки']],
        minCounts: { [T('go_local_point')]: 2, [T('waiting_for_point')]: 2 }, waitMs: 120000,
        check: (g) => g.basics(true).armOnce().takeoff().landing().route([[1.5, 0.5, 1], [0, 0, 1]])
    },
    {
        ...G5, id: 'bricks-square', title: 'Полёт по квадрату', flight: true,
        goal: 'Облететь квадрат со стороной 1 м: четыре точки по порядку.',
        steps: [
            'Квадрат — это четыре вершины, обходимые по кругу: (1; 0), (1; 1), (0; 1) и снова старт (0; 0). Высота везде 1 м.',
            'Первая вершина уже есть. Для каждой следующей добавьте пару «Лететь в локальные координаты» + «Ожидать достижения точки» (копируйте пару и меняйте числа).',
            'Посадка остаётся последним блоком.',
            'Нажмите «Проверить полёт»: дрон обойдёт квадрат и сядет.'
        ],
        hint: 'Меняется только X и Y: (1; 0), (1; 1), (0; 1), (0; 0). Z=1 везде, угол и время — нули.',
        outcome: 'Маршрут из блоков повторяет проект «Полёт по квадрату» из сборника Bricks.',
        starterXml: project('square', [preflight, takeOff, ...point(1, 0, 1), landing]),
        solutionXml: project('square', [preflight, takeOff, ...point(1, 0, 1), ...point(1, 1, 1), ...point(0, 1, 1), ...point(0, 0, 1), landing]),
        requires: [[T('go_local_point'), 'Лететь в локальные координаты'], [T('waiting_for_point'), 'Ожидать достижения точки']],
        minCounts: { [T('go_local_point')]: 4, [T('waiting_for_point')]: 4 }, waitMs: 180000,
        check: (g) => g.basics(true).armOnce().takeoff().landing().route([[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]])
    },
    {
        ...G5, id: 'bricks-speed', title: 'Скорость на время', flight: true,
        goal: 'Лететь заданной скоростью две секунды и остановиться нулевой скоростью.',
        steps: [
            'Блок «Установить скорость относительно точки старта по X … по Y … по Z …» задаёт скорость в метрах в секунду. Скорость держится заданное в блоке время (около секунды) и дальше нужна новая команда.',
            'После взлёта поставьте скорость по X равной 0.5 и подождите 2 секунды блоком «Заснуть».',
            'Затем остановите дрон: тот же блок со всеми нулями и «Заснуть на 1». Потом посадка.',
            'Нажмите «Проверить полёт»: дрон проходит около метра вперёд по X.'
        ],
        hint: 'Путь = скорость × время: 0.5 м/с × 2 с = 1 м. Нулевая скорость — тот же блок с нулями.',
        outcome: 'Скорость задаёт движение «по ощущению», а не по точке. Так управляют дроном с джойстика.',
        starterXml: project('speed', FLIGHT_BASE),
        solutionXml: project('speed', [preflight, takeOff, speedStart(0.5, 0, 0), sleep(2), speedStart(0, 0, 0), sleep(1), landing]),
        requires: [[T('set_speed_start'), 'Установить скорость относительно точки старта'], [T('sleep'), 'Заснуть']],
        minCounts: { [T('set_speed_start')]: 2 }, waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const moves = g.velocities().filter((event) => Math.hypot(event.velocity!.x, event.velocity!.y) > 0.2);
            if (!moves.length) g.fail('Скорость не задана', 'В журнале нет команды скорости по X.', 'Установите скорость по X равной 0.5.');
            const begin = g.takeoffDone?.pos;
            const end = g.landStart?.pos;
            if (begin && end && Math.hypot(end.x - begin.x, end.y - begin.y) < 0.4) g.fail('Дрон почти не сдвинулся', 'Сдвиг меньше 0.4 м.', 'Скорость 0.5 м/с нужно держать две секунды: «Заснуть на 2» после блока скорости.');
            const speeds = g.velocities();
            if (speeds.length && Math.hypot(speeds[speeds.length - 1].velocity!.x, speeds[speeds.length - 1].velocity!.y) > 0.05) g.fail('Дрон не остановлен', 'Последняя команда скорости не нулевая.', 'Перед посадкой поставьте скорость 0, 0, 0.');
        }
    },
    {
        ...G6, id: 'bricks-servo', title: 'Наклон камеры', flight: false,
        goal: 'Наклонять камеру сервоприводом и сообщать об этом в журнал.',
        steps: [
            'Блок «Задать поворот сервопривода … °» (категория «Модули») наклоняет камеру. Диапазон — от -80° (вниз) до 30° (вверх), шаг 15°.',
            'Сделайте три наклона подряд: 0, -30 и -60 градусов. После каждого блока поставьте «Заснуть на 1» и «Напечатать» с текстом «Угол …».',
            'Тексты в журнале: «Угол 0», «Угол -30», «Угол -60».',
            'Нажмите «Проверить полёт»: три строки в журнале.'
        ],
        hint: 'Угол вписывается в самом блоке сервопривода. Значения -30 и -60 кратны 15 — их блок принимает без округления.',
        outcome: 'Камера наклоняется блоками, а журнал подтверждает каждый шаг.',
        starterXml: project('servo', []),
        solutionXml: project('servo', [servo(0), sleep(1), print(text('Угол 0')), servo(-30), sleep(1), print(text('Угол -30')), servo(-60), sleep(1), print(text('Угол -60')), servo(0)]),
        requires: [[T('servo_set_angle'), 'Задать поворот сервопривода'], ['text_print', 'Напечатать'], [T('sleep'), 'Заснуть']],
        minCounts: { [T('servo_set_angle')]: 3 }, waitMs: 40000,
        check: (g) => {
            g.basics(false).noArm();
            g.order(['Угол 0', 'Угол -30', 'Угол -60'], 'Напечатайте «Угол 0», «Угол -30», «Угол -60» после соответствующих блоков сервопривода.');
        }
    },
    {
        ...G6, id: 'bricks-photo', title: 'Кадр и окно', flight: false,
        goal: 'Снять кадр камеры, показать его в окне и сохранить: переменная для кадра и три блока камеры.',
        steps: [
            'Блок «Получить кадр с … камеры» отдаёт кадр. Его нужно запомнить: присвойте блоком «присвоить» переменной `img` (категория «Переменные»).',
            'Блок «Демонстрация изображения из кадра … в окно …» показывает кадр, блок «Сохранить в файл кадр … с именем …» сохраняет (в симуляторе файл имитируется).',
            'Наклоните камеру на -45°, подождите секунду, снимите кадр с основной камеры, покажите в окне `photo`, сохраните как `foto`, верните камеру на 0°.',
            'Нажмите «Проверить полёт»: окно с кадром откроется.'
        ],
        hint: 'Сначала «присвоить img = Получить кадр», затем в блоки показа и сохранения подставляйте блок переменной `img`. В симуляторе кадр приходит с одной камеры дрона: Bricks создаёт обе камеры, и видна та, что создана последней (нижняя); на настоящем Мини 2 кадр берётся с выбранной камеры.',
        outcome: 'Кадр — обычная переменная: его можно показать, сохранить, передать нейросети или поиску меток.',
        starterXml: project('photo', [], ['img']),
        solutionXml: project('photo', [servo(-45), sleep(1), setVar('img', frame('MAIN')),
            stmt('imshow', { values: { frame: getVar('img'), name: text('photo') } }),
            stmt('imwrite', { values: { frame: getVar('img'), path: text('foto') } }), servo(0)], ['img']),
        requires: [['variables_set', 'Присвоить переменной'], [T('cam_get_cv_frame'), 'Получить кадр с камеры'], [T('imshow'), 'Демонстрация изображения'], [T('imwrite'), 'Сохранить в файл кадр']],
        waitMs: 60000,
        check: (g) => {
            g.basics(false).noArm();
            if (!g.cameraFrames().length) g.fail('Кадр не снят', 'Камера не отдала ни одного кадра.', 'Блок «Получить кадр с камеры» присвойте переменной img.');
            if (!g.events.some((event) => event.kind === 'display')) g.fail('Кадр не показан', 'Окно с кадром не открылось.', 'Подставьте переменную img в блок «Демонстрация изображения».');
        }
    },
    {
        ...G7, id: 'bricks-aruco', title: 'Метка ArUco в кадре', flight: true, scene: 'markers',
        goal: 'Найти метку ArUco нижней камерой и узнать, где в кадре её центр.',
        steps: [
            'ArUco-метка — квадратный чёрно-белый рисунок с номером. Блок «Найти маркеры ArUco на изображении … семейство …» ищет метки на кадре; семейство должно быть 6x6_250.',
            'Взлетите, поднимитесь на 3 м, подождите секунду. Снимите кадр с оптической (нижней) камеры в переменную `img`, результат поиска запишите в переменную `markers`.',
            'Блок «Координаты объекта … X центра, ID 12» вернёт горизонтальную координату центра метки номер 12 в пикселях. Напечатайте её с подписью «X метки: ».',
            'Нажмите «Проверить полёт»: в журнале «X метки: …» — число пикселей около середины кадра.'
        ],
        hint: 'Режим блока координат — «X центра», номер метки (ID) 12. Объект для блока — переменная `markers`.',
        outcome: 'Дрон нашёл метку и знает, где она в кадре. Этой координатой потом наводят дрон на метку.',
        starterXml: project('aruco', [preflight, takeOff, landing], ['img', 'markers']),
        solutionXml: project('aruco', [preflight, takeOff, ...point(0, 0, 3), sleep(1.5), setVar('img', frame('OPT')),
            setVar('markers', block('aruco_find', { fields: { FAMILY: 'DICT_6X6_250' }, values: { IMG: getVar('img') } })),
            print(join(text('X метки: '), block('cv_object_coords', { fields: { mode: 'x' }, values: { obj: getVar('markers'), ident: num(12) } }))), landing], ['img', 'markers']),
        requires: [[T('cam_get_cv_frame'), 'Получить кадр с камеры'], [T('aruco_find'), 'Найти маркеры ArUco'], [T('cv_object_coords'), 'Координаты объекта'], ['variables_set', 'Присвоить переменной']],
        minCounts: { variables_set: 2 }, waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const detection = [...g.events].reverse().find((event) => event.kind === 'detect' && event.dictionary === 'DICT_6X6_250' && event.markers?.some((marker) => marker.id === 12));
            const marker = detection?.markers?.find((item) => item.id === 12);
            if (!marker) { g.fail('Метка 12 не найдена', 'Поиск не нашёл метку 12 в кадре нижней камеры.', 'Поднимитесь на 3 м над стартом, снимите кадр оптической камеры и выберите семейство 6x6_250.'); return; }
            const xs = marker.corners.map((point) => point[0]);
            const expected = Math.floor((Math.min(...xs) + Math.max(...xs)) / 2);
            const printed = g.numbers('X метки:')?.[0];
            if (printed === undefined) g.fail('Нет строки «X метки:»', 'Координата центра не напечатана.', 'Напечатайте блок «Координаты объекта … X центра, ID 12».');
            else if (Math.abs(printed - expected) > 3) g.fail('Координата не совпала с кадром', `Центр метки по X — около ${expected}, напечатано ${printed}.`, 'Режим «X центра», номер метки 12, объект — переменная markers.');
        }
    },
    {
        ...G8, id: 'bricks-patrol', title: 'Световой патруль', flight: true,
        goal: 'Итоговый проект: два круга по квадрату, синий огонь в пути, зелёный на вершине, нумерация кругов в журнале.',
        steps: [
            'Соберите всё изученное: «Цикл со счётчиком» по кругам (lap от 1 до 2), внутри — четыре вершины квадрата (1; 0), (1; 1), (0; 1), (0; 0) на высоте 1.2 м.',
            'Перед каждой вершиной светодиоды синие; после прилёта — зелёные на полсекунды.',
            'В начале каждого круга напечатайте «Круг » и номер круга (блок переменной `lap`).',
            'Поставьте подготовку и взлёт в начало, посадку — в конец. Нажмите «Проверить полёт»: два круга, восемь зелёных вспышек и две строки «Круг…».'
        ],
        hint: 'Вершину удобно собрать один раз: синий, «Лететь…», «Ожидать…», зелёный, «Заснуть 0.5» — и копировать, меняя координаты.',
        outcome: 'Вы собрали законченный проект на блоках: цикл, переменная, полёт по точкам, подсветка и журнал.',
        starterXml: project('patrol', [preflight, takeOff, landing], ['lap']),
        solutionXml: (() => {
            const vertex = (x: number, y: number): Stmt[] => [ledAll('#0000ff'), goPoint(x, y, 1.2), waitPoint, ledAll('#00ff00'), sleep(0.5)];
            return project('patrol', [preflight, takeOff,
                forRange('lap', 1, 2, [print(join(text('Круг '), getVar('lap'))), ...vertex(1, 0), ...vertex(1, 1), ...vertex(0, 1), ...vertex(0, 0)]),
                ledAll('#000000'), landing], ['lap']);
        })(),
        requires: [['controls_for', 'Цикл со счётчиком'], ['variables_get', 'Переменная lap'], [T('go_local_point'), 'Лететь в локальные координаты'], [T('waiting_for_point'), 'Ожидать достижения точки'], [T('led_all'), 'Установить цвет всех светодиодов'], ['text_print', 'Напечатать']],
        minCounts: { [T('go_local_point')]: 4 }, waitMs: 300000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const lap = [[1, 0, 1.2], [1, 1, 1.2], [0, 1, 1.2], [0, 0, 1.2]] as Array<[number, number, number]>;
            g.route([...lap, ...lap]);
            g.order(['Круг 1', 'Круг 2'], 'Печатайте «Круг » и номер круга в начале каждого круга.');
            const colors = g.ledSequence(0);
            const greens = colors.filter((color) => color === 'green').length;
            if (!colors.includes('blue') || greens < 8) g.fail('Сигналы патруля неполные', `Зелёных вспышек ${greens}, нужно 8 (по вершине); синий ${colors.includes('blue') ? 'был' : 'не включался'}.`, 'Синий перед «Лететь…», зелёный после «Ожидать…» на каждой вершине.');
        }
    }
];

export const BRICKS_MISSION_BY_ID: Record<string, BricksMission> = Object.fromEntries(BRICKS_MISSIONS.map((mission) => [mission.id, mission]));
export const isBricksMission = (id: string): boolean => id in BRICKS_MISSION_BY_ID;

/** Блоки, которых не хватает миссии: пустой список — состав подходит. */
export function missingBricksBlocks(mission: Pick<BricksMission, 'requires' | 'minCounts'>, usedTypes: Iterable<string>): string[] {
    const counts: Record<string, number> = {};
    for (const type of usedTypes) counts[type] = (counts[type] ?? 0) + 1;
    const problems: string[] = [];
    for (const [type, label] of mission.requires) {
        const need = mission.minCounts?.[type] ?? 1;
        const have = counts[type] ?? 0;
        if (have < need) problems.push(need > 1 ? `Нужно блоков «${label}»: ${need}, сейчас ${have}.` : `Добавьте блок «${label}».`);
    }
    return problems;
}

/** Типы блоков эталонного решения в именах редактора. */
export const solutionBlockTypes = (mission: BricksMission): Record<string, number> => editorBlockTypes(mission.solutionXml);

export function gradeBricksMission(id: string, samples: DroneSample[], events: LearningEvent[]): GuideEvaluation {
    const mission = BRICKS_MISSION_BY_ID[id];
    const grader = new Sdk2Grader(samples, events, BRICKS_DONE_MESSAGE);
    if (!mission) {
        grader.fail('Проверка для этой миссии не найдена', `Нет миссии «${id}».`, 'Сообщите разработчикам урока.');
        return grader.result();
    }
    mission.check(grader);
    return grader.result();
}

