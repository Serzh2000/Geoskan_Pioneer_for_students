import { openApiDocsCatalog } from '../../api-docs/index.js';

export function openGuideReference(options: Parameters<typeof openApiDocsCatalog>[0]): void {
    const guideWindow = window as Window & {
        closeMissionGuideModal?: () => void;
        openMissionGuideModal?: () => void;
    };
    // The reference is an editor drawer; keeping the modal open would cover it.
    guideWindow.closeMissionGuideModal?.();
    openApiDocsCatalog(options);
    const drawer = document.getElementById('editor-docs');
    if (!drawer || drawer.querySelector('[data-guide-return]')) return;
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'guide-reference-return';
    back.dataset.guideReturn = '';
    back.textContent = '← Вернуться к уроку';
    back.addEventListener('click', () => {
        guideWindow.openMissionGuideModal?.();
        back.remove();
    });
    drawer.prepend(back);
    back.focus();
}
