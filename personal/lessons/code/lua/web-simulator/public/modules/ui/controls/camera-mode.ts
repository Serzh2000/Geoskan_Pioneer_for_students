import { log } from '../../shared/logging/logger.js';
import {
    setCameraMode as setCameraModeState,
    setFreeCameraSubMode as setFreeCameraSubModeState,
    type CameraMode,
    type FreeCameraSubMode
} from '../../scene/core/camera-mode-state.js';

// Slides `.camera-controls__indicator` behind whichever button just became
// active, instead of each button toggling its own background instantly.
function slideIndicatorTo(group: HTMLElement, activeButton: HTMLButtonElement | null) {
    const indicator = group.querySelector('.camera-controls__indicator') as HTMLElement | null;
    if (!indicator || !activeButton) return;

    // offsetLeft is already relative to `group` (its offsetParent, since
    // .camera-controls is position:relative) - subtracting group.offsetLeft
    // here would subtract an unrelated offset (group's own position
    // relative to ITS offsetParent) and throw the indicator off completely.
    indicator.style.transform = `translateX(${activeButton.offsetLeft}px)`;
    indicator.style.width = `${activeButton.offsetWidth}px`;
}

function syncGroup(group: HTMLElement | null, isActive: (button: HTMLButtonElement) => boolean) {
    if (!group) return;
    let activeButton: HTMLButtonElement | null = null;
    const buttons = group.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn) => {
        const active = isActive(btn);
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
        if (active) activeButton = btn;
    });
    slideIndicatorTo(group, activeButton);
}

export function initCameraModeUI() {
    const modeGroup = document.querySelector('.camera-controls:not(.camera-free-mode-controls)') as HTMLElement | null;
    const freeSubModeGroup = document.getElementById('camera-free-mode-controls');

    (window as any).setCameraMode = function(mode: CameraMode) {
        setCameraModeState(mode);
        syncGroup(modeGroup, (btn) => (btn.getAttribute('onclick') || '').includes(`'${mode}'`));
        if (freeSubModeGroup) freeSubModeGroup.hidden = mode !== 'free';
        log(`Режим камеры: ${mode.toUpperCase()}`, 'info');
    };

    (window as any).setCameraFreeSubMode = function(subMode: FreeCameraSubMode) {
        setFreeCameraSubModeState(subMode);
        syncGroup(freeSubModeGroup, (btn) => (btn.getAttribute('onclick') || '').includes(`'${subMode}'`));
        log(`Свободная камера: ${subMode === 'fly' ? 'полёт' : 'орбита'}`, 'info');
    };

    (window as any).setCameraMode('free');
    (window as any).setCameraFreeSubMode('orbit');

    // Button widths depend on layout/fonts that may not be final on first
    // paint (webfont swap, etc.) - resync the indicators once after load so
    // they land on the real geometry instead of an early guess.
    window.addEventListener('resize', () => {
        syncGroup(modeGroup, (btn) => btn.classList.contains('is-active'));
        syncGroup(freeSubModeGroup, (btn) => btn.classList.contains('is-active'));
    });
}
