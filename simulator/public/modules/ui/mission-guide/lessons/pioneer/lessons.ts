import type { ScriptLanguage } from '../../../api-docs/sections.js';
import type { GuideChapter, GuideLesson } from '../../types.js';
import { PIONEER_GROUP_TITLES, PIONEER_LESSONS } from './catalog.js';
import type { PioneerGroup, PioneerLessonSpec } from './types.js';

const GROUPS: PioneerGroup[] = ['flight', 'light', 'logic', 'projects'];
const GROUP_SUMMARIES: Record<PioneerGroup, string> = {
    flight: 'Взлёт, посадка, точки маршрута, фигуры и повтор — всё из блоков, которые работают и в Lua, и в Python.',
    light: 'Подсветка дрона: готовые цвета, свой цвет из RGB и мигание с паузами.',
    logic: 'Переменные, условия, цикл «для» и свои функции: программа начинает думать.',
    projects: 'Груз, отложенные действия, таймеры и итоговая миссия — блоки работают вместе.'
};

function chapterId(group: PioneerGroup): string {
    return `pioneer-${group}`;
}

function idPrefix(language: ScriptLanguage): string {
    return language === 'python' ? 'py' : 'lua';
}

function toLesson(spec: PioneerLessonSpec, language: ScriptLanguage): GuideLesson {
    return {
        id: `${idPrefix(language)}-${spec.topic}`,
        chapterId: chapterId(spec.group),
        badge: '',
        title: spec.title,
        goal: spec.goal,
        summary: spec.summary,
        lessonIntro: spec.intro,
        expectedOutcome: spec.outcome,
        builderHint: spec.hint,
        apiFocus: spec.notes.map((note, index) => ({ title: `Шаг ${index + 1}`, summary: note })),
        targetBlockIds: [],
        blocks: [],
        links: [],
        solutionCode: '',
        actionLabel: 'Открыть справочник API',
        actionQuery: language === 'python' ? 'go_to_local_point' : 'ap.goToLocalPoint',
        errorCatalog: [],
        missingBlockDiagnostics: {},
        compile: () => '',
        pioneer: spec
    };
}

/** Уроки на блоках pioneer_* для одного языка: блоки одни и те же, id и прогресс — свои у каждого языка. */
export function getPioneerBlockLessons(language: ScriptLanguage): GuideLesson[] {
    return lessonsFor(language).map((spec) => toLesson(spec, language));
}

function lessonsFor(language: ScriptLanguage): PioneerLessonSpec[] {
    return PIONEER_LESSONS.filter((spec) => !spec.languages || spec.languages.includes(language));
}

/** Главы практикума на блоках: по одной на группу уроков. */
export function getPioneerChapters(language: ScriptLanguage): GuideChapter[] {
    return GROUPS.map((group, index) => {
        const specs = lessonsFor(language).filter((spec) => spec.group === group);
        const tasks = specs.map((spec) => ({
            lessonId: `${idPrefix(language)}-${spec.topic}`,
            title: spec.title,
            summary: spec.summary,
            difficulty: (group === 'flight' || group === 'light' ? 'basic' : group === 'logic' ? 'intermediate' : 'advanced') as 'basic' | 'intermediate' | 'advanced'
        }));
        return {
            id: chapterId(group),
            badge: `Блоки ${index + 1}`,
            title: PIONEER_GROUP_TITLES[group],
            summary: GROUP_SUMMARIES[group],
            theoryIntro: GROUP_SUMMARIES[group],
            theorySections: [{
                title: PIONEER_GROUP_TITLES[group],
                paragraphs: [GROUP_SUMMARIES[group], `Уроков в главе: ${specs.length}. В каждом — теория, пример из блоков, который можно запустить, и задание.`],
                takeaway: 'Блоки одни и те же для Lua и Python: редактор сам собирает код под выбранный язык.'
            }],
            practiceHeading: 'Практика главы',
            practiceIntro: 'Каждое задание проверяется по настоящему полёту в симуляторе: программа запускается, а проверка смотрит, куда слетал дрон и как менялась подсветка.',
            practiceTasks: tasks,
            primaryLessonId: tasks[0].lessonId
        };
    });
}
