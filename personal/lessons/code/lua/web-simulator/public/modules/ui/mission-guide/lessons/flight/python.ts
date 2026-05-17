import type { GuideLesson } from '../../types.js';
import { getPythonCoreFlightLessons } from './python-core.js';
import { getPythonMissionLessons } from './python-mission.js';

export function getPythonFlightLessons(): GuideLesson[] {
    return [...getPythonCoreFlightLessons(), ...getPythonMissionLessons()];
}
