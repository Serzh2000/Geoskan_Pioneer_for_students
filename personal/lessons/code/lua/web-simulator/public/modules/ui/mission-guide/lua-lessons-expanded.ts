import type { GuideLesson } from './types.js';
import { getLuaFoundationsExpandedLessons } from './lessons-expanded/lua-foundations.js';
import { getLuaFlightExpandedLessons } from './lessons-expanded/lua-flight.js';
import { getLuaMissionExpandedLessons } from './lessons-expanded/lua-mission.js';

export function getLuaExpandedLessons(): GuideLesson[] {
    return [
        ...getLuaFoundationsExpandedLessons(),
        ...getLuaFlightExpandedLessons(),
        ...getLuaMissionExpandedLessons()
    ];
}
