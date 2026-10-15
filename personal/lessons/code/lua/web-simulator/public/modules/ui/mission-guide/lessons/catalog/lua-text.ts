import type { GuideTextLessonState } from '../../types.js';
import { getGuideChapters } from '../../curriculum.js';
import { getLuaTextLessons } from '../text/lua.js';
import { getAcademyTextPractices } from '../../academy/practices/index.js';

export function getLuaTextLessonState(): GuideTextLessonState {
    const lessonMap = new Map(
        getLuaTextLessons().map((lesson) => [lesson.id, lesson] as const)
    );
    const legacyLessons = [
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

    const lessons = [...getAcademyTextPractices('lua'), ...legacyLessons];
    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Lua-практикум (текстовый код)',
        heroTitle: 'Учебник Lua: начинаем с устройства и arm',
        heroText: '72 урока на Lua: устройство аппарата, arm, свет, события, координаты, маршруты, местность и телеметрия. Затем 36 уроков камеры, ArUco и миссий на Python.',
        heroFlow: '72 последовательных урока Lua · продолжение на Python до урока 108',
        chapters: getGuideChapters('lua'),
        lessons
    };
}
