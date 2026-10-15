import type { GuideTextLessonState } from '../../types.js';
import { getGuideChapters } from '../../curriculum.js';
import { getPythonTextLessons } from '../text/python.js';
import { getAcademyTextPractices } from '../../academy/practices/index.js';

export function getPythonTextLessonState(): GuideTextLessonState {
    const lessonMap = new Map(
        getPythonTextLessons().map((lesson) => [lesson.id, lesson] as const)
    );
    const legacyLessons = [
        'py-led-single-text',
        'py-led-sequence-text',
        'py-led-confirm-text',
        'py-led-delayed-text',
        'py-arm-text',
        'py-takeoff-text',
        'py-route-text',
        'py-point-wait-text',
        'py-mission-text',
        'py-land-text'
    ]
        .map((lessonId) => lessonMap.get(lessonId))
        .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
        .map((lesson, index) => ({
            ...lesson,
            badge: `Задание ${index + 1}`
        }));

    const lessons = [...getAcademyTextPractices('python'), ...legacyLessons];
    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Python-практикум (текстовый код)',
        heroTitle: 'Учебник Python: начинаем с устройства и arm',
        heroText: '108 уроков от устройства аппарата и arm до маршрутов, камеры, ArUco, наведения и итоговой миссии. Каждое новое понятие закрепляется небольшим опытом в симуляторе.',
        heroFlow: '108 последовательных уроков Python · от arm до посадки по ArUco',
        chapters: getGuideChapters('python'),
        lessons
    };
}
