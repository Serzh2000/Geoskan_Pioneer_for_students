import { escapeHtml } from '../render/shared.js';
import type { BlocklyView } from '../render/blockly-view.js';
import { walkthroughKey } from '../walkthrough/state.js';
import { PAGES_PER_LESSON, spreadPages, type BookContext, type BookNav } from './context.js';
import { spreadCurls } from './curls.js';
import { buildBookLesson } from './data.js';
import { renderBookFrame } from './frame.js';
import { renderDemoPages, renderTheoryPages } from './pages.js';
import { renderBlocksTaskPage, renderBlocksTrialPage } from './practice-pages.js';
import { blocklySource } from './source.js';
import { getBookStep } from './steps.js';

function blocklyNav(view: BlocklyView): BookNav {
    const { nextLesson, lessonIndex } = view;
    return {
        note: nextLesson ? 'Урок пройден. Можно переходить к следующему.' : 'Все десять практикумов Blockly завершены.',
        hasPrevious: lessonIndex > 0,
        nextAttr: nextLesson ? 'data-guide-nav="next"' : '',
        next: nextLesson ? `<button type="button" class="btn-primary" data-guide-nav="next">Дальше: ${escapeHtml(nextLesson.title)} <span aria-hidden="true">→</span></button>` : ''
    };
}

/** A Blockly assignment as a book spread: the workspace sits on the left page where text lessons keep their code sheet. */
export function renderBlocklyBook(view: BlocklyView): string {
    const { lesson, language } = view;
    const source = blocklySource(view.state, lesson, language);
    const step = getBookStep(walkthroughKey(language, lesson.id));
    const ctx: BookContext = {
        source, book: buildBookLesson(source), step, pages: spreadPages(source, step),
        totalPages: view.state.lessons.length * PAGES_PER_LESSON, head: 'Учебник пилота · Blockly', nav: blocklyNav(view)
    };
    const [left, right] = step === 'theory'
        ? renderTheoryPages(ctx)
        : step === 'demo'
            ? renderDemoPages(ctx)
            : [renderBlocksTaskPage(ctx, view), renderBlocksTrialPage(ctx, view)];
    return renderBookFrame(ctx, left, right, spreadCurls(ctx, { completed: view.isCompleted }), view.checking);
}
