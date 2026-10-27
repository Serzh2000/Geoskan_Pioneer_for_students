import type { ChapterExamples } from '../example.js';

const L = (...lines: string[]): string => lines.join('\n');

/** Connection of the bottom camera, then take off and hover at Z=3 above the start. */
const HEAD = L('from pioneer_sdk import Pioneer, Camera', 'import time, cv2', 'pioneer = Pioneer(simulator=True)', 'camera = Camera(view="bottom")');
const TAKEOFF = L('pioneer.arm(); pioneer.takeoff()', 'while pioneer.get_autopilot_state() != "MISSION": time.sleep(0.1)');
const REACH = 'while not pioneer.point_reached(): time.sleep(0.1)';
const HOVER = L('pioneer.go_to_local_point(0, 0, 3)', REACH);
const GO = L('def go(x, y, z):', '    pioneer.go_to_local_point(x, y, z)', '    ' + REACH);
const DICTIONARY = L('dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)', 'detector = cv2.aruco.ArucoDetector(dictionary)');
const DETECTOR = 'detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250))';

const LESSON_82 = L(HEAD, TAKEOFF, HOVER, DICTIONARY,
    'frame = camera.get_cv_frame()',
    'corners, ids, _ = detector.detectMarkers(frame)',
    'if ids is not None:',
    '    for value in ids:',
    '        print("Вижу метку с ID", int(value[0]))',
    'cv2.imshow("Метки на полу", frame)');

const LESSON_83 = L(HEAD, TAKEOFF, HOVER,
    'wrong_detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_5X5_100))',
    'right_detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250))',
    'frame = camera.get_cv_frame()',
    '_, ids_wrong, _ = wrong_detector.detectMarkers(frame)',
    '_, ids_right, _ = right_detector.detectMarkers(frame)',
    'print("Словарь 5x5:", [] if ids_wrong is None else [int(v[0]) for v in ids_wrong])',
    'print("Словарь 6x6:", [] if ids_right is None else [int(v[0]) for v in ids_right])',
    'cv2.imshow("Один кадр, два словаря", frame)');

const LESSON_84 = L(HEAD, TAKEOFF, HOVER, DICTIONARY,
    'frame = camera.get_cv_frame()',
    'corners, ids, rejected = detector.detectMarkers(frame)',
    'count = 0 if ids is None else len(ids)',
    'print("Меток найдено:", count, "- наборов углов:", len(corners))',
    'print("ID:", [] if ids is None else [int(v[0]) for v in ids])',
    'cv2.imshow("Первая детекция", frame)');

const LESSON_85 = L(HEAD, GO, TAKEOFF, DETECTOR,
    'for y in [-6, 0]:',
    '    go(0, y, 3)',
    '    frame = camera.get_cv_frame()',
    '    corners, ids, _ = detector.detectMarkers(frame)',
    '    print("Y =", y, "| кадр есть:", frame is not None, "| метки найдены:", ids is not None)');

const LESSON_86 = L(HEAD, TAKEOFF, HOVER, DETECTOR,
    'frame = camera.get_cv_frame()',
    'corners, ids, _ = detector.detectMarkers(frame)',
    'if ids is not None:',
    '    for i, value in enumerate(ids):',
    '        print("В списке на месте", i, "метка ID", int(value[0]))',
    '        if int(value[0]) == 11:',
    '            cv2.aruco.drawDetectedMarkers(frame, [corners[i]], [value])',
    'cv2.imshow("Выбрана метка 11", frame)');

const LESSON_87 = L(HEAD, TAKEOFF, HOVER, DETECTOR,
    'frame = camera.get_cv_frame()',
    'corners, ids, _ = detector.detectMarkers(frame)',
    'if ids is not None:',
    '    print("Углы метки с ID", int(ids[0][0]))',
    '    for k in range(4):',
    '        x, y = int(corners[0][0][k][0]), int(corners[0][0][k][1])',
    '        print("Угол", k, ":", x, y)',
    '        cv2.circle(frame, (x, y), 5, (0, 255, 255), -1)',
    'cv2.imshow("Четыре угла первой метки", frame)');

const LESSON_88 = L(HEAD, TAKEOFF, HOVER, DETECTOR,
    'frame = camera.get_cv_frame()',
    'corners, ids, _ = detector.detectMarkers(frame)',
    'if ids is not None:',
    '    points = corners[0][0]',
    '    cx = sum(float(p[0]) for p in points) / 4',
    '    cy = sum(float(p[1]) for p in points) / 4',
    '    print("ID", int(ids[0][0]), "центр:", round(cx), round(cy))',
    '    cv2.circle(frame, (int(cx), int(cy)), 4, (0, 0, 255), -1)',
    'cv2.imshow("Центр первой метки", frame)');

const LESSON_89 = L(HEAD, TAKEOFF, HOVER, DETECTOR,
    'frame = camera.get_cv_frame()',
    'corners, ids, _ = detector.detectMarkers(frame)',
    'if ids is not None:',
    '    h, w = frame.shape[:2]',
    '    points = corners[0][0]',
    '    cx = sum(float(p[0]) for p in points) / 4',
    '    cy = sum(float(p[1]) for p in points) / 4',
    '    print("ID", int(ids[0][0]), "ошибка X:", round(cx - w / 2), "Y:", round(cy - h / 2))',
    'cv2.imshow("Ошибка центра", frame)');

const LESSON_90 = L(HEAD, GO, TAKEOFF, DETECTOR,
    'go(0, 0, 3)',
    'count = 0',
    'for i in range(8):',
    '    if i == 2: go(0, -6, 3)',
    '    if i == 4: go(0, 0, 3)',
    '    corners, ids, _ = detector.detectMarkers(camera.get_cv_frame())',
    '    count = count + 1 if ids is not None else 0',
    '    print("Кадр", i, "счётчик:", count, "подтверждено" if count >= 3 else "")');

/** Examples of the chapter, by lesson number. */
export const ARUCO_EXAMPLES: ChapterExamples = {
    82: {
        theory: [
            '**ArUco** - это квадратная чёрно-белая метка, похожая на упрощённый QR-код. Рисунок внутри квадрата кодирует число - **ID**. ID работает как номер на футболке: он только называет метку.',
            'ID не расстояние и не координата. Метка с номером 12 не дальше метки с номером 10; по числу ничего нельзя узнать о том, где она лежит. Положение берут из кадра, а ID говорит, какая это метка.',
            'Детектор возвращает `ids` - список найденных ID. Каждый элемент - короткий список из одного числа, поэтому число достают как `int(value[0])`. Первые две строки подготовки пока считаем заготовкой, их разберём в следующих уроках.'
        ],
        python: LESSON_82,
        steps: [
            { python: DICTIONARY, text: 'Подготовка детектора: словарь рисунков и сам детектор. Подробнее о ней - в следующих уроках.' },
            { python: 'corners, ids, _ = detector.detectMarkers(frame)', text: 'Просим детектор найти метки в кадре; нам сейчас нужен только список `ids`.' },
            { python: '    for value in ids:\n        print("Вижу метку с ID", int(value[0]))', text: 'Проходим по найденным ID и печатаем каждое число; `value[0]` достаёт его из короткого списка.' },
            { python: 'cv2.imshow("Метки на полу", frame)', text: 'Показываем тот же кадр, в котором искали метки: сравните то, что видите, с журналом.' }
        ],
        watch: 'В журнале три строки «Вижу метку с ID» с номерами 10, 11 и 12 (в каком-то порядке) - столько меток лежит на полу в кадре.'
    },
    83: {
        theory: [
            '**Словарь** - это набор рисунков, которые детектор умеет узнавать. `DICT_6X6_250` значит: рисунок из клеток 6 на 6 и 250 разных номеров. Бывают и словари 4x4, 5x5, 7x7 с другим числом номеров.',
            'Метку нарисовали по одному словарю, а искать её нужно по тому же. Детектор со словарём 5x5 не узнает рисунок 6x6, и он вернёт пустой результат, хотя на картинке метки ясно видны.',
            'Это ещё одно отличие «не вижу» от «нет»: глазами метка есть, а по правилам этого словаря - нет. Поэтому словарь в программе должен совпадать со словарём меток на полигоне.'
        ],
        python: LESSON_83,
        steps: [
            { python: 'wrong_detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_5X5_100))', text: 'Первый детектор настроен на словарь 5x5, которого нет у наших меток.' },
            { python: 'right_detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250))', text: 'Второй детектор использует `DICT_6X6_250` - словарь учебных меток.' },
            { python: '_, ids_wrong, _ = wrong_detector.detectMarkers(frame)', text: 'Запускаем неподходящий детектор на кадре; углы и отбракованные кандидаты не нужны, их кладём в `_`.' },
            { python: '_, ids_right, _ = right_detector.detectMarkers(frame)', text: 'Запускаем подходящий детектор на том же самом кадре - картинка у них одна.' }
        ],
        watch: 'В журнале «Словарь 5x5: []» и «Словарь 6x6: [10, 11, 12]» (порядок может быть другим): кадр один, а результат зависит от словаря.'
    },
    84: {
        theory: [
            '`detector.detectMarkers(frame)` ищет метки и возвращает три значения: `corners` - углы каждой метки, `ids` - их ID и `rejected` - фигуры, похожие на метки, но отброшенные. Последнее нам обычно не нужно.',
            'Данные идут парами: у метки с ID `ids[i]` углы лежат в `corners[i]`. Поэтому длины списков совпадают. Если метки не найдены, `ids` равен `None`, а `corners` - пустой набор.',
            'Детекция - это только измерение. Она ничего не отправляет дрону: что делать с найденными метками, решает наша программа, а на этом шаге мы просто смотрим на результат.'
        ],
        python: LESSON_84,
        steps: [
            { python: 'corners, ids, rejected = detector.detectMarkers(frame)', text: 'Один вызов даёт все три результата; назвали их своими именами, чтобы увидеть, что где.' },
            { python: 'count = 0 if ids is None else len(ids)', text: 'Если `ids` пуст, меток ноль; иначе считаем их по длине списка.' },
            { python: 'print("Меток найдено:", count, "- наборов углов:", len(corners))', text: 'Печатаем оба числа рядом: число меток и число наборов углов должны совпасть.' },
            { python: 'print("ID:", [] if ids is None else [int(v[0]) for v in ids])', text: 'Превращаем `ids` в обычный список чисел; если меток нет, печатаем пустой список.' }
        ],
        watch: 'В журнале «Меток найдено: 3 - наборов углов: 3» и список из ID 10, 11, 12; дрон при этом висит неподвижно над стартом.'
    },
    85: {
        theory: [
            'Пустой результат - нормальный исход. Если в кадре нет ни одной подходящей метки, `ids` равен `None`, но сам кадр при этом есть и программа не ломается.',
            'Не смешивайте два случая. Если `frame` равен `None`, то нет самой картинки (урок 81). Если же `ids` равен `None`, то картинка есть, а меток на ней нет. Это разные проверки.',
            'Так программа может искать метку: посмотрела в кадр, ничего не нашла, сообщила «меток нет» и перелетела дальше. Поиск ограничивают числом шагов, чтобы он не длился вечно.'
        ],
        python: LESSON_85,
        steps: [
            { python: 'for y in [-6, 0]:', text: 'Проверим две точки: сначала далеко от меток (`Y = -6`), потом над стартом.' },
            { python: '    go(0, y, 3)', text: 'Перелетаем в очередную точку на той же высоте 3 м.' },
            { python: '    corners, ids, _ = detector.detectMarkers(frame)', text: 'Ищем метки в только что снятом кадре.' },
            { python: 'print("Y =", y, "| кадр есть:", frame is not None, "| метки найдены:", ids is not None)', text: 'Печатаем оба факта отдельно: кадр есть всегда, а метки - только над ними.' }
        ],
        watch: 'Дрон летит на 6 м в сторону от меток: журнал пишет «Y = -6 | кадр есть: True | метки найдены: False». Потом он возвращается: «Y = 0 ... метки найдены: True».'
    },
    86: {
        theory: [
            'В кадр может попасть несколько меток, и детектор выдаёт их в произвольном порядке. Нельзя считать, что нужная метка первая: порядок может поменяться от кадра к кадру.',
            'Нужную метку выбирают по ID. `enumerate(ids)` даёт пары «номер места `i`, значение `value`», и для каждой мы сравниваем `int(value[0])` с нужным числом.',
            'Углы выбранной метки лежат под тем же номером: `corners[i]`. Поэтому `i` сохраняют и используют, например, чтобы обвести рамкой именно её с помощью `cv2.aruco.drawDetectedMarkers`.'
        ],
        python: LESSON_86,
        steps: [
            { python: '    for i, value in enumerate(ids):', text: '`enumerate` на каждом шаге отдаёт номер места `i` и ID в `value`.' },
            { python: '        print("В списке на месте", i, "метка ID", int(value[0]))', text: 'Печатаем, на каком месте в списке стоит какая метка: так видно, что порядок не равен ID.' },
            { python: '        if int(value[0]) == 11:', text: 'Выбираем нужную метку по ID, а не по месту в списке.' },
            { python: '            cv2.aruco.drawDetectedMarkers(frame, [corners[i]], [value])', text: 'Обводим рамкой только выбранную метку; её углы берём по тому же номеру `i`.' }
        ],
        watch: 'В журнале три строки «В списке на месте ... метка ID ...», а в окне зелёной рамкой обведена только метка 11; остальные метки остались без рамки.'
    },
    87: {
        theory: [
            'Детектор находит не только ID, но и **четыре угла** метки. Они лежат в `corners`: у метки с номером `i` это `corners[i][0]`, то есть четыре пары чисел `(x, y)`.',
            'Углы заданы в **пикселях изображения**, а не в метрах: это положение точек на картинке. Обход идёт по кругу, начиная с левого верхнего угла самой метки.',
            'Чтобы не усложнять пример, берём первую найденную метку (выбор по ID вы уже умеете). Четыре угла дают нам всю геометрию квадрата на картинке.'
        ],
        python: LESSON_87,
        steps: [
            { python: '    print("Углы метки с ID", int(ids[0][0]))', text: 'Сначала называем метку, чьи углы выведем: берём первую в списке.' },
            { python: '    for k in range(4):', text: 'Углов всегда четыре, поэтому цикл идёт от 0 до 3.' },
            { python: '        x, y = int(corners[0][0][k][0]), int(corners[0][0][k][1])', text: 'Берём `k`-й угол первой метки: первый индекс - метка, затем четыре угла, потом `x` или `y`.' },
            { python: '        cv2.circle(frame, (x, y), 5, (0, 255, 255), -1)', text: 'Ставим жёлтую точку на каждом угле, чтобы проверить координаты глазами.' }
        ],
        watch: 'На кадре четыре жёлтые точки сидят на углах одной метки, а в журнале четыре пары координат в пикселях.'
    },
    88: {
        theory: [
            'Центр метки - это среднее её углов. Берём четыре координаты `x` и делим их сумму на 4, потом то же делаем с четырьмя `y`.',
            'Запись `sum(float(p[0]) for p in points) / 4` читается так: сложить `x` каждого угла и разделить на число углов. Дробное значение оставляем как есть, а округляем только при рисовании точки.',
            'Центр метки сравнивают с центром кадра: это следующий шаг к наведению. А пока проверяем себя, рисуя вычисленную точку прямо на кадре.'
        ],
        python: LESSON_88,
        steps: [
            { python: '    points = corners[0][0]', text: 'Берём четыре угла первой найденной метки: четыре пары `(x, y)`.' },
            { python: '    cx = sum(float(p[0]) for p in points) / 4', text: 'Складываем все `x` и делим на 4: это координата центра по ширине.' },
            { python: '    cy = sum(float(p[1]) for p in points) / 4', text: 'Так же для `y`: сумма четырёх высот, делённая на 4.' },
            { python: '    cv2.circle(frame, (int(cx), int(cy)), 4, (0, 0, 255), -1)', text: 'Рисуем красную точку в центре; для рисования координаты округляем до целых.' }
        ],
        watch: 'Красная точка стоит точно в середине квадрата метки, а в журнале видны ID и координаты центра в пикселях.'
    },
    89: {
        theory: [
            '**Ошибка** по каждой оси - это центр метки минус центр кадра: `ex = cx - w / 2` и `ey = cy - h / 2`. Она говорит, насколько метка отстоит от середины картинки.',
            'Знак показывает сторону. Если `ex` больше нуля, метка правее центра, если меньше нуля - левее. Ось `y` идёт вниз, поэтому метка выше середины даёт отрицательное `ey`, а ниже - положительное.',
            'Ошибка измеряется в пикселях, это ещё не команда движения. Её знак и размер пригодятся в следующей главе, когда мы будем наводить дрон на метку.'
        ],
        python: LESSON_89,
        steps: [
            { python: '    h, w = frame.shape[:2]', text: 'Нужны размеры кадра, чтобы найти его центр: `w / 2` и `h / 2`.' },
            { python: '    cx = sum(float(p[0]) for p in points) / 4', text: 'Центр метки по ширине, как в прошлом уроке.' },
            { python: 'round(cx - w / 2)', text: 'Ошибка по `X`: центр метки минус центр кадра; положительная, если метка справа.' },
            { python: 'round(cy - h / 2)', text: 'Ошибка по `Y`: положительная, если метка ниже середины, и отрицательная, если выше.' }
        ],
        watch: 'В журнале одна строка с ошибкой по X и Y первой метки; метка слева от центра даёт отрицательный X, выше центра - отрицательный Y, а дрон не двигается.'
    },
    90: {
        theory: [
            'Один кадр ненадёжен: метка могла попасть в него случайно или появиться на миг. Для устойчивого решения метку подтверждают в нескольких кадрах подряд.',
            'Для этого заводят счётчик. Если метка видна, он растёт на 1, а если потеряна - сбрасывается в 0. Запись `count = count + 1 if ids is not None else 0` делает оба действия сразу.',
            'Важно именно подряд. Сумма за весь полёт ничего не доказывает: две удачи до потери и две после дадут четыре, хотя три кадра подряд ни разу не набрались.'
        ],
        python: LESSON_90,
        steps: [
            { python: 'count = 0', text: 'Счётчик подряд идущих обнаружений начинает с нуля.' },
            { python: '    if i == 2: go(0, -6, 3)', text: 'На третьем кадре дрон нарочно улетает от меток, чтобы увидеть потерю цели.' },
            { python: '    if i == 4: go(0, 0, 3)', text: 'На пятом кадре возвращается к старту, и метки снова попадают в кадр.' },
            { python: '    count = count + 1 if ids is not None else 0', text: 'Метка видна - счётчик растёт, потеряна - обнуляется.' }
        ],
        watch: 'Счётчик в журнале идёт так: 1, 2, 0, 0, 1, 2, 3, 4; слово «подтверждено» появляется только после трёх кадров подряд, уже после возвращения.'
    }
};
