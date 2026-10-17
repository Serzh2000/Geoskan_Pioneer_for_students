/**
 * Модели дронов, которые умеет симулятор. Модель решает, как дрон выглядит,
 * на каких языках его программируют и какая Python-библиотека ему доступна.
 *
 * Пионер Базовый — Lua (автопилот) и Python через pioneer_sdk.
 * Пионер Мини 2 — только Python и только pioneer_sdk2: программа работает
 * на его бортовом компьютере, Lua-скриптов автопилота у него нет.
 */
import type { ScriptLanguage } from './state-types.js';

export type DroneModelId = 'pioneer-basic' | 'pioneer-mini2';
export type PythonSdkId = 'pioneer_sdk' | 'pioneer_sdk2';

export interface DroneModelProfile {
    id: DroneModelId;
    /** Как модель называется в интерфейсе. */
    title: string;
    /** Начало имени нового дрона: «Пионер Мини 2 3». */
    namePrefix: string;
    /** Языки по порядку предпочтения; первый — язык по умолчанию. */
    languages: readonly ScriptLanguage[];
    pythonSdk: PythonSdkId;
    /** Сколько светодиодов адресует led_control (номера 0..ledCount-1). */
    ledCount: number;
    /** Учебная LED-матрица 5x5 (только у Базового). */
    ledMatrix: boolean;
    /** Python на Базовом исполняется на модуле ESP32 — его показывают на модели. */
    esp32Module: boolean;
    /** Загрузка Lua-программы на настоящий дрон через Web Serial. */
    luaUpload: boolean;
    /** Наклон камеры сервоприводом, градусы (ServoCamera.set_angle). */
    servoCamera: { min: number; max: number } | null;
    /** Механический захват grab_open/grab_close. */
    grab: boolean;
    /** Модуль дальномеров Ranger: право, лево, вперёд, назад, низ. */
    ranger: boolean;
    /** Магнитный захват cargo_set. */
    cargo: boolean;
}

export const DRONE_MODELS: Record<DroneModelId, DroneModelProfile> = {
    'pioneer-basic': {
        id: 'pioneer-basic',
        title: 'Пионер Базовый',
        namePrefix: 'Пионер Базовый',
        languages: ['lua', 'python'],
        pythonSdk: 'pioneer_sdk',
        ledCount: 4,
        ledMatrix: true,
        esp32Module: true,
        luaUpload: true,
        servoCamera: null,
        grab: false,
        ranger: false,
        cargo: true
    },
    'pioneer-mini2': {
        id: 'pioneer-mini2',
        title: 'Пионер Мини 2',
        namePrefix: 'Пионер Мини 2',
        languages: ['python'],
        pythonSdk: 'pioneer_sdk2',
        // Два передних индикатора на плечах корпуса: 0 — левый, 1 — правый.
        ledCount: 2,
        ledMatrix: false,
        esp32Module: false,
        luaUpload: false,
        servoCamera: { min: -80, max: 30 },
        grab: true,
        ranger: true,
        cargo: false
    }
};

export const DEFAULT_DRONE_MODEL: DroneModelId = 'pioneer-basic';
export const DRONE_MODEL_IDS = Object.keys(DRONE_MODELS) as DroneModelId[];

export function isDroneModelId(value: unknown): value is DroneModelId {
    return typeof value === 'string' && value in DRONE_MODELS;
}

export function droneModelProfile(model: DroneModelId | undefined | null): DroneModelProfile {
    return DRONE_MODELS[model && isDroneModelId(model) ? model : DEFAULT_DRONE_MODEL];
}

export function supportsLanguage(model: DroneModelId | undefined | null, language: ScriptLanguage): boolean {
    return droneModelProfile(model).languages.includes(language);
}

/** Набор примеров редактора: у Мини 2 свои программы на pioneer_sdk2 (/api/files?lang=...). */
export type ExamplesSet = 'lua' | 'python' | 'python-sdk2';

export function examplesSetFor(model: DroneModelId | undefined | null, language: ScriptLanguage): ExamplesSet {
    if (language === 'lua') return 'lua';
    return droneModelProfile(model).pythonSdk === 'pioneer_sdk2' ? 'python-sdk2' : 'python';
}
