import { DONE_LINE, FLY_TO, flightProgram, type Sdk2Mission } from './sdk2-mission-kit.js';

/** Блоки 10–13: камера и видео, сервопривод и запись, метки ArUco, итоговый патруль. */
const J = { group: 'camera', groupTitle: '10. Камера и ImageViewer' };
const K = { group: 'servo', groupTitle: '11. Сервопривод камеры и запись' };
const L = { group: 'aruco', groupTitle: '12. Метки ArUco' };
const M = { group: 'patrol', groupTitle: '13. Итоговый патруль' };

const CAMERA_HEAD = 'from pioneer_sdk2 import Pioneer, Camera, CameraType\nimport time\n\npioneer = Pioneer()\n';
const VIEWER_HEAD = 'from pioneer_sdk2 import Pioneer, Camera, ImageViewer\nimport cv2\nimport time\n\npioneer = Pioneer()\n';
const ARUCO_HEAD = 'from pioneer_sdk2 import Pioneer, Camera, CameraType\nimport cv2\nimport time\n\npioneer = Pioneer()\n';
const ARUCO_BEFORE = `camera = Camera(CameraType.OPT)    # нижняя камера смотрит на пол
detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250))
${FLY_TO}`;

/** Последняя детекция, где нашлись метки: [идентификаторы, углы метки 12, номер кадра]. */
const lastDetection = (events: Array<{ kind: string; markers?: Array<{ id: number; corners: Array<[number, number]> }>; frameId?: number; dictionary?: string }>) =>
    [...events].reverse().find((event) => event.kind === 'detect' && event.markers?.length && event.dictionary === 'DICT_6X6_250');

export const VISION_MISSIONS: Sdk2Mission[] = [
    {
        ...J, id: 'sdk2-camera-frame', title: 'Первый кадр',
        goal: 'Получить кадр основной камеры и узнать его размер.',
        steps: [
            '`Camera()` подключает основную (переднюю) камеру Мини 2. Кадр — это изображение в формате OpenCV: массив пикселей с формой (высота, ширина, 3).',
            'Метод `get_cv_frame()` ждёт следующий кадр и возвращает его. Если камера не успела, он выбрасывает `TimeoutError`.',
            'Вместо `___` впишите имя метода камеры, который возвращает кадр: `get_cv_frame`.',
            'Камеру в конце нужно остановить: `camera.stop()` стоит в `finally`. Нажмите «Проверить полёт»: в журнале ширина и высота кадра.'
        ],
        hint: 'Название метода: get_ + cv + _frame. У результата атрибут shape: первое число — высота, второе — ширина.',
        outcome: 'Программа получила настоящий кадр симулятора. Дальше с ним работает OpenCV: рисование, поиск цвета и меток.',
        starter: `${CAMERA_HEAD}camera = Camera()

try:
    frame = camera.___()
    height, width = frame.shape[:2]
    print("Размер кадра:", width, height)
finally:
    camera.stop()
    pioneer.close_connection()
${DONE_LINE}`,
        answers: ['get_cv_frame'], waitMs: 60000,
        check: (g) => {
            g.basics(false).noArm();
            const frame = g.cameraFrames()[0];
            if (!frame) { g.fail('Кадр не получен', 'Камера не отдала ни одного кадра.', 'Вызовите camera.get_cv_frame().'); return; }
            if (frame.view && frame.view !== 'front') g.fail('Это не основная камера', `Кадр снят камерой «${frame.view}».`, 'Используйте Camera() или Camera(CameraType.MAIN).');
            const size = g.numbers('Размер кадра:');
            if (!size || size[0] !== frame.width || size[1] !== frame.height) g.fail('Размер в журнале не совпал с кадром', `Кадр ${frame.width}×${frame.height}, напечатано: ${size ? size.join(' × ') : 'ничего'}.`, 'Печатайте ширину, затем высоту: width, height из frame.shape.');
        }
    },
    {
        ...J, id: 'sdk2-two-cameras', title: 'Две камеры',
        goal: 'У Мини 2 две камеры: основная смотрит вперёд, нижняя — на пол. Снять кадр каждой.',
        steps: [
            '`Camera(CameraType.MAIN)` — основная камера (по умолчанию), `Camera(CameraType.OPT)` — нижняя, для оптического потока и меток на полу.',
            'Камеры создаются по очереди: сначала основная снимает кадр и останавливается, потом создаётся нижняя. В симуляторе у дрона один видеоканал, и кадры идут с камеры, созданной последней, поэтому две камеры сразу не включают.',
            'Вместо `___` впишите вторую камеру: `OPT`. Нажмите «Проверить полёт»: журнал должен показать два размера.'
        ],
        hint: 'OPT — от optical flow: нижняя камера. MAIN — основная.',
        outcome: 'Вы выбираете камеру под задачу: вперёд — для обзора, вниз — для посадки на метку и навигации по полу.',
        starter: `${CAMERA_HEAD}
try:
    main = Camera(CameraType.MAIN)
    frame = main.get_cv_frame()
    height, width = frame.shape[:2]
    print("Основная:", width, height)
    main.stop()

    down = Camera(CameraType.___)
    frame = down.get_cv_frame()
    height, width = frame.shape[:2]
    print("Нижняя:", width, height)
    down.stop()
finally:
    pioneer.close_connection()
${DONE_LINE}`,
        answers: ['OPT'], waitMs: 60000,
        check: (g) => {
            g.basics(false).noArm();
            const views = new Set(g.cameraFrames().map((event) => event.view));
            if (!views.has('front')) g.fail('Нет кадра основной камеры', 'Не снят кадр передней камеры.', 'Camera(CameraType.MAIN) и get_cv_frame().');
            if (!views.has('bottom')) g.fail('Нет кадра нижней камеры', 'Не снят кадр нижней камеры.', 'Вторая камера — Camera(CameraType.OPT).');
            if (g.numbers('Основная:') === null || g.numbers('Нижняя:') === null) g.fail('Не напечатаны размеры', 'Должны быть строки «Основная:» и «Нижняя:».', 'Печатайте name + ":" и размеры кадра.');
        }
    },
    {
        ...J, id: 'sdk2-viewer', title: 'Видео с подписью',
        goal: 'Показать в окне пять кадров камеры с подписью. В симуляторе окно открывает ImageViewer.',
        steps: [
            '`ImageViewer().imshow(имя, кадр)` показывает кадр: на дроне — потоком в браузер, в симуляторе — окном на экране.',
            'Перед показом на кадре можно рисовать средствами OpenCV: `cv2.putText` ставит подпись.',
            'Вместо `___` впишите метод показа: `imshow`.',
            'Нажмите «Проверить полёт»: в окне пять кадров, подпись «frame 0 … frame 4», в журнале «Показано: 5».'
        ],
        hint: 'Метод показа называется как в OpenCV: imshow. Окно откроется поверх сцены.',
        outcome: 'Кадр можно показать и подписать. Так выводят телеметрию на видео и отлаживают алгоритмы зрения.',
        starter: `${VIEWER_HEAD}camera = Camera()
viewer = ImageViewer()

try:
    for i in range(5):
        frame = camera.get_cv_frame()
        cv2.putText(frame, "frame " + str(i), (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        viewer.___("osd", frame)
        time.sleep(0.1)
    print("Показано:", 5)
finally:
    viewer.close()
    camera.stop()
    pioneer.close_connection()
${DONE_LINE}`,
        answers: ['imshow'], waitMs: 60000,
        check: (g) => {
            g.basics(false).noArm();
            const shown = g.events.filter((event) => event.kind === 'display').length;
            if (shown < 5) g.fail('Кадры не показаны', `В окне показано кадров: ${shown}, нужно 5.`, 'Вызывайте viewer.imshow("osd", frame) в цикле для каждого кадра.');
            g.expectText('Показано:', '5', 'Оставьте print("Показано:", 5) после цикла.');
        }
    },
    {
        ...K, id: 'sdk2-servo', title: 'Наклон камеры',
        goal: 'Наклонять камеру сервоприводом в допустимом диапазоне и обработать недопустимый угол.',
        steps: [
            '`ServoCamera().set_angle(градусы)` наклоняет камеру: 0 — прямо, отрицательные углы — вниз (до -80), положительные — вверх (до 30). Метод возвращает True, когда команда принята.',
            'Угол вне диапазона — ошибка `ValueError`. Её ловят `try/except`, чтобы программа не упала.',
            'Вместо `___` впишите угол вне диапазона: 45. Нажмите «Проверить полёт».',
            'В журнале четыре строки «Угол …: True» и строка «Угол 45 отклонён». В конце камера возвращается в 0.'
        ],
        hint: 'Верхний предел — 30°. Значение 45 больше предела, поэтому set_angle выбросит ValueError.',
        outcome: 'Вы наклоняете камеру и защищаете программу от неверного угла.',
        starter: `from pioneer_sdk2 import Pioneer, ServoCamera
import time

pioneer = Pioneer()
servo = ServoCamera()

try:
    for angle in (0, -30, -60, -80):
        ok = servo.set_angle(angle)
        print(f"Угол {angle}: {ok}")
        time.sleep(1)
    try:
        servo.set_angle(___)
    except ValueError:
        print("Угол 45 отклонён")
finally:
    servo.set_angle(0)
    pioneer.close_connection()
${DONE_LINE}`,
        answers: ['45'], waitMs: 60000,
        check: (g) => {
            g.basics(false).noArm();
            g.order(['Угол 0: True', 'Угол -30: True', 'Угол -60: True', 'Угол -80: True', 'Угол 45 отклонён'], 'Наклоняйте камеру на 0, -30, -60, -80 и поймайте ValueError при 45.');
        }
    },
    {
        ...K, id: 'sdk2-recorder', title: 'Запись и фото',
        goal: 'Начать и остановить запись видео, сделать фото и защититься от повторного старта.',
        steps: [
            '`RecorderControl` управляет записью камеры в память дрона: `start_recording`, `stop_recording`, `take_photo`. В симуляторе файлы не создаются, но команды проверяются так же, как на дроне.',
            'Повторный `start_recording` при идущей записи — ошибка `RuntimeError`: её нужно ловить.',
            'Вместо `___` впишите метод остановки записи: `stop_recording`.',
            'Нажмите «Проверить полёт»: «Старт: True», «Повторный старт отклонён», «Стоп: True», «Фото: True».'
        ],
        hint: 'Остановка записи — stop_recording. Он возвращает True, если запись шла.',
        outcome: 'Вы управляете записью: старт, стоп, фото, защита от повторного старта.',
        starter: `from pioneer_sdk2 import Pioneer, RecorderControl, CameraType
import time

pioneer = Pioneer()
recorder = RecorderControl()

try:
    print("Режимы:", recorder.get_camera_recording_configs(CameraType.MAIN))
    print("Старт:", recorder.start_recording(CameraType.MAIN))
    try:
        recorder.start_recording(CameraType.MAIN)
    except RuntimeError:
        print("Повторный старт отклонён")
    time.sleep(2)
    print("Стоп:", recorder.___(CameraType.MAIN))
    print("Фото:", recorder.take_photo("test.jpg"))
finally:
    pioneer.close_connection()
${DONE_LINE}`,
        answers: ['stop_recording'], waitMs: 60000,
        check: (g) => {
            g.basics(false).noArm();
            g.order(['Старт: True', 'Повторный старт отклонён', 'Стоп: True', 'Фото: True'], 'Запустите запись, поймайте RuntimeError при повторе, остановите запись и сделайте фото.');
            if (g.text('Режимы:') === null || !g.text('Режимы:')!.includes('1280')) g.fail('Режимы записи не напечатаны', 'Нет списка режимов основной камеры.', 'Выведите get_camera_recording_configs(CameraType.MAIN).');
        }
    },
    {
        ...L, id: 'sdk2-aruco-find', title: 'Поиск метки ArUco',
        scene: 'markers',
        goal: 'Подняться над метками на полу, снять кадр нижней камерой и найти номера меток.',
        steps: [
            'ArUco-метка — квадратный чёрно-белый рисунок, в который закодирован номер (ID). Детектор получает кадр и возвращает углы и ID найденных меток; если меток нет, ID равно `None`.',
            'Метки на полу видит нижняя камера. На высоте 3 м в кадре сразу несколько меток; вам нужна метка с ID 12.',
            'Вместо `___` впишите метод детектора, который ищет метки: `detectMarkers`.',
            'Нажмите «Проверить полёт»: «Найдены:» со списком номеров и «Цель найдена» для метки 12.'
        ],
        hint: 'Детектор называется ArucoDetector, у него метод detectMarkers (с большой буквы M). Он возвращает три значения: углы, номера и отбракованные.',
        outcome: 'Дрон «видит» метки: программа знает их номера. Это основа точной посадки и навигации по меткам.',
        starter: flightProgram({ head: ARUCO_HEAD, before: `\n${ARUCO_BEFORE}`, body: 'fly_to(0, 0, 3)\ntime.sleep(1.5)    # корпус успокаивается\nframe = camera.get_cv_frame()\ncorners, ids, rejected = detector.___(frame)\nfound = [] if ids is None else [int(value[0]) for value in ids]\nprint("Найдены:", found)\nif 12 in found:\n    print("Цель найдена")' }),
        answers: ['detectMarkers'], waitMs: 150000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const detection = lastDetection(g.events);
            if (!detection) { g.fail('Детектор не нашёл метки', 'Ни в одном кадре детекция не нашла метки словаря DICT_6X6_250.', 'Поднимитесь на 3 м над стартом и вызовите detectMarkers для свежего кадра нижней камеры.'); return; }
            const seen = detection.markers!.map((marker) => marker.id).sort((a, b) => a - b);
            const printed = (g.numbers('Найдены:') ?? []).slice().sort((a, b) => a - b);
            if (seen.join() !== printed.join()) g.fail('Номера в журнале не совпали с кадром', `Детектор видел: ${seen.join(', ')}; напечатано: ${printed.join(', ') || 'ничего'}.`, 'Печатайте номера из ids: int(value[0]).');
            if (seen.includes(12) && g.text('Цель найдена') === null) g.fail('Цель не отмечена', 'Метка 12 в кадре есть, а строки «Цель найдена» нет.', 'Проверьте условие 12 in found.');
        }
    },
    {
        ...L, id: 'sdk2-aruco-center', title: 'Где метка в кадре',
        scene: 'markers',
        goal: 'Найти центр метки 12 и ошибку: насколько он смещён от центра кадра. По этой ошибке дрон потом наводится на метку.',
        steps: [
            'Центр метки — среднее четырёх её углов: отдельно по X и по Y. Центр кадра — половина ширины и половина высоты.',
            'Ошибка = центр метки − центр кадра. Положительная по X — метка правее центра, положительная по Y — ниже.',
            'Вместо двух `___` впишите делители: 4 (углов у метки) и 2 (для центра кадра).',
            'Нажмите «Проверить полёт»: «Ошибка:» с двумя числами, они совпадут с геометрией кадра.'
        ],
        hint: 'Сумма четырёх координат делится на 4. Половина ширины кадра — w / 2.',
        outcome: 'Вы измерили, где метка относительно центра кадра: это вход для регулятора, который выравнивает дрон над меткой.',
        starter: flightProgram({ head: ARUCO_HEAD, before: `\n${ARUCO_BEFORE}`, body: `fly_to(0, 0, 3)
time.sleep(1.5)
frame = camera.get_cv_frame()
h, w = frame.shape[:2]
corners, ids, rejected = detector.detectMarkers(frame)
if ids is not None:
    for i, value in enumerate(ids):
        if int(value[0]) == 12:
            points = corners[i][0]
            cx = sum(float(p[0]) for p in points) / ___
            cy = sum(float(p[1]) for p in points) / 4
            ex = cx - w / ___
            ey = cy - h / 2
            print("Ошибка:", round(ex, 1), round(ey, 1))` }),
        answers: ['4', '2'], waitMs: 150000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const detection = lastDetection(g.events);
            const marker = detection?.markers?.find((item) => item.id === 12);
            const frame = g.cameraFrames().find((event) => event.frameId === detection?.frameId);
            if (!marker || !frame) { g.fail('Метка 12 не найдена', 'Детектор не нашёл метку 12 в кадре.', 'Поднимитесь на 3 м над стартом и передайте свежий кадр нижней камеры в detectMarkers.'); return; }
            const cx = marker.corners.reduce((sum, p) => sum + p[0], 0) / 4;
            const cy = marker.corners.reduce((sum, p) => sum + p[1], 0) / 4;
            const expected = [cx - (frame.width ?? 0) / 2, cy - (frame.height ?? 0) / 2];
            const printed = g.numbers('Ошибка:');
            if (!printed || printed.length < 2) g.fail('Нет строки «Ошибка:»', 'Не напечатаны два числа.', 'Выведите ex и ey через print("Ошибка:", ...).');
            else if (Math.abs(printed[0] - expected[0]) > 2 || Math.abs(printed[1] - expected[1]) > 2) g.fail('Ошибка посчитана неверно', `Ожидалось около ${expected.map((v) => v.toFixed(1)).join(' и ')}, напечатано ${printed.slice(0, 2).join(' и ')}.`, 'Центр метки — среднее четырёх углов (делите на 4), центр кадра — w/2 и h/2.');
        }
    },
    {
        ...M, id: 'sdk2-patrol', title: 'Патруль периметра',
        goal: 'Итоговый проект: облететь периметр два раза, сигналя светодиодами, считая круги и защищаясь от низкого заряда.',
        steps: [
            'Объедините всё: подключение с `try/finally`, взлёт, маршрут по списку точек, события, подсветка, посадка.',
            'Периметр — квадрат (1, 0), (1, 1), (0, 1), (0, 0) на высоте 1.2 м. Два круга. Перед каждой вершиной светодиод синий, на вершине — зелёный на секунду.',
            'Каждую вершину печатайте строкой «Круг N, вершина M». Если сработало событие `LOW_VOLTAGE1`, патруль прерывается и дрон садится.',
            'В заготовке есть подписка, функция `fly_to` и каркас полёта. Допишите цикл патруля на месте TODO.',
            'Нажмите «Проверить полёт»: восемь вершин, синие и зелёные сигналы, посадка и строка «Патруль завершён».'
        ],
        hint: 'Два вложенных цикла: по кругам (`for lap in range(1, 3)`) и по вершинам (`for number, (x, y) in enumerate(PERIMETER, start=1)`). Синий — перед fly_to, зелёный — после него.',
        outcome: 'Вы написали законченную программу патруля: данные маршрута, события, сигналы и безопасное завершение. Это уровень реального проекта.',
        starter: flightProgram({ head: 'from pioneer_sdk2 import Pioneer, Event\nimport time\n\npioneer = Pioneer()\n', before: `
PERIMETER = [(1, 0), (1, 1), (0, 1), (0, 0)]
HEIGHT = 1.2
LAPS = 2
flags = {"low_battery": False}


def on_event(event):
    if event == Event.LOW_VOLTAGE1:
        flags["low_battery"] = True


pioneer.subscribe(on_event)
${FLY_TO}`, body: '# TODO: два круга по PERIMETER.\n# Перед fly_to — синий светодиод, после — зелёный на 1 с.\n# Печатайте "Круг N, вершина M". Если flags["low_battery"] — прервите патруль (break).\nprint("Патруль завершён")' }),
        solution: flightProgram({ head: 'from pioneer_sdk2 import Pioneer, Event\nimport time\n\npioneer = Pioneer()\n', before: `
PERIMETER = [(1, 0), (1, 1), (0, 1), (0, 0)]
HEIGHT = 1.2
LAPS = 2
flags = {"low_battery": False}


def on_event(event):
    if event == Event.LOW_VOLTAGE1:
        flags["low_battery"] = True


pioneer.subscribe(on_event)
${FLY_TO}`, body: `for lap in range(1, LAPS + 1):
    for number, (x, y) in enumerate(PERIMETER, start=1):
        if flags["low_battery"]:
            break
        pioneer.led_control(r=0, g=0, b=1)
        fly_to(x, y, HEIGHT)
        pioneer.led_control(r=0, g=1, b=0)
        print(f"Круг {lap}, вершина {number}")
        time.sleep(1)
    if flags["low_battery"]:
        break
pioneer.led_control()
print("Патруль завершён")` }),
        waitMs: 300000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const lap = [[1, 0, 1.2], [1, 1, 1.2], [0, 1, 1.2], [0, 0, 1.2]] as Array<[number, number, number]>;
            g.route([...lap, ...lap]);
            g.order(['Круг 1, вершина 1', 'Круг 1, вершина 4', 'Круг 2, вершина 1', 'Круг 2, вершина 4', 'Патруль завершён'], 'Печатайте "Круг N, вершина M" на каждой вершине и в конце — «Патруль завершён».');
            const colors = g.ledSequence(0);
            const greens = colors.filter((color) => color === 'green').length;
            if (!colors.includes('blue') || greens < 8) g.fail('Сигналы патруля неполные', `Зелёных вспышек ${greens}, нужно 8 (по вершине); синий ${colors.includes('blue') ? 'был' : 'не включался'}.`, 'Синий перед fly_to, зелёный после, на каждой вершине.');
        }
    }
];
