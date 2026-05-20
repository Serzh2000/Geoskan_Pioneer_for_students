import { currentScriptLanguage } from '../../core/state.js';
import { logGuideEvent } from './guide-logging.js';
import { renderMissionGuidePanel } from './panel.js';
import { restoreMissionGuideScenePreview } from './scene-preview.js';

export function initMissionGuideModal() {
    let overlay = document.getElementById('mission-guide-overlay') as HTMLDivElement | null;
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mission-guide-overlay';
        overlay.className = 'modal-overlay guide-modal-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="modal-content guide-modal" role="dialog" aria-modal="true" aria-labelledby="mission-guide-title">
                <div class="guide-modal__header">
                    <div class="guide-modal__title-wrap">
                        <div class="guide-modal__eyebrow">\u0423\u0447\u0435\u0431\u043d\u044b\u0439 \u043c\u043e\u0434\u0443\u043b\u044c</div>
                        <div id="mission-guide-title" class="guide-modal__title">\u041f\u0440\u0430\u043a\u0442\u0438\u043a\u0443\u043c \u043f\u043e Pioneer API</div>
                        <div class="guide-modal__subtitle">\u041f\u043e\u0448\u0430\u0433\u043e\u0432\u044b\u0435 \u0443\u0440\u043e\u043a\u0438 \u043f\u043e \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044e \u0434\u0440\u043e\u043d\u043e\u043c \u0432 \u0441\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440\u0435</div>
                    </div>
                    <button type="button" id="mission-guide-close" class="modal-close-btn guide-modal__close" aria-label="\u0417\u0430\u043a\u0440\u044b\u0442\u044c">&times;</button>
                </div>
                <div id="mission-guide-modal-body" class="guide-modal__body"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const guideButton = document.getElementById('sidebar-guide-btn');

    const syncGuideButtonState = (isOpen: boolean) => {
        guideButton?.classList.toggle('active', isOpen);
    };

    const hide = () => {
        if (!overlay) return;
        logGuideEvent('modal_close', { language: currentScriptLanguage });
        restoreMissionGuideScenePreview();
        overlay.style.display = 'none';
        syncGuideButtonState(false);
    };

    const show = () => {
        if (!overlay) return;
        logGuideEvent('modal_open', { language: currentScriptLanguage });
        overlay.style.display = 'flex';
        // Need to give the browser a moment to apply display: flex before rendering Blockly
        setTimeout(() => {
            renderMissionGuidePanel(currentScriptLanguage);
            syncGuideButtonState(true);
        }, 150);
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            hide();
        }
    });

    overlay.querySelector('#mission-guide-close')?.addEventListener('click', hide);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay?.style.display !== 'none') {
            hide();
        }
    });

    (window as any).openMissionGuideModal = show;
    (window as any).closeMissionGuideModal = hide;
}
