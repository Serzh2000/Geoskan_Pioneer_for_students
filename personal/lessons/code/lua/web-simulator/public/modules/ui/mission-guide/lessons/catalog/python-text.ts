import type { GuideTextLessonState } from '../../types.js';
import { getGuideChapters } from '../../curriculum.js';
import { getPythonTextLessons } from '../text/python.js';

export function getPythonTextLessonState(): GuideTextLessonState {
    const lessonMap = new Map(
        getPythonTextLessons().map((lesson) => [lesson.id, lesson] as const)
    );
    const lessons = [
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

    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Python-практикум (текстовый код)',
        heroTitle: 'Те же 10 уроков, но своими руками на Python',
        heroText: 'Это тот же учебный план, что и в Blockly-практикуме по Python, только вместо сборки из блоков вы пишете настоящий текстовый Python-код самостоятельно, опираясь на разбор методов Pioneer SDK и пример готового решения.',
        heroFlow: '10 уроков: от LED-подсветки к полной полетной миссии — теперь в виде рукописного кода',
        chapters: getGuideChapters('python'),
        lessons
    };
}
