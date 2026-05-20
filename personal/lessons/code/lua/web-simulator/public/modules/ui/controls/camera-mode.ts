import { log } from '../../shared/logging/logger.js';

export function initCameraModeUI() {
    (window as any).setCameraMode = function(mode: string) {
        (window as any).cameraMode = mode;
        const buttons = document.querySelectorAll('.camera-controls button') as NodeListOf<HTMLButtonElement>;
        buttons.forEach((btn) => {
            const onclick = btn.getAttribute('onclick') || '';
            const isActive = onclick.includes(`'${mode}'`);
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
        log(`Режим камеры: ${mode.toUpperCase()}`, 'info');
    };

    (window as any).setCameraMode('free');
}
