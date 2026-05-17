import type { GuideLesson } from './types.js';
import { getPythonFoundationsExpandedLessons } from './lessons-expanded/python-foundations.js';
import { getPythonFlightExpandedLessons } from './lessons-expanded/python-flight.js';
import { getPythonMissionExpandedLessons } from './lessons-expanded/python-mission.js';

export function getPythonExpandedLessons(): GuideLesson[] {
    return [
        ...getPythonFoundationsExpandedLessons(),
        ...getPythonFlightExpandedLessons(),
        ...getPythonMissionExpandedLessons()
    ];
}
