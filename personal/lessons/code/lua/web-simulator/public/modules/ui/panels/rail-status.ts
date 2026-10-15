/*
 * Connection dots on the rail's hardware tabs. The drone's tab is driven by droneLink (drone-link-panel.ts); the
 * gamepad's follows the status chip that the gamepad controller already keeps (`is-connected` on #gamepad-status),
 * so no second source of truth is added.
 */
export function initRailStatus(): void {
    const chip = document.getElementById('gamepad-status');
    const tab = document.getElementById('sidebar-gamepad-btn');
    if (!chip || !tab) return;
    const sync = () => {
        tab.dataset.link = chip.classList.contains('is-connected') ? 'connected' : 'disconnected';
    };
    sync();
    new MutationObserver(sync).observe(chip, { attributes: true, attributeFilter: ['class'] });
}
