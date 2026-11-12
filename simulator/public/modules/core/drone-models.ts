/**
 * Модели дронов, которые умеет симулятор. Модель решает, как дрон выглядит,
 * на каких языках его программируют и какая Python-библиотека ему доступна.
 *
 * Пионер Базовый — Lua (автопилот) и Python через pioneer_sdk.
 * Пионер Мини 2 — Python на pioneer_sdk2 и блоки Pioneer Bricks (они тоже собирают Python):
 * программа работает на его бортовом компьютере, Lua-скриптов автопилота у него нет.
 */
import type { ScriptLanguage } from './state-types.js';
import { DEFAULT_PYTHON_SCRIPT, DEFAULT_SDK2_PYTHON_SCRIPT } from './state-types.js';

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
    /** Python-библиотека по умолчанию. */
    pythonSdk: PythonSdkId;
    /** Все Python-библиотеки, которые можно выбрать для дрона этой модели. */
    pythonSdks: readonly PythonSdkId[];
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
    /**
     * Ручной полёт с пульта. `speedScale` умножает базовые скорости физики (при параметрах автопилота по умолчанию),
     * `maxSpeed` (м/с) — потолок горизонтальной скорости; null — без потолка.
     * Мини 2: в паспорте «Макс. скорость полёта 15 км/ч» (руководство pioneer_mini2_manual_ru, с. 10).
     */
    manualFlight: { speedScale: number; maxSpeed: number | null };
}

export const DRONE_MODELS: Record<DroneModelId, DroneModelProfile> = {
    'pioneer-basic': {
        id: 'pioneer-basic',
        title: 'Пионер Базовый',
        namePrefix: 'Пионер Базовый',
        languages: ['lua', 'python'],
        pythonSdk: 'pioneer_sdk',
        // pioneer_sdk2 на Базовом работает только с бортовым компьютером Radxa Zero 3W.
        pythonSdks: ['pioneer_sdk', 'pioneer_sdk2'],
        ledCount: 4,
        ledMatrix: true,
        esp32Module: true,
        luaUpload: true,
        servoCamera: null,
        grab: false,
        ranger: false,
        cargo: true,
        // Паспорт Базового: «Скорость полёта до 65 км/ч» = 18,06 м/с (руководство по сборке, таблица 1). Стабилизация на стике до упора
        // при параметрах по умолчанию (8 м/с × attScale 0,25 = 2 м/с) даёт ровно паспорт; медленнее летать помогают параметры Copter_man_*.
        manualFlight: { speedScale: (65 / 3.6) / (8 * 0.25), maxSpeed: 65 / 3.6 }
    },
    'pioneer-mini2': {
        id: 'pioneer-mini2',
        title: 'Пионер Мини 2',
        namePrefix: 'Пионер Мини 2',
        languages: ['python'],
        pythonSdk: 'pioneer_sdk2',
        pythonSdks: ['pioneer_sdk2'],
        // Два передних индикатора на плечах корпуса: 0 — левый, 1 — правый.
        ledCount: 2,
        ledMatrix: false,
        esp32Module: false,
        luaUpload: false,
        servoCamera: { min: -80, max: 30 },
        grab: true,
        ranger: true,
        cargo: false,
        // 15 км/ч = 4,17 м/с. Стабилизация на стике до упора при параметрах по умолчанию (8 м/с × attScale 0,25 = 2 м/с) даёт ровно паспорт.
        manualFlight: { speedScale: (15 / 3.6) / (8 * 0.25), maxSpeed: 15 / 3.6 }
    }
};

export const DEFAULT_DRONE_MODEL: DroneModelId = 'pioneer-basic';

export function isDroneModelId(value: unknown): value is DroneModelId {
    return typeof value === 'string' && value in DRONE_MODELS;
}

export function droneModelProfile(model: DroneModelId | undefined | null): DroneModelProfile {
    return DRONE_MODELS[model && isDroneModelId(model) ? model : DEFAULT_DRONE_MODEL];
}

export function supportsLanguage(model: DroneModelId | undefined | null, language: ScriptLanguage): boolean {
    return droneModelProfile(model).languages.includes(language);
}

/** Python-библиотека дрона: выбранная, если модель её допускает, иначе библиотека модели. */
export function droneSdk(drone: { model?: DroneModelId | null; pythonSdk?: PythonSdkId } | undefined | null): PythonSdkId {
    const profile = droneModelProfile(drone?.model);
    return drone?.pythonSdk && profile.pythonSdks.includes(drone.pythonSdk) ? drone.pythonSdk : profile.pythonSdk;
}

/** Программа Python написана под эту библиотеку (по строке импорта pioneer_sdk2). */
export function scriptMatchesSdk(code: string, sdk: PythonSdkId): boolean {
    const usesSdk2 = /^\s*(?:from|import)\s+pioneer_sdk2\b/m.test(code);
    return sdk === 'pioneer_sdk2' ? usesSdk2 : !usesSdk2;
}

/** Шаблон новой Python-программы под библиотеку. */
export function defaultPythonScriptFor(sdk: PythonSdkId): string {
    return sdk === 'pioneer_sdk2' ? DEFAULT_SDK2_PYTHON_SCRIPT : DEFAULT_PYTHON_SCRIPT;
}

/** У дрона стоит Radxa Zero 3W с камерой: Пионер Базовый, которому выбран pioneer_sdk2. Передней камеры у такой сборки нет. */
export function usesRadxaModule(drone: { model?: DroneModelId | null; pythonSdk?: PythonSdkId } | undefined | null): boolean {
    return droneModelProfile(drone?.model).id === 'pioneer-basic' && droneSdk(drone) === 'pioneer_sdk2';
}

/** Python на борту (Мини 2 и любой дрон с pioneer_sdk2): программа выполняется на бортовом компьютере. */
export function usesOnboardSdk(drone: { model?: DroneModelId | null; pythonSdk?: PythonSdkId } | undefined | null): boolean {
    return droneSdk(drone) === 'pioneer_sdk2';
}

/** Название языка для интерфейса: «Lua», «Python · SDK1», «Python · SDK2», «Блоки». */
export type ProgramLanguageChoice = 'lua' | 'python-sdk1' | 'python-sdk2' | 'blocks';

export function languageChoicesFor(model: DroneModelId | undefined | null): readonly ProgramLanguageChoice[] {
    return droneModelProfile(model).id === 'pioneer-mini2'
        ? ['python-sdk2', 'blocks']
        : ['python-sdk1', 'python-sdk2', 'lua', 'blocks'];
}

/** Набор примеров редактора: для pioneer_sdk2 свои программы (/api/files?lang=...). */
export type ExamplesSet = 'lua' | 'python' | 'python-sdk2' | 'blocks' | 'blocks-bricks';

export function examplesSetFor(drone: { model?: DroneModelId | null; pythonSdk?: PythonSdkId } | undefined | null, language: ScriptLanguage): ExamplesSet {
    if (language === 'lua') return 'lua';
    return usesOnboardSdk(drone) ? 'python-sdk2' : 'python';
}

/** Набор примеров редактора блоков: у Мини 2 - проекты Pioneer Bricks (.xml), у остальных - программы из pioneer_* (.json). */
export function blocksExamplesSetFor(model: DroneModelId | undefined | null): ExamplesSet {
    return droneModelProfile(model).id === 'pioneer-mini2' ? 'blocks-bricks' : 'blocks';
}
