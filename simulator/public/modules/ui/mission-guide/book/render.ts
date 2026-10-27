import { escapeHtml } from '../render/shared.js';
import { describeLessonNav } from '../render/lesson-nav.js';
import { isLessonCompleted } from '../state.js';
import { walkthroughKey, isWalkthroughBusy } from '../walkthrough/state.js';
import type { GuideTextLesson, GuideTextLessonState } from '../types.js';
import { PAGES_PER_LESSON, bookHead, spreadPages, type BookContext, type BookNav } from './context.js';
import { spreadCurls } from './curls.js';
import { buildBookLesson } from './data.js';
import { renderBookFrame } from './frame.js';
import { renderDemoPages, renderTheoryPages } from './pages.js';
import { renderCodeTaskPage, renderCodeTrialPage } from './practice-pages.js';
import { courseSource, practiceSource, type BookSource } from './source.js';
import { getBookStep } from './steps.js';

export { renderBookSwitch } from './frame.js';

function textNav(state: GuideTextLessonState, source: BookSource): BookNav {
    const nav = describeLessonNav(state, source.language, source.lesson as GuideTextLesson);
    const nextAttr = nav.next?.kind === 'python' ? 'data-academy-open="academy-073"' : nav.next ? 'data-guide-nav="next"' : '';
    const next = nav.next?.kind === 'python'
        ? '<button type="button" class="btn-primary" data-academy-open="academy-073">К камере на Python <span aria-hidden="true">→</span></button>'
        : nav.next
            ? `<button type="button" class="btn-primary" data-guide-nav="next">Дальше: ${escapeHtml(nav.next.lesson.title)} <span aria-hidden="true">→</span></button>`
            : '';
    return { note: nav.note, hasPrevious: Boolean(nav.previous), next, nextAttr };
}

/** A lesson of a text track (the numbered course or an extra task) as a book spread. */
export function renderBookGuide(state: GuideTextLessonState, track: 'lua' | 'python', lesson: GuideTextLesson): string {
    const source = lesson.academy ? courseSource(lesson, track) : practiceSource(state, lesson, track);
    const key = walkthroughKey(track, lesson.id);
    const step = getBookStep(key);
    const completed = isLessonCompleted(track, lesson.id);
    const ctx: BookContext = {
        source, book: buildBookLesson(source), step, pages: spreadPages(source, step),
        totalPages: state.lessons.length * PAGES_PER_LESSON, head: bookHead(source, step), nav: textNav(state, source)
    };
    const [left, right] = step === 'theory'
        ? renderTheoryPages(ctx)
        : step === 'demo'
            ? renderDemoPages(ctx)
            : [renderCodeTaskPage(ctx), renderCodeTrialPage(ctx, completed)];
    return renderBookFrame(ctx, left, right, spreadCurls(ctx, { completed }), isWalkthroughBusy(key));
}
