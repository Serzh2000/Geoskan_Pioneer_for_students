import type { GuideTextLessonState } from '../../types.js';
import { getGuideChapters } from '../../curriculum.js';
import { getLuaTextLessons } from '../text/lua.js';

export function getLuaTextLessonState(): GuideTextLessonState {
    const lessonMap = new Map(
        getLuaTextLessons().map((lesson) => [lesson.id, lesson] as const)
    );
    const lessons = [
        'lua-led-single-text',
        'lua-led-sequence-text',
        'lua-led-confirm-text',
        'lua-led-delayed-text',
        'lua-preflight-text',
        'lua-takeoff-text',
        'lua-route-text',
        'lua-point-confirm-text',
        'lua-mission-text',
        'lua-landing-text'
    ]
        .map((lessonId) => lessonMap.get(lessonId))
        .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
        .map((lesson, index) => ({
            ...lesson,
            badge: `Задание ${index + 1}`
        }));

    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Lua-практикум (текстовый код)',
        heroTitle: 'Те же 10 уроков, но своими руками на Lua',
        heroText: 'Это тот же учебный план, что и в Blockly-практикуме по Lua, только вместо сборки из блоков вы пишете настоящий текстовый Lua-код самостоятельно, опираясь на разбор методов Pioneer API и пример готового решения.',
        heroFlow: '10 уроков: от LED-команд к полной миссии автопилота — теперь в виде рукописного кода',
        chapters: getGuideChapters('lua'),
        lessons
    };
}
