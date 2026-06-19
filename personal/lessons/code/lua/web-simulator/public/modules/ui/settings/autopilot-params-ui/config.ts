import type { SectionKey, SectionMeta } from './types.js';

export const SECTION_ORDER: SectionKey[] = ['flight', 'sensors', 'hardware', 'system'];

export const SECTION_META: Record<SectionKey, SectionMeta> = {
    flight: {
        title: 'Полет и миссия',
        description: 'Ручное управление, автоматические режимы, RTL и связанные ограничения.',
        groups: ['Copter', 'Flight']
    },
    sensors: {
        title: 'Датчики и IMU',
        description: 'Сенсорные контуры, IMU, фильтрация и маршрутизация показаний.',
        groups: ['ICM20689', 'Imu', 'SensorMux', 'Sensors']
    },
    hardware: {
        title: 'Плата и модули',
        description: 'Версия платы, радиомодуль, аппаратная конфигурация и модули.',
        groups: ['BoardPioneer', 'Board', 'Modules', 'RC11xx']
    },
    system: {
        title: 'Система и телеметрия',
        description: 'Логирование, служебные состояния и телеметрические потоки.',
        groups: ['Logger', 'State', 'Telemetry']
    }
};

export const GROUP_DESCRIPTIONS: Record<string, string> = {
    BoardPioneer: 'Аппаратная конфигурация платы Pioneer и подключаемых модулей.',
    Board: 'Базовые идентификаторы, версии и серийные сведения платы.',
    Copter: 'Ручное управление, регуляторы и поведение коптера в полете.',
    Flight: 'Навигационные, миссионные и защитные параметры автопилота.',
    ICM20689: 'Низкоуровневые настройки инерциального сенсора ICM20689.',
    Imu: 'Оценка ориентации, скорости и вспомогательные IMU-алгоритмы.',
    Logger: 'Управление логированием каналов автопилота.',
    Modules: 'Включение встроенных и внешних модулей платформы.',
    RC11xx: 'Настройки радиомодуля и параметров RC-связи.',
    SensorMux: 'Маршрутизация и переключение источников данных датчиков.',
    Sensors: 'Частоты, фильтрация, задержки и калибровка датчиков.',
    State: 'Служебные внутренние параметры состояния автопилота.',
    Telemetry: 'Настройки телеметрического потока и частот обновления.'
};

export function resolveSectionKey(group: string): SectionKey {
    const found = SECTION_ORDER.find((sectionKey) => SECTION_META[sectionKey].groups.includes(group));
    return found || 'system';
}
