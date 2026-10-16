/** One owner for the compact course outline, including its keyboard visibility. */
export function setCourseOutlineOpen(overlay: HTMLElement, open: boolean, compact: boolean): void {
    overlay.classList.toggle('is-outline-open', open);
    const toggle = overlay.querySelector<HTMLButtonElement>('[data-guide-outline-toggle]');
    toggle?.setAttribute('aria-expanded', String(open));
    if (toggle) toggle.textContent = open ? 'К уроку' : 'Оглавление';
    const outline = overlay.querySelector<HTMLElement>('#mission-guide-outline');
    const content = overlay.querySelector<HTMLElement>('#mission-guide-modal-body');
    if (outline) {
        outline.inert = compact && !open;
        outline.setAttribute('aria-hidden', String(compact && !open));
    }
    if (content) {
        content.inert = compact && open;
        content.setAttribute('aria-hidden', String(compact && open));
    }
}

export function focusCourseContent(overlay: HTMLElement): void {
    overlay.querySelector<HTMLElement>('#guide-walkthrough-content')?.focus({ preventScroll: true });
}

export function focusCourseOutline(overlay: HTMLElement): void {
    const current = overlay.querySelector<HTMLButtonElement>('#mission-guide-outline button[aria-current="page"]:not(:disabled)');
    const target = current ?? overlay.querySelector<HTMLButtonElement>('#mission-guide-outline button:not(:disabled)');
    target?.focus({ preventScroll: true });
}
