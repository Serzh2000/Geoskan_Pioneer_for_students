/** Shared modal focus scope. Background state is restored exactly as it was. */
export function createModalFocusScope(overlay: HTMLElement) {
    let returnTo: HTMLElement | null = null;
    const background = new Map<HTMLElement, boolean>();
    overlay.addEventListener('keydown', event => {
        if (event.key !== 'Tab' || event.defaultPrevented) return;
        const targets = [...overlay.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')]
            .filter(item => !item.closest('[inert]') && item.getClientRects().length > 0);
        if (!targets.length) { event.preventDefault(); return; }
        const first = targets[0], last = targets[targets.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !overlay.contains(active))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (active === last || !overlay.contains(active))) { event.preventDefault(); first.focus(); }
    });
    return {
        open(initial: HTMLElement | null) {
            returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            for (const element of document.body.children) {
                if (!(element instanceof HTMLElement) || element === overlay || ['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName)) continue;
                background.set(element, element.inert);
                element.inert = true;
            }
            initial?.focus({ preventScroll: true });
        },
        close() {
            background.forEach((value, element) => { element.inert = value; });
            background.clear();
            if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
            returnTo = null;
        }
    };
}
