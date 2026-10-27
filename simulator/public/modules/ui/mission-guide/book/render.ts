import { escapeHtml } from '../render/shared.js';
import { describeLessonNav } from '../render/lesson-nav.js';
import { getMissionGuideDraft } from '../support/monaco-preview.js';
import { isLessonCompleted } from '../state.js';
import { getWalkthroughContent } from '../walkthrough/content.js';
import { getWalkthroughProgress, getWalkthroughResult, isWalkthroughBusy, walkthroughKey } from '../walkthrough/state.js';
import type { GuideTextLesson, GuideTextLessonState } from '../types.js';
import { PAGES_PER_LESSON, spreadOfStep, spreadPages, type BookContext, type BookNav } from './context.js';
import { spreadCurls } from './curls.js';
import { renderTextCheckParts } from '../render/text-check.js';
import { buildBookLesson } from './data.js';
import { renderBookFrame } from './frame.js';
import { renderFigurePage, renderIdeaPage, renderReviewPage, renderStampPage } from './pages.js';
import { renderCodeTaskPage, renderCodeTrialPage } from './practice-pages.js';
import { courseSource, practiceSource, type BookSource } from './source.js';

export { renderBookSwitch } from './frame.js';

/** The running head of the left page: the book's title and its language. */
export function bookHead(source: BookSource): string {
    return `Учебник пилота · ${source.volume === 'python' ? 'Python' : source.volume === 'lua' ? 'Lua' : 'Blockly'}`;
}

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
    const progress = getWalkthroughProgress(key, getWalkthroughContent(lesson).correct);
    const spread = spreadOfStep(progress.step);
    const ctx: BookContext = { source, book: buildBookLesson(source), spread, pages: spreadPages(source, spread), totalPages: state.lessons.length * PAGES_PER_LESSON, head: bookHead(source), nav: textNav(state, source) };
    const check = renderTextCheckParts(track, lesson);
    const completed = isLessonCompleted(track, lesson.id);
    const [left, right] = spread === 1
        ? [renderIdeaPage(ctx), renderFigurePage(ctx)]
        : spread === 2
            ? [renderCodeTaskPage(ctx), renderCodeTrialPage(ctx, progress.step)]
            : [renderReviewPage(ctx), renderStampPage(ctx, {
                completed,
                solved: Boolean(getWalkthroughResult(key, getMissionGuideDraft(track, lesson.id, lesson.starterCode))?.solved)
            })];
    const curls = spreadCurls(ctx, { ready: progress.answer === getWalkthroughContent(lesson).correct, hasChecked: check.hasChecked, solved: check.solved, pending: check.pending, completed });
    return renderBookFrame(ctx, progress.step, left, right, curls, isWalkthroughBusy(key));
}
