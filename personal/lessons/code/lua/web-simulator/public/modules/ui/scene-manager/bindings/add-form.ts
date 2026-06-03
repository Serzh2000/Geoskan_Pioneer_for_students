import {
    getMapInputs,
    getSceneTypePreviewConfig,
    readAddSceneObjectDraft,
    syncFloorLimit,
    syncIncidentValue,
    updateAddControlsState,
    updateAddTypePreview,
    updateMapSummary
} from '../support.js';
import type { BindingOptions } from './shared.js';

const TYPE_MODAL_PAGE_SIZE = 16;

export function registerAddFormBindings({ callbacks, elements, render, typePreview }: BindingOptions) {
    const syncPreview = () => {
        updateAddTypePreview(elements);
        typePreview.sync();
    };
    const isModalOpen = () => !!elements.addTypeModalEl?.classList.contains('is-open');

    let pageIndex = 0;
    let pendingTypeValue: string | null = null;
    let modalIntent: 'select' | 'add' = 'select';

    const getOptions = () => Array.from(elements.addTypeEl?.options || []);
    const getPendingOption = () => {
        const options = getOptions();
        return options.find((option) => option.value === (pendingTypeValue || elements.addTypeEl?.value)) || options[0] || null;
    };
    const getPageCount = () => Math.max(1, Math.ceil(getOptions().length / TYPE_MODAL_PAGE_SIZE));
    const clampPageIndex = (value: number) => Math.min(Math.max(value, 0), getPageCount() - 1);
    const syncPageIndicator = () => {
        if (elements.addTypeModalPageIndicatorEl) {
            elements.addTypeModalPageIndicatorEl.textContent = `${pageIndex + 1} / ${getPageCount()}`;
        }
        elements.addTypeModalPrevBtn?.toggleAttribute('disabled', pageIndex <= 0);
        elements.addTypeModalNextBtn?.toggleAttribute('disabled', pageIndex >= getPageCount() - 1);
    };
    const focusModalCard = () => {
        const selectedCard = elements.addTypeModalGridEl?.querySelector<HTMLButtonElement>('.scene-type-modal__card.is-selected');
        const firstCard = elements.addTypeModalGridEl?.querySelector<HTMLButtonElement>('.scene-type-modal__card');
        (selectedCard || firstCard)?.focus();
    };
    const syncModalSelectionSummary = () => {
        const pendingOption = getPendingOption();
        if (!pendingOption) return;
        const meta = getSceneTypePreviewConfig(pendingOption.value, pendingOption.textContent?.trim() || pendingOption.value);
        if (elements.addTypeModalSelectionCardEl) {
            elements.addTypeModalSelectionCardEl.dataset.accent = meta.accent;
        }
        if (elements.addTypeModalSelectionTitleEl) {
            elements.addTypeModalSelectionTitleEl.textContent = pendingOption.textContent?.trim() || pendingOption.value;
        }
        if (elements.addTypeModalSelectionTextEl) {
            elements.addTypeModalSelectionTextEl.textContent = meta.description;
        }
        if (elements.addTypeModalSelectionIconEl) {
            elements.addTypeModalSelectionIconEl.innerHTML = meta.icon;
        }
        if (elements.addTypeModalApplyBtn && elements.addTypeEl) {
            const alreadyApplied = pendingOption.value === elements.addTypeEl.value;
            elements.addTypeModalApplyBtn.disabled = modalIntent === 'select' && alreadyApplied;
            elements.addTypeModalApplyBtn.textContent = modalIntent === 'add'
                ? 'Добавить объект'
                : alreadyApplied
                    ? 'Компонент уже выбран'
                    : 'Подтвердить выбор';
        }
    };
    const closeModal = (restoreFocus = false) => {
        if (!elements.addTypeModalEl) return;
        elements.addTypeModalEl.classList.remove('is-open');
        elements.addTypeModalEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('scene-type-modal-open');
        typePreview.hide();
        pendingTypeValue = null;
        if (restoreFocus) {
            (elements.addBtn || elements.addTypeOpenBtn)?.focus();
        }
    };
    const applyPendingSelection = () => {
        const pendingOption = getPendingOption();
        if (!elements.addTypeEl || !pendingOption) return;
        const changed = elements.addTypeEl.value !== pendingOption.value;
        elements.addTypeEl.value = pendingOption.value;
        if (changed) {
            elements.addTypeEl.dispatchEvent(new Event('input', { bubbles: true }));
            elements.addTypeEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            updateAddControlsState(elements);
        }
        if (modalIntent === 'add') {
            const draft = readAddSceneObjectDraft(elements);
            callbacks.sceneManager?.add(draft.type, draft.options);
            render();
        }
        closeModal(true);
    };
    const renderModalPage = () => {
        if (!elements.addTypeEl || !elements.addTypeModalGridEl) return;

        const options = getOptions();
        pageIndex = clampPageIndex(pageIndex);
        const start = pageIndex * TYPE_MODAL_PAGE_SIZE;
        const pageItems = options.slice(start, start + TYPE_MODAL_PAGE_SIZE);

        elements.addTypeModalGridEl.innerHTML = '';
        pageItems.forEach((option) => {
            const label = option.textContent?.trim() || option.value;
            const meta = getSceneTypePreviewConfig(option.value, label);
            const currentValue = elements.addTypeEl?.value;
            const isPending = option.value === (pendingTypeValue || currentValue);
            const isCurrent = option.value === currentValue;
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `scene-type-modal__card${isPending ? ' is-selected' : ''}${isCurrent ? ' is-current' : ''}`;
            card.dataset.value = option.value;
            card.setAttribute('aria-pressed', isPending ? 'true' : 'false');
            card.innerHTML = `
                <span class="scene-type-modal__card-head">
                    <span class="scene-type-modal__card-icon" aria-hidden="true">${meta.icon}</span>
                    ${isCurrent ? '<span class="scene-type-modal__card-badge">Текущий</span>' : ''}
                    ${isPending && !isCurrent ? '<span class="scene-type-modal__card-badge scene-type-modal__card-badge--pending">К выбору</span>' : ''}
                </span>
                <span class="scene-type-modal__card-title">${label}</span>
                <span class="scene-type-modal__card-text">${meta.description}</span>
            `;
            const showCardPreview = () => {
                typePreview.showForType(option.value, label);
            };
            card.addEventListener('pointerenter', showCardPreview);
            card.addEventListener('focus', showCardPreview);
            card.addEventListener('click', () => {
                pendingTypeValue = option.value;
                renderModalPage();
                syncModalSelectionSummary();
                typePreview.showForType(option.value, label);
            });
            elements.addTypeModalGridEl?.appendChild(card);
        });

        syncPageIndicator();
        syncModalSelectionSummary();
    };
    const syncPageWithSelection = () => {
        const selectedIndex = getOptions().findIndex((option) => option.value === (pendingTypeValue || elements.addTypeEl?.value));
        if (selectedIndex >= 0) {
            pageIndex = Math.floor(selectedIndex / TYPE_MODAL_PAGE_SIZE);
        }
    };
    const openModal = (intent: 'select' | 'add') => {
        if (!elements.addTypeModalEl || !elements.addTypeEl) return;
        modalIntent = intent;
        pendingTypeValue = elements.addTypeEl.value;
        syncPageWithSelection();
        renderModalPage();
        elements.addTypeModalEl.classList.add('is-open');
        elements.addTypeModalEl.setAttribute('aria-hidden', 'false');
        document.body.classList.add('scene-type-modal-open');
        typePreview.showForType(
            pendingTypeValue,
            elements.addTypeEl.selectedOptions[0]?.textContent?.trim() || pendingTypeValue || undefined
        );
        window.requestAnimationFrame(() => focusModalCard());
    };
    const changePage = (delta: number) => {
        const nextPage = clampPageIndex(pageIndex + delta);
        if (nextPage === pageIndex) return;
        pageIndex = nextPage;
        renderModalPage();
        window.requestAnimationFrame(() => focusModalCard());
    };

    if (elements.addTypeEl) {
        elements.addTypeEl.addEventListener('change', () => updateAddControlsState(elements));
        elements.addTypeEl.addEventListener('input', () => updateAddControlsState(elements));
        updateAddControlsState(elements);
        syncPreview();
    }

    elements.addTypeOpenBtn?.addEventListener('click', () => openModal('select'));
    elements.addBtn?.addEventListener('click', () => openModal('add'));
    elements.addTypeModalApplyBtn?.addEventListener('click', applyPendingSelection);
    elements.addTypeModalPrevBtn?.addEventListener('click', () => changePage(-1));
    elements.addTypeModalNextBtn?.addEventListener('click', () => changePage(1));
    elements.addTypeModalCloseBtn?.addEventListener('click', () => closeModal(true));
    elements.addTypeModalEl?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-scene-type-modal-close="true"]')) {
            closeModal(true);
        }
    });
    elements.addTypeModalGridEl?.addEventListener('pointerleave', () => {
        if (!isModalOpen()) return;
        const pendingOption = getPendingOption();
        if (pendingOption) {
            typePreview.showForType(pendingOption.value, pendingOption.textContent?.trim() || pendingOption.value);
        }
    });
    document.addEventListener('keydown', (event) => {
        if (!isModalOpen()) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal(true);
            return;
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            changePage(-1);
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            changePage(1);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            applyPendingSelection();
        }
    });

    getMapInputs(elements).forEach((input) => {
        input.addEventListener('input', () => {
            updateMapSummary(elements);
            syncPreview();
        });
        input.addEventListener('change', () => {
            updateMapSummary(elements);
            syncPreview();
        });
    });
    elements.addFloorsEl?.addEventListener('input', () => {
        syncFloorLimit(elements.addFloorsEl, elements.addBuildingFloorEl);
        syncPreview();
    });
    elements.selectedFloorsEl?.addEventListener('input', () => syncFloorLimit(elements.selectedFloorsEl, elements.selectedBuildingFloorEl));
    elements.addBuildingIncidentsEl?.addEventListener('input', () => {
        syncIncidentValue(elements.addValueEl, elements.addBuildingIncidentsEl);
        syncPreview();
    });
    elements.selectedBuildingIncidentsEl?.addEventListener('input', () => syncIncidentValue(elements.selectedValueEl, elements.selectedBuildingIncidentsEl));
    elements.addValueEl?.addEventListener('input', syncPreview);
    elements.addDictionaryEl?.addEventListener('change', syncPreview);
    elements.addPointsEl?.addEventListener('input', syncPreview);
}
