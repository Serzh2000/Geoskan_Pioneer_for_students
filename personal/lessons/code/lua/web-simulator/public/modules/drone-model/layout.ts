/**
 * Геометрические константы низкополигональной модели «Геоскан Пионер Базовый».
 *
 * Система координат модели: Z вверх, +Y — «вперёд» (туда же смотрит камера и
 * указатель ориентации). Начало координат находится в центре рамы; вся модель
 * сдвигается вверх на DRONE_MODEL_OFFSET так, чтобы низ стоек шасси оказался
 * ровно на Z = 0 (уровень пола сцены).
 *
 * Значения подобраны по габаритам прежней CAD-сборки, чтобы новая модель
 * занимала в сцене ровно тот же объём: размах по X/Y = 0.574, высота = 0.316.
 */

export type Vec3Tuple = [number, number, number];
export type Vec2Tuple = [number, number];

export type PlacementConfig = {
    position: Vec3Tuple;
    rotation?: Vec3Tuple;
};

/** Низ стоек шасси относительно центра рамы (шасси уходит вниз). */
export const LANDING_GEAR_DROP = 0.132;

/** Сдвиг всей модели вверх: ставит пятки шасси на Z = 0. */
export const DRONE_MODEL_OFFSET = LANDING_GEAR_DROP;

/**
 * Расстояние от центра рамы до оси мотора по X и по Y (X-конфигурация).
 * Равно радиусу кольца защиты: тогда кольца соседних моторов касаются друг
 * друга, а общий габарит модели остаётся прежним — 0.574 по X и Y.
 */
export const MOTOR_ARM_OFFSET = 0.1435;

/** Позиции четырёх моторов. Порядок совпадает с индексами rotor_0..rotor_3. */
export const MOTOR_POSITIONS: Vec2Tuple[] = [
    [MOTOR_ARM_OFFSET, -MOTOR_ARM_OFFSET],
    [-MOTOR_ARM_OFFSET, MOTOR_ARM_OFFSET],
    [MOTOR_ARM_OFFSET, MOTOR_ARM_OFFSET],
    [-MOTOR_ARM_OFFSET, -MOTOR_ARM_OFFSET]
];

// --- Высоты основных ярусов (до общего сдвига DRONE_MODEL_OFFSET) ---

/** Верхняя палуба: на ней стоят светодиоды и LED-матрица. */
export const DECK_TOP_Z = 0.0205;
export const DECK_THICKNESS = 0.004;
/** Нижняя палуба рамы. */
export const DECK_BOTTOM_Z = -0.0005;
/** Центр лучей рамы. */
export const ARM_Z = 0.0145;
/** Центр корпуса мотора. */
export const MOTOR_BODY_Z = 0.026;
/** Центр «колокола» мотора (оранжевая часть). */
export const MOTOR_BELL_Z = 0.0425;
/** Плоскость вращения винтов. */
export const PROPELLER_Z = 0.0542;
/** Центр аккумулятора под нижней палубой. */
export const BATTERY_Z = -0.014;

/**
 * Два яруса защиты винтов. Плоскость вращения винта проходит между ними,
 * поэтому лопасти прикрыты и сверху, и снизу — как на настоящем аппарате.
 */
export const GUARD_LOWER_Z = 0.032;
export const GUARD_UPPER_Z = 0.076;
/**
 * Радиус кольца защиты вокруг каждого винта. Совпадает с MOTOR_ARM_OFFSET,
 * поэтому кольца соседних моторов касаются в серединах сторон — там их
 * связывают короткие перемычки, как на настоящем аппарате.
 */
export const GUARD_RADIUS = MOTOR_ARM_OFFSET;

/**
 * Радиус винта по кончику лопасти. У настоящего «Пионера» стоят винты 5030
 * (5 дюймов, 127 мм), то есть радиус около 63.5 мм — внутри кольца защиты
 * остаётся небольшой зазор, как в оригинале.
 */
export const PROPELLER_RADIUS = 0.128;

// --- Центральный корпус ---

export const BODY_WIDTH = 0.10;
export const BODY_LENGTH = 0.11;

/** Передний модуль камеры. */
export const CAMERA_POSITION: Vec3Tuple = [0, 0.07, 0.0145];

/** Указатель направления «вперёд». */
export const ORIENTATION_ARROW_Z = 0.108;

// --- Светодиоды ---

/** Всего адресуемых светодиодов: 4 бортовых + 25 в матрице 5x5. */
export const BASE_LED_COUNT = 4;
export const MATRIX_LED_COLS = 5;
export const MATRIX_LED_ROWS = 5;
export const MATRIX_LED_COUNT = MATRIX_LED_COLS * MATRIX_LED_ROWS;
export const TOTAL_LED_COUNT = BASE_LED_COUNT + MATRIX_LED_COUNT;

/** Высота, на которой лежат корпуса светодиодов (поверх палубы). */
export const LED_SURFACE_Z = DECK_TOP_Z + 0.0015;

/** Четыре бортовых индикатора по углам палубы. */
export const BASE_LED_POSITIONS: Vec2Tuple[] = [
    [0.045, 0.025],
    [0.045, -0.025],
    [-0.045, -0.025],
    [-0.045, 0.025]
];

/** Шаг между светодиодами матрицы. */
export const MATRIX_LED_SPACING = 0.012;
/** Сторона печатной платы LED-матрицы. */
export const MATRIX_BOARD_SIZE = 0.07;
/** Размер корпуса одного светодиода (WS2812B, 5x5x1.6 мм в масштабе сцены). */
export const LED_PACKAGE_SIZE = 0.0085;
export const LED_PACKAGE_HEIGHT = 0.0032;
