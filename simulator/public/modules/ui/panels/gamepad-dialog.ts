import { createModalFocusScope } from '../modal-focus.js';

/** Controller setup shares the textbook's full-window dialog and focus behavior. */
export function initGamepadDialog() {
    const panel = document.getElementById('gamepad-panel');
    const closeButton = document.getElementById('gamepad-dialog-close');
    if (!panel || !closeButton) return null;
    const overlay = document.createElement('div');
    overlay.id = 'gamepad-dialog';
    overlay.className = 'gamepad-modal-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'gamepad-dialog-title');
    panel.classList.remove('active');
    overlay.append(panel);
    document.body.append(overlay);
    const focus = createModalFocusScope(overlay);
    const opener = document.querySelector<HTMLButtonElement>(".sidebar-tab-btn[onclick*='gamepad-panel']");
    opener?.setAttribute('aria-haspopup', 'dialog');
    opener?.setAttribute('aria-controls', overlay.id);
    opener?.setAttribute('aria-expanded', 'false');
    const close = () => {
        if (overlay.hidden) return;
        overlay.hidden = true;
        opener?.setAttribute('aria-expanded', 'false');
        focus.close();
    };
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || event.defaultPrevented || event.target instanceof HTMLSelectElement) return;
        event.preventDefault();
        close();
    });
    // The setup wizard is a second dialog. Its existing controller owns its
    // display state; this observer supplies focus and background isolation.
    const wizard = document.getElementById('gp-wizard-overlay');
    const wizardClose = document.getElementById('gp-wizard-close');
    if (wizard && wizardClose) {
        const wizardFocus = createModalFocusScope(wizard);
        let wizardOpen = false;
        new MutationObserver(() => {
            const visible = wizard.style.display !== 'none' && wizard.getClientRects().length > 0;
            if (visible === wizardOpen) return;
            wizardOpen = visible;
            if (visible) {
                wizard.inert = false;
                wizardFocus.open(wizardClose);
            } else {
                wizardFocus.close();
                wizard.inert = !overlay.hidden;
            }
        }).observe(wizard, { attributes: true, attributeFilter: ['style'] });
        wizard.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || event.defaultPrevented || event.target instanceof HTMLSelectElement) return;
            event.preventDefault();
            wizardClose.click();
        });
    }
    return {
        open() {
            if (!overlay.hidden) return;
            overlay.hidden = false;
            opener?.setAttribute('aria-expanded', 'true');
            focus.open(closeButton);
            window.dispatchEvent(new Event('resize'));
        },
        close
    };
}
