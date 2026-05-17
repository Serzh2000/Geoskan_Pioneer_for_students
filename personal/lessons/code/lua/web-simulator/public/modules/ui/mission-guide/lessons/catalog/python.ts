import type { GuideLessonState } from '../../types.js';
import { getGuideChapters } from '../../curriculum.js';
import { getPythonExpandedLessons } from '../../python-lessons-expanded.js';
import { getPythonLedLessons } from '../led/python.js';
import { getPythonFlightLessons } from '../flight/python.js';

export function getPythonLessonState(): GuideLessonState {
    const lessonMap = new Map(
        [...getPythonLedLessons(), ...getPythonExpandedLessons(), ...getPythonFlightLessons()]
            .map((lesson) => [lesson.id, lesson] as const)
    );
    const lessons = [
        'py-led-single',
        'py-led-sequence',
        'py-led-confirm',
        'py-led-delayed',
        'py-arm',
        'py-takeoff',
        'py-route',
        'py-point-wait',
        'py-mission',
        'py-land'
    ]
        .map((lessonId) => lessonMap.get(lessonId))
        .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
        .map((lesson, index) => ({
            ...lesson,
            badge: `Задание ${index + 1}`
        }));

    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Python-практикум',
        heroTitle: 'Пошаговые уроки по Python SDK Pioneer',
        heroText: 'Каждый урок сначала объясняет нужные методы SDK, а затем предлагает собрать и проверить рабочую последовательность команд в симуляторе.',
        heroFlow: '10 уроков: от LED-подсветки к полной полетной миссии',
        chapters: getGuideChapters('python'),
        lessons
    };
}
