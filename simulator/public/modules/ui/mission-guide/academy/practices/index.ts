import { getDroneAcademyPractices } from './drone.js';
import { getSignalsCodePractices } from './signals-code.js';
import { getTimeAcademyPractices } from './time.js';
import { getFlightAcademyPractices } from './flight.js';
import { getTelemetryAcademyPractices } from './telemetry.js';
import { getCameraArucoAcademyPractices } from './camera-aruco.js';
import { getVisualNavigationAcademyPractices } from './visual-navigation.js';
import { getSdkExtrasAcademyPractices } from './sdk-extras.js';
import { getSdkPythonAcademyPractices } from './sdk-python.js';
import { getLuaExtrasAcademyPractices } from './lua-extras.js';
import { ACADEMY_LESSONS } from '../catalog.js';

/** Уроки, для которых есть готовое задание (хотя бы на одном языке). */
export const ACADEMY_READY_NUMBERS = new Set(ACADEMY_LESSONS.map(lesson => lesson.number));
/** Урок есть на языке, если так записано в каталоге: Python-линия (камера, SDK) и Lua-линия (датчики, таймеры, связь) расходятся. */
export const isAcademyPracticeReady = (number: number, language: 'lua' | 'python') =>
    ACADEMY_READY_NUMBERS.has(number) && Boolean(ACADEMY_LESSONS[number - 1]?.languages.includes(language));
export function getAcademyTextPractices(language: 'lua' | 'python') {
    return [...getDroneAcademyPractices(language), ...getSignalsCodePractices(language), ...getTimeAcademyPractices(language), ...getFlightAcademyPractices(language), ...getTelemetryAcademyPractices(language),
        ...(language === 'python' ? [...getCameraArucoAcademyPractices(), ...getVisualNavigationAcademyPractices(), ...getSdkExtrasAcademyPractices(), ...getSdkPythonAcademyPractices()] : getLuaExtrasAcademyPractices())];
}
