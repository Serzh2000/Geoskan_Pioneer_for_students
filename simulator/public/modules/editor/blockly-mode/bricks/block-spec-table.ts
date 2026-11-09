/* Таблица блоков Bricks (Мини 2): см. описание в block-specs.ts. */
import { AI_MODELS, ARUCO_FAMILIES, POSE_CHOICES, RANGER_SIDES, YOLO_CLASSES } from './constants.js';
import type { BricksBlockSpec, BricksPart } from './block-spec-types.js';

const n = (input: string, value = 0): BricksPart => ({ input, shadow: { type: 'math_number', value } });
const t = (input: string, value: string): BricksPart => ({ input, shadow: { type: 'text', value } });
const v = (input: string): BricksPart => ({ input });

const IMAGE_SIZE_CHOICES = [['width', 'ширину'], ['height', 'высоту']] as const;
const ROTATE_CHOICES = [
    ['ROTATE_90_CLOCKWISE', '90 по часовой стрелке'],
    ['ROTATE_180', '180'],
    ['ROTATE_90_COUNTERCLOCKWISE', '90 против часовой стрелки']
] as const;
const FLIP_CHOICES = [['1', 'вертикальной оси'], ['0', 'горизонтальной оси']] as const;

export const BRICKS_SPECS: BricksBlockSpec[] = [
    // ---------------- Полёт ----------------
    {
        type: 'preflight', category: 'flight', kind: 'statement', parts: ['Предполётная подготовка'],
        tooltip: 'Запускает двигатели и готовит дрон к взлёту.', python: 'pioneer.arm()'
    },
    {
        type: 'take_off', category: 'flight', kind: 'statement', parts: ['Взлет'],
        tooltip: 'Взлёт. Блок ждёт, пока дрон поднимется.', python: 'pioneer.takeoff()'
    },
    {
        type: 'landing', category: 'flight', kind: 'statement', parts: ['Посадка'],
        tooltip: 'Посадка. Блок ждёт, пока дрон сядет.', python: 'pioneer.land()'
    },
    {
        type: 'disarm', category: 'flight', kind: 'statement', parts: ['Заглушить двигатели'],
        tooltip: 'Останавливает двигатели.', python: 'pioneer.disarm()'
    },
    {
        type: 'go_local_point', category: 'flight', kind: 'statement',
        parts: ['Лететь в локальные координаты X', n('X', 1), 'Y', n('Y', 1), 'Z', n('Z', 1), 'Угол поворота', n('YAW'), 'Желаемое время', n('TIME')],
        tooltip: 'Летит в точку относительно старта (метры, угол в градусах). Блок не ждёт прилёта: после него поставьте «Ожидать достижения точки».',
        python: 'pioneer.go_to_local_point(x,y,z,yaw,time)'
    },
    {
        type: 'go_local_point_bf', category: 'flight', kind: 'statement',
        parts: ['Сместиться на локальные координаты X', n('X'), 'Y', n('Y'), 'Z', n('Z'), 'Угол поворота', n('YAW'), 'Желаемое время', n('TIME')],
        tooltip: 'Смещается относительно текущего положения и курса дрона: X - вправо, Y - вперёд, Z - вверх.',
        python: 'pioneer.go_to_local_point_body_fixed(x,y,z,yaw,time)'
    },
    {
        type: 'waiting_for_point', category: 'flight', kind: 'statement', parts: ['Ожидать достижения точки'],
        tooltip: 'Ждёт, пока дрон долетит до заданной точки.', python: 'while not pioneer.point_reached():\n    pass'
    },
    {
        type: 'point_reached', category: 'flight', kind: 'value', output: 'Boolean', parts: ['Достигнута точка'],
        tooltip: 'Истина, когда дрон долетел до заданной точки.', python: 'pioneer.point_reached()'
    },
    {
        type: 'set_speed_start', category: 'flight', kind: 'statement',
        parts: ['Установить скорость относительно точки старта по X', n('X'), 'по Y', n('Y'), 'по Z', n('Z'), 'Угловая скорость', n('W')],
        tooltip: 'Скорость (м/с) в системе координат точки старта; угловая скорость в рад/с.',
        python: 'pioneer.set_manual_speed(vx, vy, vz, yaw_rate)'
    },
    {
        type: 'set_speed_body', category: 'flight', kind: 'statement',
        parts: ['Установить скорость относительно позиции дрона по X', n('X'), 'по Y', n('Y'), 'по Z', n('Z'), 'Угловая скорость', n('W')],
        tooltip: 'Скорость (м/с) в системе координат дрона: X - вправо, Y - вперёд; угловая скорость в рад/с.',
        python: 'pioneer.set_manual_speed_body_fixed(vx, vy, vz, yaw_rate)'
    },
    {
        type: 'set_yaw', category: 'flight', kind: 'statement', parts: ['Установить угол', n('ANGLE', 90), 'в градусах'],
        tooltip: 'Поворачивает дрон на месте до заданного курса (градусы).', python: 'pioneer.set_yaw(angle)'
    },

    // ---------------- Модули ----------------
    {
        type: 'servo_set_angle', category: 'modules', kind: 'statement',
        parts: ['Задать поворот сервопривода', { num: 'angle', value: 0, min: -80, max: 30, precision: 15 }, '°'],
        tooltip: 'Наклон камеры: от -80° (вниз) до 30° (вверх), шаг 15°. Значение округляется до шага, как в Bricks.',
        python: 'servo.set_angle(angle=…)'
    },
    {
        type: 'grab_open', category: 'modules', kind: 'statement', parts: ['Открыть захват со скоростью', n('SPEED', 50), 'процентов'],
        tooltip: 'Открывает механический захват; скорость 0..100 %.', python: 'pioneer.grab_open(velocity=…)'
    },
    {
        type: 'grab_close', category: 'modules', kind: 'statement', parts: ['Закрыть захват со скоростью', n('SPEED', 50), 'процентов'],
        tooltip: 'Закрывает механический захват; скорость 0..100 %.', python: 'pioneer.grab_close(velocity=…)'
    },
    {
        type: 'ranger_data', category: 'modules', kind: 'value', parts: ['Получить данные от модуля Ranger'],
        tooltip: 'Показания пяти дальномеров модуля Ranger (метры): справа, слева, спереди, сзади, снизу.',
        python: 'pioneer.get_ranger_data()'
    },
    {
        type: 'ranger_value', category: 'modules', kind: 'value',
        parts: ['Получить значение дальномера', { dd: 'side', options: RANGER_SIDES }, 'из данных модуля Ranger', v('DATA')],
        tooltip: 'Одно показание из данных модуля Ranger.', python: 'data[номер]'
    },
    {
        type: 'led_index', category: 'modules', kind: 'statement',
        parts: ['Установить цвет', v('COLOR'), 'на светодиод с номером', n('NUM')],
        tooltip: 'Включает один светодиод цветом из блока «Цвет». У Мини 2 два светодиода: 0 - левый, 1 - правый.',
        python: 'pioneer.led_control(номер, r, g, b)'
    },
    {
        type: 'led_all', category: 'modules', kind: 'statement', parts: ['Установить цвет всех светодиодов на', v('COLOR')],
        tooltip: 'Включает все светодиоды цветом из блока «Цвет». Чёрный цвет - светодиоды выключены.',
        python: 'pioneer.led_control(255, r, g, b)'
    },
    {
        type: 'get_dist_sensor_data', category: 'modules', kind: 'value', output: 'Number',
        parts: ['Получить данные от датчика расстояния'],
        tooltip: 'Высота над землёй по дальномеру, метры.', python: 'pioneer.get_dist_sensor_data()'
    },
    {
        type: 'get_orientation', category: 'modules', kind: 'value', output: 'Number',
        parts: ['Получить текущую ориентацию по углу', { dd: 'angle', options: [['0', 'Крена'], ['1', 'Тангажа'], ['2', 'Рысканья']] }],
        tooltip: 'Угол ориентации дрона в градусах.', python: 'pioneer.get_orientation()[номер]'
    },
    {
        type: 'get_local_position', category: 'modules', kind: 'value', parts: ['Получить текущие локальные координаты дрона'],
        tooltip: 'Положение (x, y, z) относительно точки старта, метры.', python: 'pioneer.get_local_position_lps()'
    },
    {
        type: 'get_local_velocity', category: 'modules', kind: 'value',
        parts: ['Получить текущие скорости дрона в локальной системе координат'],
        tooltip: 'Скорость (vx, vy, vz) относительно точки старта, м/с.', python: 'pioneer.get_local_velocity_lps()'
    },
    {
        type: 'get_global_position', category: 'modules', kind: 'value', parts: ['Получить текущие глобальные координаты дрона'],
        tooltip: 'Координаты по GPS. В симуляторе модуля GPS нет: блок вернёт пустое значение.', python: 'pioneer.get_global_position_gps()'
    },
    {
        type: 'get_global_velocity', category: 'modules', kind: 'value',
        parts: ['Получить текущие скорости дрона в глобальной системе координат'],
        tooltip: 'Скорость по GPS. В симуляторе модуля GPS нет: блок вернёт пустое значение.', python: 'pioneer.get_global_velocity_gps()'
    },

    // ---------------- Камера ----------------
    {
        type: 'cam_get_cv_frame', category: 'camera', kind: 'value',
        parts: ['Получить кадр с', { dd: 'choice', options: [['CameraType.MAIN', 'основной'], ['CameraType.OPT', 'оптической']] }, 'камеры'],
        tooltip: 'Кадр камеры (массив OpenCV, BGR). Присвойте его переменной.', python: 'cam_main.get_cv_frame()'
    },
    {
        type: 'imshow', category: 'camera', kind: 'statement',
        parts: ['Демонстрация изображения из кадра', v('frame'), 'в окно', t('name', 'test')],
        tooltip: 'Показывает кадр в окне с заданным именем (на дроне - http://10.42.0.1:8889/имя/).',
        python: 'iv.imshow(name=…, frame=…)'
    },
    {
        type: 'imwrite', category: 'camera', kind: 'statement',
        parts: ['Сохранить в файл кадр', v('frame'), 'с именем', t('path', 'photo')],
        tooltip: 'Сохраняет кадр в /mnt/media/photos/имя.jpg (в симуляторе запись файла только имитируется).',
        python: 'cv2.imwrite("/mnt/media/photos/" + имя + ".jpg", кадр.copy())'
    },
    // paint_obj собирается отдельно (динамическая форма), см. blocks.ts
    {
        type: 'image_size', category: 'camera', kind: 'value', output: 'Number',
        parts: ['Получить размер изображения', v('img'), { dd: 'choice', options: IMAGE_SIZE_CHOICES }],
        tooltip: 'Ширина или высота кадра в пикселях.', python: 'img.shape[1] / img.shape[0]'
    },
    {
        type: 'image_resize', category: 'camera', kind: 'value',
        parts: ['Изменить размер изображения', v('img'), 'ширина', n('width', 320), 'высота', n('height', 240)],
        tooltip: 'Копия кадра нового размера.', python: 'cv2.resize(img, (ширина, высота))'
    },
    {
        type: 'image_rotate', category: 'camera', kind: 'value',
        parts: ['Повернуть изображение', v('img'), 'на угол', { dd: 'choice', options: ROTATE_CHOICES }],
        tooltip: 'Поворот кадра на 90 или 180 градусов.', python: 'cv2.rotate(img, cv2.ROTATE_…)', droneOnly: true
    },
    {
        type: 'image_flip', category: 'camera', kind: 'value',
        parts: ['Отразить изображение', v('img'), 'вдоль', { dd: 'choice', options: FLIP_CHOICES }],
        tooltip: 'Зеркальное отражение кадра.', python: 'cv2.flip(img, 1)', droneOnly: true
    },
    {
        type: 'image_crop', category: 'camera', kind: 'value',
        parts: ['Обрезка изображения', v('img'), 'от точки', v('from'), 'до точки', v('to')],
        tooltip: 'Вырезает прямоугольник кадра между двумя точками (блок «Точка» из категории «Прочее»).',
        python: 'img[y1:y2, x1:x2]'
    },

    // ---------------- ИИ ----------------
    {
        type: 'ai_model_init', category: 'ai', kind: 'statement',
        parts: ['Инициализация ИИ модели', { dd: 'chosen_model', options: AI_MODELS }],
        tooltip: 'Загружает нейросеть на NPU дрона. Ставится один раз перед циклом.',
        python: 'Yolo(model_name=…) / YoloPose(…) / PaddleOCR(…)'
    },
    {
        type: 'yolo_object', category: 'ai', kind: 'value',
        parts: ['Найти на кадре', v('img'), 'объект класса', { dd: 'choice', options: [['all', 'Все'], ...YOLO_CLASSES] }, 'для детекции'],
        tooltip: 'Находит на кадре объекты выбранного класса (нужна инициализация модели Yolo).',
        python: 'yolo_find_on_image(img, результат, classNames_yolo, class_filter=[…])'
    },
    {
        type: 'yolo_pose_object', category: 'ai', kind: 'value', parts: ['Найти позу на кадре', v('img')],
        tooltip: 'Находит людей и их позы (нужна инициализация модели YoloPose).', python: 'find_poses(img, результат)'
    },
    {
        type: 'pose_compare', category: 'ai', kind: 'value', output: 'Boolean',
        parts: ['Поза в объекте', v('obj'), 'соответствует позе', { dd: 'choice', options: POSE_CHOICES }],
        tooltip: 'Истина, если выбранная поза держится несколько кадров подряд.', python: 'pose_compare(поза, "two_hand_up", last_cmds)'
    },
    {
        type: 'ppocr_text_find', category: 'ai', kind: 'value', parts: ['Распознать текст на изображении', v('img')],
        tooltip: 'Распознаёт текст на кадре (нужна инициализация модели PaddleOCR). Результат сохраните в переменную.',
        python: '[results := infer_cache_per_frame(…, lambda fr: model_ppocr.run(fr))]'
    },
    {
        type: 'ppocr_text_selection_from_object', category: 'ai', kind: 'value', output: 'String',
        parts: ['Получить текст из результата распознавания', v('ppocr')],
        tooltip: 'Строки распознанного текста, склеенные через перенос строки.',
        python: '"\\n".join([text for group in ocr[0][1] for (text, _) in group])'
    },

    // ---------------- Компьютерное зрение ----------------
    {
        type: 'aruco_find', category: 'vision', kind: 'value',
        parts: ['Найти маркеры ArUco на изображении', v('IMG'), 'семейство', { dd: 'FAMILY', options: ARUCO_FAMILIES }],
        tooltip: 'Находит маркеры выбранного семейства. Семейство должно совпадать с напечатанными маркерами.',
        python: "aruco_find_on_image('img', img, cv2.aruco.DICT_…)"
    },
    {
        type: 'cv_object_coords', category: 'vision', kind: 'value',
        parts: ['Координаты объекта', v('obj'), { dd: 'mode', options: [['center', 'центр'], ['x', 'X центра'], ['y', 'Y центра']] }, 'ID/индекс', n('ident')],
        tooltip: 'Центр объекта (маркера ArUco с этим ID или рамки Yolo с этим номером) в пикселях кадра.',
        python: 'object_coords(obj, "center", id)'
    },
    {
        type: 'cv_object_size', category: 'vision', kind: 'value',
        parts: ['Размер объекта', v('obj'), { dd: 'mode', options: [['length', 'длина'], ['width', 'ширина'], ['height', 'высота']] }, 'ID/индекс', n('ident')],
        tooltip: 'Размер объекта в пикселях: длина - большая сторона рамки.', python: 'object_size(obj, "length", id)'
    },
    {
        type: 'cv_contour_shape', category: 'vision', kind: 'value', output: 'String',
        parts: ['Определить форму контура', v('contour'), 'индекс', n('index')],
        tooltip: 'Название формы контура: треугольник, прямоугольник, круг…', python: 'contour_shape(contours, index)', droneOnly: true
    },
    {
        type: 'cv_gaussian_blur', category: 'vision', kind: 'value',
        parts: ['Получить гауссово размытие изображения', v('img'), 'размер ядра', n('k', 5)],
        tooltip: 'Размытие кадра; размер ядра - нечётное число.', python: 'cv2.GaussianBlur(img, (k, k), 0)', droneOnly: true
    },
    {
        type: 'cv_canny', category: 'vision', kind: 'value',
        parts: ['Получить маску Кэнни изображения', v('img'), 'нижняя граница', { num: 'low', value: 100 }, 'верхняя граница', { num: 'high', value: 200 }],
        tooltip: 'Границы объектов на кадре (алгоритм Кэнни).', python: 'cv2.Canny(img, low, high)', droneOnly: true
    },
    {
        type: 'cv_color_mask', category: 'vision', kind: 'value',
        parts: ['Получить цветовую маску изображения', v('img'), 'нижняя граница', v('lower'), 'верхняя граница', v('upper')],
        tooltip: 'Маска пикселей, цвет которых лежит между двумя цветами (блок «Цвет»).', python: 'color_mask(img, lower, upper)', droneOnly: true
    },
    {
        type: 'cv_threshold', category: 'vision', kind: 'value',
        parts: ['Получить бинарную маску по порогу из изображения', v('img'), 'порог', { num: 'threshold', value: 127 }],
        tooltip: 'Чёрно-белая маска: светлее порога - белое.', python: 'binary_mask(img, порог)', droneOnly: true
    },
    {
        type: 'cv_contours', category: 'vision', kind: 'value', parts: ['Получить контуры из маски', v('mask')],
        tooltip: 'Список контуров на маске.', python: 'cv2.findContours(mask, …)[0]', droneOnly: true
    },

    // ---------------- Прочее ----------------
    {
        type: 'sleep', category: 'other', kind: 'statement', parts: ['Заснуть на', n('NAME', 1), 'секунд'],
        tooltip: 'Пауза в секундах.', python: 'sleep(секунды)'
    },
    {
        type: 'get_time', category: 'other', kind: 'value', output: 'Number', parts: ['Получить время'],
        tooltip: 'Текущее время в секундах (time.time()).', python: 'time.time()'
    },
    {
        type: 'field-colour', category: 'other', kind: 'value', output: 'Colour', parts: ['Цвет', { colour: 'colour', value: '#ff0000' }],
        tooltip: 'Выбор цвета. В программу цвет попадает строкой «#rrggbb».', python: '"#rrggbb"'
    },
    {
        type: 'field-angle', category: 'other', kind: 'value', output: 'Number', parts: ['Угол', { angle: 'angle', value: 0 }, '°'],
        tooltip: 'Выбор угла в градусах.', python: 'число'
    },
    {
        type: 'point', category: 'other', kind: 'value', parts: ['Точка X', n('X'), 'Y', n('Y')],
        tooltip: 'Точка кадра (x, y) для блока «Обрезка изображения».', python: '(x, y)'
    }
];
