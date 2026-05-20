﻿﻿﻿﻿﻿import { getLuaExpandedFoundationLessons } from './lua-lessons-expanded-foundations.js';
import { getLuaExpandedFlightLessons } from './lua-lessons-expanded-flight.js';
import type { GuideLesson } from './types.js';

export function getLuaExpandedLessons(): GuideLesson[] {
    return [
        ...getLuaExpandedFoundationLessons(),
        ...getLuaExpandedFlightLessons()
    ];
}
