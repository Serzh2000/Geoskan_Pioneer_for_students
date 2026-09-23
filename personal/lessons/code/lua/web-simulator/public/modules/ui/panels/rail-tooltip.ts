/*
 * Instant hover/focus labels for the icon-only sidebar rail. The native
 * title tooltip shows up only after about a second, which is too slow for
 * the main way to find tools; the label text still comes from each button's
 * title (moved into data-tooltip so the two never show at once), falling
 * back to aria-label.
 */
export function initRailTooltip(): void {
    const rail = document.querySelector<HTMLElement>('.sidebar-tabs');
    if (!rail) return;

    const tip = document.createElement('div');
    tip.className = 'rail-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'rail-tooltip';
    document.body.appendChild(tip);

    let current: HTMLElement | null = null;

    const labelOf = (button: HTMLElement) => {
        // Re-read every time: the theme toggle rewrites its title on switch.
        if (button.title) {
            button.dataset.tooltip = button.title;
            button.removeAttribute('title');
        }
        return button.dataset.tooltip || button.getAttribute('aria-label') || '';
    };

    const show = (button: HTMLElement) => {
        const text = labelOf(button);
        if (!text) return;
        current = button;
        tip.textContent = text;
        const rect = button.getBoundingClientRect();
        tip.style.left = `${Math.round(rect.right + 10)}px`;
        tip.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
        button.setAttribute('aria-describedby', tip.id);
        tip.classList.add('is-visible');
    };

    const hide = () => {
        current?.removeAttribute('aria-describedby');
        current = null;
        tip.classList.remove('is-visible');
    };

    const buttonFrom = (target: EventTarget | null) =>
        (target as HTMLElement | null)?.closest<HTMLElement>('.sidebar-tab-btn') ?? null;

    rail.addEventListener('pointerover', (event) => {
        const button = buttonFrom(event.target);
        if (!button) hide();
        else if (button !== current) show(button);
    });
    rail.addEventListener('pointerleave', hide);
    rail.addEventListener('focusin', (event) => {
        const button = buttonFrom(event.target);
        if (button && button.matches(':focus-visible')) show(button);
    });
    rail.addEventListener('focusout', hide);
    rail.addEventListener('click', hide);
    window.addEventListener('resize', hide);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hide();
    });
}
