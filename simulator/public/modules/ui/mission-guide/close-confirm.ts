/**
 * Inline confirmation shown at the top of the textbook when it is closed while a check is
 * running. It is part of the dialog (no window.confirm), so the modal focus scope keeps working.
 */
export const CLOSE_CONFIRM_MARKUP = `
    <div id="mission-guide-close-confirm" class="guide-close-confirm" role="group" aria-labelledby="mission-guide-close-confirm-text" hidden>
        <p id="mission-guide-close-confirm-text" class="guide-close-confirm__text" role="alert">Проверка ещё идёт. Остановить её и закрыть учебник?</p>
        <div class="guide-close-confirm__actions">
            <button type="button" id="mission-guide-close-stop" class="btn-secondary btn--sm" data-guide-close-stop>Остановить и закрыть</button>
            <button type="button" id="mission-guide-close-continue" class="btn-primary btn--sm" data-guide-close-continue>Продолжить проверку</button>
        </div>
    </div>`;

export interface CloseConfirm {
    /** Shows the question when a check is running. Returns true when closing must wait for the answer. */
    request(): boolean;
    isOpen(): boolean;
    /** «Продолжить проверку»: hides the question and puts focus back where it was. */
    dismiss(): void;
    /** Hides the question without moving focus (the dialog is closing or reopening). */
    reset(): void;
}

export function createCloseConfirm(overlay: HTMLElement, options: { isBusy: () => boolean; stop: () => void }): CloseConfirm {
    const bar = overlay.querySelector<HTMLElement>('#mission-guide-close-confirm');
    const stopButton = overlay.querySelector<HTMLButtonElement>('[data-guide-close-stop]');
    const continueButton = overlay.querySelector<HTMLButtonElement>('[data-guide-close-continue]');
    const closeButton = overlay.querySelector<HTMLButtonElement>('#mission-guide-close');
    let returnTo: HTMLElement | null = null;

    const isOpen = () => Boolean(bar && !bar.hidden);
    const reset = () => {
        if (bar) bar.hidden = true;
        returnTo = null;
    };
    const dismiss = () => {
        if (!isOpen()) return;
        const target = returnTo;
        const hadFocus = !bar || bar.contains(overlay.ownerDocument.activeElement);
        reset();
        if (!hadFocus) return;
        // The element that held focus may have been replaced by a re-render while checking.
        const usable = target?.isConnected && !target.closest('[inert]') && !target.hasAttribute('disabled');
        (usable ? target : closeButton)?.focus({ preventScroll: true });
    };

    stopButton?.addEventListener('click', () => options.stop());
    continueButton?.addEventListener('click', dismiss);

    // A check that ends while the question is open makes the question stale.
    const body = overlay.querySelector('#mission-guide-modal-body');
    const Observer = overlay.ownerDocument.defaultView?.MutationObserver;
    if (body && Observer) {
        new Observer(() => { if (isOpen() && !options.isBusy()) dismiss(); }).observe(body, { attributes: true, attributeFilter: ['aria-busy'] });
    }

    return {
        request() {
            if (!bar || !options.isBusy()) return false;
            if (isOpen()) { continueButton?.focus({ preventScroll: true }); return true; }
            const active = overlay.ownerDocument.activeElement;
            returnTo = active && overlay.contains(active) ? active as HTMLElement : closeButton;
            bar.hidden = false;
            continueButton?.focus({ preventScroll: true });
            return true;
        },
        isOpen,
        dismiss,
        reset
    };
}
