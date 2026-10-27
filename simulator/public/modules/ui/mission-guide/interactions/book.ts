import { setBookView } from '../book/view.js';
import { currentScriptLanguage } from '../../../core/state.js';
import { switchGuideTrack } from '../course-navigation.js';
import { saveMissionGuideDraft } from '../support/monaco-preview.js';
import { getLedbarState, setLedbarState, syncLedbarFigure, type LedbarState } from '../book/ledbar.js';
import { getWalkthroughContent, type WalkthroughLesson } from '../walkthrough/content.js';
import { answerWalkthrough, getWalkthroughProgress, moveWalkthrough, walkthroughKey } from '../walkthrough/state.js';
import type { GuidePracticeTrack, RenderMissionGuidePanel } from '../types.js';

const KNOBS = ['index', 'r', 'g', 'b'] as const;

/** Wires the controls only the book spread has: the prediction marks, the view switch, the volumes, the LED strip knobs. */
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
    const correct = getWalkthroughContent(lesson).correct;
    container.querySelectorAll<HTMLButtonElement>('[data-book-answer]').forEach(button => {
        button.addEventListener('click', () => {
            answerWalkthrough(key, Number(button.dataset.bookAnswer), correct);
            // The book shows the idea and the prediction on one spread, so marking an answer is also the first step forward.
            if (getWalkthroughProgress(key, correct).step === 'device') moveWalkthrough(key, 'predict', correct, '');
            rerender(track);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-lb-figure]').forEach(figure => {
        const id = figure.dataset.lbLesson || lesson.id;
        const state = getLedbarState(id);
        syncLedbarFigure(figure, track, state);
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
