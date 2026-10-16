import { getDroneAcademyPractices } from './drone.js';
import { getSignalsCodePractices } from './signals-code.js';
import { getTimeAcademyPractices } from './time.js';
import { getFlightAcademyPractices } from './flight.js';
import { getTelemetryAcademyPractices } from './telemetry.js';
import { getCameraArucoAcademyPractices } from './camera-aruco.js';
import { getVisualNavigationAcademyPractices } from './visual-navigation.js';

export const ACADEMY_READY_NUMBERS = new Set(Array.from({ length: 108 }, (_, index) => index + 1));
export const isAcademyPracticeReady = (number: number, language: 'lua' | 'python') => ACADEMY_READY_NUMBERS.has(number) && (number <= 72 || language === 'python');
export function getAcademyTextPractices(language: 'lua' | 'python') {
    return [...getDroneAcademyPractices(language), ...getSignalsCodePractices(language), ...getTimeAcademyPractices(language), ...getFlightAcademyPractices(language), ...getTelemetryAcademyPractices(language), ...(language === 'python' ? [...getCameraArucoAcademyPractices(), ...getVisualNavigationAcademyPractices()] : [])];
}
