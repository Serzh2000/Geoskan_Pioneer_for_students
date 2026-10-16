import { log } from '../../shared/logging/logger.js';
import {
    setCameraMode as setCameraModeState,
    setFreeCameraSubMode as setFreeCameraSubModeState,
    type CameraMode,
    type FreeCameraSubMode
} from '../../scene/core/camera-mode-state.js';

function syncGroup(group: HTMLElement | null, isActive: (button: HTMLButtonElement) => boolean) {
    if (!group) return;
    const buttons = group.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn) => {
        const active = isActive(btn);
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
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

}
