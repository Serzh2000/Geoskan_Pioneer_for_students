import { createContextMenuDom } from './dom.js';
import { renderContextMenuContents } from './menu-builder.js';
import { renderContextToolbar } from './toolbar-builder.js';
import type { MenuCallbacks, ObjectToolPanelCallbacks } from './types.js';

let callbacks: MenuCallbacks = {
    onTransform: () => {},
    onDelete: () => {},
    onDuplicate: () => {}
};

let toolPanelCallbacks: ObjectToolPanelCallbacks = {
    title: '',
    activeMode: null,
    onTransform: () => {},
    rotationStepDeg: 15,
    onSetRotationStep: () => {},
    onRotateStep: () => {},
    onResetTransform: () => {},
    onExit: () => {}
};

export function initContextMenu() {
    const prevMenu = document.getElementById('object-context-menu');
    if (prevMenu) prevMenu.remove();
    const prevToolPanel = document.getElementById('transform-toolbar');
    if (prevToolPanel) prevToolPanel.remove();
    const prevStyle = document.getElementById('ctx-menu-style');
    if (prevStyle) prevStyle.remove();

    const { style, menu, header, toolbar, toolbarTitle, toolbarActions } = createContextMenuDom();
    document.head.appendChild(style);

    const renderButtons = () => {
        renderContextMenuContents(menu, header, callbacks, hide);
    };

    const hide = () => {
        menu.classList.remove('visible');
    };

    const setToolbarMode = (mode?: string | null) => {
        toolPanelCallbacks.activeMode = mode || null;
        const buttons = toolbar.querySelectorAll<HTMLButtonElement>('[data-transform-mode]');
        buttons.forEach((button) => {
            button.classList.toggle('active', button.dataset.transformMode === toolPanelCallbacks.activeMode);
        });
        const rotateSections = toolbar.querySelectorAll<HTMLElement>('[data-rotate-only]');
        rotateSections.forEach((section) => {
            section.style.display = toolPanelCallbacks.activeMode === 'rotate' ? '' : 'none';
        });
    };

    const hideToolbar = () => {
        toolbar.classList.remove('visible');
    };

    const setRotationStep = (step: number) => {
        toolPanelCallbacks.rotationStepDeg = step;
        const buttons = toolbar.querySelectorAll<HTMLButtonElement>('[data-rotation-step]');
        buttons.forEach((button) => {
            button.classList.toggle('active', Number(button.dataset.rotationStep) === step);
        });
    };

    const renderToolbar = () => {
        renderContextToolbar(
            { toolbar, toolbarTitle, toolbarActions },
            toolPanelCallbacks,
            { setToolbarMode, setRotationStep }
        );
    };

    const show = (x: number, y: number) => {
        renderButtons();
        menu.style.left = `${Math.max(0, x)}px`;
        menu.style.top = `${Math.max(0, y)}px`;
        menu.classList.add('visible');
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${Math.max(0, window.innerWidth - rect.width - 6)}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${Math.max(0, window.innerHeight - rect.height - 6)}px`;
        }
    };

    menu.addEventListener('pointerdown', (e) => e.stopPropagation());
    menu.addEventListener('mousedown', (e) => e.stopPropagation());
    menu.addEventListener('click', (e) => e.stopPropagation());
    menu.addEventListener('contextmenu', (e) => e.preventDefault());

    document.body.appendChild(menu);
    document.body.appendChild(toolbar);

    window.showContextMenu = (
        x: number,
        y: number,
        onTransform: (mode: string) => void,
        onDelete: () => void,
        onDuplicate: () => void,
        onShowCoords?: () => void,
        onResetOrigin?: () => void,
        objectInfoTitle?: string,
        objectInfoItems?: { title?: string; text: string }[],
        objectActionsTitle?: string,
        objectActions?: { label: string; icon: string; action: () => void; active?: boolean; danger?: boolean }[]
    ) => {
        callbacks = {
            onTransform,
            onDelete,
            onDuplicate,
            onShowCoords,
            onResetOrigin,
            objectInfoTitle,
            objectInfoItems,
            objectActionsTitle,
            objectActions
        };
        show(x, y);
    };

    window.hideContextMenu = hide;
    (window as any).showGizmoToolbar = (
        title: string,
        activeMode: string | null | undefined,
        rotationStepDeg: number,
        onTransform: (mode: string) => void,
        onSetRotationStep: (step: number) => void,
        onRotateStep: (axis: 'x' | 'y' | 'z', direction: 1 | -1) => void,
        onResetTransform: () => void,
        onExit: () => void
    ) => {
        toolPanelCallbacks = {
            title,
            activeMode: activeMode || null,
            onTransform,
            rotationStepDeg,
            onSetRotationStep,
            onRotateStep,
            onResetTransform,
            onExit
        };
        renderToolbar();
    };
    (window as any).hideGizmoToolbar = hideToolbar;
    (window as any).setGizmoToolbarMode = setToolbarMode;
    (window as any).setTransformToolbarRotationStep = setRotationStep;

    document.addEventListener('pointerdown', (e: PointerEvent) => {
        const target = e.target as Node | null;
        if (!target) return;
        if (!menu.classList.contains('visible')) return;
        if (menu.contains(target)) return;
        hide();
    }, true);

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') hide();
    });
}
