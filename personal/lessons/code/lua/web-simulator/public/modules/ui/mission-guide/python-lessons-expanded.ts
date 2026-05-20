import { getPythonExpandedFoundationLessons } from './python-lessons-expanded-foundations.js';
import { getPythonExpandedFlightLessons } from './python-lessons-expanded-flight.js';
import type { GuideLesson } from './types.js';

export function getPythonExpandedLessons(): GuideLesson[] {
    return [
        ...getPythonExpandedFoundationLessons(),
        ...getPythonExpandedFlightLessons()
    ];
}
