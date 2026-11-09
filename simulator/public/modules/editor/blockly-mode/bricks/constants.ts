/*
 * «Bricks (Мини 2)» - набор блоков Пионера Мини 2, повторяющий официальную блочную среду Геоскан
 * Pioneer Bricks 2.3.0. Блоки генерируют Python на pioneer_sdk2 / pioneer_rknn в том же виде, что и
 * Bricks (эталон - проекты u01..u10 из сборника «Pioneer Bricks»).
 *
 * Цвета взяты со снимков палитр Bricks (категории «Полёт», «Модули», «Камера», «ИИ»,
 * «Компьютерное зрение», «Прочее»).
 */

export const BRICKS_COLOURS = {
    start: '#a65c5c',
    flight: '#6494f7',
    modules: '#b74c00',
    camera: '#9e680a',
    ai: '#cb6598',
    vision: '#076496',
    other: '#cd9b00'
} as const;

/** Причина отключения блока: «только на дроне» (в симуляторе нет нужной функции OpenCV). */
export const BRICKS_DRONE_ONLY_REASON = 'bricks_drone_only';

/*
 * Имена типов блоков внутри редактора и в файлах проектов Bricks разные. В файлах (XML) - родные имена
 * Bricks (start_block, led_all, go_local_point...), а в самом редакторе к ним добавлен префикс: часть этих
 * имён уже занята старыми учебными блоками (teaching-python-definitions.ts), которые остаются
 * зарегистрированными для сохранённых уроков, и второй блок с тем же именем затёр бы первый.
 * При открытии проекта родные имена заменяются на внутренние, при сохранении - обратно (blockly-mode/bricks/xml.ts).
 */
export const BRICKS_TYPE_PREFIX = 'bricks_';

export function bricksType(nativeType: string): string {
    return nativeType.startsWith(BRICKS_TYPE_PREFIX) ? nativeType : `${BRICKS_TYPE_PREFIX}${nativeType}`;
}

export function nativeBricksType(type: string): string {
    return type.startsWith(BRICKS_TYPE_PREFIX) ? type.slice(BRICKS_TYPE_PREFIX.length) : type;
}

/** Родное имя блока «Начало программы» в проектах Bricks. */
export const BRICKS_START_NATIVE_TYPE = 'start_block';
export const BRICKS_START_TYPE = bricksType(BRICKS_START_NATIVE_TYPE);

/** Каталог классов COCO, которые знает Yolo: [значение в Python, подпись по-русски]. */
export const YOLO_CLASSES: ReadonlyArray<readonly [string, string]> = [
    ['person', 'Человек'], ['bicycle', 'Велосипед'], ['car', 'Автомобиль'], ['motorbike', 'Мотоцикл'],
    ['aeroplane', 'Самолёт'], ['bus', 'Автобус'], ['train', 'Поезд'], ['truck', 'Грузовик'], ['boat', 'Лодка'],
    ['traffic light', 'Светофор'], ['fire hydrant', 'Пожарный гидрант'], ['stop sign', 'Знак «Стоп»'],
    ['parking meter', 'Паркомат'], ['bench', 'Скамейка'], ['bird', 'Птица'], ['cat', 'Кошка'], ['dog', 'Собака'],
    ['horse', 'Лошадь'], ['sheep', 'Овца'], ['cow', 'Корова'], ['elephant', 'Слон'], ['bear', 'Медведь'],
    ['zebra', 'Зебра'], ['giraffe', 'Жираф'], ['backpack', 'Рюкзак'], ['umbrella', 'Зонт'], ['handbag', 'Сумка'],
    ['tie', 'Галстук'], ['suitcase', 'Чемодан'], ['frisbee', 'Фрисби'], ['skis', 'Лыжи'], ['snowboard', 'Сноуборд'],
    ['sports ball', 'Спортивный мяч'], ['kite', 'Воздушный змей'], ['baseball bat', 'Бейсбольная бита'],
    ['baseball glove', 'Бейсбольная перчатка'], ['skateboard', 'Скейтборд'], ['surfboard', 'Доска для сёрфинга'],
    ['tennis racket', 'Теннисная ракетка'], ['bottle', 'Бутылка'], ['wine glass', 'Бокал'], ['cup', 'Чашка'],
    ['fork', 'Вилка'], ['knife', 'Нож'], ['spoon', 'Ложка'], ['bowl', 'Миска'], ['banana', 'Банан'],
    ['apple', 'Яблоко'], ['sandwich', 'Бутерброд'], ['orange', 'Апельсин'], ['broccoli', 'Брокколи'],
    ['carrot', 'Морковь'], ['hot dog', 'Хот-дог'], ['pizza', 'Пицца'], ['donut', 'Пончик'], ['cake', 'Торт'],
    ['chair', 'Стул'], ['sofa', 'Диван'], ['pottedplant', 'Комнатное растение'], ['bed', 'Кровать'],
    ['diningtable', 'Обеденный стол'], ['toilet', 'Унитаз'], ['tvmonitor', 'Телевизор'], ['laptop', 'Ноутбук'],
    ['mouse', 'Мышь'], ['remote', 'Пульт'], ['keyboard', 'Клавиатура'], ['cell phone', 'Мобильный телефон'],
    ['microwave', 'Микроволновка'], ['oven', 'Духовка'], ['toaster', 'Тостер'], ['sink', 'Раковина'],
    ['refrigerator', 'Холодильник'], ['book', 'Книга'], ['clock', 'Часы'], ['vase', 'Ваза'],
    ['scissors', 'Ножницы'], ['teddy bear', 'Плюшевый мишка'], ['hair drier', 'Фен'], ['toothbrush', 'Зубная щётка']
];

/** Позы, которые понимает блок «Поза в объекте … соответствует позе». */
export const POSE_CHOICES: ReadonlyArray<readonly [string, string]> = [
    ['left_up', 'Левая рука вверх'],
    ['right_up', 'Правая рука вверх'],
    ['left_side', 'Левая рука в сторону'],
    ['right_side', 'Правая рука в сторону'],
    ['two_hand_up', 'Две руки вверх'],
    ['two_hand_side', 'Обе руки в стороны'],
    ['wrist_centre', 'Кисти рядом в центре']
];

/** Семейства маркеров ArUco / AprilTag (значения - имена констант cv2.aruco). */
export const ARUCO_FAMILIES: ReadonlyArray<readonly [string, string]> = [
    ['DICT_ARUCO_ORIGINAL', 'Original ArUco'],
    ['DICT_4X4_50', '4x4_50'], ['DICT_4X4_100', '4x4_100'], ['DICT_4X4_250', '4x4_250'], ['DICT_4X4_1000', '4x4_1000'],
    ['DICT_5X5_50', '5x5_50'], ['DICT_5X5_100', '5x5_100'], ['DICT_5X5_250', '5x5_250'], ['DICT_5X5_1000', '5x5_1000'],
    ['DICT_6X6_50', '6x6_50'], ['DICT_6X6_100', '6x6_100'], ['DICT_6X6_250', '6x6_250'], ['DICT_6X6_1000', '6x6_1000'],
    ['DICT_7X7_50', '7x7_50'], ['DICT_7X7_100', '7x7_100'], ['DICT_7X7_250', '7x7_250'], ['DICT_7X7_1000', '7x7_1000'],
    ['DICT_APRILTAG_16h5', 'AprilTag 16h5'], ['DICT_APRILTAG_25h9', 'AprilTag 25h9'],
    ['DICT_APRILTAG_36h10', 'AprilTag 36h10'], ['DICT_APRILTAG_36h11', 'AprilTag 36h11']
];

/** Модели блока «Инициализация ИИ модели». */
export const AI_MODELS: ReadonlyArray<readonly [string, string]> = [
    ['Yolo', 'Yolo'],
    ['YoloPose', 'YoloPose'],
    ['PaddleOCR', 'PaddleOCR']
];

export const RANGER_SIDES: ReadonlyArray<readonly [string, string]> = [
    ['0', 'Правый'], ['1', 'Левый'], ['2', 'Передний'], ['3', 'Задний'], ['4', 'Нижний']
];
