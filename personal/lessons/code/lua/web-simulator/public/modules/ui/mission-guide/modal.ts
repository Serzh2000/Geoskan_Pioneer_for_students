import { currentScriptLanguage } from '../../core/state.js';
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
                        <div id="mission-guide-title" class="guide-modal__title">Краткое руководство</div>
                        <div class="guide-modal__subtitle">5 интерактивных учебных страниц с drag-and-drop паззлами и реальными командами Pioneer API</div>
                    </div>
                    <button type="button" id="mission-guide-close" class="modal-close-btn guide-modal__close" aria-label="Закрыть">✕</button>
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
        restoreMissionGuideScenePreview();
        overlay.style.display = 'none';
        syncGuideButtonState(false);
    };

    const show = () => {
        if (!overlay) return;
        renderMissionGuidePanel(currentScriptLanguage);
        overlay.style.display = 'flex';
        syncGuideButtonState(true);
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
