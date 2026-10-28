import { setBookView } from '../book/view.js';
import { currentScriptLanguage } from '../../../core/state.js';
import { switchGuideTrack } from '../course-navigation.js';
import { saveMissionGuideDraft } from '../support/monaco-preview.js';
import { getLedbarState, setLedbarState, syncLedbarFigure, type LedbarState } from '../book/ledbar.js';
import { runExample, stopExample } from '../book/demo.js';
import { liveScene, printScene, settleScene } from '../book/scene-plate.js';
import { attachCurlPeel } from '../book/curls.js';
import { BOOK_STEPS, setBookStep, type BookStep } from '../book/steps.js';
import { walkthroughKey } from '../walkthrough/state.js';
import type { WalkthroughLesson } from '../walkthrough/content.js';
import type { GuidePracticeTrack, RenderMissionGuidePanel } from '../types.js';

const KNOBS = ['index', 'r', 'g', 'b'] as const;

// ---- navigation: the contents panel and the arrow keys. The book re-renders its DOM on every state change, so the listeners
// are installed once on the document and look at the live DOM every time. ----

/** The book that is on the screen now, or null when the textbook is closed or shows the plain page. */
function liveBook(): HTMLElement | null {
    const book = document.querySelector<HTMLElement>('.book');
    return book && book.getClientRects().length > 0 ? book : null;
}

function contentsOf(book: HTMLElement): { panel: HTMLElement; toggle: HTMLButtonElement } | null {
    const panel = book.querySelector<HTMLElement>('#book-toc');
    const toggle = book.querySelector<HTMLButtonElement>('[data-book-toc-toggle]');
    return panel && toggle ? { panel, toggle } : null;
}

function contentsOpen(book: HTMLElement | null): boolean {
    const parts = book ? contentsOf(book) : null;
    return Boolean(parts && !parts.panel.hidden);
}

function setContents(book: HTMLElement, open: boolean, focus: 'panel' | 'toggle' | 'none'): void {
    const parts = contentsOf(book);
    if (!parts) return;
    parts.panel.hidden = !open;
    parts.toggle.setAttribute('aria-expanded', String(open));
    if (open && focus === 'panel') {
        const current = parts.panel.querySelector<HTMLElement>('.book-toc__lesson.is-current');
        current?.scrollIntoView({ block: 'center' });
        (current ?? parts.panel).focus({ preventScroll: true });
    } else if (!open && focus === 'toggle') parts.toggle.focus();
}

function confirmOpen(): boolean {
    const bar = document.getElementById('mission-guide-close-confirm');
    return Boolean(bar && !bar.hidden);
}

/** Keys that belong to a field: arrows move its caret, they must not turn the page. */
function typingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], .monaco-editor, .blocklyWidgetDiv, .blocklySvg, .blocklyDropDownDiv'));
}

let navigationInstalled = false;
function installBookNavigation(): void {
    if (navigationInstalled) return;
    navigationInstalled = true;
    // Capture: the textbook closes on Escape in a bubbling listener unless somebody has already used the key.
    document.addEventListener('keydown', event => {
        const book = liveBook();
        if (!book || confirmOpen()) return;
        if (event.key === 'Escape') {
            if (!contentsOpen(book)) return;
            event.preventDefault();
            setContents(book, false, 'toggle');
            return;
        }
        if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || event.defaultPrevented) return;
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || contentsOpen(book) || typingTarget(event.target) || typingTarget(document.activeElement)) return;
        const curl = book.querySelector<HTMLButtonElement>(event.key === 'ArrowLeft' ? '.book-curl--back' : '.book-curl--next');
        if (!curl || curl.disabled) return;
        event.preventDefault();
        curl.click();
    }, true);
    document.addEventListener('click', event => {
        const book = liveBook();
        if (!book || !(event.target instanceof Element)) return;
        const toggle = event.target.closest('[data-book-toc-toggle]');
        if (toggle && book.contains(toggle)) {
            setContents(book, !contentsOpen(book), 'panel');
            return;
        }
        if (!contentsOpen(book)) return;
        if (event.target.closest('[data-book-toc-close]')) { setContents(book, false, 'toggle'); return; }
        const inPanel = event.target.closest('#book-toc');
        const opens = event.target.closest('.book-toc__lesson:not(:disabled)');
        if (!inPanel || opens) setContents(book, false, 'none');
    });
}

/** Wires the controls only the book has: the parts of a lesson, the example run, the view switch, the volumes, the LED strip knobs. */
export function attachBookBindings(container: HTMLElement, track: 'lua' | 'python', lesson: WalkthroughLesson, rerender: RenderMissionGuidePanel): void {
    attachCurlPeel(container);
    installBookNavigation();
    container.querySelectorAll<HTMLButtonElement>('[data-book-view]').forEach(button => {
        button.addEventListener('click', () => {
            setBookView(button.dataset.bookView === 'on');
            rerender(track);
        });
    });

    container.querySelector<HTMLButtonElement>('[data-book-close]')?.addEventListener('click', () => {
        (window as unknown as { closeMissionGuideModal?: () => boolean }).closeMissionGuideModal?.();
    });
    // The volumes do what the tabs of the modal header do; the book hides that header.
    container.querySelectorAll<HTMLButtonElement>('[data-book-track]').forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.bookTrack as GuidePracticeTrack;
            const volume = container.querySelector<HTMLElement>('.book')?.dataset.bookVolume;
            if (button.disabled || target === volume) return;
            saveMissionGuideDraft();
            const notice = switchGuideTrack(target);
            const status = document.getElementById('mission-guide-track-status');
            if (status) { status.textContent = notice; status.dataset.notice = notice; delete status.dataset.noticeScope; }
            rerender(currentScriptLanguage);
        });
    });

    const key = walkthroughKey(track, lesson.id);
    container.querySelectorAll<HTMLButtonElement>('[data-book-step]').forEach(button => {
        button.addEventListener('click', () => {
            const step = button.dataset.bookStep as BookStep;
            if (button.disabled || !BOOK_STEPS.includes(step)) return;
            setBookStep(key, step);
            rerender(track);
        });
    });

    // The demonstration opens with the print of the viewport.
    printScene(container);
    const status = container.querySelector<HTMLElement>('[data-book-demo-status]');
    container.querySelector<HTMLButtonElement>('[data-book-demo]')?.addEventListener('click', event => {
        const code = container.querySelector<HTMLElement>('[data-book-code]')?.textContent ?? '';
        const button = event.currentTarget as HTMLButtonElement;
        button.disabled = true;
        if (status) status.textContent = 'Запускаю пример…';
        void runExample(track, code).then(started => {
            if (started) liveScene(container);
            if (status && started) status.textContent = 'Пример выполняется. Смотрите сцену; запустить его ещё раз можно в любой момент.';
        }).catch(() => {
            if (status) status.textContent = 'Пример не удалось запустить. Нажмите «Остановить и сбросить» и повторите.';
        }).finally(() => { button.disabled = false; });
    });
    container.querySelector<HTMLButtonElement>('[data-book-demo-stop]')?.addEventListener('click', () => {
        stopExample();
        settleScene(container);
        if (status) status.textContent = 'Сцена сброшена. Можно запустить пример снова.';
    });

    container.querySelectorAll<HTMLElement>('[data-lb-figure]').forEach(figure => {
        const id = figure.dataset.lbLesson || lesson.id;
        syncLedbarFigure(figure, track, getLedbarState(id));
        figure.querySelectorAll<HTMLInputElement>('input[data-lb]').forEach(input => {
            input.addEventListener('input', () => {
                const knob = input.dataset.lb as typeof KNOBS[number];
                if (!KNOBS.includes(knob)) return;
                const next: LedbarState = { ...getLedbarState(id), [knob]: Number(input.value) };
                setLedbarState(id, next);
                syncLedbarFigure(figure, track, next);
            });
        });
    });
}
