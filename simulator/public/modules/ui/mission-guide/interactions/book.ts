import { setBookView } from '../book/view.js';
import { currentScriptLanguage } from '../../../core/state.js';
import { switchGuideTrack } from '../course-navigation.js';
import { saveMissionGuideDraft } from '../support/monaco-preview.js';
import { getLedbarState, setLedbarState, syncLedbarFigure, type LedbarState } from '../book/ledbar.js';
import { runExample, stopExample } from '../book/demo.js';
import { BOOK_STEPS, setBookStep, type BookStep } from '../book/steps.js';
import { walkthroughKey } from '../walkthrough/state.js';
import type { WalkthroughLesson } from '../walkthrough/content.js';
import type { GuidePracticeTrack, RenderMissionGuidePanel } from '../types.js';

const KNOBS = ['index', 'r', 'g', 'b'] as const;

/** Wires the controls only the book has: the parts of a lesson, the example run, the view switch, the volumes, the LED strip knobs. */
export function attachBookBindings(container: HTMLElement, track: 'lua' | 'python', lesson: WalkthroughLesson, rerender: RenderMissionGuidePanel): void {
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

    const status = container.querySelector<HTMLElement>('[data-book-demo-status]');
    container.querySelector<HTMLButtonElement>('[data-book-demo]')?.addEventListener('click', event => {
        const code = container.querySelector<HTMLElement>('[data-book-code]')?.textContent ?? '';
        const button = event.currentTarget as HTMLButtonElement;
        button.disabled = true;
        if (status) status.textContent = 'Запускаю пример…';
        void runExample(track, code).then(started => {
            if (status && started) status.textContent = 'Пример выполняется. Смотрите сцену; запустить его ещё раз можно в любой момент.';
        }).catch(() => {
            if (status) status.textContent = 'Пример не удалось запустить. Нажмите «Остановить и сбросить» и повторите.';
        }).finally(() => { button.disabled = false; });
    });
    container.querySelector<HTMLButtonElement>('[data-book-demo-stop]')?.addEventListener('click', () => {
        stopExample();
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
