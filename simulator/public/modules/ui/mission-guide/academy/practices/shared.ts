import type { GuideTextLesson } from '../../types.js';
import { ACADEMY_LESSONS } from '../catalog.js';
import { localize } from '../../book/localize.js';
import { explainerFor } from '../explainers.js';

export type AcademyCodeExercise = {
    number: number; task: string; observation: string; hint: string; experiment: string;
    question: string; right: string; wrong: string; feedback: string;
    lua: string; python: string; luaAnswer: string; pythonAnswer: string;
    waitMs?: number;
    /** Шаги карточки миссии, если задание удобнее показать по одному действию; в тексте допустимы <lua>/<py>. */
    taskSteps?: string[];
};

export function compileAcademyExercise(exercise: AcademyCodeExercise, language: 'lua' | 'python'): GuideTextLesson {
    const lesson = ACADEMY_LESSONS[exercise.number - 1];
    const body = exercise[language];
    const explain = explainerFor(lesson.number, language);
    const wrap = (code: string) => language === 'lua'
        ? `local leds = Ledbar.new(29)\n\n${code}\n${code.includes('function callback') ? '' : '\nfunction callback(event)\nend\n'}`
        : `from pioneer_sdk import Pioneer\nimport time\n\npioneer = Pioneer(simulator=True)\n\n${code}\n`;
    const correct = exercise.number % 2;
    // The task and the hint may carry <lua>/<py> passages: each track keeps only its own.
    exercise = {
        ...exercise, task: localize(exercise.task, language), hint: localize(exercise.hint, language), observation: localize(exercise.observation, language),
        experiment: localize(exercise.experiment, language), question: localize(exercise.question, language),
        right: localize(exercise.right, language), wrong: localize(exercise.wrong, language), feedback: localize(exercise.feedback, language)
    };
    return {
        id: `${language}-${lesson.id}`, topicId: lesson.id, chapterId: lesson.moduleId,
        badge: `Урок ${lesson.number}`, title: lesson.title, goal: exercise.task,
        taskSteps: exercise.taskSteps?.map(step => localize(step, language)),
        summary: explain, lessonIntro: `${explain} ${exercise.hint}`,
        expectedOutcome: exercise.observation, builderHint: exercise.hint,
        starterCode: wrap(body), solutionCode: wrap(body.split('___').join(language === 'lua' ? exercise.luaAnswer : exercise.pythonAnswer)),
        apiFocus: [{ title: lesson.concept, summary: exercise.hint }],
        links: [{ label: 'Команды текущего опыта', query: lesson.number < 28 ? language === 'lua' ? 'Ledbar set' : 'led_control' : language === 'lua' ? 'Timer callback ENGINES_STARTED' : 'sleep get_autopilot_state' }],
        academy: { number: lesson.number, mode: 'code', waitMs: exercise.waitMs, hints: [exercise.hint], experiment: exercise.experiment,
            teaching: { deviceTitle: lesson.title,
                device: `${explain} Тема урока: ${lesson.concept.toLowerCase()}.`,
                question: exercise.question.includes('?') ? exercise.question : `${exercise.question.replace(/…$/, '')}?`, correct,
                choices: (correct ? [exercise.wrong, exercise.right] : [exercise.right, exercise.wrong]).map((text, index) => ({ text, feedback: `${index === correct ? 'Верно. ' : 'Попробуйте ещё раз. '}${exercise.feedback}` })),
                takeaway: exercise.feedback }
        }
    };
}
