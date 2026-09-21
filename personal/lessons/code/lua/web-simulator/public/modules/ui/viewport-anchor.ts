/*
 * The rail-toggle and run/stop/reset buttons live as direct children of
 * <body> (see index.html) so no panel/container overflow can ever clip
 * them - but that means plain CSS insets (`top/right/bottom/left: 12px`)
 * only line them up with the window's own edge, not with the actual scene
 * viewport card. That card sits further in, by .container's own padding
 * (14px normally, 6px past the 640px breakpoint - see
 * responsive/workspace/mobile-layout.css) plus the card's own padding, so
 * the buttons drift relative to the visible card at every breakpoint and
 * whenever the sidebar resizes. Track the card's real bounding rect every
 * frame instead and position the controls relative to ITS edges.
 */
const PAD = 12; // matches --panel-pad-x, the gap kept between the card edge and a button

function getAnchorRect(): DOMRect | null {
    const card = document.querySelector('.scene-viewport-card') as HTMLElement | null;
    if (card) {
        const rect = card.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return rect;
    }
    // The scene card is hidden (e.g. full-width code editor) - fall back to
    // the app's own outer container so the controls stay reachable.
    const container = document.querySelector('.container') as HTMLElement | null;
    return container ? container.getBoundingClientRect() : null;
}

function syncPositions() {
    requestAnimationFrame(syncPositions);

    const rect = getAnchorRect();
    if (!rect) return;

    const rail = document.getElementById('rail-toggle-btn');
    const runControls = document.querySelector('.viewport-run-controls') as HTMLElement | null;
    const sidebar = document.querySelector('.workspace-sidebar') as HTMLElement | null;

    if (runControls) {
        runControls.style.top = '';
        runControls.style.left = '';
        runControls.style.right = `${Math.max(0, Math.round(window.innerWidth - rect.right + PAD))}px`;
        runControls.style.bottom = `${Math.max(0, Math.round(window.innerHeight - rect.bottom + PAD))}px`;
    }

    if (rail) {
        // The rail is pinned open with no panel (bare icon strip) - shift
        // past its real right edge instead of the card's left edge.
        const dockedBare = document.body.classList.contains('is-rail-docked')
            && !document.body.classList.contains('has-open-panel');
        const left = dockedBare && sidebar ? sidebar.getBoundingClientRect().right + PAD : rect.left + PAD;
        rail.style.bottom = '';
        rail.style.right = '';
        rail.style.top = `${Math.round(rect.top + PAD)}px`;
        rail.style.left = `${Math.round(left)}px`;
    }
}

export function initViewportAnchor(): void {
    syncPositions();
}
