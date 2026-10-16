/*
 * Instant hover/focus labels for the icon-only sidebar rail. The native
 * title tooltip shows up only after about a second, which is too slow for
 * the main way to find tools, so the rail has exactly one mechanism: the
 * label lives in data-tooltip (backed by aria-label for assistive tech) and
 * this module renders it. A `title` written later by other code (the theme
 * toggle and the rail disclosure rewrite theirs on every state change) is
 * moved into data-tooltip right away, so the two never show at once.
 *
 * A button whose action really has a keyboard shortcut may add it in
 * data-tooltip-shortcut ("Ctrl+Enter"); the tooltip then shows it next to the
 * name. No rail button has one today: no handler binds a key to a rail tab.
 */
import { initRailA11y } from './rail-a11y.js';

export function initRailTooltip(): void {
    initRailA11y();
    const rail = document.querySelector<HTMLElement>('.sidebar-tabs');
    if (!rail) return;
    const disclosure = document.getElementById('rail-toggle-btn');
    const hosts = disclosure ? [rail, disclosure] : [rail];

    const tip = document.createElement('div');
    tip.className = 'rail-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'rail-tooltip';
    document.body.appendChild(tip);

    let current: HTMLElement | null = null;

    const render = (button: HTMLElement, text: string) => {
        tip.textContent = text;
        const shortcut = button.dataset.tooltipShortcut;
        if (!shortcut) return;
        const key = document.createElement('span');
        key.className = 'rail-tooltip__key';
        key.textContent = shortcut;
        tip.appendChild(key);
    };

    const adoptTitle = (button: HTMLElement) => {
        if (!button.title) return;
        button.dataset.tooltip = button.title;
        button.removeAttribute('title');
        if (current === button) render(button, button.dataset.tooltip);
    };

    const labelOf = (button: HTMLElement) => {
        adoptTitle(button);
        return button.dataset.tooltip || button.getAttribute('aria-label') || '';
    };

    const show = (button: HTMLElement) => {
        const text = labelOf(button);
        if (!text) return;
        current = button;
        render(button, text);
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
        (target as HTMLElement | null)?.closest<HTMLElement>('.sidebar-tab-btn, #rail-toggle-btn') ?? null;

    // Adopt the titles present now and every one written afterwards.
    const adoptAll = () => hosts.forEach((host) => {
        if (host.matches('[title]')) adoptTitle(host);
        host.querySelectorAll<HTMLElement>('[title]').forEach(adoptTitle);
    });
    adoptAll();
    if (typeof MutationObserver === 'function') {
        const observer = new MutationObserver((records) => {
            for (const record of records) {
                const target = record.target as HTMLElement;
                const button = buttonFrom(target);
                if (button) adoptTitle(button);
            }
        });
        hosts.forEach((host) => observer.observe(host, { attributes: true, attributeFilter: ['title'], subtree: true }));
    }

    hosts.forEach((host) => {
        host.addEventListener('pointerover', (event) => {
            const button = buttonFrom(event.target);
            if (!button) hide();
            else if (button !== current) show(button);
        });
        host.addEventListener('pointerleave', hide);
        host.addEventListener('focusin', (event) => {
            const button = buttonFrom(event.target);
            if (button && button.matches(':focus-visible')) show(button);
        });
        host.addEventListener('focusout', hide);
        host.addEventListener('click', hide);
    });
    window.addEventListener('resize', hide);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hide();
    });
}
