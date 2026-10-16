import type { MenuCallbacks } from './types.js';

function addSeparator(menu: HTMLElement) {
    const separator = document.createElement('div');
    separator.className = 'ctx-separator';
    menu.appendChild(separator);
}

function addSectionLabel(menu: HTMLElement, label: string) {
    const section = document.createElement('div');
    section.className = 'ctx-section-label';
    section.textContent = label;
    menu.appendChild(section);
}

function addInfoCard(menu: HTMLElement, text: string, title?: string) {
    const card = document.createElement('div');
    card.className = 'ctx-info-card';
    if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'ctx-info-title';
        titleEl.textContent = title;
        card.appendChild(titleEl);
    }

    const textEl = document.createElement('div');
    textEl.className = 'ctx-info-text';
    textEl.textContent = text;
    card.appendChild(textEl);
    menu.appendChild(card);
}

function addButton(
    menu: HTMLElement,
    label: string,
    icon: string,
    action: () => void,
    hide: () => void,
    className = '',
    active = false
) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ctx-btn ${className}`.trim();
    if (active) button.classList.add('active');
    button.innerHTML = `<span>${icon}</span><span>${label}</span>`;

    const run = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        hide();
        action();
    };

    button.addEventListener('pointerdown', run);
    button.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') run(e);
    });

    menu.appendChild(button);
}

export function renderContextMenuContents(
    menu: HTMLElement,
    header: HTMLElement,
    callbacks: MenuCallbacks,
    hide: () => void
) {
    menu.innerHTML = '';
    menu.appendChild(header);

    addButton(menu, 'Переместить', '📍', () => callbacks.onTransform('translate'), hide);
    addButton(menu, 'Наклонить', '🔄', () => callbacks.onTransform('rotate'), hide);
    addButton(menu, 'Масштаб', '📏', () => callbacks.onTransform('scale'), hide);
    addButton(menu, 'Дублировать', '📋', () => callbacks.onDuplicate(), hide);

    if (callbacks.onShowCoords) {
        addButton(menu, 'Координаты', '🎯', () => callbacks.onShowCoords?.(), hide);
    }

    if (callbacks.onResetOrigin) {
        addButton(menu, 'Вернуть в начало', '🏠', () => callbacks.onResetOrigin?.(), hide);
    }

    if (callbacks.objectInfoItems?.length) {
        addSeparator(menu);
        addSectionLabel(menu, callbacks.objectInfoTitle || 'Информация');
        callbacks.objectInfoItems.forEach((infoItem) => addInfoCard(menu, infoItem.text, infoItem.title));
    }

    if (callbacks.objectActions?.length) {
        addSeparator(menu);
        addSectionLabel(menu, callbacks.objectActionsTitle || 'Действия объекта');
        callbacks.objectActions.forEach((action) => {
            addButton(menu, action.label, action.icon, action.action, hide, action.danger ? 'danger' : '', !!action.active);
        });
    }

    addButton(menu, 'Удалить', '🗑️', () => callbacks.onDelete(), hide, 'danger');
    addButton(menu, 'Отмена', '✖', () => {}, hide, 'cancel');
}
