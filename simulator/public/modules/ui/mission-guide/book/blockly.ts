import { escapeHtml } from '../render/shared.js';
import type { BlocklyView } from '../render/blockly-view.js';
import { getWalkthroughContent } from '../walkthrough/content.js';
import { getWalkthroughProgress, walkthroughKey } from '../walkthrough/state.js';
import { PAGES_PER_LESSON, spreadOfStep, spreadPages, type BookContext, type BookNav } from './context.js';
import { spreadCurls } from './curls.js';
import { buildBookLesson } from './data.js';
import { renderBookFrame } from './frame.js';
import { renderFigurePage, renderIdeaPage, renderReviewPage, renderStampPage } from './pages.js';
import { renderBlocksTaskPage, renderBlocksTrialPage } from './practice-pages.js';
import { blocklySource } from './source.js';

function blocklyNav(view: BlocklyView): BookNav {
    const { nextLesson, lessonIndex } = view;
    return {
        note: nextLesson ? 'Можно переходить к следующему уроку.' : 'Все десять практикумов Blockly завершены.',
        hasPrevious: lessonIndex > 0,
        nextAttr: nextLesson ? 'data-guide-nav="next"' : '',
        next: nextLesson ? `<button type="button" class="btn-primary" data-guide-nav="next">Дальше: ${escapeHtml(nextLesson.title)} <span aria-hidden="true">→</span></button>` : ''
    };
}

/** A Blockly assignment as a book spread: the workspace sits on the left page where text lessons keep their code sheet. */
export function renderBlocklyBook(view: BlocklyView): string {
    const { lesson, language } = view;
    const source = blocklySource(view.state, lesson, language);
    const progress = getWalkthroughProgress(walkthroughKey(language, lesson.id), getWalkthroughContent(lesson).correct);
    const spread = spreadOfStep(progress.step);
    const ctx: BookContext = {
        source, book: buildBookLesson(source), spread, pages: spreadPages(source, spread), totalPages: view.state.lessons.length * PAGES_PER_LESSON,
        head: 'Учебник пилота · Blockly', nav: blocklyNav(view)
    };
    const [left, right] = spread === 1
        ? [renderIdeaPage(ctx), renderFigurePage(ctx)]
        : spread === 2
            ? [renderBlocksTaskPage(ctx, view), renderBlocksTrialPage(ctx, view)]
            : [renderReviewPage(ctx), renderStampPage(ctx, { completed: view.isCompleted, solved: Boolean(view.runtimeResult?.solved) })];
    const solved = Boolean(view.runtimeResult?.solved);
    const curls = spreadCurls(ctx, { ready: progress.answer === getWalkthroughContent(lesson).correct, hasChecked: view.hasChecked, solved, pending: view.checking, completed: view.isCompleted });
    return renderBookFrame(ctx, progress.step, left, right, curls, view.checking);
}
