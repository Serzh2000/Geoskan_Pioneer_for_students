import type { GuideLesson } from '../../types.js';
import { getLuaCoreFlightLessons } from './lua-core.js';
import { getLuaMissionLessons } from './lua-mission.js';

export function getLuaFlightLessons(): GuideLesson[] {
    return [...getLuaCoreFlightLessons(), ...getLuaMissionLessons()];
}
