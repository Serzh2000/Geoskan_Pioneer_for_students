import type { ObjectToolPanelCallbacks } from './types.js';

type ToolbarDom = {
    toolbar: HTMLElement;
    toolbarTitle: HTMLElement;
    toolbarActions: HTMLElement;
};

type ToolbarApi = {
    setToolbarMode: (mode?: string | null) => void;
    setRotationStep: (step: number) => void;
};

const TRANSFORM_ICONS = {
    translate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 15 22 12 19 9"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>',
    rotate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
    scale: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><path d="M7 17l10-10"></path><path d="M17 17V7H7"></path></svg>',
    exit: '✕'
};

export function renderContextToolbar(
    dom: ToolbarDom,
    callbacks: ObjectToolPanelCallbacks,
    api: ToolbarApi
) {
    const { toolbar, toolbarTitle, toolbarActions } = dom;
    toolbarTitle.textContent = callbacks.title || 'Инструменты';
    toolbarActions.innerHTML = '';

    const addToolbarButton = (content: string, mode: string | null, action: () => void, extraClass = '', title = '') => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `transform-btn ${extraClass}`.trim();
        button.innerHTML = content;
        if (title) button.title = title;
        if (mode) button.dataset.transformMode = mode;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            action();
        });
        toolbarActions.appendChild(button);
    };

    addToolbarButton(TRANSFORM_ICONS.translate, 'translate', () => callbacks.onTransform('translate'), 'transform-mode-btn', 'Перемещение');
    addToolbarButton(TRANSFORM_ICONS.rotate, 'rotate', () => callbacks.onTransform('rotate'), 'transform-mode-btn', 'Поворот');
    addToolbarButton(TRANSFORM_ICONS.scale, 'scale', () => callbacks.onTransform('scale'), 'transform-mode-btn', 'Масштаб');

    const separator = document.createElement('div');
    separator.className = 'transform-toolbar-separator';
    toolbarActions.appendChild(separator);

    const stepGroup = document.createElement('div');
    stepGroup.className = 'transform-step-group';
    stepGroup.setAttribute('data-rotate-only', 'true');

    const stepLabel = document.createElement('span');
    stepLabel.className = 'transform-step-label';
    stepLabel.textContent = 'Шаг';
    stepGroup.appendChild(stepLabel);

    [5, 15, 45].forEach((step) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'transform-btn transform-step-btn';
        button.textContent = `${step}°`;
        button.dataset.rotationStep = String(step);
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            callbacks.onSetRotationStep(step);
        });
        stepGroup.appendChild(button);
    });
    toolbarActions.appendChild(stepGroup);

    const axisGroup = document.createElement('div');
    axisGroup.className = 'transform-toolbar-actions transform-axis-group';
    axisGroup.setAttribute('data-rotate-only', 'true');
    axisGroup.style.display = 'flex';

    const subtitle = document.createElement('div');
    subtitle.className = 'transform-toolbar-subtitle';
    subtitle.textContent = 'Поворот X/Y/Z';
    axisGroup.appendChild(subtitle);

    const axisButtons = [
        { label: 'X-', axis: 'x', direction: -1 },
        { label: 'X+', axis: 'x', direction: 1 },
        { label: 'Y-', axis: 'y', direction: -1 },
        { label: 'Y+', axis: 'y', direction: 1 },
        { label: 'Z-', axis: 'z', direction: -1 },
        { label: 'Z+', axis: 'z', direction: 1 }
    ] as const;

    axisButtons.forEach(({ label, axis, direction }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'transform-btn transform-axis-btn';
        button.textContent = label;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            callbacks.onRotateStep(axis, direction);
        });
        axisGroup.appendChild(button);
    });

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'transform-btn transform-reset-btn';
    resetButton.textContent = 'Сброс';
    resetButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        callbacks.onResetTransform();
    });
    axisGroup.appendChild(resetButton);
    toolbarActions.appendChild(axisGroup);

    // Close button as a small cross in the corner
    addToolbarButton(TRANSFORM_ICONS.exit, null, () => callbacks.onExit(), 'exit', 'Закрыть');

    api.setToolbarMode(callbacks.activeMode);
    api.setRotationStep(callbacks.rotationStepDeg);
    toolbar.classList.add('visible');
}
