import { currentScriptLanguage } from '../../core/state.js';
import { beginTemporaryEditorDocument, restoreTemporaryEditorDocument } from '../../editor/index.js';
import { renderApiDocs } from '../api-docs/index.js';
import { refreshFileList } from '../controls/file-controls.js';
import { logGuideEvent } from './support/logging.js';
import { renderMissionGuidePanel } from './panel.js';
import { restoreMissionGuideScenePreview } from './support/scene-preview.js';
import { restoreMissionGuideBlocklyPreview } from './support/blockly-preview.js';
import { restoreMissionGuideMonacoPreview } from './support/monaco-preview.js';
import { getActivePracticeTrack, isLessonCompleted, setActiveLessonId, setActivePracticeTrack } from './state.js';
import { ACADEMY_READY_NUMBERS } from './academy/practices/index.js';
import type { GuidePracticeTrack } from './types.js';
import { syncWalkthroughSession } from './walkthrough/state.js';
import { getAcademySceneEvidence, restoreAcademyScene } from './academy/scene.js';
import { resetSimulationState } from '../../app/simulation-controls.js';
import { createModalFocusScope } from '../modal-focus.js';
import { switchGuideTrack } from './course-navigation.js';
import { saveMissionGuideDraft } from './support/monaco-preview.js';
import { CLOSE_CONFIRM_MARKUP, createCloseConfirm } from './close-confirm.js';
import { focusCourseContent, focusCourseOutline, setCourseOutlineOpen } from './support/outline-navigation.js';

export function initMissionGuideModal() {
    let overlay = document.getElementById('mission-guide-overlay') as HTMLDivElement | null;
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mission-guide-overlay';
        overlay.className = 'guide-modal-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="guide-modal" role="dialog" aria-modal="true" aria-labelledby="mission-guide-title">
                <div class="guide-modal__header">
                    <div id="mission-guide-title" class="guide-modal__title">Учебник пилота</div>
                    <div id="mission-guide-track-switch" class="pk-seg guide-track-switch" role="tablist" aria-label="Способ программирования">
                        <button type="button" id="guide-track-python" class="pk-seg__btn" role="tab" aria-controls="mission-guide-modal-body" data-guide-track="python">Python <small>108</small></button>
                        <button type="button" id="guide-track-lua" class="pk-seg__btn" role="tab" aria-controls="mission-guide-modal-body" data-guide-track="lua">Lua <small>72</small></button>
                        <button type="button" id="guide-track-blockly" class="pk-seg__btn" role="tab" aria-controls="mission-guide-modal-body" data-guide-track="blockly">Blockly <small>10</small></button>
                    </div>
                    <button type="button" id="mission-guide-close" class="panel-close-btn guide-modal__close" aria-label="Закрыть учебник"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                ${CLOSE_CONFIRM_MARKUP}
                <div class="guide-modal__context"><button type="button" class="btn-secondary btn--sm" data-guide-outline-toggle aria-controls="mission-guide-outline" aria-expanded="false">Оглавление</button><span id="mission-guide-track-status" role="status"></span></div>
                <div class="guide-modal__workspace"><aside id="mission-guide-outline" class="guide-outline" aria-label="Программа обучения"></aside><div id="mission-guide-modal-body" class="guide-modal__body" role="tabpanel" tabindex="0"></div></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const guideButton = document.getElementById('sidebar-guide-btn');
    const trackSwitch = overlay.querySelector('#mission-guide-track-switch');
    const focusScope = createModalFocusScope(overlay);
    let originalTitle = document.title;

    const syncGuideButtonState = (isOpen: boolean) => {
        guideButton?.classList.toggle('active', isOpen);
    };

    const syncTrackSwitchState = () => {
        if (!trackSwitch) return;
        const activeTrack = getActivePracticeTrack();
        trackSwitch.querySelectorAll<HTMLButtonElement>('[data-guide-track]').forEach((button) => {
            const isActive = button.dataset.guideTrack === activeTrack;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.tabIndex = isActive ? 0 : -1;
        });
    };

    trackSwitch?.addEventListener('click', (event) => {
        const button = (event.target as HTMLElement).closest('[data-guide-track]') as HTMLElement | null;
        if (!(button instanceof HTMLButtonElement) || button.disabled) return;
        const track = button.dataset.guideTrack as GuidePracticeTrack;
        saveMissionGuideDraft();
        const notice = switchGuideTrack(track);
        const status = document.getElementById('mission-guide-track-status');
        if (status) { status.textContent = notice; status.dataset.notice = notice; delete status.dataset.noticeScope; }
        syncTrackSwitchState();
        if (overlay && overlay.style.display !== 'none') {
            renderMissionGuidePanel(currentScriptLanguage);
        }
    });
    trackSwitch?.addEventListener('keydown', (event) => {
        const key = (event as KeyboardEvent).key;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
        event.preventDefault();
        const tabs = [...trackSwitch.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
        const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        // Manual activation avoids switching a live editor while merely exploring tabs.
        tabs.forEach((tab, i) => { tab.tabIndex = i === next ? 0 : -1; });
        tabs[next]?.focus();
    });
    const outlineToggle = overlay.querySelector<HTMLButtonElement>('[data-guide-outline-toggle]');
    const compactOutline = window.matchMedia('(max-width: 900px)');
    const syncOutlineVisibility = () => setCourseOutlineOpen(overlay!, overlay!.classList.contains('is-outline-open'), compactOutline.matches);
    compactOutline.addEventListener('change', () => {
        const active = document.activeElement;
        syncOutlineVisibility();
        if (active instanceof HTMLElement && active.closest('[inert]')) outlineToggle?.focus();
    });
    syncOutlineVisibility();
    outlineToggle?.addEventListener('click', () => {
        const open = !overlay!.classList.contains('is-outline-open');
        setCourseOutlineOpen(overlay!, open, compactOutline.matches);
        if (open) focusCourseOutline(overlay!);
        else focusCourseContent(overlay!);
    });
    overlay.querySelector('#mission-guide-outline')?.addEventListener('click', event => {
        // Capture closes the outline before the lesson handler rerenders and places focus.
        if (!(event.target as HTMLElement).closest('button:not(:disabled)[data-academy-open], button:not(:disabled)[data-guide-open-lesson], button:not(:disabled)[data-guide-text-lesson]')) return;
        setCourseOutlineOpen(overlay!, false, compactOutline.matches);
    }, true);

    syncTrackSwitchState();

    const isBusy = () => document.getElementById('mission-guide-modal-body')?.getAttribute('aria-busy') === 'true';
    const closeConfirm = createCloseConfirm(overlay, { isBusy, stop: () => hide() });
    // Closing while a check runs asks first; false means the question is open and the textbook stays.
    const requestClose = (): boolean => {
        if (!overlay || overlay.style.display === 'none') return true;
        if (closeConfirm.request()) return false;
        hide();
        return true;
    };
    const hide = () => {
        if (!overlay) return;
        closeConfirm.reset();
        const wasRunning = isBusy();
        syncWalkthroughSession('closed');
        logGuideEvent('modal_close', { language: currentScriptLanguage });
        restoreMissionGuideScenePreview();
        restoreMissionGuideBlocklyPreview();
        restoreMissionGuideMonacoPreview();
        restoreTemporaryEditorDocument();
        renderApiDocs(currentScriptLanguage);
        refreshFileList(currentScriptLanguage);
        if (wasRunning || getAcademySceneEvidence()) {
            resetSimulationState();
            restoreAcademyScene();
        }
        overlay.style.display = 'none';
        setCourseOutlineOpen(overlay, false, compactOutline.matches);
        document.title = originalTitle;
        focusScope.close();
        syncGuideButtonState(false);
    };

    const show = () => {
        if (!overlay || overlay.style.display !== 'none') return;
        beginTemporaryEditorDocument();
        logGuideEvent('modal_open', { language: currentScriptLanguage });
        closeConfirm.reset();
        overlay.style.display = 'flex';
        originalTitle = document.title;
        document.title = 'Учебник пилота — Pioneer';
        focusScope.open(overlay.querySelector<HTMLButtonElement>('#mission-guide-close'));
        requestAnimationFrame(() => {
            if (!overlay || overlay.style.display === 'none') return;
            renderMissionGuidePanel(currentScriptLanguage);
            syncGuideButtonState(true);
        });
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            requestClose();
        }
    });

    overlay.querySelector('#mission-guide-close')?.addEventListener('click', () => { requestClose(); });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !event.defaultPrevented && overlay?.style.display !== 'none') {
            // Native select popups own Escape; closing them must not close the course.
            if (event.target instanceof HTMLSelectElement) return;
            // Escape while the question is open answers it with the safe choice: keep checking.
            if (closeConfirm.isOpen()) { event.preventDefault(); closeConfirm.dismiss(); return; }
            if (overlay?.classList.contains('is-outline-open')) { outlineToggle?.click(); outlineToggle?.focus(); return; }
            requestClose();
        }
    });

    // Opens the textbook at an academy lesson (a notice points at the page that explains its matter). A lesson that is
    // not ready or not unlocked yet cannot be opened, so the textbook then opens where the student left off.
    const openAtLesson = (number: number) => {
        if (!overlay) return;
        const language = currentScriptLanguage === 'python' ? 'python' : 'lua';
        const pad = (n: number) => String(n).padStart(3, '0');
        const fullId = `${language}-academy-${pad(number)}`;
        const previousDone = (['lua', 'python'] as const).some((track) => isLessonCompleted(track, `${track}-academy-${pad(number - 1)}`));
        if (ACADEMY_READY_NUMBERS.has(number) && (number === 1 || isLessonCompleted(language, fullId) || previousDone)) {
            setActivePracticeTrack(language);
            setActiveLessonId(language, fullId);
            syncTrackSwitchState();
        }
        if (overlay.style.display !== 'none') renderMissionGuidePanel(language);
        else show();
    };

    (window as any).openMissionGuideModal = show;
    (window as any).openMissionGuideLesson = openAtLesson;
    (window as any).closeMissionGuideModal = requestClose;
}
