import { getPythonExpandedFoundationLessons } from './python-foundations.js';
import { getPythonExpandedFlightLessons } from './python-flight.js';
import type { GuideLesson } from '../../types.js';

export function getPythonExpandedLessons(): GuideLesson[] {
    return [
        ...getPythonExpandedFoundationLessons(),
        ...getPythonExpandedFlightLessons()
    ];
}
