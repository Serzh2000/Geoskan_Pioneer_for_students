import { getLuaExpandedFoundationLessons } from './lua-foundations.js';
import { getLuaExpandedFlightLessons } from './lua-flight.js';
import type { GuideLesson } from '../../types.js';

export function getLuaExpandedLessons(): GuideLesson[] {
    return [
        ...getLuaExpandedFoundationLessons(),
        ...getLuaExpandedFlightLessons()
    ];
}
