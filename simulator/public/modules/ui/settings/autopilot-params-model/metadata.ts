import type { AutopilotParameterDefinition } from './types.js';

export const GROUP_DESCRIPTIONS: Record<string, string> = {
    BoardPioneer: 'Параметры аппаратной конфигурации платы Pioneer и подключаемых модулей.',
    Board: 'Идентификаторы платы, версии и серийные сведения автопилота.',
    Copter: 'Параметры ручного управления, регуляторов и поведения коптера в полете.',
    Flight: 'Навигационные, миссионные и защитные параметры автопилота.',
    ICM20689: 'Настройки IMU-микросхемы ICM20689.',
    Imu: 'Параметры инерциальной оценки и вспомогательных алгоритмов IMU.',
    Logger: 'Включение и отключение каналов штатного логирования автопилота.',
    Modules: 'Флаги модулей и дополнительных функций платформы.',
    RC11xx: 'Настройки радиомодуля и канала связи RC11xx.',
    SensorMux: 'Маршрутизация показаний через мультиплексор датчиков.',
    Sensors: 'Частоты, фильтрация и калибровочные параметры датчиков.',
    State: 'Внутренние служебные параметры состояния автопилота.',
    Telemetry: 'Частоты и поток телеметрии.'
};

export const DOC_OVERRIDES: Record<string, Omit<Partial<AutopilotParameterDefinition>, 'defaultValue' | 'group' | 'key'>> = {
    Copter_man_attScale: {
        description: 'Чувствительность Pioneer по осям X, Y и Yaw в режиме Stabilize.',
        details: 'Документация рекомендует диапазон 0.25-0.5 и дальнейшее увеличение шагом 0.1 на усмотрение пользователя.',
        validation: { min: 0.25, max: 0.5, recommended: 'Рекомендуемый диапазон документации: 0.25-0.5.' },
        source: 'documentation'
    },
    Copter_man_velScale: {
        description: 'Чувствительность Pioneer по осям X и Y в режимах Althold / Navigation.',
        details: 'Документация рекомендует диапазон 0.5-2.',
        validation: { min: 0.5, max: 2, recommended: 'Рекомендуемый диапазон документации: 0.5-2.' },
        source: 'documentation'
    },
    Copter_man_vzScale: {
        description: 'Чувствительность Pioneer по оси Z в режимах Althold / Navigation.',
        details: 'Документация рекомендует диапазон 0.5-2.',
        validation: { min: 0.5, max: 2, recommended: 'Рекомендуемый диапазон документации: 0.5-2.' },
        source: 'documentation'
    },
    Copter_man_yawScale: {
        description: 'Чувствительность Pioneer по оси Yaw в режимах Althold / Navigation.',
        details: 'Документация приводит базовое значение 3 с возможностью дальнейшего увеличения пользователем.',
        validation: { min: 0, recommended: 'Базовое значение из документации: 3.' },
        source: 'documentation'
    },
    Copter_pos_aMax: {
        description: 'Максимальное ускорение при полете по миссии.',
        details: 'Из документации: при увеличении vMax желательно увеличивать и aMax, чтобы коптер успевал набрать скорость.',
        validation: { min: 0, unit: 'м/с²' },
        source: 'documentation'
    },
    Copter_pos_vMax: {
        description: 'Скорость Pioneer по осям X и Y при полете по миссии.',
        details: 'Документация приводит ориентир 0.5 м/с.',
        validation: { min: 0, unit: 'м/с', recommended: 'Ориентир документации: 0.5 м/с.' },
        source: 'documentation'
    },
    Copter_pos_vUp: {
        description: 'Предел скорости набора высоты.',
        details: 'Не взаимодействует с параметром Copter_pos_vTakeoff.',
        validation: { min: 0, unit: 'м/с', recommended: 'Ориентир документации: 0.5 м/с.' },
        source: 'documentation'
    },
    Copter_pos_vDown: {
        description: 'Предел скорости сброса высоты.',
        details: 'Не взаимодействует с параметром Copter_pos_vLanding.',
        validation: { min: 0, unit: 'м/с', recommended: 'Ориентир документации: 0.5 м/с.' },
        source: 'documentation'
    },
    Copter_pos_vTakeoff: {
        description: 'Скорость отрыва до высоты, задаваемой Flight_com_takeoffAlt.',
        details: 'На странице документации для примера указано 2 м/с, в шаблоне профиля по умолчанию стоит 0.3.',
        validation: { min: 0, unit: 'м/с' },
        source: 'documentation'
    },
    Copter_pos_vLanding: {
        description: 'Скорость посадки ниже высоты, установленной параметром Flight_com_landingAlt.',
        details: 'Документация приводит ориентир 0.5 м/с.',
        validation: { min: 0, unit: 'м/с' },
        source: 'documentation'
    },
    Copter_alt_minHeight: {
        description: 'Высота по дальномеру, выше которой его показания начинают учитываться в контуре управления.',
        details: 'Документация отмечает, что значение 100 позволяет фактически выключить дальномер из контура управления.',
        validation: { min: 0, unit: 'м' },
        source: 'documentation'
    },
    Copter_throttleMode: {
        description: 'Режим работы газа.',
        details: '0 - стик без пружины; 1 - подпружиненный стик, рабочий диапазон от середины до верхнего положения.',
        validation: { allowedValues: [0, 1], recommended: 'Допустимы только значения 0 или 1.' },
        source: 'documentation'
    },
    Copter_shockAccel: {
        description: 'Порог перегрузки, при достижении которого автопилот отключает двигатели.',
        details: 'Чтобы коптер не выключал двигатели при жесткой посадке, документация рекомендует увеличить значение.',
        validation: { min: 0, unit: 'g' },
        source: 'documentation'
    },
    Flight_com_takeoffAlt: {
        description: 'Высота взлета при выполнении полетного задания.',
        details: 'Используется в связке с Copter_pos_vTakeoff.',
        validation: { min: 0, unit: 'м' },
        source: 'documentation'
    },
    Flight_com_navSystem: {
        description: 'Используемая система навигации.',
        details: '0 - GNSS, 1 - локальная система LPS, 2 - оптическая система навигации.',
        validation: { allowedValues: [0, 1, 2], recommended: 'Допустимы только значения 0, 1 или 2.' },
        source: 'documentation'
    },
    Flight_com_landingVol: {
        description: 'Напряжение, при котором выполняется посадка.',
        details: 'Если напряжение опустится ниже этого порога, посадка прервет возврат домой.',
        validation: { min: 0, unit: 'В' },
        source: 'documentation'
    },
    Flight_com_rtlVoltage: {
        description: 'Напряжение, ниже которого включается возврат домой.',
        details: 'Документация говорит, что 0 отключает возврат по напряжению; шаблон профиля допускает значение -1.',
        validation: { min: -1, unit: 'В' },
        source: 'documentation'
    },
    Flight_com_autoFlightT: {
        description: 'Максимальная длительность автоматического полета.',
        details: 'Полет считается автоматическим при пропадании связи с пультом радиоуправления.',
        validation: { min: 0, unit: 'с' },
        source: 'documentation'
    },
    Copter_flyWithoutRc: {
        description: 'Разрешение на автономный запуск без пульта радиоуправления.',
        details: 'Параметр определяет, учитывать ли отсутствие пульта при старте автономного сценария.',
        validation: { allowedValues: [0, 1], recommended: 'Допустимы только значения 0 или 1.' },
        source: 'documentation'
    },
    Flight_com_landAtHome: {
        description: 'Нужно ли садиться при достижении домашней точки в режиме возврата.',
        details: '1 - садиться в точке дома; 0 - зависнуть над точкой дома.',
        validation: { allowedValues: [0, 1] },
        source: 'documentation'
    },
    Flight_com_homeAlt: {
        description: 'Высота над точкой дома, используемая в режиме возврата домой.',
        details: 'Коптер зависает на этой высоте над домашней точкой.',
        validation: { min: 0, unit: 'м' },
        source: 'documentation'
    },
    Flight_com_rtlAltMode: {
        description: 'Режим возврата домой.',
        details: '0 - возврат с удержанием высоты и последующей посадкой; 1 - постепенное снижение при возврате.',
        validation: { allowedValues: [0, 1] },
        source: 'documentation'
    },
    Flight_com_returnAlt: {
        description: 'Высота возврата в домашнюю точку.',
        details: 'Используется в логике RTL.',
        validation: { min: 0, unit: 'м' },
        source: 'documentation'
    },
    Copter_motorCheckTime: {
        description: 'Время проверки скорости оборотов двигателей на старте.',
        details: 'Для отключения проверки документация предлагает установить 0.',
        validation: { min: 0, unit: 'с' },
        source: 'documentation'
    },
    Copter_startRpmMax: {
        description: 'Максимальное количество об/мин для стартовой проверки двигателей.',
        details: 'Используется при проверке нестандартных моторов.',
        validation: { min: 0, unit: 'об/мин' },
        source: 'documentation'
    },
    Copter_startRpmMin: {
        description: 'Минимальное количество об/мин для стартовой проверки двигателей.',
        details: 'Используется при проверке нестандартных моторов.',
        validation: { min: 0, unit: 'об/мин' },
        source: 'documentation'
    },
    Copter_startRpmSigma: {
        description: 'Максимальное расхождение между измеренными оборотами двигателей на старте.',
        details: 'Если расхождение больше порога, считается, что двигатели работают неравномерно.',
        validation: { min: 0, unit: 'об/мин' },
        source: 'documentation'
    },
    Copter_stallRpm: {
        description: 'Порог оборотов, после которого считается, что произошел срыв синхронизации.',
        details: 'При превышении двигатели отключаются.',
        validation: { min: 0, unit: 'об/мин' },
        source: 'documentation'
    },
    Copter_xyRate_ki: {
        description: 'Интегральная часть регулятора XY.',
        details: 'Снижают, если коптер нехотя отзывается на управление; увеличивают при низкочастотных колебаниях.',
        validation: { min: 0 },
        source: 'documentation'
    },
    Copter_xyRate_kp: {
        description: 'Пропорциональная часть регулятора XY.',
        details: 'Снижают при перерегулировании и высокочастотных колебаниях, повышают при вялой реакции коптера.',
        validation: { min: 0 },
        source: 'documentation'
    }
};
