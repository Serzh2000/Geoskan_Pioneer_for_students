import { localize } from '../../book/localize.js';
import { compileAcademyExercise } from './shared.js';

export type FlightPoint = [number, number, number];
export type FlightExercise = {
    number: number; points: FlightPoint[]; land?: boolean;
    task: string; hint: string; experiment: string;
    question: string; right: string; wrong: string; feedback: string;
    answer: string; component?: [number, number];
};

/** Each row teaches one new idea; route execution reuses the event/timeout lessons. */
export const FLIGHT_EXERCISES: FlightExercise[] = [
    { number: 37, points: [], answer: 'MCE_TAKEOFF',
        task: 'Перед запуском нажмите «Подготовить полигон». Отправьте команду взлёта только после подтверждения подготовки. <lua>Впишите вместо ___ команду взлёта в обработчик события ENGINES_STARTED («моторы запущены»).</lua><py>Впишите вместо ___ название команды взлёта, она идёт после arm. Затем программа ждёт состояния MISSION, так автопилот сообщает, что взлёт закончен.</py>',
        hint: '<lua>Команда Ev.MCE_TAKEOFF запускает подъём, событие Ev.TAKEOFF_COMPLETE подтверждает окончание.</lua><py>Команда takeoff() запускает подъём, состояние MISSION подтверждает зависание.</py> Высота взлёта задаётся параметрами автопилота, это ещё не цель маршрута.',
        experiment: 'Сравните время команды и подтверждения. Почему строка «взлетаю» сама не доказывает подъём?', question: 'Когда подъём можно считать завершённым?', right: 'После подтверждения зависания и изменения высоты', wrong: 'Сразу после отправки команды', feedback: 'Отправка и завершение разделены физическим движением.' },
    { number: 38, points: [[0, 0, 1], [0, 0, 2]], component: [1, 2], answer: '2',
        task: 'После взлёта посетите (0,0,1), затем (0,0,2). Во второй цели замените только Z.', hint: 'X и Y оставляем нулевыми, Z измеряется в метрах вверх. Новую цель задаём после <lua>события POINT_REACHED</lua><py>успешного ожидания point_reached()</py>.',
        experiment: 'Верните Z второй точки к 1. Исчезнет ли вертикальный участок?', question: 'Что изменится при (0,0,1) → (0,0,2)?', right: 'Только высота', wrong: 'Положение по X', feedback: 'Компоненты координат задают независимые направления.' },
    { number: 39, points: [[2, 0, 1], [-2, 0, 1]], component: [1, 0], answer: '-2',
        task: 'Долетите до точки с X=2, затем до точки с X=-2; в обеих точках Y=0 и Z=1.', hint: 'Минус выбирает сторону от начала координат. Переход от +2 к -2 — четыре метра по X, а не два.',
        experiment: 'Замените -2 на -1 и предскажите длину второго участка.', question: 'Расстояние между X=2 и X=-2?', right: '4 метра', wrong: '2 метра', feedback: 'Расстояние — модуль разности координат.' },
    { number: 40, points: [[1, 0, 1]], component: [0, 0], answer: '1',
        task: 'Прочитайте положение дрона до подготовки двигателей. Запишите его в журнал строкой, которая начинается со слов «Старт:». Затем отправьте дрон в точку (1, 0, 1).', hint: '<lua>Sensors.lpsPosition()</lua><py>get_local_position_lps()</py> и цель используют координаты сцены. Сброс этого симулятора возвращает аппарат в (0,0,0); у произвольного старта это совпадение не гарантировано.',
        experiment: 'Запустите код отдельно после перемещения аппарата и объясните, почему абсолютная цель не сдвигается вместе со стартом.', question: 'Откуда отсчитывается <lua>goToLocalPoint</lua><py>go_to_local_point</py> в симуляторе?', right: 'От начала координат сцены', wrong: 'Всегда от текущего места дрона', feedback: 'Положение и цель должны относиться к одной системе отсчёта.' },
    { number: 41, points: [[1, 1, 1]], component: [0, 1], answer: '1',
        task: 'Отправьте аппарат в точку (1,1,1) после завершения взлёта и дождитесь прибытия.', hint: '<lua>Команда находится в обработчике TAKEOFF_COMPLETE.</lua><py>Сначала дождитесь MISSION, затем задайте точку и дождитесь point_reached().</py>',
        experiment: '<lua>Отправьте цель сразу при ENGINES_STARTED, не дожидаясь взлёта.</lua><py>Уберите ожидание состояния MISSION.</py> Почему ранняя команда и прибытие всё равно не одно событие?', question: 'Что задаёт команда точки?', right: 'Цель, к которой ещё нужно долететь', wrong: 'Мгновенно переносит аппарат', feedback: 'Автопилот строит движение к цели во времени.' },
    { number: 42, points: [[0, 0, 3], [6, 0, 3]], component: [1, 2], answer: '3',
        task: 'Нажмите «Подготовить полигон»: в сцене появится холм в точке (6,0). Посетите (0,0,3), затем (6,0,3). В каждой точке после прибытия прочитайте Z и показание дальномера и запишите их в журнал.', hint: '<lua>Sensors.range()</lua><py>get_dist_sensor_data()</py> измеряет поверхность снизу. Одинаковая мировая Z над землёй и холмом даёт разный просвет. Холм ниже выбранной высоты.',
        experiment: 'Увеличьте обе высоты на метр: что изменится у дальномера?', question: 'Над холмом при той же Z просвет…', right: 'Меньше, чем над ровной землёй', wrong: 'Всегда равен Z', feedback: 'Дальномер вычитает высоту поверхности, а мировая Z её не вычитает.' },
    { number: 43, points: [[2, 0, 1]], component: [0, 0], answer: '2',
        task: 'Во время движения к X=2 считайте оставшееся смещение 2-X и печатайте его каждые полсекунды. Не подставляйте цель вместо измеренного X.', hint: '<lua>Sensors.lpsPosition()</lua><py>get_local_position_lps()</py> возвращает три числа: x, y, z. Сохраняйте знак разности цель минус положение.',
        experiment: 'Поменяйте цель на отрицательную. Как изменится знак ошибки?', question: 'Как получить оставшееся смещение по X?', right: 'Вычесть измеренное X из целевого X', wrong: 'Всегда печатать координату цели', feedback: 'Ошибка зависит от нового измерения и уменьшается при подходе.' },
    { number: 44, points: [[2, 0, 1]], component: [0, 0], answer: '2',
        task: 'После подтверждения точки проверьте <lua>math.abs(2-X)<0.15</lua><py>abs(2-X)<0.15</py> и выведите «В допуске». Сравните X с ровно 2 в журнале.', hint: 'Физическое прибытие допускает небольшую погрешность. Для одномерного опыта достаточно модуля ошибки X; точное равенство ненадёжно.',
        experiment: 'Замените допуск точным равенством. Срабатывает ли оно каждый раз?', question: 'Почему <lua>math.abs</lua><py>abs</py>(цель-X)<0.15 полезнее X==цель?', right: 'Учитывает небольшую погрешность прибытия', wrong: 'Переносит дрон точно в цель', feedback: 'Допуск описывает область принятия решения, не меняя физику.' },
    { number: 45, points: [[0, 0, 1]], component: [0, 2], answer: '1',
        task: 'Долетите до точки (0,0,1), она над стартом. После прибытия поверните корпус на π/2 радиан, подождите две секунды и прочитайте положение.', hint: '<lua>Поворот выполняет ap.updateYaw(math.pi/2).</lua><py>Нужна цель с прежними XYZ и yaw=math.pi/2.</py> 90 градусов соответствуют π/2 радиан. Поворот не требует перемещения по X/Y.',
        experiment: 'Поверните на -π/2. Объясните направление изменения взгляда.', question: 'Что меняет yaw при прежних XYZ?', right: 'Курс корпуса', wrong: 'Координату высоты', feedback: 'Угол курса и положение — разные величины.' },
    { number: 46, points: [[2, 0, 1]], component: [0, 0], answer: '2',
        task: 'В точке (2,0,1) выведите «Прибыл» после подтверждения прибытия.', hint: 'Сообщение <lua>внутри обработчика POINT_REACHED</lua><py>после успешного wait_point()</py> подтверждает этап. Print сразу после команды опередит движение.',
        experiment: 'Переставьте print к отправке команды и сравните момент сообщения.', question: 'Где уместно «Прибыл»?', right: 'После подтверждения точки', wrong: 'До команды движения', feedback: 'Отчёт описывает уже произошедший результат.' },
    { number: 47, points: [[2, 0, 1], [2, 2, 1]], component: [1, 1], answer: '2',
        task: 'Посетите (2,0,1), затем (2,2,1). Отправьте вторую цель только после первой.', hint: '<lua>Переменная phase различает первый и второй POINT_REACHED.</lua><py>Дождитесь точки после каждой команды.</py> Две команды подряд могут заменить активную цель.',
        experiment: 'Задайте вторую цель сразу: какая вершина будет пропущена?', question: 'Когда отправляем вторую цель?', right: 'После прибытия в первую', wrong: 'Сразу следом за первой командой', feedback: 'Порядок команд не гарантирует порядок посещения точек без ожиданий.' },
    { number: 48, points: [[0, 2, 1], [2, 2, 1]], component: [0, 1], answer: '2',
        task: 'Постройте угол: сначала долетите до вершины (0,2,1), затем до (2,2,1). Вершину нужно посетить, а не пролететь мимо.', hint: 'Конечная точка (2,2,1) та же, что у прямого маршрута по диагонали. Угол отличается тем, что дрон по пути действительно посещает вершину (0,2,1).',
        experiment: 'Уберите промежуточную точку и сравните след полёта.', question: 'Что доказывает движение по углу?', right: 'Посещение промежуточной вершины', wrong: 'Только совпадение конечной точки', feedback: 'Форма пути определяется последовательностью достигнутых точек.' },
    { number: 49, points: [[2, 0, 1], [2, 2, 1], [0, 2, 1], [0, 0, 1]], component: [3, 1], answer: '0',
        task: 'Замкните квадрат: (2,0,1) → (2,2,1) → (0,2,1) → (0,0,1). Впишите вместо ___ координату Y последней точки.', hint: 'Каждая вершина подтверждается отдельно. Возвращение в начало без остальных вершин не считается квадратом.',
        experiment: 'Увеличьте длину стороны, меняя одинаковые координаты согласованно.', question: 'Сколько горизонтальных сторон у замкнутого квадрата?', right: 'Четыре', wrong: 'Одна, от старта к финишу', feedback: 'Замкнутый маршрут сохраняет все промежуточные вершины.' },
    { number: 50, points: [[2, 0, 1], [2, 2, 1], [0, 2, 1], [0, 0, 1]], component: [2, 0], answer: '0',
        task: 'Квадрат (2,0,1) → (2,2,1) → (0,2,1) → (0,0,1) записан списком точек, его проходит один алгоритм. Впишите вместо ___ координату X третьей точки списка.', hint: '<lua>Таблица points, индекс i, следующий элемент берётся после POINT_REACHED.</lua><py>Цикл for point in points, команда и ожидание внутри цикла.</py> Список — данные, ожидание — логика.',
        experiment: 'Добавьте пятую точку в список: нужно ли менять <lua>обработчик</lua><py>цикл</py>?', question: 'Что меняем для добавления вершины?', right: 'Данные списка', wrong: 'Переписываем весь алгоритм ожидания', feedback: 'Отделённые от логики данные делают маршрут расширяемым.' },
    { number: 51, points: [[0, 2, 1], [0, 0, 1]], component: [0, 1], answer: '2',
        task: 'До <lua>подготовки двигателей</lua><py>arm</py> сохраните координаты дома. Посетите (0,2,1) и вернитесь к сохранённым X/Y на высоте 1.', hint: 'В заготовке последняя точка строится из homeX/homeY. Это работает и при старте вне мировых нулей; учебный сброс пока даёт нули.',
        experiment: 'В свободном запуске сдвиньте старт. Проверьте разницу между home и буквальным (0,0).', question: 'Дом — это…', right: 'Заранее сохранённое положение старта', wrong: 'Всегда мировые нули', feedback: 'Возвращение использует измеренный старт, а не предположение.' },
    { number: 52, points: [[1, 0, 1]], component: [0, 0], answer: '1', land: true,
        task: 'Долетите до (1,0,1), после подтверждения отправьте посадку и дождитесь остановки.', hint: '<lua>Событие Ev.COPTER_LANDED</lua><py>Состояние DISARMED</py> подтверждает завершение. На земле до взлёта это состояние ещё не доказывает посадку.',
        experiment: 'Вынесите <lua>посадку</lua><py>land()</py> перед прибытием: где окажется аппарат?', question: 'Что подтверждает завершённую посадку?', right: 'Снижение после маршрута и остановка на поверхности', wrong: 'Только команда land', feedback: 'Посадка — отдельный физический этап.' },
    { number: 53, points: [[2, 1, 1]], component: [0, 1], answer: '1', land: true,
        task: 'Выполните полный цикл: <lua>подготовка</lua><py>arm</py> → взлёт → точка (2,1,1) → посадка. Каждый этап запускается после подтверждения предыдущего. Впишите вместо ___ недостающую координату точки.', hint: 'Новых команд нет. Разделите этапы и запускайте следующий только после завершения предыдущего.',
        experiment: 'Поменяйте одно ожидание на короткую фиксированную паузу и объясните риск.', question: 'На чём основаны переходы полной миссии?', right: 'На подтверждении каждого этапа', wrong: 'На нескольких командах без ожидания', feedback: 'Последовательность подтверждений делает миссию проверяемой.' },
    { number: 54, points: [[1, 1, 1]], component: [0, 0], answer: '1', land: true,
        task: 'Впишите вместо ___ недостающую координату точки (1,1,1): миссия летит к ней и садится. Нажмите «Проверить и запустить» три раза подряд, не меняя код. Кнопку «Сбросить проверку» между запусками не нажимайте: она обнуляет счёт запусков. Каждый запуск сам начинается со сброса сцены.', hint: 'Проверка хранит три успешных опыта только в текущей сессии. При изменении кода отсчёт повторов начинается заново.',
        experiment: 'Сравните последние измеренные координаты трёх посадок.', question: 'Зачем повторять без изменения кода?', right: 'Проверить повторяемость из одинаковых условий', wrong: 'Чтобы скрыть один неудачный запуск', feedback: 'Повторяемый результат сильнее единичного удачного наблюдения.' },
    { number: 55, points: [], answer: 'Карта повторяется',
        task: 'Дважды нажмите «Подготовить полигон» с одним seed. Осмотрите расстановку, затем выведите «Карта повторяется» без <lua>подготовки двигателей</lua><py>arm</py>.', hint: 'Кнопка создаёт отдельную учебную сцену и временно скрывает прежние объекты. Повтор одного seed воспроизводит позиции, размеры и ID; вид сцены можно менять независимо.',
        experiment: 'Смените seed и найдите изменившийся объект. ID контрольных точек остаются договорённостью карты.', question: 'Что фиксирует seed?', right: 'Воспроизводимую расстановку генератора', wrong: 'Один случайный вид камеры', feedback: 'Одинаковые входные настройки генератора дают одинаковую карту.' },
    { number: 56, points: [], answer: 'MCE_TAKEOFF',
        task: 'Подготовьте полигон кнопкой «Подготовить полигон». Осмотрите свободное место вокруг винтов в сцене. Впишите вместо ___ команду взлёта. После взлёта дрон должен зависнуть над стартом без полёта к точкам.', hint: 'Центральная стартовая зона процедурного полигона свободна. Объектный центр и полный габарит аппарата отличаются; запас нужен вокруг всего корпуса.',
        experiment: 'В менеджере сцены добавьте препятствие рядом со стартом и объясните, где пропал запас, не запуская столкновение.', question: 'Что должно помещаться в свободном объёме?', right: 'Весь аппарат с запасом', wrong: 'Только математическая точка центра', feedback: 'Габарит и запас проверяют до команды подъёма.' },
    { number: 57, points: [[0, 8, 2]], component: [0, 2], answer: '2',
        task: 'Подготовьте лесной полигон кнопкой «Подготовить полигон». Пройдите свободный центральный коридор к точке (0,8,2).', hint: 'Деревья расставлены за границами центрального коридора с учётом радиуса кроны. Не сокращайте путь через боковую растительность.',
        experiment: 'Осмотрите край коридора и оцените запас до кроны, а не только ствола.', question: 'От чего считать боковой запас у дерева?', right: 'От полного объёма кроны и корпуса', wrong: 'Только от оси ствола', feedback: 'Траектория центра должна учитывать размеры препятствия и аппарата.' },
    { number: 58, points: [[0, 0, 5], [0, 12, 5]], component: [0, 2], answer: '5',
        task: 'Подготовьте полигон холмов кнопкой «Подготовить полигон». Первая точка маршрута — (0,0,5): подъём до Z=5 над стартом. Вторая точка — (0,12,5).', hint: 'Набор безопасной высоты происходит до горизонтального участка. Учебный коридор открыт, окружающие холмы помогают оценить выбранный запас.',
        experiment: 'Сравните профиль пути при одновременном наборе высоты и движении.', question: 'Когда набирают высоту перед опасным участком?', right: 'До его пересечения', wrong: 'После столкновения', feedback: 'Запас должен существовать к моменту входа на участок.' },
    { number: 59, points: [[4, 0, 3], [4, 12, 3], [0, 12, 3]], component: [1, 0], answer: '4',
        task: 'Подготовьте городской полигон кнопкой «Подготовить полигон». Здание стоит в точке (0,6). Обойдите его справа через точки (4,0,3), (4,12,3), (0,12,3).', hint: 'Прямая от старта к финишу пересекает здание. Две точки бокового участка дают запас от фасада; высота 3 здесь не заменяет обход.',
        experiment: 'Нарисуйте прямую к финишу и найдите место её пересечения с фасадом.', question: 'Зачем нужны промежуточные точки обхода?', right: 'Изменить путь, сохранив конечную цель', wrong: 'Только увеличить число строк', feedback: 'Промежуточные точки управляют геометрией пути.' },
    { number: 60, points: [[0, 12, 3]], component: [0, 2], answer: '3',
        task: 'Подготовьте промышленный полигон кнопкой «Подготовить полигон». Пройдите центральный коридор к точке (0,12,3).', hint: 'Проверяйте весь отрезок, а не только конечную точку. Пилоны расположены по сторонам свободного прохода.',
        experiment: 'Осмотрите маршрут сверху и сбоку: какие ограничения видны в каждом виде?', question: 'Достаточно ли свободного финиша?', right: 'Нет, свободен должен быть весь путь', wrong: 'Да, препятствия между точками не важны', feedback: 'Столкновение возможно на любом участке траектории.' },
    { number: 61, points: [[-2, -6, 1.18], [0, -6, 1.18], [2, -6, 1.18]], component: [1, 2], answer: '1.18',
        task: 'Подготовьте гоночную трассу кнопкой «Подготовить полигон». Пройдите первые ворота по трём точкам: подход (-2,-6,1.18), центр (0,-6,1.18), выход (2,-6,1.18).', hint: 'Плоскость первых ворот — YZ, поэтому пролетаем по X. Центр кольца находится на высоте 1.18. Подход и выход задают сторону прохода.',
        experiment: 'Сравните центр кольца с центром его общей рамки. Почему высота по картинке на глаз ненадёжна?', question: 'Что подтверждает проход через створ?', right: 'Подход, центр проёма и выход с другой стороны', wrong: 'Зависание в любой точке рядом с воротами', feedback: 'Ворота — проём с направлением пересечения.' },
    { number: 62, points: [[0, 8, 3]], component: [0, 2], answer: '3',
        task: 'Подготовьте лесной полигон, измените seed и подготовьте снова. Осмотрите новую карту, затем выполните знакомый центральный маршрут (0,8,3).', hint: 'Боковая расстановка меняется; центральный свободный коридор — сохранённое ограничение генератора. Поэтому этот маршрут остаётся пригодным после осмотра.',
        experiment: 'Найдите боковую прямую, для которой прежний путь мог бы стать неверным.', question: 'Почему центральный маршрут можно сохранить?', right: 'Генератор гарантирует свободный коридор при любом seed', wrong: 'Любые старые координаты всегда безопасны', feedback: 'Перенос навыка опирается на проверенные ограничения новой карты.' },
    { number: 63, points: [[-3, -12, 3], [-3, 12, 5], [3, 12, 5], [3, -12, 3], [0, 0, 3]], component: [1, 2], answer: '5', land: true,
        task: 'Подготовьте смешанный полигон кнопкой «Подготовить полигон». Пройдите пять точек заготовки по порядку. Северные точки с Y=12 лежат на высоте Z=5. Последняя точка (0,0,3) — возвращение на старт, после неё посадите дрон.', hint: 'Участки проходят внутри гарантированного коридора |X|<5. Для северных участков задана большая высота; каждая точка требует подтверждения. Полный маршрут длиннее предыдущих, дождитесь конца.',
        experiment: 'Перед расширением маршрута вглубь зон осмотрите реальные препятствия. Какие новые точки обхода понадобятся?', question: 'Как расширять экспедицию в разные зоны?', right: 'Разбить путь на проверяемые участки с ограничениями', wrong: 'Отправить одну дальнюю цель сквозь всю карту', feedback: 'План участка связывает цель, высоту, запас и условие завершения.' }
];

/** The texts of an exercise are written once for both languages; each language keeps only its own `<lua>`/`<py>` passages. */
function localizedExercise(spec: FlightExercise, language: 'lua' | 'python'): FlightExercise {
    const keep = (text: string) => localize(text, language);
    return { ...spec, task: keep(spec.task), hint: keep(spec.hint), experiment: keep(spec.experiment), question: keep(spec.question),
        right: keep(spec.right), wrong: keep(spec.wrong), feedback: keep(spec.feedback) };
}

const completion = 'Опыт завершён';
function flightBody(spec: FlightExercise, language: 'lua' | 'python'): string {
    const n = spec.number;
    if (n === 55) return 'print("___")\nprint("Опыт завершён")';
    const lua = language === 'lua';
    const point = (p: FlightPoint, i: number) => p.map((value, component) => spec.component?.[0] === i && spec.component[1] === component ? '___' : String(value));
    const coordinates = spec.points.map(point);
    if (n === 51) coordinates[1] = ['homeX', 'homeY', '1'];
    const before = n === 40 || n === 51 ? lua ? 'local homeX,homeY,homeZ=Sensors.lpsPosition()\nprint("Старт: "..homeX..","..homeY..","..homeZ)\n' : 'homeX,homeY,homeZ=pioneer.get_local_position_lps()\nprint("Старт:",homeX,homeY,homeZ)\n' : '';
    const arrival = (index: number): string => {
        let code = lua ? `print("Точка ${index + 1}")` : `print("Точка ${index + 1}")`;
        if (n === 42) code += lua ? '\nlocal x,y,z=Sensors.lpsPosition(); print("Z="..z.." просвет="..Sensors.range())' : '\nx,y,z=pioneer.get_local_position_lps(); print("Z=",z,"просвет=",pioneer.get_dist_sensor_data())';
        if (n === 44) code += lua ? '\nlocal x=Sensors.lpsPosition(); if math.abs(2-x)<0.15 then print("В допуске") end' : '\nx,y,z=pioneer.get_local_position_lps()\nif abs(2-x)<0.15: print("В допуске")';
        if (n === 46) code += '\nprint("Прибыл")';
        return code;
    };
    if (lua) {
        const finish = spec.land ? 'ap.push(Ev.MCE_LANDING)' : n === 45 ? 'ap.updateYaw(math.pi/2)\nTimer.callLater(2,function() Sensors.lpsPosition(); print("Опыт завершён") end)' : `print("${completion}")`;
        const list = n >= 50 && coordinates.length > 0;
        const timeout = 'local finished=false\nTimer.callLater(360,function() if not finished then print("тайм-аут") end end)\n';
        const progress = list ? `local points={${coordinates.map(p => `{${p.join(',')}}`).join(',')}}\nlocal i=0\nfunction nextPoint()\n    i=i+1\n    if points[i] then ap.goToLocalPoint(points[i][1],points[i][2],points[i][3])\n    else finished=true; ${finish} end\nend\n` : 'local phase=0\n';
        let sample = '';
        if (n === 43) sample = 'local samples=0\nfunction measure()\n    if samples>=40 or finished then return end\n    samples=samples+1\n    local x=Sensors.lpsPosition(); print("Ошибка X: "..(2-x))\n    Timer.callLater(0.5,measure)\nend\n';
        const first = coordinates.length ? list ? 'nextPoint()' : `phase=1; ap.goToLocalPoint(${coordinates[0].join(',')})` : `finished=true; ${finish}`;
        const reached = list ? 'if event==Ev.POINT_REACHED then print("Точка "..i); nextPoint() end' : coordinates.map((_, i) => `if event==Ev.POINT_REACHED and phase==${i + 1} then\n        ${arrival(i).replace(/\n/g, '\n        ')}\n        ${coordinates[i + 1] ? `phase=${i + 2}; ap.goToLocalPoint(${coordinates[i + 1].join(',')})` : `phase=${i + 2}; finished=true; ${finish}`}\n        return\n    end`).join('\n    ');
        return before + timeout + progress + sample + `ap.push(Ev.MCE_PREFLIGHT)\nfunction callback(event)\n    if event==Ev.ENGINES_STARTED then ap.push(Ev.${coordinates.length ? 'MCE_TAKEOFF' : '___'}) end\n    if event==Ev.TAKEOFF_COMPLETE then\n        ${first}\n        ${n === 43 ? 'measure()' : ''}\n    end\n    ${reached}\n    ${spec.land ? `if event==Ev.COPTER_LANDED then print("${completion}") end` : ''}\nend`;
    }
    const wait = `def wait_for(test, limit=360):\n    deadline=time.monotonic()+limit\n    while time.monotonic()<deadline:\n        if test(): return True\n        time.sleep(0.05)\n    raise RuntimeError("тайм-аут ожидания")\n\ndef wait_point():\n    return wait_for(pioneer.point_reached)\n\n`;
    let steps: string;
    if (n >= 50 && coordinates.length) steps = `points=[${coordinates.map(p => `(${p.join(',')})`).join(',')}]\nfor i,point in enumerate(points):\n    pioneer.go_to_local_point(*point)\n    wait_point()\n    print("Точка",i+1)\n`;
    else steps = coordinates.map((p, i) => `pioneer.go_to_local_point(${p.join(',')})\n${n === 43 ? 'deadline=time.monotonic()+40\nwhile not pioneer.point_reached() and time.monotonic()<deadline:\n    x,y,z=pioneer.get_local_position_lps()\n    print("Ошибка X:",2-x)\n    time.sleep(0.5)' : 'wait_point()'}\n${arrival(i)}\n`).join('');
    if (n === 45) steps += 'import math\npioneer.go_to_local_point(0,0,1,yaw=math.pi/2)\nwait_point()\ntime.sleep(2)\npioneer.get_local_position_lps()\n';
    return before + wait + `pioneer.arm()\npioneer.${coordinates.length ? 'takeoff' : '___'}()\nwait_for(lambda:pioneer.get_autopilot_state()=="MISSION")\n` + steps + (spec.land ? 'pioneer.land()\nwait_for(lambda:pioneer.get_autopilot_state()=="DISARMED")\n' : '') + `print("${completion}")`;
}

export function getFlightAcademyPractices(language: 'lua' | 'python') {
    return FLIGHT_EXERCISES.map(spec => {
        const view = localizedExercise(spec, language);
        const lesson = compileAcademyExercise({ ...view, observation: 'Проверка сверяет реальные переходы автопилота, координаты посещённых точек и результат задания.',
            lua: flightBody(spec, 'lua'), python: flightBody(spec, 'python'),
            luaAnswer: spec.answer, pythonAnswer: [37, 56].includes(spec.number) ? 'takeoff' : spec.answer, waitMs: 420000 }, language);
        lesson.academy!.doneMessage = completion;
        lesson.academy!.teaching.device = `${lesson.summary} ${view.hint} Сначала осмотрите подготовленную сцену, затем спрогнозируйте путь. Заготовка повторяет ожидания из предыдущего раздела; измените только отмеченный фрагмент.`;
        lesson.links = [{ label: 'Движение и измерение положения', query: language === 'lua' ? 'ap.goToLocalPoint Sensors.lpsPosition' : 'go_to_local_point get_local_position_lps point_reached' }];
        return lesson;
    });
}

