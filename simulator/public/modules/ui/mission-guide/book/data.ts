import { getWalkthroughTopic } from '../walkthrough/content.js';
import type { GuideLesson, GuideTextLesson } from '../types.js';
import type { LessonExample } from './example.js';
import { courseExample, topicExample } from './examples/index.js';
import type { BookSource } from './source.js';

export type BookFigureKind = 'ledbar' | 'drone';

/** What the three parts of a lesson are drawn from. */
export type BookLesson = {
    chapter: string;
    kicker: string;
    /** The theory: short paragraphs. */
    theory: string[];
    /** The example program, in the language of the lesson. */
    code: string;
    /** The example read fragment by fragment. */
    steps: Array<{ snippet: string; text: string }>;
    /** What to look at while the example runs. */
    watch: string;
    /** False while a lesson has no example of its own and the book falls back to the lesson's own texts. */
    authored: boolean;
    figure: BookFigureKind;
    figureCaption: string;
    figureHint: string;
};

function sentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+/g)?.map(item => item.trim()) ?? [text.trim()];
}

function authoredExample(source: BookSource): LessonExample | undefined {
    const { lesson } = source;
    return source.kind === 'course' ? courseExample(source.number) : topicExample(getWalkthroughTopic(lesson));
}

/** Without an example of its own a lesson reads from its explanation and shows its reference program. */
function fallback(source: BookSource): Pick<BookLesson, 'theory' | 'code' | 'steps' | 'watch'> {
    const lesson = source.lesson as GuideTextLesson | GuideLesson;
    const explanation = source.kind === 'course' ? (lesson as GuideTextLesson).summary : lesson.lessonIntro;
    return { theory: sentences(explanation), code: lesson.solutionCode.trim(), steps: [], watch: lesson.expectedOutcome };
}

export function buildBookLesson(source: BookSource): BookLesson {
    const { lesson, language } = source;
    const example = authoredExample(source);
    const code = example?.[language]?.trim();
    const own = example && code
        ? {
            theory: example.theory, code, watch: example.watch,
            steps: example.steps.flatMap(step => (step[language] ? [{ snippet: step[language]!, text: step.text }] : []))
        }
        : null;
    const lighting = source.kind === 'course'
        ? (lesson as GuideTextLesson).chapterId === 'lights'
        : getWalkthroughTopic(lesson).startsWith('led');
    return {
        ...(own ?? fallback(source)),
        authored: Boolean(own),
        chapter: source.chapter,
        kicker: `${source.label} · ${source.chapter}`,
        figure: lighting ? 'ledbar' : 'drone',
        figureCaption: lighting ? 'Лента из 29 светодиодов' : lesson.title,
        figureHint: lighting ? 'Двигайте ползунки: так выглядит команда и такого цвета будет лампочка.' : ''
    };
}
