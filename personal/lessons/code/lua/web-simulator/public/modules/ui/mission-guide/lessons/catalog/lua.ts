import type { GuideLessonState } from '../../types.js';
import { getGuideChapters } from '../../curriculum.js';
import { getLuaExpandedLessons } from '../../lua-lessons-expanded.js';
import { getLuaLedLessons } from '../led/lua.js';
import { getLuaFlightLessons } from '../flight/lua.js';

export function getLuaLessonState(): GuideLessonState {
    const lessonMap = new Map(
        [...getLuaLedLessons(), ...getLuaExpandedLessons(), ...getLuaFlightLessons()]
            .map((lesson) => [lesson.id, lesson] as const)
    );
    const lessons = [
        'lua-led-single',
        'lua-led-sequence',
        'lua-led-confirm',
        'lua-led-delayed',
        'lua-preflight',
        'lua-takeoff',
        'lua-route',
        'lua-point-confirm',
        'lua-mission',
        'lua-landing'
    ]
        .map((lessonId) => lessonMap.get(lessonId))
        .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
        .map((lesson, index) => ({
            ...lesson,
            badge: `Задание ${index + 1}`
        }));

    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Lua-практикум',
        heroTitle: 'Пошаговые уроки по Lua API Pioneer',
        heroText: 'Каждый урок сочетает краткий разбор методов Pioneer API, сборку сценария в Blockly и мгновенную проверку результата в симуляторе.',
        heroFlow: '10 уроков: от LED-команд к полной миссии автопилота',
        chapters: getGuideChapters('lua'),
        lessons
    };
}
